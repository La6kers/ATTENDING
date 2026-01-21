// ============================================================
// AI API Routes - Differential Diagnosis
// apps/provider-portal/pages/api/ai/differential.ts
//
// Generates AI-powered differential diagnoses from patient data
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { 
  differentialDiagnosisService,
  type PatientPresentation,
  type DifferentialDiagnosisResult,
  type ProviderFeedback,
} from '@attending/shared/lib/ai/differentialDiagnosis';
import { prisma } from '@/lib/api/prisma';

// ============================================================
// TYPES
// ============================================================

interface DifferentialRequest {
  /** Patient ID */
  patientId: string;
  
  /** Encounter ID */
  encounterId?: string;
  
  /** Assessment ID (to pull data from) */
  assessmentId?: string;
  
  /** Manual presentation data (overrides assessment) */
  presentation?: PatientPresentation;
}

interface DifferentialResponse {
  success: boolean;
  data?: DifferentialDiagnosisResult;
  error?: string;
}

interface FeedbackRequest {
  feedback: ProviderFeedback;
}

// ============================================================
// HANDLER
// ============================================================

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DifferentialResponse | { success: boolean; error?: string }>,
  session: any
) {
  switch (req.method) {
    case 'POST':
      return generateDifferential(req, res, session);
    case 'PUT':
      return submitFeedback(req, res, session);
    default:
      res.setHeader('Allow', ['POST', 'PUT']);
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
      });
  }
}

// ============================================================
// POST - Generate Differential Diagnosis
// ============================================================

async function generateDifferential(
  req: NextApiRequest,
  res: NextApiResponse<DifferentialResponse>,
  session: any
) {
  const { patientId, encounterId, assessmentId, presentation } = req.body as DifferentialRequest;

  if (!patientId) {
    return res.status(400).json({
      success: false,
      error: 'Patient ID is required',
    });
  }

  try {
    let patientPresentation: PatientPresentation;

    if (presentation) {
      // Use provided presentation
      patientPresentation = presentation;
    } else if (assessmentId) {
      // Build presentation from assessment
      patientPresentation = await buildPresentationFromAssessment(assessmentId);
    } else {
      // Build presentation from patient data
      patientPresentation = await buildPresentationFromPatient(patientId, encounterId);
    }

    // Generate differentials
    const result = await differentialDiagnosisService.generateDifferentials(patientPresentation);

    // Audit log
    await createAuditLog(
      session.user.id,
      'AI_DIFFERENTIAL_GENERATED',
      'DifferentialDiagnosis',
      result.requestId,
      {
        patientId,
        encounterId,
        assessmentId,
        primaryDiagnosis: result.primaryDiagnosis.diagnosis,
        differentialCount: result.differentials.length,
        mustRuleOutCount: result.mustRuleOut.length,
      },
      req
    );

    // Store result for feedback correlation
    await storeDifferentialResult(result, patientId, session.user.id);

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('[API] Differential diagnosis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate differential diagnosis',
    });
  }
}

// ============================================================
// PUT - Submit Provider Feedback
// ============================================================

