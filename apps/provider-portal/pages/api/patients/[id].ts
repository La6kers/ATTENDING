// ============================================================
// ATTENDING AI - Single Patient API Route
// apps/provider-portal/pages/api/patients/[id].ts
//
// GET    — full patient record with clinical history
// PATCH  — update patient demographics
// DELETE — soft-delete patient
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, `/api/v1/patients/${id}`);
  if (proxied) return;

  // Fallback: direct Prisma
  switch (req.method) {
    case 'GET':
      return getPatient(id, res);
    case 'PATCH':
      return updatePatient(id, req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// ============================================================
// GET - Full Patient Record
// ============================================================

async function getPatient(id: string, res: NextApiResponse) {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        allergies: {
          where: { deletedAt: null },
          orderBy: { severity: 'desc' },
        },
        conditions: {
          where: { deletedAt: null },
          orderBy: { onsetDate: 'desc' },
        },
        medications: {
          where: { deletedAt: null, status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
        },
        vitalSigns: {
          where: { deletedAt: null },
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        assessments: {
          where: { deletedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            assignedProvider: {
              select: { id: true, name: true, specialty: true },
            },
          },
        },
        encounters: {
          where: { deletedAt: null },
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            provider: {
              select: { id: true, name: true, specialty: true },
            },
            labOrders: {
              where: { deletedAt: null },
              orderBy: { orderedAt: 'desc' },
              take: 5,
              select: { id: true, orderNumber: true, status: true, priority: true, orderedAt: true },
            },
            imagingOrders: {
              where: { deletedAt: null },
              orderBy: { orderedAt: 'desc' },
              take: 5,
              select: { id: true, orderNumber: true, status: true, priority: true, orderedAt: true },
            },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const transformed = {
      id: patient.id,
      mrn: patient.mrn,
      name: `${patient.firstName} ${patient.lastName}`,
      firstName: patient.firstName,
      lastName: patient.lastName,
      middleName: patient.middleName,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
      age: calculateAge(patient.dateOfBirth),
      gender: patient.gender,
      sex: patient.sex,

      // Contact info
      contact: {
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode,
      },

      // Emergency contact
      emergencyContact: {
        name: patient.emergencyContact,
        phone: patient.emergencyPhone,
      },

      // Insurance
      insurance: {
        provider: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNum,
      },

      // Clinical data — field names match schema
      allergies: patient.allergies.map((a) => ({
        id: a.id,
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        status: a.status,
        notes: a.notes,
      })),

      conditions: patient.conditions.map((c) => ({
        id: c.id,
        description: c.description,
        icdCode: c.icdCode,
        status: c.status,
        isPrimary: c.isPrimary,
        onsetDate: c.onsetDate?.toISOString().split('T')[0] ?? null,
      })),

      medications: patient.medications.map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        rxnormCode: m.rxnormCode,
        dose: m.dose,
        frequency: m.frequency,
        route: m.route,
        status: m.status,
        startDate: m.startDate?.toISOString().split('T')[0] ?? null,
        endDate: m.endDate?.toISOString().split('T')[0] ?? null,
        prescribedBy: m.prescribedBy,
        pharmacy: m.pharmacy,
      })),

      // Recent vitals (schema field: vitalSigns)
      vitals: patient.vitalSigns.map((v) => ({
        id: v.id,
        bloodPressure:
          v.bloodPressureSystolic && v.bloodPressureDiastolic
            ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
            : null,
        heartRate: v.heartRate,
        temperature: v.temperature,
        respiratoryRate: v.respiratoryRate,
        oxygenSaturation: v.oxygenSaturation,
        weight: v.weight,
        weightUnit: v.weightUnit,
        height: v.height,
        heightUnit: v.heightUnit,
        painLevel: v.painLevel,
        bloodGlucose: v.bloodGlucose,
        recordedAt: v.recordedAt.toISOString(),
      })),

      // Assessment history (PatientAssessment schema)
      assessments: patient.assessments.map((a) => ({
        id: a.id,
        sessionId: a.sessionId,
        status: a.status,
        phase: a.phase,
        chiefComplaint: a.chiefComplaint,
        triageLevel: a.triageLevel,
        hasRedFlags: !!a.redFlagsDetected,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() ?? null,
        provider: a.assignedProvider
          ? { id: a.assignedProvider.id, name: a.assignedProvider.name }
          : null,
      })),

      // Encounter history (Encounter schema)
      encounters: patient.encounters.map((e) => ({
        id: e.id,
        encounterType: e.encounterType,
        status: e.status,
        chiefComplaint: e.chiefComplaint,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime?.toISOString() ?? null,
        provider: { id: e.provider.id, name: e.provider.name },
        labOrders: e.labOrders,
        imagingOrders: e.imagingOrders,
      })),

      preferredLanguage: patient.preferredLanguage,
      isActive: patient.isActive,
      organizationId: patient.organizationId,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };

    return res.status(200).json(transformed);
  } catch (error) {
    console.error('[Patient] GET error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================
// PATCH - Update Patient Demographics
// ============================================================

async function updatePatient(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  session: any,
) {
  try {
    const existing = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const {
      firstName,
      lastName,
      middleName,
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
      preferredLanguage,
    } = req.body;

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(middleName !== undefined && { middleName }),
        ...(gender !== undefined && { gender }),
        ...(sex !== undefined && { sex }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(emergencyPhone !== undefined && { emergencyPhone }),
        ...(insuranceProvider !== undefined && { insuranceProvider }),
        ...(insurancePolicyNum !== undefined && { insurancePolicyNum }),
        ...(preferredLanguage !== undefined && { preferredLanguage }),
      },
    });

    await createAuditLog(
      session?.user?.id,
      'UPDATE_PATIENT',
      'Patient',
      id,
      req.body,
      req,
    );

    return res.status(200).json({
      id: updated.id,
      mrn: updated.mrn,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Patient] PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================
// Helpers
// ============================================================

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export default requireAuth(handler);
