// Patient API - Get, Update, Delete individual patient
// apps/provider-portal/pages/api/patients/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid patient ID' });
  }

  switch (req.method) {
    case 'GET':
      return getPatient(req, res, session, id);
    case 'PUT':
    case 'PATCH':
      return updatePatient(req, res, session, id);
    case 'DELETE':
      return deletePatient(req, res, session, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function getPatient(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        allergies: { where: { isActive: true } },
        conditions: true,
        medications: { where: { isActive: true } },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 10 },
        encounters: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
          include: {
            provider: { select: { name: true, specialty: true } },
          },
        },
        assessments: {
          orderBy: { submittedAt: 'desc' },
          take: 5,
        },
      },
    });
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    await createAuditLog(session.user.id, 'VIEW', 'Patient', id, null, req);
    
    return res.status(200).json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return res.status(500).json({ error: 'Failed to fetch patient' });
  }
}

async function updatePatient(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    const {
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
      primaryProviderId,
      preferredLanguage,
      isActive,
    } = req.body;
    
    const existingPatient = await prisma.patient.findUnique({ where: { id } });
    
    if (!existingPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        firstName,
        lastName,
        middleName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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
        primaryProviderId,
        preferredLanguage,
        isActive,
      },
      include: {
        allergies: true,
        conditions: true,
        medications: true,
      },
    });
    
    await createAuditLog(session.user.id, 'UPDATE', 'Patient', id, req.body, req);
    
    return res.status(200).json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    return res.status(500).json({ error: 'Failed to update patient' });
  }
}

async function deletePatient(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    // Soft delete - just mark as inactive
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
    
    await createAuditLog(session.user.id, 'DELETE', 'Patient', id, null, req);
    
    return res.status(200).json({ success: true, message: 'Patient deactivated' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return res.status(500).json({ error: 'Failed to delete patient' });
  }
}

export default requireAuth(handler);
