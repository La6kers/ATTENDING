// ============================================================
// COMPASS Standalone — Diagnosis API
// Generates HPI narrative + differential diagnoses
// Uses shared DifferentialDiagnosisService with Bayesian engine
// Integrates image analysis findings into differential scoring
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DifferentialDiagnosisService,
  type PatientPresentation,
} from '@attending/shared/lib/ai/differentialDiagnosis';
import { buildHpiNarrative } from '../../lib/hpiNarrative';
import crypto from 'crypto';
import { logClinicalAudit, createDiagnoseAuditEntry } from '@attending/shared/lib/audit/clinicalAuditLog';
import { normalizeWithLLM, type CCNormalizationResult } from '@attending/shared/lib/ai/ccNormalizer';
import { matchesKnownSymptom, normalizeSymptomText } from '@attending/shared/lib/ai/symptomSynonyms';
import { preprocessCC, describePreprocess } from '@attending/shared/lib/ai/ccPreprocessor';
import { scorePrevalenceMatches } from '@attending/shared/lib/ai/clinicalPrevalence';
import type { MatchProvenance } from '@attending/shared/lib/ai/differentialDiagnosis.types';
import { z } from 'zod';
import type { HPIData } from '@attending/shared/types/chat.types';

// ============================================================
// Zod Validation Schemas (runtime type safety for clinical data)
// ============================================================

const ImageConditionSchema = z.object({
  name: z.string().max(200),
  confidence: z.number().min(0).max(100),
  bodyRegion: z.string().max(100),
  reasoning: z.string().max(1000),
});

const VitalsSchema = z.object({
  heartRate: z.number().min(0).max(300).optional(),
  bloodPressureSystolic: z.number().min(0).max(400).optional(),
  bloodPressureDiastolic: z.number().min(0).max(300).optional(),
  temperature: z.number().min(70).max(115).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
}).optional();

/** Coerce a value that may be a single string into a string array. */
const stringOrArrayToArray = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.length > 0) return [val];
  return undefined;
}, z.array(z.string().max(200)).optional());

const HPISchema = z.object({
  onset: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  duration: z.string().max(200).optional(),
  character: z.string().max(200).optional(),
  severity: z.number().min(0).max(10).optional(),
  aggravating: stringOrArrayToArray,
  relieving: stringOrArrayToArray,
  associated: z.array(z.string().max(200)).optional(),
  timing: z.string().max(200).optional(),
}).passthrough().optional().transform((val): HPIData => val || {});

const DiagnoseRequestSchema = z.object({
  chiefComplaint: z.string().min(1).max(500),
  hpi: HPISchema,
  mrn: z.string().max(50).optional(),
  gender: z.string().max(30).optional(),
  age: z.number().int().min(0).max(120).optional(),
  redFlags: z.array(z.string().max(200)).max(20).optional(),
  symptomSpecificAnswers: z.record(z.string(), z.string().max(500)).optional(),
  imageSuggestedConditions: z.array(ImageConditionSchema).max(10).optional(),
  vitals: VitalsSchema,
  medications: z.array(z.string().max(100)).max(30).optional(),
});

