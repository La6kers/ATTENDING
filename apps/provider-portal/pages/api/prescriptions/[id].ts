// Prescription by ID API - Get, Update, Delete
// apps/provider-portal/pages/api/prescriptions/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Prescription ID is required' });
  }

  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, `/api/v1/prescriptions/${id}`);
  if (proxied) return;

  // Fallback: direct Prisma
  switch (req.method) {
    case 'GET':
      return getPrescription(req, res, session, id);
    case 'PATCH':
      return updatePrescription(req, res, session, id);
    case 'DELETE':
      return deletePrescription(req, res, session, id);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function getPrescription(
  req: NextApiRequest, 
  res: NextApiResponse, 
  session: any, 
  id: string
) {
  try {
    const prescription = await prisma.medicationOrder.findUnique({
      where: { id },
      include: {
        encounter: {
          include: {
            patient: { 
              select: { 
                id: true, 
                firstName: true, 
                lastName: true, 
                mrn: true, 
                dateOfBirth: true,
              } 
            },
          },
        },
        orderedBy: { select: { id: true, name: true, npi: true } },
        interactions: true,
      },
    });
    
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    return res.status(200).json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return res.status(500).json({ error: 'Failed to fetch prescription' });
  }
}

async function updatePrescription(
  req: NextApiRequest, 
  res: NextApiResponse, 
  session: any, 
  id: string
) {
  try {
    const existingPrescription = await prisma.medicationOrder.findUnique({
      where: { id },
      include: { encounter: { include: { patient: true } } },
    });
    
    if (!existingPrescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    // Only allow updates if prescription is still pending
    if (existingPrescription.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot modify a prescription that has been completed' 
      });
    }
    
    const {
      strength,
      quantity,
      refills,
      directions,
      indication,
      dispenseAsWritten,
      pharmacy,
      status,
      frequency,
      route,
    } = req.body;
    
    const prescription = await prisma.medicationOrder.update({
      where: { id },
      data: {
        ...(strength && { dose: strength }),
        ...(quantity && { quantity }),
        ...(refills !== undefined && { refills }),
        ...(directions && { instructions: directions }),
        ...(indication && { indication }),
        ...(dispenseAsWritten !== undefined && { dispenseAsWritten }),
        ...(pharmacy && { pharmacy }),
        ...(status && { status }),
        ...(frequency && { frequency }),
        ...(route && { route }),
      },
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
        orderedBy: { select: { name: true, npi: true } },
      },
    });
    
    await createAuditLog(
      session.user.id,
      'UPDATE',
      'MedicationOrder',
      id,
      { updates: req.body },
      req
    );
    
    return res.status(200).json(prescription);
  } catch (error) {
    console.error('Error updating prescription:', error);
    return res.status(500).json({ error: 'Failed to update prescription' });
  }
}

async function deletePrescription(
  req: NextApiRequest, 
  res: NextApiResponse, 
  session: any, 
  id: string
) {
  try {
    const existingPrescription = await prisma.medicationOrder.findUnique({
      where: { id },
    });
    
    if (!existingPrescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    // Only allow cancellation if not completed
    if (existingPrescription.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot cancel a prescription that has been completed' 
      });
    }
    
    // Soft delete by changing status to CANCELLED
    const prescription = await prisma.medicationOrder.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        discontinuedAt: new Date(),
        discontinuedBy: session.user.id,
        discontinueReason: req.body.reason || 'Cancelled by provider',
      },
    });
    
    await createAuditLog(
      session.user.id,
      'DELETE',
      'MedicationOrder',
      id,
      { action: 'cancelled', reason: req.body.reason },
      req
    );
    
    return res.status(200).json({ 
      success: true, 
      message: 'Prescription cancelled',
      prescription 
    });
  } catch (error) {
    console.error('Error cancelling prescription:', error);
    return res.status(500).json({ error: 'Failed to cancel prescription' });
  }
}

export default requireAuth(handler);
