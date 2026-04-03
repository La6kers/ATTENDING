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

interface ImageCondition {
  name: string;
  confidence: number;
  bodyRegion: string;
  reasoning: string;
}

interface DiagnoseRequest {
  chiefComplaint: string;
  hpi: HPIData;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  redFlags?: string[];
  symptomSpecificAnswers?: Record<string, string>;
  imageSuggestedConditions?: ImageCondition[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as DiagnoseRequest;
    const {
      chiefComplaint, hpi, patientName, dateOfBirth, gender,
      redFlags, symptomSpecificAnswers, imageSuggestedConditions,
    } = body;

    if (!chiefComplaint) {
      return res.status(400).json({ error: 'Chief complaint is required' });
    }

    // Build HPI narrative
    const hpiNarrative = buildHpiNarrative(hpi || {}, chiefComplaint, patientName);

    // Estimate age from DOB
    let age = 40;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }

    // Merge image-suggested conditions into red flags and symptom answers
    // This cross-references visual AI findings with the Bayesian differential engine
    const enhancedRedFlags = [...(redFlags || [])];
    const enhancedAnswers = { ...(symptomSpecificAnswers || {}) };

    if (imageSuggestedConditions && imageSuggestedConditions.length > 0) {
      for (const imgCondition of imageSuggestedConditions) {
        // High-confidence image findings become red flag indicators
        if (imgCondition.confidence >= 60) {
          enhancedRedFlags.push(`Image finding: ${imgCondition.name} (${imgCondition.confidence}% — ${imgCondition.bodyRegion})`);
        }
        // Inject image conditions as pseudo-symptom-specific answers
        // This allows the Bayesian engine's LR rules to pick them up
        enhancedAnswers[`image_${imgCondition.bodyRegion}`] =
          `${imgCondition.name} — ${imgCondition.reasoning}`;
      }
    }

    // Build presentation for Bayesian diagnosis engine
    const presentation: PatientPresentation = {
      chiefComplaint,
      duration: hpi?.duration,
      symptoms: [
        {
          name: chiefComplaint,
          severity: hpi?.severity && hpi.severity >= 7 ? 'severe' : hpi?.severity && hpi.severity >= 4 ? 'moderate' : 'mild',
          onset: hpi?.onset,
          location: hpi?.location,
          character: hpi?.character,
          timing: hpi?.timing,
          aggravatingFactors: hpi?.aggravating,
          alleviatingFactors: hpi?.relieving,
        },
        // Add associated symptoms
        ...(hpi?.associated || [])
          .filter(s => s && s.toLowerCase() !== 'no associated symptoms')
          .map(s => ({ name: s })),
        // Add image-suggested conditions as additional symptom data
        ...(imageSuggestedConditions || [])
          .filter(c => c.confidence >= 40)
          .map(c => ({ name: `${c.name} (image analysis — ${c.bodyRegion})` })),
      ],
      demographics: {
        age,
        gender: (gender?.toLowerCase() as 'male' | 'female' | 'other') || 'other',
      },
      redFlags: enhancedRedFlags,
      symptomSpecificAnswers: enhancedAnswers,
    };

    // Generate differentials via Bayesian engine
    const diagnosisService = new DifferentialDiagnosisService({
      provider: (process.env.AI_PROVIDER as 'biomistral' | 'azure-openai' | 'anthropic' | 'local') || 'local',
      endpoint: process.env.AI_ENDPOINT,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    });

    const differentials = await diagnosisService.generateDifferentials(presentation);

    return res.status(200).json({
      hpiNarrative,
      differentials,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[COMPASS Diagnose] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate diagnosis',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