async function submitFeedback(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; error?: string }>,
  session: any
) {
  const { feedback } = req.body as FeedbackRequest;

  if (!feedback || !feedback.requestId) {
    return res.status(400).json({
      success: false,
      error: 'Feedback with requestId is required',
    });
  }

  try {
    await differentialDiagnosisService.submitFeedback(feedback);

    // Audit log
    await createAuditLog(
      session.user.id,
      'AI_FEEDBACK_SUBMITTED',
      'DifferentialDiagnosis',
      feedback.requestId,
      {
        selectedDiagnosis: feedback.selectedDiagnosis,
        wasHelpful: feedback.wasHelpful,
        accuracyRating: feedback.accuracyRating,
      },
      req
    );

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('[API] Feedback submission error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback',
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function buildPresentationFromAssessment(assessmentId: string): Promise<PatientPresentation> {
  const assessment = await prisma.patientAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      encounter: {
        include: {
          patient: {
            include: {
              allergies: true,
              medications: { where: { isActive: true } },
              conditions: { where: { status: 'ACTIVE' } },
            },
          },
          vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  if (!assessment) {
    throw new Error(`Assessment ${assessmentId} not found`);
  }

  const patient = assessment.encounter.patient;
  const vitals = assessment.encounter.vitals[0];
  const assessmentData = assessment as any; // Type assertion for JSON fields

  return {
    chiefComplaint: assessmentData.chiefComplaint || 'Not specified',
    duration: assessmentData.duration,
    symptoms: (assessmentData.symptoms || []).map((s: any) => ({
      name: typeof s === 'string' ? s : s.name,
      severity: s.severity,
      onset: s.onset,
    })),
    vitals: vitals ? {
      temperature: vitals.temperature || undefined,
      heartRate: vitals.heartRate || undefined,
      bloodPressure: vitals.systolicBP && vitals.diastolicBP ? {
        systolic: vitals.systolicBP,
        diastolic: vitals.diastolicBP,
      } : undefined,
      respiratoryRate: vitals.respiratoryRate || undefined,
      oxygenSaturation: vitals.oxygenSaturation || undefined,
      painScore: vitals.painScore || undefined,
    } : undefined,
    demographics: {
      age: calculateAge(patient.dateOfBirth),
      gender: (patient.gender?.toLowerCase() || 'other') as 'male' | 'female' | 'other',
      pregnant: assessmentData.isPregnant,
    },
    medicalHistory: {
      conditions: patient.conditions.map(c => c.name),
      medications: patient.medications.map(m => m.medicationName),
      allergies: patient.allergies.map(a => a.allergen),
    },
    redFlags: assessmentData.redFlags || [],
  };
}

async function buildPresentationFromPatient(
  patientId: string,
  encounterId?: string
): Promise<PatientPresentation> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      allergies: true,
      medications: { where: { isActive: true } },
      conditions: { where: { status: 'ACTIVE' } },
      vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  });

  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  let encounter;
  if (encounterId) {
    encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patientAssessment: true,
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });
  }

  const vitals = encounter?.vitals[0] || patient.vitals[0];
  const assessment = encounter?.patientAssessment as any;

  return {
    chiefComplaint: assessment?.chiefComplaint || 'Chief complaint not specified',
    symptoms: (assessment?.symptoms || []).map((s: any) => ({
      name: typeof s === 'string' ? s : s.name,
    })),
    vitals: vitals ? {
      temperature: vitals.temperature || undefined,
      heartRate: vitals.heartRate || undefined,
      bloodPressure: vitals.systolicBP && vitals.diastolicBP ? {
        systolic: vitals.systolicBP,
        diastolic: vitals.diastolicBP,
      } : undefined,
      respiratoryRate: vitals.respiratoryRate || undefined,
      oxygenSaturation: vitals.oxygenSaturation || undefined,
    } : undefined,
    demographics: {
      age: calculateAge(patient.dateOfBirth),
      gender: (patient.gender?.toLowerCase() || 'other') as 'male' | 'female' | 'other',
    },
    medicalHistory: {
      conditions: patient.conditions.map(c => c.name),
      medications: patient.medications.map(m => m.medicationName),
      allergies: patient.allergies.map(a => a.allergen),
    },
    redFlags: assessment?.redFlags || [],
  };
}

async function storeDifferentialResult(
  result: DifferentialDiagnosisResult,
  patientId: string,
  providerId: string
): Promise<void> {
  // Store for feedback correlation and analytics
  // In production, this would go to a dedicated analytics database
  try {
    await prisma.auditLog.create({
      data: {
        userId: providerId,
        action: 'AI_DIFFERENTIAL_STORED',
        entityType: 'DifferentialDiagnosis',
        entityId: result.requestId,
        changes: {
          patientId,
          primaryDiagnosis: result.primaryDiagnosis.diagnosis,
          confidence: result.overallConfidence,
          differentialCount: result.differentials.length,
        },
        success: true,
      },
    });
  } catch (error) {
    console.error('[API] Failed to store differential result:', error);
  }
}

function calculateAge(dateOfBirth: Date | null): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export default requireAuth(handler);
