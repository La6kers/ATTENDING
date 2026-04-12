// =============================================================================
// COMPASS Admin - Assessments List API
// apps/compass-admin/pages/api/assessments/index.ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string, 10) || 100, 1), 500);

    const assessments = await prisma.patientAssessment.findMany({
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true, gender: true, mrn: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: pageSize,
    });

    const flattened = assessments.map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Unknown',
      patientDOB: a.patient?.dateOfBirth?.toISOString(),
      patientGender: a.patient?.gender,
      patientMRN: a.patient?.mrn,
      chiefComplaint: a.chiefComplaint,
      hpiNarrative: a.hpiNarrative,
      triageLevel: a.triageLevel || 'ROUTINE',
      redFlags: a.redFlagsDetected ? (() => { try { return JSON.parse(a.redFlagsDetected!); } catch { return []; } })() : [],
      medications: a.medications,
      allergies: a.allergies,
      medicalHistory: a.medicalHistory,
      reviewOfSystems: a.reviewOfSystems,
      symptoms: a.symptoms,
      status: a.status,
      completedAt: a.completedAt?.toISOString(),
      assignedProviderId: a.assignedProviderId,
      assignedProviderName: null,
    }));

    return res.status(200).json({ assessments: flattened, total: flattened.length });
  } catch (error) {
    console.error('[COMPASS ADMIN] Assessments error:', error);
    return res.status(500).json({ error: 'Failed to load assessments' });
  }
}
