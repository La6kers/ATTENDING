// ============================================================
// ATTENDING AI - Single Patient API Route
// apps/provider-portal/pages/api/patients/[id].ts
//
// Get full patient details including history and assessments
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: {
          where: { isActive: true },
          orderBy: { severity: 'desc' },
        },
        medications: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
        conditions: {
          orderBy: { onsetDate: 'desc' },
        },
        vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        assessments: {
          orderBy: { submittedAt: 'desc' },
          take: 10,
          include: {
            assignedProvider: {
              select: { name: true, specialty: true },
            },
          },
        },
        encounters: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: {
            provider: {
              select: { name: true, specialty: true },
            },
            labOrders: {
              orderBy: { orderedAt: 'desc' },
              take: 5,
            },
            imagingOrders: {
              orderBy: { orderedAt: 'desc' },
              take: 5,
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
        id: patient.insuranceId,
        name: patient.insuranceName,
      },
      
      // Clinical data
      allergies: patient.allergies.map(a => ({
        id: a.id,
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity,
        type: a.type,
      })),
      
      medications: patient.medications.map(m => ({
        id: m.id,
        name: m.medicationName,
        genericName: m.genericName,
        dose: m.dose,
        frequency: m.frequency,
        route: m.route,
        prescriber: m.prescriber,
        indication: m.indication,
        startDate: m.startDate?.toISOString().split('T')[0],
      })),
      
      conditions: patient.conditions.map(c => ({
        id: c.id,
        name: c.name,
        icdCode: c.icdCode,
        status: c.status,
        onsetDate: c.onsetDate?.toISOString().split('T')[0],
      })),
      
      // Recent vitals
      vitals: patient.vitals.map(v => ({
        id: v.id,
        bloodPressure: v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : null,
        systolic: v.systolic,
        diastolic: v.diastolic,
        heartRate: v.heartRate,
        temperature: v.temperature,
        respiratoryRate: v.respiratoryRate,
        oxygenSaturation: v.oxygenSaturation,
        weight: v.weight,
        height: v.height,
        painLevel: v.painLevel,
        recordedAt: v.recordedAt.toISOString(),
      })),
      
      // Assessment history
      assessments: patient.assessments.map(a => ({
        id: a.id,
        chiefComplaint: a.chiefComplaint,
        urgencyLevel: a.urgencyLevel.toLowerCase(),
        status: a.status.toLowerCase().replace('_', '-'),
        submittedAt: a.submittedAt?.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        provider: a.assignedProvider?.name,
      })),
      
      // Encounter history
      encounters: patient.encounters.map(e => ({
        id: e.id,
        visitType: e.visitType,
        status: e.status,
        chiefComplaint: e.chiefComplaint,
        scheduledAt: e.scheduledAt?.toISOString(),
        provider: e.provider.name,
        labOrderCount: e.labOrders.length,
        imagingOrderCount: e.imagingOrders.length,
      })),
      
      // Metadata
      preferredLanguage: patient.preferredLanguage,
      isActive: patient.isActive,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
    };

    return res.status(200).json(transformed);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}
