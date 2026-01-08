// ============================================================
// API Route: /api/assessments
// apps/provider-portal/pages/api/assessments/index.ts
//
// Handles GET (list) and POST (create) operations for patient assessments
// NOW USING PRISMA - Real database queries
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { Prisma, UrgencyLevel, AssessmentStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}

// GET /api/assessments - List assessments with optional filtering
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status, urgency, limit = '50', offset = '0' } = req.query;

  // Build where clause dynamically
  const where: Prisma.PatientAssessmentWhereInput = {};
  
  if (status && status !== 'all') {
    // Map frontend status format to Prisma enum
    const statusMap: Record<string, AssessmentStatus> = {
      'pending': AssessmentStatus.PENDING,
      'urgent': AssessmentStatus.URGENT,
      'in-review': AssessmentStatus.IN_REVIEW,
      'in_review': AssessmentStatus.IN_REVIEW,
      'completed': AssessmentStatus.COMPLETED,
      'follow-up': AssessmentStatus.FOLLOW_UP,
      'follow_up': AssessmentStatus.FOLLOW_UP,
    };
    where.status = statusMap[status as string] || status as AssessmentStatus;
  }
  
  if (urgency && urgency !== 'all') {
    const urgencyMap: Record<string, UrgencyLevel> = {
      'standard': UrgencyLevel.STANDARD,
      'moderate': UrgencyLevel.MODERATE,
      'high': UrgencyLevel.HIGH,
      'emergency': UrgencyLevel.EMERGENCY,
    };
    where.urgencyLevel = urgencyMap[urgency as string] || urgency as UrgencyLevel;
  }

  // Fetch from database with related patient data
  const [assessments, total] = await Promise.all([
    prisma.patientAssessment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            email: true,
            allergies: {
              select: {
                allergen: true,
                reaction: true,
                severity: true,
              },
            },
          },
        },
        assignedProvider: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: [
        { urgencyLevel: 'desc' },
        { submittedAt: 'desc' },
      ],
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    }),
    prisma.patientAssessment.count({ where }),
  ]);

  // Transform to match frontend expected format
  const transformed = assessments.map(a => ({
    id: a.id,
    patientId: a.patientId,
    sessionId: a.sessionId,
    patientName: `${a.patient.firstName} ${a.patient.lastName}`,
    patientAge: calculateAge(a.patient.dateOfBirth),
    patientGender: a.patient.gender || 'Unknown',
    patientContact: {
      phone: a.patient.phone,
      email: a.patient.email,
    },
    chiefComplaint: a.chiefComplaint,
    urgencyLevel: a.urgencyLevel.toLowerCase() as 'standard' | 'moderate' | 'high',
    urgencyScore: a.urgencyScore,
    redFlags: a.redFlags,
    riskFactors: a.riskFactors,
    differentialDiagnosis: transformDifferentialDx(a.differentialDx),
    hpiData: {
      onset: a.hpiOnset,
      location: a.hpiLocation,
      duration: a.hpiDuration,
      character: a.hpiCharacter,
      severity: a.hpiSeverity,
      aggravatingFactors: a.hpiAggravating,
      relievingFactors: a.hpiRelieving,
      timing: a.hpiTiming,
      associatedSymptoms: a.hpiAssociated,
    },
    medicalHistory: {
      conditions: a.medicalHistory || [],
      medications: a.medications,
      allergies: a.patient.allergies.map(al => al.allergen),
      surgeries: a.surgicalHistory,
    },
    status: mapStatusToFrontend(a.status),
    submittedAt: a.submittedAt?.toISOString() || a.createdAt.toISOString(),
    reviewedAt: a.reviewedAt?.toISOString(),
    completedAt: a.completedAt?.toISOString(),
    providerNotes: a.providerNotes,
    confirmedDiagnoses: a.confirmedDiagnoses,
    treatmentPlan: a.treatmentPlan,
    icdCodes: a.icdCodes,
    followUpInstructions: a.followUpInstructions,
    ordersPlaced: a.ordersPlaced,
    aiRecommendations: a.aiRecommendations,
    clinicalPearls: a.clinicalPearls,
    assignedProvider: a.assignedProvider ? {
      id: a.assignedProvider.id,
      name: a.assignedProvider.name,
      specialty: a.assignedProvider.specialty,
    } : null,
  }));

  return res.status(200).json({
    assessments: transformed,
    total,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });
}

