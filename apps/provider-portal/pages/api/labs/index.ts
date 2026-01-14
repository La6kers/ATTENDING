// Lab Orders API - List & Create
// apps/provider-portal/pages/api/labs/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { 
  CreateLabOrderSchema, 
  validate, 
  type CreateLabOrder 
} from '@attending/shared/schemas';

async function handler(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === 'GET') {
    return getLabOrders(req, res, session);
  } else if (req.method === 'POST') {
    return createLabOrder(req, res, session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getLabOrders(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { encounterId, patientId, status, priority, limit = '50', offset = '0' } = req.query;
    
    const where: any = {};
    
    if (encounterId) where.encounterId = String(encounterId);
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    
    if (patientId) {
      where.encounter = { patientId: String(patientId) };
    }
    
    const [labOrders, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        include: {
          encounter: {
            include: {
              patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
            },
          },
          orderedBy: { select: { id: true, name: true } },
          results: true,
        },
        orderBy: [
          { priority: 'desc' },
          { orderedAt: 'desc' },
        ],
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      }),
      prisma.labOrder.count({ where }),
    ]);
    
    return res.status(200).json({
      labOrders,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return res.status(500).json({ error: 'Failed to fetch lab orders' });
  }
}

async function createLabOrder(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Validate request body with Zod
  const validation = validate(CreateLabOrderSchema, req.body);
  
  if (!validation.success) {
    return res.status(400).json(validation.error.toJSON());
  }

  const { encounterId, tests, indication, priority, specialInstructions, collectionDate } = validation.data;

  try {
    // Verify encounter exists
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { patient: true },
    });
    
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    // Create lab orders for each test
    const labOrders = await Promise.all(
      tests.map((test) =>
        prisma.labOrder.create({
          data: {
            encounterId,
            orderedById: session.user.id,
            testCode: test.code,
            testName: test.name,
            category: test.category,
            priority: test.priority || priority,
            indication,
            specialInstructions,
            specimenType: test.specimenType,
            collectionDate: collectionDate ? new Date(collectionDate) : undefined,
          },
          include: {
            encounter: {
              include: {
                patient: { select: { firstName: true, lastName: true, mrn: true } },
              },
            },
            orderedBy: { select: { name: true } },
          },
        })
      )
    );
    
    // Create notification for lab department if STAT
    if (priority === 'STAT') {
      await prisma.notification.create({
        data: {
          userId: session.user.id, // In production, this would be the lab supervisor
          type: 'ALERT',
          title: 'STAT Lab Order',
          message: `STAT lab order for ${encounter.patient.lastName}, ${encounter.patient.firstName}`,
          priority: 'HIGH',
          relatedType: 'LabOrder',
          relatedId: labOrders[0].id,
        },
      });
    }
    
    await createAuditLog(
      session.user.id,
      'CREATE',
      'LabOrder',
      labOrders.map(l => l.id).join(','),
      { tests: tests.map((t) => t.name), priority },
      req
    );
    
    return res.status(201).json(labOrders);
  } catch (error) {
    console.error('Error creating lab order:', error);
    return res.status(500).json({ error: 'Failed to create lab order' });
  }
}

export default requireAuth(handler);
