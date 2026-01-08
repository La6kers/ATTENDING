// ============================================================
// API Route: /api/assessments/[id]
// apps/provider-portal/pages/api/assessments/[id].ts
//
// Handles GET (single), PATCH (update), DELETE operations
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { AssessmentStatus } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Assessment ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(id, res);
      case 'PATCH':
        return handlePatch(id, req, res);
      case 'DELETE':
        return handleDelete(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
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

// GET /api/assessments/[id] - Get single assessment with full details
async function handleGet(id: string, res: NextApiResponse) {
  const assessment = await prisma.patientAssessment.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          allergies: true,
          medications: true,
          conditions: true,
          vitals: {
            orderBy: { recordedAt: 'desc' },
            take: 5,
          },
        },
      },
      encounter: {
        include: {
          labOrders: {
            include: { results: true },
            orderBy: { orderedAt: 'desc' },
            take: 10,
          },
          imagingOrders: {
            orderBy: { orderedAt: 'desc' },
            take: 5,
          },
          medicationOrders: {
            orderBy: { orderedAt: 'desc' },
            take: 10,
          },
        },
      },
      assignedProvider: {
        select: {
          id: true,
          name: true,
          specialty: true,
          email: true,
        },
      },
    },
  });

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Transform to frontend format
  const transformed = {
    id: assessment.id,
    sessionId: assessment.sessionId,
    patientId: assessment.patientId,
    patientName: `${assessment.patient.firstName} ${assessment.patient.lastName}`,
    patientAge: calculateAge(assessment.patient.dateOfBirth),
    patientGender: assessment.patient.gender,
    patientDOB: assessment.patient.dateOfBirth.toISOString().split('T')[0],
    patientContact: {
      phone: assessment.patient.phone,
      email: assessment.patient.email,
      address: assessment.patient.address,
      city: assessment.patient.city,
      state: assessment.patient.state,
      zipCode: assessment.patient.zipCode,
    },
    emergencyContact: {
      name: assessment.patient.emergencyContact,
      phone: assessment.patient.emergencyPhone,
    },
    chiefComplaint: assessment.chiefComplaint,
    urgencyLevel: assessment.urgencyLevel.toLowerCase(),
    urgencyScore: assessment.urgencyScore,
    status: assessment.status.toLowerCase().replace('_', '-'),
    redFlags: assessment.redFlags,
    riskFactors: assessment.riskFactors,
    differentialDiagnosis: transformDifferentialDx(assessment.differentialDx),
    hpiData: {
      onset: assessment.hpiOnset,
      location: assessment.hpiLocation,
      duration: assessment.hpiDuration,
      character: assessment.hpiCharacter,
      severity: assessment.hpiSeverity,
      timing: assessment.hpiTiming,
      aggravatingFactors: assessment.hpiAggravating,
      relievingFactors: assessment.hpiRelieving,
      associatedSymptoms: assessment.hpiAssociated,
    },
    reviewOfSystems: assessment.reviewOfSystems,
    medicalHistory: {
      conditions: assessment.patient.conditions.map(c => ({
        name: c.name,
        icdCode: c.icdCode,
        status: c.status,
      })),
      medications: assessment.patient.medications.map(m => ({
        name: m.medicationName,
        dose: m.dose,
        frequency: m.frequency,
        prescriber: m.prescriber,
      })),
      allergies: assessment.patient.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
      })),
      surgeries: assessment.surgicalHistory,
    },
    socialHistory: assessment.socialHistory,
    familyHistory: assessment.familyHistory,
    recentVitals: assessment.patient.vitals[0] ? {
      systolic: assessment.patient.vitals[0].systolic,
      diastolic: assessment.patient.vitals[0].diastolic,
      heartRate: assessment.patient.vitals[0].heartRate,
      temperature: assessment.patient.vitals[0].temperature,
      respiratoryRate: assessment.patient.vitals[0].respiratoryRate,
      oxygenSaturation: assessment.patient.vitals[0].oxygenSaturation,
      weight: assessment.patient.vitals[0].weight,
      painLevel: assessment.patient.vitals[0].painLevel,
      recordedAt: assessment.patient.vitals[0].recordedAt,
    } : null,
    aiRecommendations: assessment.aiRecommendations,
    clinicalPearls: assessment.clinicalPearls,
    providerNotes: assessment.providerNotes,
    confirmedDiagnoses: assessment.confirmedDiagnoses,
    icdCodes: assessment.icdCodes,
    treatmentPlan: assessment.treatmentPlan,
    followUpInstructions: assessment.followUpInstructions,
    ordersPlaced: assessment.ordersPlaced,
    assignedProvider: assessment.assignedProvider,
    encounter: assessment.encounter ? {
      id: assessment.encounter.id,
      status: assessment.encounter.status,
      visitType: assessment.encounter.visitType,
      labOrders: assessment.encounter.labOrders,
      imagingOrders: assessment.encounter.imagingOrders,
      medicationOrders: assessment.encounter.medicationOrders,
    } : null,
    timestamps: {
      created: assessment.createdAt.toISOString(),
      submitted: assessment.submittedAt?.toISOString(),
      reviewed: assessment.reviewedAt?.toISOString(),
      completed: assessment.completedAt?.toISOString(),
      updated: assessment.updatedAt.toISOString(),
    },
    compassVersion: assessment.compassVersion,
    aiModelUsed: assessment.aiModelUsed,
  };

  return res.status(200).json(transformed);
}

