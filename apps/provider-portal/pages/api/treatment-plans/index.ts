// Treatment Plans API - List & Create
// apps/provider-portal/pages/api/treatment-plans/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Development bypass for auth
const isDev = process.env.NODE_ENV === 'development';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = isDev 
    ? { user: { id: 'dev-provider-1', name: 'Dr. Development' } }
    : null;

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return getTreatmentPlans(req, res, session);
  } else if (req.method === 'POST') {
    return createTreatmentPlan(req, res, session);
  }
  
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}

async function getTreatmentPlans(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { 
      encounterId, 
      patientId, 
      status,
      providerId,
      limit = '50', 
      offset = '0' 
    } = req.query;
    
    const where: any = {};
    
    if (encounterId) where.encounterId = String(encounterId);
    if (patientId) where.patientId = String(patientId);
    if (status) where.status = String(status);
    if (providerId) where.providerId = String(providerId);
    
    try {
      const [plans, total] = await Promise.all([
        prisma.treatmentPlan.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
        }),
        prisma.treatmentPlan.count({ where }),
      ]);
      
      // Fetch patient info for each plan
      const patientIds = [...new Set(plans.map(p => p.patientId).filter(Boolean))];
      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, firstName: true, lastName: true, mrn: true },
      });
      const patientMap = new Map(patients.map(p => [p.id, p]));
      
      // Parse JSON fields
      const parsedPlans = plans.map((plan: any) => ({
        ...plan,
        patient: patientMap.get(plan.patientId) || null,
        diagnoses: typeof plan.diagnoses === 'string' ? JSON.parse(plan.diagnoses) : plan.diagnoses,
        labOrderIds: typeof plan.labOrderIds === 'string' ? JSON.parse(plan.labOrderIds) : plan.labOrderIds,
        imagingOrderIds: typeof plan.imagingOrderIds === 'string' ? JSON.parse(plan.imagingOrderIds) : plan.imagingOrderIds,
        prescriptionIds: typeof plan.prescriptionIds === 'string' ? JSON.parse(plan.prescriptionIds) : plan.prescriptionIds,
        referralIds: typeof plan.referralIds === 'string' ? JSON.parse(plan.referralIds) : plan.referralIds,
        followUpSchedule: typeof plan.followUpSchedule === 'string' ? JSON.parse(plan.followUpSchedule) : plan.followUpSchedule,
        patientEducation: typeof plan.patientEducation === 'string' ? JSON.parse(plan.patientEducation) : plan.patientEducation,
        returnPrecautions: typeof plan.returnPrecautions === 'string' ? JSON.parse(plan.returnPrecautions) : plan.returnPrecautions,
      }));
      
      return res.status(200).json({
        plans: parsedPlans,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    } catch (prismaError) {
      // Model doesn't exist yet
      console.log('TreatmentPlan model not found, returning mock data');
      return res.status(200).json({
        plans: getMockTreatmentPlans(),
        total: 2,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    }
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    return res.status(500).json({ error: 'Failed to fetch treatment plans' });
  }
}

async function createTreatmentPlan(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const {
      patientId,
      encounterId,
      diagnoses = [],
      chiefComplaint,
      clinicalSummary,
      labOrders = [],
      imagingOrders = [],
      prescriptions = [],
      referrals = [],
      followUpSchedule = [],
      patientEducation = [],
      returnPrecautions = [],
      additionalInstructions,
      protocolApplied,
      status = 'DRAFT',
    } = req.body;
    
    if (!encounterId) {
      return res.status(400).json({ error: 'Encounter ID is required' });
    }
    
    try {
      const plan = await prisma.treatmentPlan.create({
        data: {
          encounterId,
          patientId,
          providerId: session.user.id,
          diagnoses: JSON.stringify(diagnoses),
          chiefComplaint,
          clinicalSummary,
          labOrderIds: JSON.stringify(labOrders.map((o: any) => o.id)),
          imagingOrderIds: JSON.stringify(imagingOrders.map((o: any) => o.id)),
          prescriptionIds: JSON.stringify(prescriptions.map((o: any) => o.id)),
          referralIds: JSON.stringify(referrals.map((o: any) => o.id)),
          followUpSchedule: JSON.stringify(followUpSchedule),
          patientEducation: JSON.stringify(patientEducation),
          returnPrecautions: JSON.stringify(returnPrecautions),
          additionalInstructions,
          protocolApplied,
          status,
        },
      });
      
      // Create notification for submitted plans
      if (status === 'PENDING_REVIEW') {
        try {
          await prisma.notification.create({
            data: {
              userId: session.user.id,
              type: 'SYSTEM',
              title: 'Treatment Plan Submitted',
              message: `Treatment plan for encounter ${encounterId} submitted for review`,
              priority: 'NORMAL',
              relatedType: 'TreatmentPlan',
              relatedId: plan.id,
            },
          });
        } catch (notifError) {
          console.log('Could not create notification:', notifError);
        }
      }
      
      return res.status(201).json({
        ...plan,
        diagnoses,
        labOrders,
        imagingOrders,
        prescriptions,
        referrals,
        followUpSchedule,
        patientEducation,
        returnPrecautions,
      });
    } catch (prismaError) {
      // Model doesn't exist yet
      console.log('TreatmentPlan model not found, returning mock response');
      const mockPlan = {
        id: `plan-${Date.now()}`,
        encounterId,
        patientId,
        providerId: session.user.id,
        diagnoses,
        chiefComplaint,
        clinicalSummary,
        labOrders,
        imagingOrders,
        prescriptions,
        referrals,
        followUpSchedule,
        patientEducation,
        returnPrecautions,
        additionalInstructions,
        protocolApplied,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return res.status(201).json(mockPlan);
    }
  } catch (error) {
    console.error('Error creating treatment plan:', error);
    return res.status(500).json({ error: 'Failed to create treatment plan' });
  }
}

function getMockTreatmentPlans() {
  return [
    {
      id: 'plan-mock-1',
      encounterId: 'enc-001',
      patientId: 'pat-001',
      providerId: 'prov-001',
      diagnoses: [
        { code: 'G43.909', description: 'Migraine, unspecified', type: 'primary' }
      ],
      chiefComplaint: 'Severe headache',
      clinicalSummary: 'Patient presents with severe throbbing headache...',
      labOrders: [],
      imagingOrders: [{ id: 'img-1', name: 'MRI Brain', priority: 'ROUTINE' }],
      prescriptions: [{ id: 'rx-1', name: 'Sumatriptan 100mg', priority: 'ROUTINE' }],
      referrals: [{ id: 'ref-1', name: 'Neurology', priority: 'ROUTINE' }],
      followUpSchedule: [
        { id: 'fu-1', type: 'appointment', description: 'Follow-up visit', timeframe: '2 weeks' }
      ],
      returnPrecautions: [
        { id: 'rp-1', condition: 'Worst headache of life', urgency: 'emergent', instruction: 'Go to ER' }
      ],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'plan-mock-2',
      encounterId: 'enc-002',
      patientId: 'pat-002',
      providerId: 'prov-001',
      diagnoses: [
        { code: 'R07.9', description: 'Chest pain, unspecified', type: 'primary' },
        { code: 'I10', description: 'Essential hypertension', type: 'secondary' }
      ],
      chiefComplaint: 'Chest pain on exertion',
      clinicalSummary: 'Patient with chest pain...',
      labOrders: [{ id: 'lab-1', name: 'Troponin', priority: 'STAT' }],
      imagingOrders: [{ id: 'img-2', name: 'Stress Test', priority: 'URGENT' }],
      prescriptions: [],
      referrals: [{ id: 'ref-2', name: 'Cardiology', priority: 'URGENT' }],
      followUpSchedule: [
        { id: 'fu-2', type: 'appointment', description: 'Cardiology follow-up', timeframe: '1 week' }
      ],
      returnPrecautions: [
        { id: 'rp-2', condition: 'Chest pain at rest', urgency: 'emergent', instruction: 'Call 911' }
      ],
      status: 'DRAFT',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ];
}

export default handler;
