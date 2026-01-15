// =============================================================================
// ATTENDING AI - Patient Health Profile API
// apps/patient-portal/pages/api/patient/health-profile.ts
//
// Handles patient health profile (conditions, medications, allergies)
// Separate from main profile for focused medical data access
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// Types
interface HealthProfile {
  conditions: string[];
  medications: string[];
  allergies: string[];
  surgicalHistory: string[];
  familyHistory: string[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    exercise?: string;
    diet?: string;
  };
  immunizations: string[];
  lastUpdated: string;
}

// Mock health profile (replace with database in production)
let mockHealthProfile: HealthProfile = {
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID', 'Vitamin D 2000IU daily'],
  allergies: ['Penicillin', 'Sulfa'],
  surgicalHistory: ['Appendectomy (2010)', 'Knee arthroscopy (2018)'],
  familyHistory: ['Father - Heart disease', 'Mother - Type 2 Diabetes', 'Brother - Hypertension'],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Occasional (social)',
    drugs: 'None',
    exercise: '3x per week, walking',
    diet: 'Low sodium, reduced carbohydrates',
  },
  immunizations: ['COVID-19 (2024)', 'Flu (2024)', 'Tdap (2020)', 'Pneumococcal (2022)'],
  lastUpdated: new Date(Date.now() - 86400000 * 7).toISOString(),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication check

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'PUT':
      return handleUpdate(req, res);
    case 'PATCH':
      return handlePatch(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/health-profile - Get health profile
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ profile: mockHealthProfile });
}

// PUT /api/patient/health-profile - Full health profile update
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const updates = req.body;

  mockHealthProfile = {
    ...mockHealthProfile,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    profile: mockHealthProfile,
    message: 'Health profile updated successfully',
  });
}

// PATCH /api/patient/health-profile - Partial update
async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  const updates = req.body;

  // Handle array fields - can add or remove items
  if (updates.addCondition) {
    mockHealthProfile.conditions.push(updates.addCondition);
    delete updates.addCondition;
  }

  if (updates.removeCondition) {
    mockHealthProfile.conditions = mockHealthProfile.conditions.filter((c) => c !== updates.removeCondition);
    delete updates.removeCondition;
  }

  if (updates.addMedication) {
    mockHealthProfile.medications.push(updates.addMedication);
    delete updates.addMedication;
  }

  if (updates.removeMedication) {
    mockHealthProfile.medications = mockHealthProfile.medications.filter((m) => m !== updates.removeMedication);
    delete updates.removeMedication;
  }

  if (updates.addAllergy) {
    mockHealthProfile.allergies.push(updates.addAllergy);
    delete updates.addAllergy;
  }

  if (updates.removeAllergy) {
    mockHealthProfile.allergies = mockHealthProfile.allergies.filter((a) => a !== updates.removeAllergy);
    delete updates.removeAllergy;
  }

  // Handle socialHistory nested updates
  if (updates.socialHistory) {
    mockHealthProfile.socialHistory = { ...mockHealthProfile.socialHistory, ...updates.socialHistory };
    delete updates.socialHistory;
  }

  // Apply remaining updates
  mockHealthProfile = {
    ...mockHealthProfile,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    profile: mockHealthProfile,
    message: 'Health profile updated successfully',
  });
}
