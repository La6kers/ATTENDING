// API Route: /api/assessments/[id]
// Handles GET (single), PUT (update), and DELETE operations for a specific assessment

import type { NextApiRequest, NextApiResponse } from 'next';
import { PatientAssessment } from '@/store/assessmentQueueStore';

// Shared in-memory storage (in production, use database)
// This is imported from the index route in practice
let assessmentsDB: PatientAssessment[] = [];

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
      case 'PUT':
        return handlePut(id, req, res);
      case 'DELETE':
        return handleDelete(id, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/assessments/[id] - Get single assessment
async function handleGet(id: string, res: NextApiResponse) {
  const assessment = assessmentsDB.find(a => a.id === id);

  if (!assessment) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  return res.status(200).json({ assessment });
}

// PUT /api/assessments/[id] - Update assessment
async function handlePut(id: string, req: NextApiRequest, res: NextApiResponse) {
  const index = assessmentsDB.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  const updates = req.body;
  const currentAssessment = assessmentsDB[index];

  // Handle status transitions
  if (updates.status) {
    if (updates.status === 'in_review' && !currentAssessment.reviewedAt) {
      updates.reviewedAt = new Date().toISOString();
    }
    if (updates.status === 'completed' && !currentAssessment.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
  }

  // Merge updates
  const updatedAssessment: PatientAssessment = {
    ...currentAssessment,
    ...updates,
    id: currentAssessment.id, // Prevent ID modification
    submittedAt: currentAssessment.submittedAt, // Prevent submission time modification
  };

  assessmentsDB[index] = updatedAssessment;

  return res.status(200).json({
    success: true,
    assessment: updatedAssessment,
  });
}

// DELETE /api/assessments/[id] - Delete assessment
async function handleDelete(id: string, res: NextApiResponse) {
  const index = assessmentsDB.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Assessment not found' });
  }

  // Remove from database
  const deletedAssessment = assessmentsDB.splice(index, 1)[0];

  return res.status(200).json({
    success: true,
    deleted: deletedAssessment.id,
  });
}
