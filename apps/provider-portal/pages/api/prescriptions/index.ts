// Prescriptions API - Using MedicationOrder model
// apps/provider-portal/pages/api/prescriptions/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, _session: any) {
  if (req.method === 'GET') {
    return getPrescriptions(req, res);
  } else if (req.method === 'POST') {
    return createPrescription(req, res, _session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getPrescriptions(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { encounterId, patientId, status, limit = '50', offset = '0' } = req.query;
    
    const where: any = {};
    
    if (encounterId) where.encounterId = String(encounterId);
    if (status) where.status = String(status);
    
    if (patientId) {
      where.encounter = { patientId: String(patientId) };
    }
    
    const [prescriptions, total] = await Promise.all([
      prisma.medicationOrder.findMany({
        where,
        include: {
          encounter: {
            include: {
              patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true } },
            },
          },
          orderedBy: { select: { id: true, name: true, npi: true } },
        },
        orderBy: { orderedAt: 'desc' },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      }),
      prisma.medicationOrder.count({ where }),
    ]);
    
    return res.status(200).json({
      prescriptions,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
}

async function createPrescription(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      encounterId,
      medicationName,
      brandName,
      strength,
      form,
      quantity,
      daysSupply,
      refills,
      directions,
      indication,
      dispenseAsWritten,
      pharmacyId,
      isControlled,
      schedule,
      frequency,
      route,
    } = req.body;
    
    // Validate required fields
    if (!encounterId || !medicationName || !strength || !quantity || !directions) {
      return res.status(400).json({ 
        error: 'Required fields: encounterId, medicationName, strength, quantity, directions' 
      });
    }
    
    // Verify encounter exists
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { patient: true },
    });
    
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    // Check for controlled substance restrictions
    if (isControlled && schedule && ['II', 'III'].includes(schedule)) {
      console.log(`Controlled substance (Schedule ${schedule}) ordered by provider ${session.user.id}`);
    }
    
    // Create medication order (prescription)
    const prescription = await prisma.medicationOrder.create({
      data: {
        encounterId,
        orderedById: session.user.id,
        medicationName,
        genericName: brandName !== medicationName ? medicationName : null,
        dose: strength,
        doseUnit: 'mg',
        frequency: frequency || 'as directed',
        route: route || form || 'PO',
        duration: daysSupply ? `${daysSupply} days` : null,
        quantity,
        refills: refills || 0,
        indication,
        instructions: directions,
        dispenseAsWritten: dispenseAsWritten || false,
        isControlled: isControlled || false,
        deaSchedule: schedule,
        pharmacy: pharmacyId,
        status: 'PENDING',
        priority: 'ROUTINE',
      },
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true } },
          },
        },
        orderedBy: { select: { name: true, npi: true } },
      },
    });
    
    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: 'SYSTEM',
        title: 'Prescription Created',
        message: `Prescription for ${medicationName} ${strength} created`,
        priority: 'NORMAL',
        relatedType: 'MedicationOrder',
        relatedId: prescription.id,
      },
    });
    
    // Audit log
    await createAuditLog(
      session.user.id,
      'CREATE',
      'MedicationOrder',
      prescription.id,
      { 
        medication: medicationName, 
        strength, 
        quantity, 
        isControlled,
        patientId: encounter.patientId 
      },
      req
    );
    
    return res.status(201).json(prescription);
  } catch (error) {
    console.error('Error creating prescription:', error);
    return res.status(500).json({ error: 'Failed to create prescription' });
  }
}

export default requireAuth(handler);
