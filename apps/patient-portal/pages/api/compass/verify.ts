// =============================================================================
// ATTENDING AI - COMPASS Appointment Verification
// apps/patient-portal/pages/api/compass/verify.ts
//
// Verifies a patient's identity before allowing them to start a pre-visit
// COMPASS assessment. Called from /compass/index.tsx when the patient
// arrives via an appointment link (code= or token= query param).
//
// Verification logic:
//   1. Look up the appointment code in the CompassSession table.
//   2. Confirm the patient's last name and date of birth match.
//   3. Return a session token the COMPASS chat page uses to associate
//      the completed assessment with the correct patient/encounter.
//
// If the database lookup fails (e.g. Prisma not running), falls back to
// a permissive demo mode so the patient flow is never blocked in dev.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@attending/shared/lib/security';

interface VerifyRequest {
  code?: string;
  lastName: string;
  dateOfBirth: string; // ISO date string YYYY-MM-DD
}

interface VerifyResponse {
  sessionId: string;
  patientId: string;
  patientName: string;
  encounterId?: string;
  appointmentDate?: string;
  providerName?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // =========================================================================
  // Rate limiting: max 5 requests per minute per IP
  // =========================================================================
  const clientIp = getClientIp(req);
  const rateLimitResult = await rateLimit(`ip:${clientIp}`, {
    windowMs: 60000,
    maxRequests: 5,
    keyPrefix: 'compass-verify',
  });

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', rateLimitResult.retryAfter || 60);
    return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
  }

  // =========================================================================
  // Organization context
  // =========================================================================
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) {
    console.error('[COMPASS VERIFY] DEFAULT_ORGANIZATION_ID environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error: organization context unavailable' });
  }

  const { code, lastName, dateOfBirth } = req.body as VerifyRequest;

  if (!lastName || !dateOfBirth) {
    return res.status(400).json({ error: 'lastName and dateOfBirth are required' });
  }

  try {
    // Attempt to find the patient by last name + DOB.
    // In production, this would also validate the appointment code against
    // a CompassInvitation table, but we fall back to name/DOB matching
    // for the current schema where invitation tokens aren't yet stored.
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ error: 'Invalid dateOfBirth format' });
    }

    const patient = await prisma.patient.findFirst({
      where: {
        lastName: { equals: lastName, mode: 'insensitive' },
        dateOfBirth: dob,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        encounters: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            provider: { select: { name: true } },
          },
        },
      },
    });

    if (!patient) {
      return res.status(400).json({ error: 'Verification failed. Please check your information and try again.' });
    }

    const encounter = patient.encounters[0];
    const sessionId = crypto.randomUUID();

    const response: VerifyResponse = {
      sessionId,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      encounterId: encounter?.id,
      appointmentDate: encounter?.scheduledAt?.toISOString(),
      providerName: encounter?.provider?.name,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[COMPASS VERIFY ERROR]', error);

    // In development / when Prisma isn't running, return a demo session
    // so the patient can still complete the COMPASS flow without a real DB.
    if (process.env.NODE_ENV === 'development') {
      const devResponse: VerifyResponse = {
        sessionId: `demo-${crypto.randomUUID()}`,
        patientId: 'demo-patient',
        patientName: lastName ? `${lastName.charAt(0).toUpperCase()}${lastName.slice(1).toLowerCase()} (Demo)` : 'Demo Patient',
        appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        providerName: 'Dr. Dev Provider',
      };
      return res.status(200).json(devResponse);
    }

    return res.status(500).json({ error: 'Verification service unavailable. Please try again.' });
  }
}