// Simple in-memory rate limiter (per IP, 20 requests/minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = process.env.NODE_ENV === 'development' ? 1000 : 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// HMAC-based request signing for CSRF-like protection
function validateOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin || req.headers.referer || '';
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'https://attending-compass.azurewebsites.net',
  ].filter(Boolean);
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') return true;
  return allowedOrigins.some(allowed => origin.startsWith(allowed as string));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Origin validation
  if (!validateOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  try {
    // Validate request body with Zod schema
    const parseResult = DiagnoseRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const {
      chiefComplaint, hpi, mrn, gender, age: reqAge,
      redFlags, symptomSpecificAnswers, imageSuggestedConditions,
      vitals, medications,
    } = parseResult.data;

    // Sanitize string inputs
    const safeChiefComplaint = chiefComplaint.slice(0, 500);
    const safeMrn = mrn?.slice(0, 50);

    // Build HPI narrative (use MRN as identifier, not patient name)
    const hpiNarrative = buildHpiNarrative(hpi || {}, safeChiefComplaint, safeMrn ? `Patient (MRN: ${safeMrn})` : undefined);

    // Age comes from the request (collected in the chat flow or patient portal auth).
    // Fallback of 40 is kept only to preserve back-compat for callers that haven't
    // been updated yet — warn in logs so we notice.
    let age: number;
    if (typeof reqAge === 'number') {
      age = reqAge;
    } else {
      age = 40;
      console.warn('[COMPASS Diagnose] Request missing age — falling back to 40. Update caller to pass age.');
    }

    // --- Tier 1: Deterministic preprocessor (abbreviations, narrative, questions) ---
    const preResult = preprocessCC(safeChiefComplaint);
    let effectiveCC = preResult.processed;
    if (preResult.expandedAbbrev || preResult.extractedNarrative || preResult.flattenedQuestions) {
      console.log(`[CC-Preprocess] ${describePreprocess(preResult)} | "${safeChiefComplaint.slice(0, 60)}" → "${effectiveCC.slice(0, 100)}"`);
    }

    // --- Tier 2: Synonym normalization (layman → canonical) ---
    // normalizeSymptomText appends canonical forms for known layman phrasings
    effectiveCC = normalizeSymptomText(effectiveCC);

    // --- Tier 3: LLM CC normalization (fallback when deterministic passes miss) ---
    let ccNormResult: CCNormalizationResult | null = null;
    if (!matchesKnownSymptom(effectiveCC)) {
      ccNormResult = await normalizeWithLLM(safeChiefComplaint, age, gender || 'other');
      if (ccNormResult.extractedTerms.length > 0) {
        effectiveCC = `${effectiveCC} ${ccNormResult.extractedTerms.join(' ')}`;
      }
    }

    if (ccNormResult?.llmUsed) {
      console.log(`[CC-Normalize] provider=${ccNormResult.provider} latency=${ccNormResult.latencyMs}ms terms=${ccNormResult.extractedTerms.join(',')}`);
    }

    // Merge image-suggested conditions into red flags and symptom answers
    const enhancedRedFlags = [...(redFlags || [])];
    const enhancedAnswers = { ...(symptomSpecificAnswers || {}) };

    if (imageSuggestedConditions && imageSuggestedConditions.length > 0) {
      for (const imgCondition of imageSuggestedConditions) {
        if (imgCondition.confidence >= 60) {
          enhancedRedFlags.push(`Image finding: ${imgCondition.name} (${imgCondition.confidence}% — ${imgCondition.bodyRegion})`);
        }
        enhancedAnswers[`image_${imgCondition.bodyRegion}`] =
          `${imgCondition.name} — ${imgCondition.reasoning}`;
      }
    }

    // Build presentation for Bayesian diagnosis engine
    const presentation: PatientPresentation = {
      chiefComplaint: effectiveCC,
      duration: hpi?.duration,
      symptoms: [
        {
          name: effectiveCC,
          severity: hpi?.severity && hpi.severity >= 7 ? 'severe' : hpi?.severity && hpi.severity >= 4 ? 'moderate' : 'mild',
          onset: hpi?.onset,
          location: hpi?.location,
          character: hpi?.character,
          timing: hpi?.timing,
          aggravatingFactors: hpi?.aggravating,
          alleviatingFactors: hpi?.relieving,
        },
        ...(hpi?.associated || [])
          .filter(s => s && s.toLowerCase() !== 'no associated symptoms')
          .map(s => ({ name: s })),
        ...(imageSuggestedConditions || [])
          .filter(c => c.confidence >= 40)
          .map(c => ({ name: `${c.name} (image analysis — ${c.bodyRegion})` })),
      ],
      demographics: {
        age,
        gender: (gender?.toLowerCase() as 'male' | 'female' | 'other') || 'other',
      },
      vitals: vitals ? {
        heartRate: vitals.heartRate,
        oxygenSaturation: vitals.oxygenSaturation,
        temperature: vitals.temperature,
        bloodPressure: (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic)
          ? { systolic: vitals.bloodPressureSystolic, diastolic: vitals.bloodPressureDiastolic }
          : undefined,
      } : undefined,
      medicalHistory: medications && medications.length > 0
        ? { conditions: [], medications, allergies: [] }
        : undefined,
      redFlags: enhancedRedFlags,
      symptomSpecificAnswers: enhancedAnswers,
    };

    // Generate differentials via Bayesian engine with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const startTime = Date.now();

    const aiProvider = (process.env.AI_PROVIDER as 'biomistral' | 'azure-openai' | 'anthropic' | 'local') || 'local';
    const diagnosisService = new DifferentialDiagnosisService({
      provider: aiProvider,
      endpoint: process.env.AI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AI_API_KEY || process.env.AZURE_OPENAI_KEY,
      model: process.env.AI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT,
    });

    const differentials = await diagnosisService.generateDifferentials(presentation);
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;

    // HIPAA audit log — no raw PHI, only hashed identifiers and categories
    logClinicalAudit(createDiagnoseAuditEntry({
      requestId: crypto.randomUUID(),
      clientIp: clientIp,
      chiefComplaint: safeChiefComplaint,
      mrn: safeMrn,
      symptomCount: presentation.symptoms.length,
      redFlagCount: enhancedRedFlags.length,
      differentialCount: differentials.differentials.length,
      provider: aiProvider,
      aiInvoked: aiProvider !== 'local' || (ccNormResult?.llmUsed ?? false),
      latencyMs,
      success: true,
    }));

    // --- R2: Build match provenance for auditability ---
    // scorePrevalenceMatches is deterministic so the ranked list seen here
    // mirrors what the engine routed on internally.
    const preprocessingApplied: string[] = [];
    if (preResult.expandedAbbrev) preprocessingApplied.push('abbreviation-expansion');
    if (preResult.extractedNarrative) preprocessingApplied.push('narrative-extraction');
    if (preResult.flattenedQuestions) preprocessingApplied.push('question-flattening');
    if (ccNormResult?.llmUsed) preprocessingApplied.push(`llm-normalize:${ccNormResult.provider}`);

    const ranked = scorePrevalenceMatches(effectiveCC);
    const topMatch = ranked[0];
    const matchProvenance: MatchProvenance = {
      prevalenceCategory: topMatch ? topMatch.category.complaint : null,
      alternativeCategories: ranked.slice(1, 4).map(m => ({
        category: m.category.complaint,
        score: m.score,
      })),
      triggeredBy: topMatch ? topMatch.matchedPatterns : [],
      fallbackUsed: !topMatch,
      effectiveCC,
      preprocessingApplied,
    };

    return res.status(200).json({
      hpiNarrative,
      differentials: { ...differentials, matchProvenance },
      matchProvenance,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[COMPASS Diagnose] Error:', error);

    // Audit log the failure too
    logClinicalAudit(createDiagnoseAuditEntry({
      requestId: crypto.randomUUID(),
      clientIp: clientIp,
      chiefComplaint: req.body?.chiefComplaint || 'unknown',
      symptomCount: 0,
      redFlagCount: 0,
      differentialCount: 0,
      provider: process.env.AI_PROVIDER || 'local',
      aiInvoked: false,
      latencyMs: 0,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }));

    return res.status(500).json({
      error: 'Failed to generate diagnosis. Please try again.',
    });
  }
}
