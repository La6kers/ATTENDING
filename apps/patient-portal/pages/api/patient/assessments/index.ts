// =============================================================================
// ATTENDING AI - Patient Assessments API
// apps/patient-portal/pages/api/patient/assessments/index.ts
//
// Handles patient assessment listing and creation
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

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

// Mock data store (replace with database in production)
const mockAssessments: Assessment[] = [
  {
    id: 'assess-001',
    chiefComplaint: 'Persistent headache for 3 days',
    status: 'completed',
    urgencyLevel: 'moderate',
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    providerName: 'Smith',
    diagnosis: ['Tension headache', 'Dehydration'],
    followUp: '2 weeks',
  },
  {
    id: 'assess-002',
    chiefComplaint: 'Follow-up for blood pressure',
    status: 'pending',
    urgencyLevel: 'standard',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'assess-003',
    chiefComplaint: 'Annual wellness check',
    status: 'completed',
    urgencyLevel: 'standard',
    submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
    providerName: 'Johnson',
    diagnosis: ['Routine examination - no issues'],
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication check
  // const session = await getSession({ req });
  // if (!session) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/assessments - List assessments
async function handleGet(req: NextApiRequest, res: NextApiResponse<AssessmentsResponse>) {
  const { page = '1', pageSize = '20', status } = req.query;

  let filteredAssessments = [...mockAssessments];

  // Filter by status if provided
  if (status && typeof status === 'string') {
    const statuses = status.split(',');
    filteredAssessments = filteredAssessments.filter((a) => statuses.includes(a.status));
  }

  // Sort by submission date (newest first)
  filteredAssessments.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Paginate
  const pageNum = parseInt(page as string, 10);
  const size = parseInt(pageSize as string, 10);
  const startIndex = (pageNum - 1) * size;
  const paginatedAssessments = filteredAssessments.slice(startIndex, startIndex + size);

  return res.status(200).json({
    assessments: paginatedAssessments,
    total: filteredAssessments.length,
    page: pageNum,
    pageSize: size,
  });
}

// POST /api/patient/assessments - Create new assessment
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { chiefComplaint, urgencyLevel, clinicalData: _clinicalData, redFlags: _redFlags } = req.body;

  if (!chiefComplaint) {
    return res.status(400).json({ error: 'Chief complaint is required' });
  }

  // Create new assessment
  const newAssessment: Assessment = {
    id: `assess-${Date.now()}`,
    chiefComplaint,
    status: 'pending',
    urgencyLevel: urgencyLevel || 'standard',
    submittedAt: new Date().toISOString(),
  };

  // In production, save to database
  mockAssessments.unshift(newAssessment);

  // TODO: Notify providers via WebSocket if urgent
  // if (urgencyLevel === 'high' || urgencyLevel === 'emergency') {
  //   notifyProviders(newAssessment);
  // }

  return res.status(201).json({
    success: true,
    assessment: newAssessment,
    message: 'Assessment submitted successfully',
  });
}
