// =============================================================================
// ATTENDING AI - Patient Profile API
// apps/patient-portal/pages/api/patient/profile.ts
//
// Handles patient profile retrieval and updates.
// Requires authenticated PATIENT session.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';
import { verifyCsrfToken } from '@attending/shared/lib/security';

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

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

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

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, patientId);
    case 'PUT':
    case 'PATCH': {
      const csrfSecret = req.cookies['__Host-csrf-token'];
      const csrfToken = req.headers['x-csrf-token'] as string;
      if (!csrfSecret || !csrfToken || !verifyCsrfToken(csrfSecret, csrfToken)) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
      }
      if (req.method === 'PUT') return handleUpdate(req, res, patientId);
      return handlePatch(req, res, patientId);
    }
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/profile - Get patient profile
async function handleGet(_req: NextApiRequest, res: NextApiResponse, patientId: string) {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      include: {
        allergies: { where: { deletedAt: null } },
        conditions: { where: { deletedAt: null } },
        medications: { where: { deletedAt: null } },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const profile: PatientProfile = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email || '',
      phone: patient.phone || '',
      dateOfBirth: patient.dateOfBirth?.toISOString() || '',
      gender: patient.gender || '',
      address: {
        street: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zip: patient.zipCode || '',
      },
      conditions: patient.conditions.map((c: { name: string }) => c.name),
      medications: patient.medications.map((m: { name: string }) => m.name),
      allergies: patient.allergies.map((a: { allergen: string }) => a.allergen),
      emergencyContact: safeJsonParse(patient.emergencyContact as string, { name: '', relationship: '', phone: '' }),
      preferences: {
        notifications: true,
        emailUpdates: true,
        smsReminders: false,
      },
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };

    return res.status(200).json({ profile });
  } catch (error) {
    console.error('[Patient Profile] Error fetching profile:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}

// PUT /api/patient/profile - Full profile update
async function handleUpdate(req: NextApiRequest, res: NextApiResponse, patientId: string) {
  const updates = req.body;

  if (!updates.firstName || !updates.lastName || !updates.email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }

  if (typeof updates.firstName !== 'string' || typeof updates.lastName !== 'string' || typeof updates.email !== 'string') {
    return res.status(400).json({ error: 'firstName, lastName, and email must be strings' });
  }

  try {
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        phone: updates.phone,
        gender: updates.gender,
        address: updates.address?.street,
        city: updates.address?.city,
        state: updates.address?.state,
        zipCode: updates.address?.zip,
        emergencyContact: updates.emergencyContact
          ? JSON.stringify(updates.emergencyContact)
          : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[Patient Profile] Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

// PATCH /api/patient/profile - Partial profile update
async function handlePatch(req: NextApiRequest, res: NextApiResponse, patientId: string) {
  const updates = req.body;

  try {
    const data: Record<string, unknown> = {};

    if (updates.firstName) data.firstName = updates.firstName;
    if (updates.lastName) data.lastName = updates.lastName;
    if (updates.email) data.email = updates.email;
    if (updates.phone) data.phone = updates.phone;
    if (updates.gender) data.gender = updates.gender;
    if (updates.address) {
      if (updates.address.street) data.address = updates.address.street;
      if (updates.address.city) data.city = updates.address.city;
      if (updates.address.state) data.state = updates.address.state;
      if (updates.address.zip) data.zipCode = updates.address.zip;
    }
    if (updates.emergencyContact) {
      data.emergencyContact = JSON.stringify(updates.emergencyContact);
    }

    await prisma.patient.update({
      where: { id: patientId },
      data,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[Patient Profile] Error patching profile:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}
