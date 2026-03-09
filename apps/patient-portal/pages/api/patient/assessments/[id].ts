// =============================================================================
// ATTENDING AI - Single Assessment API
// apps/patient-portal/pages/api/patient/assessments/[id].ts
//
// Handles individual assessment retrieval and updates
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

// Types
interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
}

interface AssessmentDetail {
  id: string;
  chiefComplaint: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  submittedAt: string;
  reviewedAt?: string;
  patientName: string;
  hpi: HPIData;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  redFlags: string[];
  providerName?: string;
  diagnosis?: string[];
  icdCodes?: string[];
  treatmentPlan?: string;
  followUpInstructions?: string;
  providerNotes?: string;
  ordersPlaced?: string[];
}

// Mock data store (replace with database in production)
const mockAssessmentDetails: Record<string, AssessmentDetail> = {
  'assess-001': {
    id: 'assess-001',
    chiefComplaint: 'Persistent headache for 3 days',
    status: 'completed',
    urgencyLevel: 'moderate',
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    patientName: 'John Doe',
    hpi: {
      onset: 'Started 3 days ago, gradual',
      location: 'Bilateral frontal area',
      duration: 'Constant, varies in intensity',
      character: 'Pressure-like, dull',
      severity: 6,
      aggravating: ['Stress', 'Screen time', 'Lack of sleep'],
      relieving: ['Rest', 'Dark room', 'Ibuprofen'],
      associated: ['Mild nausea', 'Light sensitivity'],
    },
    medications: ['Ibuprofen 400mg PRN', 'Vitamin D 2000IU daily'],
    allergies: ['NKDA'],
    medicalHistory: ['Migraines (diagnosed 2020)', 'Anxiety'],
    redFlags: [],
    providerName: 'Smith',
    diagnosis: ['Tension-type headache', 'Possible migraine variant'],
    icdCodes: ['G44.2', 'G43.909'],
    treatmentPlan:
      'Continue OTC pain relief. Try stress management techniques. Consider preventive therapy if frequency increases.',
    followUpInstructions:
      'Return in 2 weeks if symptoms persist. Seek immediate care if experiencing sudden severe headache, vision changes, or neurological symptoms.',
    providerNotes:
      'Patient presents with typical tension-type headache pattern. No red flags identified. Discussed lifestyle modifications and trigger avoidance.',
    ordersPlaced: ['Headache diary for 2 weeks'],
  },
  'assess-002': {
    id: 'assess-002',
    chiefComplaint: 'Follow-up for blood pressure',
    status: 'pending',
    urgencyLevel: 'standard',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    patientName: 'John Doe',
    hpi: {
      onset: 'Routine follow-up',
      duration: 'Ongoing management',
      character: 'No acute symptoms',
    },
    medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
    allergies: ['Penicillin', 'Sulfa'],
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    redFlags: [],
  },
  'assess-003': {
    id: 'assess-003',
    chiefComplaint: 'Annual wellness check',
    status: 'completed',
    urgencyLevel: 'standard',
    submittedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
    patientName: 'John Doe',
    hpi: {
      onset: 'Routine wellness visit',
      character: 'No complaints',
    },
    medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
    allergies: ['Penicillin', 'Sulfa'],
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    redFlags: [],
    providerName: 'Johnson',
    diagnosis: ['Routine examination - no issues'],
    icdCodes: ['Z00.00'],
    treatmentPlan: 'Continue current medications. Annual labs ordered.',
    followUpInstructions: 'Return in 1 year for next wellness check, or sooner if new concerns arise.',
    providerNotes: 'Patient doing well on current regimen. BP and glucose well controlled.',
    ordersPlaced: ['CBC', 'CMP', 'HbA1c', 'Lipid panel'],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const patientId = (session.user as { id?: string }).id;
  if (!patientId) {
    return res.status(401).json({ error: 'Session missing patient ID', code: 'AUTH_INVALID' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Assessment ID is required' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(id, patientId, res);
    case 'PUT':
      return handlePut(id, patientId, req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/assessments/[id] - Get assessment details
async function handleGet(id: string, patientId: string, res: NextApiResponse) {
  const assessment = mockAssessmentDetails[id];

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // TODO: When migrating to Prisma, query with { id, patientId } to enforce ownership.
  // Mock data is hardcoded to "John Doe" — in production, verify assessment.patientId === patientId.

  return res.status(200).json({ assessment });
}

// PUT /api/patient/assessments/[id] - Update assessment (limited for patients)
async function handlePut(id: string, patientId: string, req: NextApiRequest, res: NextApiResponse) {
  const assessment = mockAssessmentDetails[id];

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Patients can only update in_progress assessments
  if (assessment.status !== 'in_progress') {
    return res.status(403).json({
      error: 'Cannot modify assessment after submission',
    });
  }

  const allowedFields = ['chiefComplaint', 'hpi', 'medications', 'allergies', 'medicalHistory'];
  const updates: Partial<AssessmentDetail> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (updates as any)[field] = req.body[field];
    }
  }

  // Apply updates
  Object.assign(assessment, updates);

  return res.status(200).json({
    success: true,
    assessment,
    message: 'Assessment updated successfully',
  });
}
