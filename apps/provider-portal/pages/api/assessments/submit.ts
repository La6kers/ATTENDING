// =============================================================================
// Assessment Submit API (Provider Portal side)
// apps/provider-portal/pages/api/assessments/submit.ts
//
// Alternative submit endpoint for assessments arriving via provider portal.
// The canonical submit lives in patient-portal/api/assessments/submit.ts
// which writes to the shared database. This endpoint exists for cases where
// a provider-side process needs to create an assessment record directly.
//
// Phase 3: Wired to actual database.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Try .NET backend first (CQRS + domain events → SignalR)
  const proxied = await proxyToBackend(req, res, '/api/v1/assessments/submit');
  if (proxied) return;

  // Fallback: direct Prisma

  try {
    const {
      sessionId,
      patientId,
      chiefComplaint,
      hpiNarrative,
      symptoms,
      reviewOfSystems,
      medications,
      allergies,
      medicalHistory,
      vitalSigns,
      redFlags,
      triageLevel,
      conversation,
    } = req.body;

    if (!sessionId || !patientId || !chiefComplaint) {
      return res.status(400).json({
        error: 'sessionId, patientId, and chiefComplaint are required',
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const hasRedFlags = Array.isArray(redFlags) && redFlags.length > 0;
    const hasCritical = hasRedFlags && redFlags.some((rf: string | { severity?: string }) =>
      typeof rf === 'object' && rf !== null && rf.severity === 'critical'
    );

    const assessment = await prisma.patientAssessment.create({
      data: {
        sessionId,
        patientId,
        status: 'COMPLETED',
        phase: 'COMPLETE',
        chiefComplaint,
        hpiNarrative: hpiNarrative || null,
        symptoms: symptoms ? JSON.stringify(symptoms) : null,
        reviewOfSystems: reviewOfSystems ? JSON.stringify(reviewOfSystems) : null,
        medications: medications ? JSON.stringify(medications) : null,
        allergies: allergies ? JSON.stringify(allergies) : null,
        medicalHistory: medicalHistory ? JSON.stringify(medicalHistory) : null,
        vitalSigns: vitalSigns ? JSON.stringify(vitalSigns) : null,
        triageLevel: triageLevel || (hasCritical ? 'EMERGENCY' : hasRedFlags ? 'URGENT' : 'ROUTINE'),
        redFlagsDetected: redFlags ? JSON.stringify(redFlags) : null,
        conversation: conversation ? JSON.stringify(conversation) : null,
        completedAt: new Date(),
      },
    });

    // Emergency event if needed
    if (hasRedFlags) {
      await prisma.emergencyEvent.create({
        data: {
          patientId,
          organizationId: patient.organizationId,
          assessmentId: assessment.id,
          eventType: 'RED_FLAG',
          severity: hasCritical ? 'CRITICAL' : 'HIGH',
          description: `Assessment red flags: ${redFlags.map((rf: string | { flag?: string }) =>
            typeof rf === 'object' && rf !== null ? rf.flag ?? String(rf) : rf
          ).join(', ')}`,
          triggeredBy: 'SYSTEM',
        },
      });
    }

    // Audit
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_SUBMITTED',
        entityType: 'PatientAssessment',
        entityId: assessment.id,
        changes: JSON.stringify({ triageLevel: assessment.triageLevel, redFlagCount: redFlags?.length || 0 }),
        success: true,
      },
    });

    console.log(`[ASSESSMENT] ID: ${assessment.id}, Triage: ${assessment.triageLevel}`);

    return res.status(201).json({
      success: true,
      assessmentId: assessment.id,
      urgentAlert: hasRedFlags,
      message: hasRedFlags
        ? 'Assessment flagged as urgent.'
        : 'Assessment submitted successfully.',
    });
  } catch (error) {
    console.error('[ASSESSMENT SUBMIT ERROR]', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
}

export default requireAuth(handler);
