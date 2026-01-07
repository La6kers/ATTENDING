// Lab Order API - Get, Update, Cancel individual lab order
// apps/provider-portal/pages/api/labs/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid lab order ID' });
  }

  switch (req.method) {
    case 'GET':
      return getLabOrder(req, res, session, id);
    case 'PUT':
    case 'PATCH':
      return updateLabOrder(req, res, session, id);
    case 'DELETE':
      return cancelLabOrder(req, res, session, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

async function getLabOrder(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    const labOrder = await prisma.labOrder.findUnique({
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
                allergies: { where: { isActive: true } },
              },
            },
          },
        },
        orderedBy: { select: { id: true, name: true, specialty: true } },
        results: { orderBy: { resultedAt: 'desc' } },
      },
    });
    
    if (!labOrder) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    
    return res.status(200).json(labOrder);
  } catch (error) {
    console.error('Error fetching lab order:', error);
    return res.status(500).json({ error: 'Failed to fetch lab order' });
  }
}

async function updateLabOrder(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    const {
      status,
      priority,
      indication,
      specialInstructions,
      collectionDate,
      notes,
      // For adding results
      results,
    } = req.body;
    
    const existingOrder = await prisma.labOrder.findUnique({ where: { id } });
    
    if (!existingOrder) {
      return res.status(404).json({ error: 'Lab order not found' });
    }
    
    // Update order
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (indication) updateData.indication = indication;
    if (specialInstructions) updateData.specialInstructions = specialInstructions;
    if (collectionDate) updateData.collectionDate = new Date(collectionDate);
    if (notes) updateData.notes = notes;
    
    // Handle status changes
    if (status === 'COLLECTED' && !existingOrder.collectedAt) {
      updateData.collectedAt = new Date();
    }
    if (status === 'RESULTED' && !existingOrder.resultedAt) {
      updateData.resultedAt = new Date();
    }
    
    const labOrder = await prisma.labOrder.update({
      where: { id },
      data: updateData,
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
        results: true,
      },
    });
    
    // Add results if provided
    if (results && Array.isArray(results)) {
      const createdResults = await Promise.all(
        results.map((result: any) =>
          prisma.labResult.create({
            data: {
              labOrderId: id,
              analyte: result.analyte,
              value: result.value,
              unit: result.unit,
              referenceRange: result.referenceRange,
              isAbnormal: result.isAbnormal || false,
              isCritical: result.isCritical || false,
              interpretation: result.interpretation,
              verifiedBy: session.user.id,
            },
          })
        )
      );
      
      // If any critical values, create notification
      const criticalResults = createdResults.filter(r => r.isCritical);
      if (criticalResults.length > 0) {
        await prisma.notification.create({
          data: {
            userId: labOrder.orderedById,
            type: 'CRITICAL_VALUE',
            title: 'Critical Lab Value',
            message: `Critical value for ${labOrder.testName}: ${criticalResults.map(r => `${r.analyte}: ${r.value}`).join(', ')}`,
            priority: 'CRITICAL',
            relatedType: 'LabOrder',
            relatedId: id,
          },
        });
      }
    }
    
    await createAuditLog(session.user.id, 'UPDATE', 'LabOrder', id, req.body, req);
    
    return res.status(200).json(labOrder);
  } catch (error) {
    console.error('Error updating lab order:', error);
    return res.status(500).json({ error: 'Failed to update lab order' });
  }
}

async function cancelLabOrder(req: NextApiRequest, res: NextApiResponse, session: any, id: string) {
  try {
    const labOrder = await prisma.labOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: `Cancelled by ${session.user.name} at ${new Date().toISOString()}`,
      },
    });
    
    await createAuditLog(session.user.id, 'CANCEL', 'LabOrder', id, null, req);
    
    return res.status(200).json({ success: true, labOrder });
  } catch (error) {
    console.error('Error cancelling lab order:', error);
    return res.status(500).json({ error: 'Failed to cancel lab order' });
  }
}

export default requireAuth(handler);
