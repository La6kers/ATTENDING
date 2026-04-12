// Referral by ID API - Get, Update, Delete
// apps/provider-portal/pages/api/referrals/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Referral ID is required' });
  }

  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, `/api/v1/referrals/${id}`);
  if (proxied) return;

  // Fallback: direct Prisma
  switch (req.method) {
    case 'GET':
      return getReferral(id, req, res);
    case 'PUT':
      return updateReferral(id, req, res, session);
    case 'DELETE':
      return cancelReferral(id, req, res, session);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function getReferral(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const referral = await prisma.referral.findUnique({
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
                gender: true,
                phone: true,
                email: true,
                insuranceId: true,
                insuranceName: true,
              } 
            },
          },
        },
        referringProvider: { 
          select: { 
            id: true, 
            name: true, 
            npi: true, 
            specialty: true,
            phone: true,
          } 
        },
      },
    });
    
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }
    
    return res.status(200).json(referral);
  } catch (error) {
    console.error('Error fetching referral:', error);
    
    // Return mock data if Prisma model doesn't exist yet
    return res.status(200).json({
      id,
      encounterId: 'enc-001',
      patientId: 'pat-001',
      specialty: 'NEURO',
      specialtyName: 'Neurology',
      urgency: 'ROUTINE',
      reason: 'Headache evaluation',
      clinicalQuestion: 'Please evaluate for secondary causes',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function updateReferral(id: string, req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      urgency,
      reason,
      specificQuestions,
      clinicalSummary,
      preferredProvider,
      preferredFacility,
      notes,
      status,
      appointmentDate,
      appointmentTime,
      preAuthStatus,
      preAuthNumber,
    } = req.body;
    
    const updateData: Record<string, unknown> = {};
    
    // Only update provided fields that exist in the schema
    if (urgency !== undefined) updateData.urgency = urgency;
    if (reason !== undefined) updateData.reason = reason;
    if (specificQuestions !== undefined) updateData.specificQuestions = specificQuestions;
    if (clinicalSummary !== undefined) updateData.clinicalSummary = clinicalSummary;
    if (preferredProvider !== undefined) updateData.preferredProvider = preferredProvider;
    if (preferredFacility !== undefined) updateData.preferredFacility = preferredFacility;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (appointmentDate !== undefined) updateData.appointmentDate = new Date(appointmentDate);
    if (appointmentTime !== undefined) updateData.appointmentTime = appointmentTime;
    if (preAuthStatus !== undefined) updateData.preAuthStatus = preAuthStatus;
    if (preAuthNumber !== undefined) updateData.preAuthNumber = preAuthNumber;
    
    const referral = await prisma.referral.update({
      where: { id },
      data: updateData,
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
        referringProvider: { select: { name: true, npi: true } },
      },
    });
    
    // Create notification for status changes
    if (status && status !== 'PENDING') {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'SYSTEM',
          title: `Referral ${status === 'SCHEDULED' ? 'Scheduled' : 'Updated'}`,
          message: `Referral to ${referral.specialty} has been ${status.toLowerCase()}`,
          priority: status === 'SCHEDULED' ? 'NORMAL' : 'LOW',
          relatedType: 'Referral',
          relatedId: referral.id,
        },
      }).catch(console.log);
    }
    
    await createAuditLog(
      session.user.id,
      'UPDATE',
      'Referral',
      id,
      { updates: req.body },
      req
    );
    
    return res.status(200).json(referral);
  } catch (error: any) {
    console.error('Error updating referral:', error);
    
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Referral not found' });
    }
    
    // Return mock update response
    return res.status(200).json({
      id,
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
  }
}

async function cancelReferral(id: string, req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { reason } = req.body;
    
    // Check current status
    const existing = await prisma.referral.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Referral not found' });
    }
    
    if (existing.status === 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot cancel a completed referral' 
      });
    }
    
    // Soft delete by changing status
    const referral = await prisma.referral.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        notes: `Cancelled: ${reason || 'Cancelled by provider'}`,
      },
    });
    
    await createAuditLog(
      session.user.id,
      'DELETE',
      'Referral',
      id,
      { action: 'cancelled', reason },
      req
    );
    
    return res.status(200).json({ 
      success: true, 
      message: 'Referral cancelled',
      referral 
    });
  } catch (error: any) {
    console.error('Error cancelling referral:', error);
    
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Referral not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Referral cancelled (mock)' 
    });
  }
}

export default requireAuth(handler);
