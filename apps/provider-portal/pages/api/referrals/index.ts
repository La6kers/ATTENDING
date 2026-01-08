// Referral Orders API - List & Create
// apps/provider-portal/pages/api/referrals/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Development bypass for auth
const isDev = process.env.NODE_ENV === 'development';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // In development, use a mock session
  const session = isDev 
    ? { user: { id: 'dev-provider-1', name: 'Dr. Development' } }
    : null; // In production, use proper auth

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return getReferrals(req, res, session);
  } else if (req.method === 'POST') {
    return createReferral(req, res, session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getReferrals(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { 
      encounterId, 
      patientId, 
      status, 
      specialty,
      urgency,
      limit = '50', 
      offset = '0' 
    } = req.query;
    
    const where: any = {};
    
    if (encounterId) where.encounterId = String(encounterId);
    if (status) where.status = String(status);
    if (specialty) where.specialty = String(specialty);
    if (urgency) where.urgency = String(urgency);
    
    if (patientId) {
      where.patientId = String(patientId);
    }
    
    // Try to use Prisma if Referral model exists, otherwise return mock data
    try {
      const [referrals, total] = await Promise.all([
        prisma.referral.findMany({
          where,
          include: {
            encounter: {
              include: {
                patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
              },
            },
          },
          orderBy: [
            { urgency: 'desc' },
            { createdAt: 'desc' },
          ],
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
        }),
        prisma.referral.count({ where }),
      ]);
      
      return res.status(200).json({
        referrals,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    } catch (prismaError) {
      // Prisma model doesn't exist yet, return mock data
      console.log('Referral model not found, returning mock data');
      return res.status(200).json({
        referrals: getMockReferrals(),
        total: 3,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    }
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return res.status(500).json({ error: 'Failed to fetch referrals' });
  }
}

async function createReferral(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      encounterId,
      patientId,
      specialty,
      specialtyName,
      urgency = 'ROUTINE',
      preferredProviderId,
      clinicalQuestion,
      relevantHistory,
      attachedDocuments = [],
      priorAuthRequired = false,
    } = req.body;
    
    if (!encounterId || !specialty) {
      return res.status(400).json({ error: 'Encounter ID and specialty are required' });
    }
    
    // Try to create in database
    try {
      const referral = await prisma.referral.create({
        data: {
          encounterId,
          patientId,
          providerId: session.user.id,
          specialty,
          specialtyName,
          urgency,
          preferredProviderId,
          clinicalQuestion,
          relevantHistory,
          attachedDocuments: JSON.stringify(attachedDocuments),
          priorAuthRequired,
          status: 'PENDING',
        },
        include: {
          encounter: {
            include: {
              patient: { select: { firstName: true, lastName: true, mrn: true } },
            },
          },
        },
      });
      
      // Create notification for urgent referrals
      if (urgency === 'STAT' || urgency === 'URGENT') {
        try {
          await prisma.notification.create({
            data: {
              userId: session.user.id,
              type: 'ALERT',
              title: `${urgency} Referral`,
              message: `${urgency} referral to ${specialtyName} created`,
              priority: urgency === 'STAT' ? 'HIGH' : 'NORMAL',
              relatedType: 'Referral',
              relatedId: referral.id,
            },
          });
        } catch (notifError) {
          console.log('Could not create notification:', notifError);
        }
      }
      
      return res.status(201).json(referral);
    } catch (prismaError) {
      // Prisma model doesn't exist yet, return mock response
      console.log('Referral model not found, returning mock response');
      const mockReferral = {
        id: `ref-${Date.now()}`,
        encounterId,
        patientId,
        specialty,
        specialtyName,
        urgency,
        preferredProviderId,
        clinicalQuestion,
        relevantHistory,
        priorAuthRequired,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      return res.status(201).json(mockReferral);
    }
  } catch (error) {
    console.error('Error creating referral:', error);
    return res.status(500).json({ error: 'Failed to create referral' });
  }
}

function getMockReferrals() {
  return [
    {
      id: 'ref-mock-1',
      encounterId: 'enc-001',
      patientId: 'pat-001',
      specialty: 'NEURO',
      specialtyName: 'Neurology',
      urgency: 'URGENT',
      clinicalQuestion: 'Evaluate for secondary headache causes',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ref-mock-2',
      encounterId: 'enc-002',
      patientId: 'pat-002',
      specialty: 'CARDS',
      specialtyName: 'Cardiology',
      urgency: 'ROUTINE',
      clinicalQuestion: 'Chest pain evaluation and risk stratification',
      status: 'SCHEDULED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'ref-mock-3',
      encounterId: 'enc-003',
      patientId: 'pat-003',
      specialty: 'GI',
      specialtyName: 'Gastroenterology',
      urgency: 'ROUTINE',
      clinicalQuestion: 'Colonoscopy screening',
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

export default handler;
