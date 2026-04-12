// =============================================================================
// ATTENDING AI - Patients API
// apps/provider-portal/pages/api/patients/index.ts
//
// GET  — list / search patients (Prisma → SQL Server)
// POST — create new patient
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

// =============================================================================
// Handler
// =============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, '/api/v1/patients');
  if (proxied) return;

  // Fallback: direct Prisma
  switch (req.method) {
    case 'GET':
      return getPatients(req, res);
    case 'POST':
      return createPatient(req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// =============================================================================
// GET - List / Search Patients
// =============================================================================

async function getPatients(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      search,
      stats,
      limit = '50',
      offset = '0',
      organizationId,
    } = req.query;

    // Statistics endpoint
    if (stats === 'true') {
      const [total, activeCount] = await Promise.all([
        prisma.patient.count({ where: { deletedAt: null } }),
        prisma.patient.count({ where: { deletedAt: null, isActive: true } }),
      ]);
      return res.status(200).json({ total, activeCount, inactiveCount: total - activeCount });
    }

    const searchStr = typeof search === 'string' ? search.trim() : '';
    const take = Math.min(parseInt(String(limit)), 100);
    const skip = parseInt(String(offset));

    // Build where clause
    const where: any = { deletedAt: null };
    if (organizationId && typeof organizationId === 'string') {
      where.organizationId = organizationId;
    }
    if (searchStr) {
      where.OR = [
        { firstName: { contains: searchStr } },
        { lastName: { contains: searchStr } },
        { mrn: { contains: searchStr } },
        { email: { contains: searchStr } },
        { phone: { contains: searchStr } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          allergies: {
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { id: true, allergen: true, severity: true, reaction: true },
          },
          conditions: {
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { id: true, icdCode: true, description: true },
            take: 5,
          },
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
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        take,
        skip,
      }),
      prisma.patient.count({ where }),
    ]);

    const formatted = patients.map(transformPatient);

    return res.status(200).json({
      patients: formatted,
      total,
      limit: take,
      offset: skip,
    });
  } catch (error) {
    console.error('[Patients API] Error fetching patients:', error);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

// =============================================================================
// POST - Create Patient
// =============================================================================

async function createPatient(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      mrn,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      sex,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      insuranceProvider,
      insurancePolicyNum,
      preferredLanguage = 'en',
      organizationId,
    } = req.body;

    // Validate required fields
    if (!mrn || !firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        error: 'MRN, first name, last name, and date of birth are required',
      });
    }

    // Check for duplicate MRN
    const existing = await prisma.patient.findUnique({ where: { mrn } });
    if (existing) {
      return res.status(409).json({ error: `Patient with MRN ${mrn} already exists` });
    }

    const patient = await prisma.patient.create({
      data: {
        mrn,
        firstName,
        lastName,
        middleName: middleName || null,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender || null,
        sex: sex || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        emergencyContact: emergencyContact || null,
        emergencyPhone: emergencyPhone || null,
        insuranceProvider: insuranceProvider || null,
        insurancePolicyNum: insurancePolicyNum || null,
        preferredLanguage,
        organizationId: organizationId || session?.user?.organizationId || null,
        isActive: true,
      },
    });

    // Audit log
    await createAuditLog(
      session?.user?.id,
      'CREATE_PATIENT',
      'Patient',
      patient.id,
      { mrn, firstName, lastName },
      req,
    );

    return res.status(201).json({
      id: patient.id,
      mrn: patient.mrn,
      name: `${patient.firstName} ${patient.lastName}`,
      createdAt: patient.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Patients API] Error creating patient:', error);
    return res.status(500).json({ error: 'Failed to create patient' });
  }
}

// =============================================================================
// Helpers
// =============================================================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
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

function transformPatient(p: any) {
  const latestAssessment = p.assessments?.[0] ?? null;
  const redFlagCount = latestAssessment?.redFlagsDetected
    ? safeJsonParse<any[]>(latestAssessment.redFlagsDetected, []).length
    : 0;

  return {
    id: p.id,
    mrn: p.mrn,
    name: `${p.firstName} ${p.lastName}`,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth instanceof Date
      ? p.dateOfBirth.toISOString().split('T')[0]
      : p.dateOfBirth,
    age: calculateAge(new Date(p.dateOfBirth)),
    gender: p.gender,
    sex: p.sex,
    phone: p.phone,
    email: p.email,
    insurancePlan: p.insuranceProvider,
    preferredLanguage: p.preferredLanguage,
    isActive: p.isActive,
    allergies: p.allergies?.map((a: any) => a.allergen) ?? [],
    allergySeverities: p.allergies ?? [],
    conditions: p.conditions?.map((c: any) => ({ code: c.icdCode, description: c.description })) ?? [],
    latestAssessment: latestAssessment
      ? {
          id: latestAssessment.id,
          status: latestAssessment.status,
          triageLevel: latestAssessment.triageLevel,
          chiefComplaint: latestAssessment.chiefComplaint,
          startedAt: latestAssessment.startedAt,
          redFlagCount,
        }
      : null,
    hasActiveAssessment:
      latestAssessment?.status === 'IN_PROGRESS' || latestAssessment?.status === 'PENDING',
  };
}

export default requireAuth(handler);
