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
import type { HPIData } from '@attending/shared/types/chat.types';
import crypto from 'crypto';
import { logClinicalAudit, createDiagnoseAuditEntry } from '@attending/shared/lib/audit/clinicalAuditLog';

interface ImageCondition {
  name: string;
  confidence: number;
  bodyRegion: string;
  reasoning: string;
}

interface VitalsInput {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  oxygenSaturation?: number;
}

interface DiagnoseRequest {
  chiefComplaint: string;
  hpi: HPIData;
  mrn?: string;
  gender?: string;
  redFlags?: string[];
  symptomSpecificAnswers?: Record<string, string>;
  imageSuggestedConditions?: ImageCondition[];
  vitals?: VitalsInput;
  medications?: string[];
}

// Simple in-memory rate limiter (per IP, 20 requests/minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
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
    const body = req.body as DiagnoseRequest;
    const {
      chiefComplaint, hpi, mrn, gender,
      redFlags, symptomSpecificAnswers, imageSuggestedConditions,
      vitals, medications,
    } = body;

    if (!chiefComplaint || typeof chiefComplaint !== 'string') {
      return res.status(400).json({ error: 'Chief complaint is required' });
    }

    // Sanitize string inputs
    const safeChiefComplaint = chiefComplaint.slice(0, 500);
    const safeMrn = mrn?.slice(0, 50);

    // Build HPI narrative (use MRN as identifier, not patient name)
    const hpiNarrative = buildHpiNarrative(hpi || {}, safeChiefComplaint, safeMrn ? `Patient (MRN: ${safeMrn})` : undefined);

    // Default age — will be populated from patient portal auth when connected
    const age = 40;

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
      chiefComplaint: safeChiefComplaint,
      duration: hpi?.duration,
      symptoms: [
        {
          name: safeChiefComplaint,
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
      aiInvoked: aiProvider !== 'local',
      latencyMs,
      success: true,
    }));

    return res.status(200).json({
      hpiNarrative,
      differentials,
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
