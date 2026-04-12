// ============================================================
// Differential Diagnosis API Route
// apps/provider-portal/pages/api/clinical/differential.ts
//
// AI-powered differential diagnosis generation
// Integrates with BioMistral and rule-based clinical reasoning
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { 
  differentialDiagnosisService,
  type ClinicalPresentation,
  type PatientFactors,
  type DifferentialResult,
} from '@attending/clinical-services';

// ============================================================
// TYPES
// ============================================================

interface DifferentialRequest {
  presentation: ClinicalPresentation;
  patientFactors: PatientFactors;
  encounterId?: string;
  assessmentId?: string;
}

interface DifferentialResponse {
  success: boolean;
  data?: DifferentialResult;
  error?: string;
}

// ============================================================
// HANDLER
// ============================================================

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DifferentialResponse>,
  session: any
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const { 
    presentation, 
    patientFactors, 
    encounterId, 
    assessmentId 
  } = req.body as DifferentialRequest;

  // Validation
  if (!presentation || !presentation.chiefComplaint) {
    return res.status(400).json({
      success: false,
      error: 'Chief complaint is required',
    });
  }

  if (!patientFactors || typeof patientFactors.age !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Patient age is required',
    });
  }

  try {
    const startTime = Date.now();

    // Generate differential diagnosis
    const result = await differentialDiagnosisService.generateDifferential(
      presentation,
      patientFactors
    );

    const duration = Date.now() - startTime;

    // Audit log the AI assistance
    await createAuditLog(
      session.user.id,
      'AI_DIFFERENTIAL_GENERATED',
      'DifferentialDiagnosis',
      assessmentId || encounterId,
      {
        chiefComplaint: presentation.chiefComplaint,
        symptomCount: presentation.symptoms?.length || 0,
        patientAge: patientFactors.age,
        patientGender: patientFactors.gender,
        differentialCount: result.differentials.length,
        emergencyCount: result.emergencyDiagnoses.length,
        mustNotMissCount: result.mustNotMissDiagnoses.length,
        modelUsed: result.modelUsed,
        confidence: result.confidence,
        durationMs: duration,
      },
      req
    );

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('[API] Differential diagnosis error:', error);
    
    await createAuditLog(
      session.user.id,
      'AI_DIFFERENTIAL_FAILED',
      'DifferentialDiagnosis',
      assessmentId || encounterId,
      { error: error.message },
      req
    );

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate differential diagnosis',
    });
  }
}

export default requireAuth(handler);
