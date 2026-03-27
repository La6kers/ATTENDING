// ============================================================
// Claim Assessment API
// apps/provider-portal/pages/api/chat/conversations/[id]/claim.ts
//
// Assigns a provider to a patient assessment so they can
// review it and begin the clinical encounter.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: assessmentId } = req.query;

  if (!assessmentId || typeof assessmentId !== 'string') {
    return res.status(400).json({ error: 'Assessment ID is required' });
  }

  try {
    const assessment = await prisma.patientAssessment.update({
      where: { id: assessmentId },
      data: {
        assignedProviderId: (session.user as any).id,
        status: 'CLAIMED',
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        assignedProviderId: true,
        status: true,
        chiefComplaint: true,
        triageLevel: true,
        lastActivityAt: true,
        patient: {
          select: { firstName: true, lastName: true, mrn: true },
        },
      },
    });

    console.log(`[Audit] Assessment ${assessmentId} claimed by ${(session.user as any).email}`);

    return res.status(200).json({
      success: true,
      assessment,
    });
  } catch (error) {
    console.error('Claim assessment error:', error);
    return res.status(500).json({ error: 'Failed to claim assessment' });
  }
}