// POST /api/assessments - Create new assessment (from COMPASS)
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const data = req.body;

  // Validate required fields
  if (!data.patientId || !data.chiefComplaint) {
    return res.status(400).json({
      error: 'Missing required fields: patientId and chiefComplaint',
    });
  }

  // Verify patient exists
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });

  if (!patient) {
    return res.status(404).json({
      error: 'Patient not found',
    });
  }

  // Generate session ID
  const sessionId = data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Determine status based on urgency
  const urgencyLevel = mapUrgencyLevel(data.urgencyLevel);
  let status: AssessmentStatus = AssessmentStatus.PENDING;
  if (urgencyLevel === UrgencyLevel.HIGH || urgencyLevel === UrgencyLevel.EMERGENCY) {
    status = AssessmentStatus.URGENT;
  }

  // Create assessment in database
  const assessment = await prisma.patientAssessment.create({
    data: {
      patientId: data.patientId,
      sessionId,
      chiefComplaint: data.chiefComplaint,
      urgencyLevel,
      urgencyScore: data.urgencyScore || calculateUrgencyScore(data),
      status,
      hpiOnset: data.hpiData?.onset,
      hpiLocation: data.hpiData?.location,
      hpiDuration: data.hpiData?.duration,
      hpiCharacter: data.hpiData?.character,
      hpiSeverity: data.hpiData?.severity,
      hpiTiming: data.hpiData?.timing,
      hpiAggravating: data.hpiData?.aggravatingFactors || [],
      hpiRelieving: data.hpiData?.relievingFactors || [],
      hpiAssociated: data.hpiData?.associatedSymptoms || [],
      medications: data.medicalHistory?.medications || data.medications || [],
      allergies: data.medicalHistory?.allergies || data.allergies || [],
      medicalHistory: data.medicalHistory?.conditions || [],
      surgicalHistory: data.medicalHistory?.surgeries || [],
      familyHistory: data.familyHistory,
      socialHistory: data.socialHistory,
      reviewOfSystems: data.reviewOfSystems,
      redFlags: data.redFlags || [],
      riskFactors: data.riskFactors || [],
      differentialDx: data.differentialDiagnosis ? { primary: data.differentialDiagnosis } : {},
      aiRecommendations: data.recommendations || data.aiRecommendations || [],
      clinicalPearls: data.clinicalPearls || [],
      compassVersion: data.compassVersion || '1.0.0',
      aiModelUsed: data.aiModelUsed || 'BioMistral-7B',
      submittedAt: new Date(),
    },
    include: {
      patient: true,
    },
  });

  // Create notification for provider
  const notificationType = status === AssessmentStatus.URGENT ? 'URGENT_ASSESSMENT' : 'NEW_ASSESSMENT';
  const priority = status === AssessmentStatus.URGENT ? 'CRITICAL' : 'NORMAL';
  const emoji = status === AssessmentStatus.URGENT ? '🚨' : '📋';

  // Find a provider to notify (in production, use assignment logic)
  const provider = await prisma.user.findFirst({
    where: { role: 'PROVIDER', isActive: true },
  });

  if (provider) {
    await prisma.notification.create({
      data: {
        userId: provider.id,
        type: notificationType as any,
        title: `${emoji} ${status === AssessmentStatus.URGENT ? 'URGENT' : 'New Assessment'}: ${assessment.patient.firstName} ${assessment.patient.lastName}`,
        message: assessment.chiefComplaint.substring(0, 200),
        priority: priority as any,
        relatedType: 'PatientAssessment',
        relatedId: assessment.id,
        actionUrl: `/assessments/${assessment.id}`,
      },
    });
  }

  // Log for WebSocket notification (will be picked up by WS service)
  console.log(`[ASSESSMENT] New ${status} assessment created:`, {
    id: assessment.id,
    patient: `${assessment.patient.firstName} ${assessment.patient.lastName}`,
    urgency: urgencyLevel,
    redFlags: data.redFlags?.length || 0,
  });

  return res.status(201).json({
    success: true,
    assessmentId: assessment.id,
    sessionId: assessment.sessionId,
    queuePosition: await getQueuePosition(assessment.id),
    urgentAlert: status === AssessmentStatus.URGENT,
    message: 'Assessment submitted successfully',
  });
}

// ============================================================
// Helper Functions
// ============================================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

function mapUrgencyLevel(level: string): UrgencyLevel {
  const mapping: Record<string, UrgencyLevel> = {
    standard: UrgencyLevel.STANDARD,
    moderate: UrgencyLevel.MODERATE,
    high: UrgencyLevel.HIGH,
    emergency: UrgencyLevel.EMERGENCY,
  };
  return mapping[level?.toLowerCase()] || UrgencyLevel.STANDARD;
}

function mapStatusToFrontend(status: AssessmentStatus): string {
  const mapping: Record<AssessmentStatus, string> = {
    IN_PROGRESS: 'in_progress',
    PENDING: 'pending',
    URGENT: 'urgent',
    IN_REVIEW: 'in_review',
    COMPLETED: 'completed',
    FOLLOW_UP: 'follow_up',
    CANCELLED: 'cancelled',
  };
  return mapping[status] || 'pending';
}

function transformDifferentialDx(dx: any): Array<{name: string; probability: number; supportingEvidence: string[]; icdCode?: string}> {
  if (!dx) return [];
  
  // Handle both { primary: [...] } and direct array formats
  const dxArray = dx.primary || dx;
  if (!Array.isArray(dxArray)) return [];
  
  return dxArray.map((d: any) => ({
    name: d.name,
    probability: d.probability,
    supportingEvidence: d.evidence || d.supportingEvidence || [],
    icdCode: d.icdCode,
  }));
}

function calculateUrgencyScore(data: any): number {
  let score = 0;
  
  // Severity contribution (0-50)
  if (data.hpiData?.severity) {
    score += data.hpiData.severity * 5;
  }
  
  // Red flags contribution
  if (data.redFlags?.length) {
    score += data.redFlags.length * 15;
  }
  
  // Risk factors contribution
  if (data.riskFactors?.length) {
    score += data.riskFactors.length * 5;
  }
  
  return Math.min(100, score);
}

async function getQueuePosition(assessmentId: string): Promise<number> {
  const count = await prisma.patientAssessment.count({
    where: {
      status: { in: [AssessmentStatus.PENDING, AssessmentStatus.URGENT] },
      createdAt: {
        lt: (await prisma.patientAssessment.findUnique({ where: { id: assessmentId } }))?.createdAt,
      },
    },
  });
  return count + 1;
}
