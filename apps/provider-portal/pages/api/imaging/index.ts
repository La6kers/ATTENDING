// Imaging Orders API - List & Create
// apps/provider-portal/pages/api/imaging/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { proxyToBackend } from '@/lib/api/backendProxy';
import { 
  CreateImagingOrderSchema, 
  validate, 
} from '@attending/shared/schemas';

async function handler(req: NextApiRequest, res: NextApiResponse, _session: any) {
  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, '/api/v1/imagingorders');
  if (proxied) return;

  // Fallback: direct Prisma
  if (req.method === 'GET') {
    return getImagingOrders(req, res);
  } else if (req.method === 'POST') {
    return createImagingOrder(req, res, _session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getImagingOrders(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { encounterId, patientId, status, priority, studyType, limit = '50', offset = '0' } = req.query;
    
    const where: any = {};
    
    if (encounterId) where.encounterId = String(encounterId);
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    if (studyType) where.studyType = String(studyType);
    
    if (patientId) {
      where.encounter = { patientId: String(patientId) };
    }
    
    const [imagingOrders, total] = await Promise.all([
      prisma.imagingOrder.findMany({
        where,
        include: {
          encounter: {
            include: {
              patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
            },
          },
          orderedBy: { select: { id: true, name: true } },
        },
        orderBy: [
          { priority: 'desc' },
          { orderedAt: 'desc' },
        ],
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      }),
      prisma.imagingOrder.count({ where }),
    ]);
    
    return res.status(200).json({
      imagingOrders,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error('Error fetching imaging orders:', error);
    return res.status(500).json({ error: 'Failed to fetch imaging orders' });
  }
}

async function createImagingOrder(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Validate request body with Zod
  const validation = validate(CreateImagingOrderSchema, req.body);
  
  if (!validation.success) {
    return res.status(400).json(validation.error.toJSON());
  }

  const {
    encounterId,
    studyType,
    studyName,
    bodyPart,
    laterality,
    priority,
    indication,
    clinicalHistory,
    contrast,
    contrastType,
    specialInstructions,
  } = validation.data;

  try {
    // Verify encounter exists
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { patient: true },
    });
    
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    // Check for contrast allergies if contrast ordered
    if (contrast) {
      const contrastAllergies = await prisma.allergy.findMany({
        where: {
          patientId: encounter.patientId,
          isActive: true,
          OR: [
            { allergen: { contains: 'contrast', mode: 'insensitive' } },
            { allergen: { contains: 'iodine', mode: 'insensitive' } },
            { allergen: { contains: 'gadolinium', mode: 'insensitive' } },
          ],
        },
      });
      
      if (contrastAllergies.length > 0) {
        // Don't block, but warn in response
        console.warn(`Patient has potential contrast allergies: ${contrastAllergies.map(a => a.allergen).join(', ')}`);
      }
    }
    
    const imagingOrder = await prisma.imagingOrder.create({
      data: {
        encounterId,
        orderedById: session.user.id,
        studyType,
        studyName,
        bodyPart,
        laterality,
        priority,
        indication,
        clinicalHistory,
        contrast,
        contrastType,
        specialInstructions,
      },
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true } },
          },
        },
        orderedBy: { select: { name: true } },
      },
    });
    
    // Create notification for STAT orders
    if (priority === 'STAT') {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'ALERT',
          title: 'STAT Imaging Order',
          message: `STAT ${studyName} for ${encounter.patient.lastName}, ${encounter.patient.firstName}`,
          priority: 'HIGH',
          relatedType: 'ImagingOrder',
          relatedId: imagingOrder.id,
        },
      });
    }
    
    await createAuditLog(
      session.user.id,
      'CREATE',
      'ImagingOrder',
      imagingOrder.id,
      { studyName, priority, contrast },
      req
    );
    
    return res.status(201).json(imagingOrder);
  } catch (error) {
    console.error('Error creating imaging order:', error);
    return res.status(500).json({ error: 'Failed to create imaging order' });
  }
}

export default requireAuth(handler);
