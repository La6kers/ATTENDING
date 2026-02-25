// =============================================================================
// ATTENDING AI - Appointments API
// apps/provider-portal/pages/api/appointments/index.ts
//
// GET — list encounters (appointments) with patient info
// POST — create new encounter/appointment
// Uses Encounter model via Prisma → SQL Server
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  switch (req.method) {
    case 'GET':
      return getAppointments(req, res, session);
    case 'POST':
      return createAppointment(req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// =============================================================================
// GET - List Encounters (Appointments)
// =============================================================================

async function getAppointments(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      startDate,
      endDate,
      providerId,
      status,
      patientId,
      today,
      limit = '50',
      offset = '0',
    } = req.query;

    const take = Math.min(parseInt(String(limit)), 100);
    const skip = parseInt(String(offset));

    // Build where clause
    const where: any = { deletedAt: null };

    // Default to current provider if no override
    const filterProviderId =
      typeof providerId === 'string'
        ? providerId
        : session?.user?.id ?? undefined;

    if (filterProviderId) {
      where.providerId = filterProviderId;
    }

    if (status && typeof status === 'string') {
      where.status = status.toUpperCase();
    }

    if (patientId && typeof patientId === 'string') {
      where.patientId = patientId;
    }

    // Today filter
    if (today === 'true') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.startTime = { gte: todayStart, lte: todayEnd };
    } else if (startDate && endDate) {
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        where.startTime = { gte: start, lte: end };
      }
    }

    const [encounters, total] = await Promise.all([
      prisma.encounter.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              dateOfBirth: true,
              gender: true,
              sex: true,
              insuranceProvider: true,
              assessments: {
                where: { deletedAt: null },
                orderBy: { startedAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  triageLevel: true,
                  chiefComplaint: true,
                  startedAt: true,
                  redFlagsDetected: true,
                },
              },
            },
          },
          provider: {
            select: { id: true, name: true, specialty: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take,
        skip,
      }),
      prisma.encounter.count({ where }),
    ]);

    const appointments = encounters.map(transformEncounter);

    return res.status(200).json({
      appointments,
      total,
      limit: take,
      offset: skip,
      date: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('[Appointments API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}

// =============================================================================
// POST - Create Encounter/Appointment
// =============================================================================

async function createAppointment(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      patientId,
      encounterType = 'Office Visit',
      chiefComplaint,
      startTime,
      notes,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        providerId: session.user.id,
        encounterType,
        status: 'SCHEDULED',
        chiefComplaint: chiefComplaint || null,
        startTime: startTime ? new Date(startTime) : new Date(),
        notes: notes || null,
        organizationId: session?.user?.organizationId || null,
      },
    });

    await createAuditLog(
      session.user.id,
      'CREATE_ENCOUNTER',
      'Encounter',
      encounter.id,
      { patientId, encounterType },
      req,
    );

    return res.status(201).json({
      id: encounter.id,
      status: encounter.status,
      encounterType: encounter.encounterType,
      startTime: encounter.startTime.toISOString(),
      createdAt: encounter.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Appointments API] Create error:', error);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
}

// =============================================================================
// Helpers
// =============================================================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
  return age;
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function transformEncounter(e: any) {
  const latestAssessment = e.patient?.assessments?.[0] ?? null;
  const redFlagCount = latestAssessment?.redFlagsDetected
    ? safeJsonParse<any[]>(latestAssessment.redFlagsDetected, []).length
    : 0;

  return {
    id: e.id,
    scheduledAt: e.startTime.toISOString(),
    time: e.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    type: e.encounterType,
    status: e.status,
    reason: e.chiefComplaint,
    provider: e.provider
      ? { id: e.provider.id, name: e.provider.name, specialty: e.provider.specialty }
      : null,
    patient: e.patient
      ? {
          id: e.patient.id,
          name: `${e.patient.firstName} ${e.patient.lastName}`,
          mrn: e.patient.mrn,
          age: e.patient.dateOfBirth ? calculateAge(new Date(e.patient.dateOfBirth)) : null,
          gender: e.patient.gender,
          sex: e.patient.sex,
          insurancePlan: e.patient.insuranceProvider,
        }
      : null,
    assessment: latestAssessment
      ? {
          id: latestAssessment.id,
          status: latestAssessment.status,
          triageLevel: latestAssessment.triageLevel,
          chiefComplaint: latestAssessment.chiefComplaint,
          redFlagCount,
        }
      : null,
  };
}

export default requireAuth(handler);
