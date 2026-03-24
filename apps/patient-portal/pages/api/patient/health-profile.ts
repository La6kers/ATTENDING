// =============================================================================
// ATTENDING AI - Patient Health Profile API
// apps/patient-portal/pages/api/patient/health-profile.ts
//
// Handles patient health profile (conditions, medications, allergies).
// Requires authenticated PATIENT session.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';
import { verifyCsrfToken } from '@attending/shared/lib/security';

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

// GET /api/patient/health-profile
async function handleGet(_req: NextApiRequest, res: NextApiResponse, patientId: string) {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      include: {
        conditions: { where: { deletedAt: null }, select: { id: true, name: true, icdCode: true } },
        medications: { where: { deletedAt: null }, select: { id: true, name: true, dose: true, frequency: true } },
        allergies: { where: { deletedAt: null }, select: { id: true, allergen: true, reaction: true, severity: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    return res.status(200).json({
      profile: {
        conditions: patient.conditions.map((c) => c.name),
        medications: patient.medications.map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`),
        allergies: patient.allergies.map((a) => a.allergen),
        lastUpdated: patient.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Health Profile] Error fetching health profile:', error);
    return res.status(500).json({ error: 'Failed to retrieve health profile' });
  }
}

// PUT /api/patient/health-profile - Full update
async function handleUpdate(req: NextApiRequest, res: NextApiResponse, patientId: string) {
  const updates = req.body;

  try {
    // Look up patient's organizationId for tenant-scoped creates
    const patientRecord = await prisma.patient.findFirst({
      where: { id: patientId },
      select: { organizationId: true },
    });
    const organizationId = patientRecord?.organizationId || '';

    // Update conditions
    if (updates.conditions && Array.isArray(updates.conditions)) {
      // Soft-delete existing conditions
      await prisma.condition.updateMany({
        where: { patientId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
      // Create new conditions
      for (const name of updates.conditions) {
        await prisma.condition.create({
          data: { patientId, organizationId, name },
        });
      }
    }

    // Update medications
    if (updates.medications && Array.isArray(updates.medications)) {
      await prisma.medication.updateMany({
        where: { patientId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
      for (const name of updates.medications) {
        await prisma.medication.create({
          data: { patientId, organizationId, name },
        });
      }
    }

    // Update allergies
    if (updates.allergies && Array.isArray(updates.allergies)) {
      await prisma.allergy.updateMany({
        where: { patientId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
      for (const allergen of updates.allergies) {
        await prisma.allergy.create({
          data: { patientId, organizationId, allergen },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Health profile updated successfully',
    });
  } catch (error) {
    console.error('[Health Profile] Error updating health profile:', error);
    return res.status(500).json({ error: 'Failed to update health profile' });
  }
}

// PATCH /api/patient/health-profile - Add/remove individual items
async function handlePatch(req: NextApiRequest, res: NextApiResponse, patientId: string) {
  const updates = req.body;

  // Validate add fields are strings with max length 500
  for (const field of ['addCondition', 'addMedication', 'addAllergy'] as const) {
    if (updates[field] !== undefined) {
      if (typeof updates[field] !== 'string' || updates[field].length > 500) {
        return res.status(400).json({ error: `${field} must be a string with maximum length 500` });
      }
    }
  }

  try {
    // Look up patient's organizationId for tenant-scoped creates
    const patientRecord = await prisma.patient.findFirst({
      where: { id: patientId },
      select: { organizationId: true },
    });
    const organizationId = patientRecord?.organizationId || '';

    // Add/remove conditions
    if (updates.addCondition) {
      await prisma.condition.create({
        data: { patientId, organizationId, name: updates.addCondition },
      });
    }
    if (updates.removeCondition) {
      await prisma.condition.updateMany({
        where: { patientId, name: updates.removeCondition, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
    }

    // Add/remove medications
    if (updates.addMedication) {
      await prisma.medication.create({
        data: { patientId, organizationId, name: updates.addMedication },
      });
    }
    if (updates.removeMedication) {
      await prisma.medication.updateMany({
        where: { patientId, name: updates.removeMedication, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
    }

    // Add/remove allergies
    if (updates.addAllergy) {
      await prisma.allergy.create({
        data: { patientId, organizationId, allergen: updates.addAllergy },
      });
    }
    if (updates.removeAllergy) {
      await prisma.allergy.updateMany({
        where: { patientId, allergen: updates.removeAllergy, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: patientId },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Health profile updated successfully',
    });
  } catch (error) {
    console.error('[Health Profile] Error patching health profile:', error);
    return res.status(500).json({ error: 'Failed to update health profile' });
  }
}