// PATCH /api/assessments/[id] - Update assessment
async function handlePatch(id: string, req: NextApiRequest, res: NextApiResponse) {
  const data = req.body;

  // Verify assessment exists
  const existing = await prisma.patientAssessment.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Build update data
  const updateData: any = {};

  // Status update
  if (data.status) {
    const statusMap: Record<string, AssessmentStatus> = {
      'pending': AssessmentStatus.PENDING,
      'urgent': AssessmentStatus.URGENT,
      'in-review': AssessmentStatus.IN_REVIEW,
      'in_review': AssessmentStatus.IN_REVIEW,
      'completed': AssessmentStatus.COMPLETED,
      'follow-up': AssessmentStatus.FOLLOW_UP,
      'follow_up': AssessmentStatus.FOLLOW_UP,
      'cancelled': AssessmentStatus.CANCELLED,
    };
    updateData.status = statusMap[data.status] || data.status;

    // Set timestamps based on status
    if (data.status === 'in-review' || data.status === 'in_review') {
      updateData.reviewedAt = new Date();
    } else if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }
  }

  // Provider notes
  if (data.providerNotes !== undefined) {
    updateData.providerNotes = data.providerNotes;
  }

  // Confirmed diagnoses
  if (data.confirmedDiagnoses) {
    updateData.confirmedDiagnoses = data.confirmedDiagnoses;
  }

  // ICD codes
  if (data.icdCodes) {
    updateData.icdCodes = data.icdCodes;
  }

  // Treatment plan
  if (data.treatmentPlan !== undefined) {
    updateData.treatmentPlan = data.treatmentPlan;
  }

  // Follow-up instructions
  if (data.followUpInstructions !== undefined) {
    updateData.followUpInstructions = data.followUpInstructions;
  }

  // Orders placed
  if (data.ordersPlaced) {
    updateData.ordersPlaced = data.ordersPlaced;
  }

  // Assigned provider
  if (data.assignedProviderId) {
    updateData.assignedProviderId = data.assignedProviderId;
  }

  // Perform update
  const updated = await prisma.patientAssessment.update({
    where: { id },
    data: updateData,
    include: {
      patient: true,
      assignedProvider: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'ASSESSMENT_UPDATED',
      entityType: 'PatientAssessment',
      entityId: id,
      changes: {
        before: existing,
        after: updateData,
      },
    },
  });

  return res.status(200).json({
    success: true,
    assessment: {
      id: updated.id,
      status: updated.status.toLowerCase(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

// DELETE /api/assessments/[id] - Cancel/delete assessment
async function handleDelete(id: string, res: NextApiResponse) {
  const existing = await prisma.patientAssessment.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Soft delete by setting status to CANCELLED
  await prisma.patientAssessment.update({
    where: { id },
    data: {
      status: AssessmentStatus.CANCELLED,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'ASSESSMENT_CANCELLED',
      entityType: 'PatientAssessment',
      entityId: id,
    },
  });

  return res.status(200).json({
    success: true,
    message: 'Assessment cancelled',
  });
}

// Helper functions
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

function transformDifferentialDx(dx: any): Array<{name: string; probability: number; supportingEvidence: string[]; icdCode?: string}> {
  if (!dx) return [];
  const dxArray = dx.primary || dx;
  if (!Array.isArray(dxArray)) return [];
  
  return dxArray.map((d: any) => ({
    name: d.name,
    probability: d.probability,
    supportingEvidence: d.evidence || d.supportingEvidence || [],
    icdCode: d.icdCode,
  }));
}
