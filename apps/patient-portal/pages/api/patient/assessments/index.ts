// =============================================================================
// ATTENDING AI - Patient Assessments API
// apps/patient-portal/pages/api/patient/assessments/index.ts
//
// Handles patient assessment listing and creation.
// Requires authenticated PATIENT session.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';

// Types
interface Assessment {
  id: string;
  chiefComplaint: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  submittedAt: string;
  reviewedAt?: string;
  providerName?: string;
  diagnosis?: string[];
  followUp?: string;
}

interface AssessmentsResponse {
  assessments: Assessment[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const patientId = (session.user as { id?: string }).id;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, patientId);
    case 'POST':
      return handlePost(req, res, patientId);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/assessments - List assessments for the authenticated patient
async function handleGet(req: NextApiRequest, res: NextApiResponse<AssessmentsResponse>, patientId?: string) {
  const { page = '1', pageSize = '20', status } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 20));

  try {
    const where: Record<string, unknown> = { patientId };

    if (status && typeof status === 'string') {
      const statuses = status.split(',');
      where.status = { in: statuses };
    }

    const [assessments, total] = await Promise.all([
      prisma.patientAssessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size,
      }),
      prisma.patientAssessment.count({ where }),
    ]);

    return res.status(200).json({
      assessments: assessments.map((a) => ({
        id: a.id,
        chiefComplaint: a.chiefComplaint || '',
        status: (a.status?.toLowerCase() as Assessment['status']) || 'pending',
        urgencyLevel: (a.urgencyLevel?.toLowerCase() as Assessment['urgencyLevel']) || 'standard',
        submittedAt: a.createdAt.toISOString(),
        reviewedAt: a.reviewedAt?.toISOString(),
        providerName: a.reviewedBy || undefined,
        diagnosis: a.diagnosis ? JSON.parse(a.diagnosis as string) : undefined,
        followUp: a.followUp || undefined,
      })),
      total,
      page: pageNum,
      pageSize: size,
    });
  } catch (error) {
    console.error('[Assessments] Error fetching assessments:', error);
    return res.status(500).json({ assessments: [], total: 0, page: 1, pageSize: 20 });
  }
}

// POST /api/patient/assessments - Create new assessment
async function handlePost(req: NextApiRequest, res: NextApiResponse, patientId?: string) {
  const { chiefComplaint, urgencyLevel } = req.body;

  if (!chiefComplaint) {
    return res.status(400).json({ error: 'Chief complaint is required' });
  }

  try {
    const assessment = await prisma.patientAssessment.create({
      data: {
        patientId: patientId || '',
        sessionId: `session-${Date.now()}`,
        chiefComplaint,
        urgencyLevel: urgencyLevel || 'STANDARD',
        status: 'IN_PROGRESS',
      },
    });

    return res.status(201).json({
      success: true,
      assessment: {
        id: assessment.id,
        chiefComplaint: assessment.chiefComplaint,
        status: 'pending',
        urgencyLevel: urgencyLevel || 'standard',
        submittedAt: assessment.createdAt.toISOString(),
      },
      message: 'Assessment submitted successfully',
    });
  } catch (error) {
    console.error('[Assessments] Error creating assessment:', error);
    return res.status(500).json({ error: 'Failed to create assessment' });
  }
}
