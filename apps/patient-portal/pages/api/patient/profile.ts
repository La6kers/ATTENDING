// =============================================================================
// ATTENDING AI - Patient Profile API
// apps/patient-portal/pages/api/patient/profile.ts
//
// Handles patient profile retrieval and updates
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// Types
interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  bloodType?: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    smsReminders: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Mock profile (replace with database in production)
let mockProfile: PatientProfile = {
  id: 'patient-001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@email.com',
  phone: '(555) 123-4567',
  dateOfBirth: '1985-03-15',
  gender: 'Male',
  address: {
    street: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
  },
  bloodType: 'O+',
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  medications: ['Lisinopril 10mg', 'Metformin 500mg'],
  allergies: ['Penicillin', 'Sulfa'],
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '(555) 987-6543',
  },
  preferences: {
    notifications: true,
    emailUpdates: true,
    smsReminders: false,
  },
  createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
  updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication check
  // const session = await getSession({ req });
  // if (!session) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

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

// GET /api/patient/profile - Get patient profile
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ profile: mockProfile });
}

// PUT /api/patient/profile - Full profile update
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const updates = req.body;

  // Validate required fields
  if (!updates.firstName || !updates.lastName || !updates.email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  // Update profile
  mockProfile = {
    ...mockProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    profile: mockProfile,
    message: 'Profile updated successfully',
  });
}

// PATCH /api/patient/profile - Partial profile update
async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  const updates = req.body;

  // Handle nested updates
  if (updates.address) {
    mockProfile.address = { ...mockProfile.address, ...updates.address };
    delete updates.address;
  }

  if (updates.emergencyContact) {
    mockProfile.emergencyContact = { ...mockProfile.emergencyContact, ...updates.emergencyContact };
    delete updates.emergencyContact;
  }

  if (updates.preferences) {
    mockProfile.preferences = { ...mockProfile.preferences, ...updates.preferences };
    delete updates.preferences;
  }

  // Apply remaining updates
  mockProfile = {
    ...mockProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    profile: mockProfile,
    message: 'Profile updated successfully',
  });
}
