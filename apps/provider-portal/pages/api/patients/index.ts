// Patients API - List & Create
// apps/provider-portal/pages/api/patients/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === 'GET') {
    return getPatients(req, res, session);
  } else if (req.method === 'POST') {
    return createPatient(req, res, session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getPatients(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { search, limit = '50', offset = '0', active } = req.query;
    
    const where: any = {};
    
    if (search) {
      const searchStr = String(search);
      where.OR = [
        { firstName: { contains: searchStr, mode: 'insensitive' } },
        { lastName: { contains: searchStr, mode: 'insensitive' } },
        { mrn: { contains: searchStr, mode: 'insensitive' } },
        { email: { contains: searchStr, mode: 'insensitive' } },
      ];
    }
    
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          allergies: { where: { isActive: true } },
          conditions: { where: { status: 'ACTIVE' } },
        },
        orderBy: { lastName: 'asc' },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      }),
      prisma.patient.count({ where }),
    ]);
    
    return res.status(200).json({
      patients,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

async function createPatient(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      mrn,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContact,
      emergencyPhone,
      insuranceId,
      insuranceName,
      allergies,
      conditions,
      medications,
    } = req.body;
    
    // Check for existing MRN
    if (mrn) {
      const existing = await prisma.patient.findUnique({ where: { mrn } });
      if (existing) {
        return res.status(400).json({ error: 'Patient with this MRN already exists' });
      }
    }
    
    const patient = await prisma.patient.create({
      data: {
        mrn: mrn || `MRN-${Date.now()}`,
        firstName,
        lastName,
        middleName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        insuranceId,
        insuranceName,
        allergies: allergies ? {
          create: allergies.map((a: any) => ({
            allergen: a.allergen,
            reaction: a.reaction,
            severity: a.severity || 'MILD',
            type: a.type || 'DRUG',
          })),
        } : undefined,
        conditions: conditions ? {
          create: conditions.map((c: any) => ({
            name: c.name,
            icdCode: c.icdCode,
            status: 'ACTIVE',
          })),
        } : undefined,
        medications: medications ? {
          create: medications.map((m: any) => ({
            medicationName: m.name,
            dose: m.dose,
            frequency: m.frequency,
            isActive: true,
          })),
        } : undefined,
      },
      include: {
        allergies: true,
        conditions: true,
        medications: true,
      },
    });
    
    await createAuditLog(session.user.id, 'CREATE', 'Patient', patient.id, { mrn: patient.mrn }, req);
    
    return res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    return res.status(500).json({ error: 'Failed to create patient' });
  }
}

export default requireAuth(handler);
