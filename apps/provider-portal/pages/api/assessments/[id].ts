// =============================================================================
// Assessment Detail API: /api/assessments/[id]
// apps/provider-portal/pages/api/assessments/[id].ts
//
// GET — single assessment with patient context
// PATCH — assign provider, update status, add notes
//
// Phase 3: Uses actual PatientAssessment schema fields only.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

// =============================================================================
// Helpers
// =============================================================================

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Assessment ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET': return handleGet(id, res);
      case 'PATCH': return handlePatch(id, req, res);
      default:
        res.setHeader('Allow', ['GET', 'PATCH']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('[Assessment Detail API Error]', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}

// =============================================================================
// GET — full assessment detail
// =============================================================================

async function handleGet(id: string, res: NextApiResponse) {
  const assessment = await prisma.patientAssessment.findUnique({
    where: { id },
    include: {
      patient: {
        include: {
          allergies: { where: { deletedAt: null } },
          medications: { where: { deletedAt: null } },
          conditions: { where: { deletedAt: null } },
          vitalSigns: { orderBy: { recordedAt: 'desc' }, take: 5 },
        },
      },
      assignedProvider: {
        select: { id: true, name: true, specialty: true, email: true },
      },
      emergencyEvents: true,
    },
  });

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const p = assessment.patient;

  return res.status(200).json({
    id: assessment.id,
    sessionId: assessment.sessionId,
    status: assessment.status,
    phase: assessment.phase,

    // Patient demographics
    patient: {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.mrn,
      dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
      age: calculateAge(p.dateOfBirth),
      gender: p.gender,
      phone: p.phone,
      email: p.email,
    },

    // Assessment content (all stored as JSON strings in NVarChar(Max))
    chiefComplaint: assessment.chiefComplaint,
    hpiNarrative: assessment.hpiNarrative,
    symptoms: safeJsonParse(assessment.symptoms, []),
    reviewOfSystems: safeJsonParse(assessment.reviewOfSystems, {}),
    medications: safeJsonParse(assessment.medications, []),
    allergies: safeJsonParse(assessment.allergies, []),
    medicalHistory: safeJsonParse(assessment.medicalHistory, []),
    vitalSigns: safeJsonParse(assessment.vitalSigns, null),

    // Risk / triage
    triageLevel: assessment.triageLevel,
    redFlags: safeJsonParse(assessment.redFlagsDetected, []),

    // AI analysis
    aiSummary: assessment.aiSummary,
    aiDifferential: safeJsonParse(assessment.aiDifferential, []),

    // Conversation transcript
    conversation: safeJsonParse(assessment.conversation, []),

    // Provider assignment
    assignedProvider: assessment.assignedProvider,

    // Emergency events
    emergencyEvents: assessment.emergencyEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
      acknowledgedAt: e.acknowledgedAt?.toISOString() || null,
      resolvedAt: e.resolvedAt?.toISOString() || null,
    })),

    // Patient's existing clinical data (from their medical record)
    patientRecord: {
      allergies: p.allergies.map((a) => ({
        id: a.id, allergen: a.allergen, reaction: a.reaction, severity: a.severity,
      })),
      medications: p.medications.map((m) => ({
        id: m.id, name: m.name, dose: m.dose, frequency: m.frequency, status: m.status,
      })),
      conditions: p.conditions.map((c) => ({
        id: c.id, icdCode: c.icdCode, description: c.description, status: c.status,
      })),
      recentVitals: p.vitalSigns.length > 0 ? {
        heartRate: p.vitalSigns[0].heartRate,
        bloodPressureSystolic: p.vitalSigns[0].bloodPressureSystolic,
        bloodPressureDiastolic: p.vitalSigns[0].bloodPressureDiastolic,
        temperature: p.vitalSigns[0].temperature,
        respiratoryRate: p.vitalSigns[0].respiratoryRate,
        oxygenSaturation: p.vitalSigns[0].oxygenSaturation,
        recordedAt: p.vitalSigns[0].recordedAt.toISOString(),
      } : null,
    },

    // Timestamps
    startedAt: assessment.startedAt.toISOString(),
    completedAt: assessment.completedAt?.toISOString() || null,
    lastActivityAt: assessment.lastActivityAt.toISOString(),
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  });
}

// =============================================================================
// PATCH — update assessment (assign provider, change status)
// =============================================================================

async function handlePatch(id: string, req: NextApiRequest, res: NextApiResponse) {
  const existing = await prisma.patientAssessment.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const { status, assignedProviderId } = req.body;
  const updateData: any = {};

  if (status) {
    updateData.status = status.toUpperCase();
  }

  if (assignedProviderId) {
    // Verify provider exists
    const provider = await prisma.user.findUnique({ where: { id: assignedProviderId } });
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    updateData.assignedProviderId = assignedProviderId;
  }

  const updated = await prisma.patientAssessment.update({
    where: { id },
    data: updateData,
    include: {
      assignedProvider: { select: { id: true, name: true } },
    },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      action: 'ASSESSMENT_UPDATED',
      entityType: 'PatientAssessment',
      entityId: id,
      changes: JSON.stringify({ before: { status: existing.status, assignedProviderId: existing.assignedProviderId }, after: updateData }),
      success: true,
    },
  });

  return res.status(200).json({
    success: true,
    assessment: {
      id: updated.id,
      status: updated.status,
      assignedProvider: updated.assignedProvider,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
