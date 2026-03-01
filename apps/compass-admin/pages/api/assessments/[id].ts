// =============================================================================
// COMPASS Admin - Assessment Detail + Actions API
// apps/compass-admin/pages/api/assessments/[id].ts
//
// GET   /api/assessments/:id              → Assessment detail
// PATCH /api/assessments/:id { action }   → Claim or mark reviewed
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid assessment ID' });
  }

  // ── GET: Detail ─────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const assessment = await prisma.patientAssessment.findUnique({
        where: { id },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, mrn: true },
          },
        },
      });

      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      return res.status(200).json({
        id: assessment.id,
        sessionId: assessment.sessionId,
        patientName: assessment.patient ? `${assessment.patient.firstName} ${assessment.patient.lastName}` : 'Unknown',
        patientDOB: assessment.patient?.dateOfBirth?.toISOString(),
        patientGender: assessment.patient?.gender,
        patientMRN: assessment.patient?.mrn,
        chiefComplaint: assessment.chiefComplaint,
        hpiNarrative: assessment.hpiNarrative,
        triageLevel: assessment.triageLevel || 'ROUTINE',
        redFlags: assessment.redFlagsDetected ? (() => { try { return JSON.parse(assessment.redFlagsDetected!); } catch { return []; } })() : [],
        medications: assessment.medications,
        allergies: assessment.allergies,
        medicalHistory: assessment.medicalHistory,
        reviewOfSystems: assessment.reviewOfSystems,
        symptoms: assessment.symptoms,
        conversation: assessment.conversation,
        status: assessment.status,
        completedAt: assessment.completedAt?.toISOString(),
        assignedProviderId: assessment.assignedProviderId,
        assignedProviderName: null,
      });
    } catch (error) {
      console.error('[COMPASS ADMIN] Assessment detail error:', error);
      return res.status(500).json({ error: 'Failed to load assessment' });
    }
  }

  // ── PATCH: Actions (claim, review) ──────────────────────
  if (req.method === 'PATCH') {
    try {
      const { action } = req.body;

      if (action === 'claim') {
        // In production, use the authenticated user's ID
        // For now, mark as claimed with a placeholder
        await prisma.patientAssessment.update({
          where: { id },
          data: {
            assignedProviderId: 'current-provider', // Would be from session
            status: 'IN_REVIEW',
          },
        });
        return res.status(200).json({ success: true, action: 'claimed' });
      }

      if (action === 'review') {
        await prisma.patientAssessment.update({
          where: { id },
          data: { status: 'REVIEWED' },
        });
        return res.status(200).json({ success: true, action: 'reviewed' });
      }

      return res.status(400).json({ error: 'Invalid action. Use "claim" or "review".' });
    } catch (error) {
      console.error('[COMPASS ADMIN] Assessment action error:', error);
      return res.status(500).json({ error: 'Action failed' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
