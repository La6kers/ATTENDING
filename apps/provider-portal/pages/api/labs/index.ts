// =============================================================================
// Lab Orders API - List & Create
// apps/provider-portal/pages/api/labs/index.ts
//
// UPDATED: Integrated clinical-services for AI-powered recommendations
// and validation of lab orders against patient context.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';
import { requireAuth, createAuditLog } from '@/lib/api/auth';
import { 
  CreateLabOrderSchema, 
  validate, 
} from '@attending/shared/schemas';
import {
  labRecommender,
  redFlagEvaluator,
} from '@attending/clinical-services';

// =============================================================================
// Types
// =============================================================================

interface LabOrderResponse {
  labOrders: any[];
  total: number;
  limit: number;
  offset: number;
  recommendations?: {
    critical: any[];
    recommended: any[];
    consider: any[];
  };
}

// =============================================================================
// Main Handler
// =============================================================================

async function handler(req: NextApiRequest, res: NextApiResponse, _session: any) {
  switch (req.method) {
    case 'GET':
      return getLabOrders(req, res);
    case 'POST':
      return createLabOrder(req, res, _session);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// =============================================================================
// GET - List Lab Orders
// =============================================================================

async function getLabOrders(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      encounterId, 
      patientId, 
      status, 
      priority, 
      limit = '50', 
      offset = '0',
      includeRecommendations = 'false',
    } = req.query;
    
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
    
    const response: LabOrderResponse = {
      labOrders,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    };
    
    // Include AI recommendations if requested with encounter context
    if (includeRecommendations === 'true' && encounterId) {
      const encounter = await prisma.encounter.findUnique({
        where: { id: String(encounterId) },
        include: {
          patient: true,
          patientAssessment: true,
        },
      });
      
      if (encounter?.patientAssessment) {
        const assessment = encounter.patientAssessment;
        const symptoms = (assessment as any).symptoms || [];
        
        // Get AI-powered lab recommendations
        const recommendations = labRecommender.getRecommendations({
          chiefComplaint: (assessment as any).chiefComplaint || '',
          symptoms,
          age: calculateAge(encounter.patient.dateOfBirth) || 0,
          gender: encounter.patient.gender || 'unknown',
        });
        
        // Group by priority/category
        const criticalRecs = recommendations.filter(r => r.priority === 'STAT');
        const recommendedRecs = recommendations.filter(r => r.category === 'critical' || r.category === 'recommended');
        const considerRecs = recommendations.filter(r => r.category !== 'critical' && r.category !== 'recommended');
        
        response.recommendations = {
          critical: criticalRecs,
          recommended: recommendedRecs,
          consider: considerRecs,
        };
      }
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching lab orders:', error);
    return res.status(500).json({ error: 'Failed to fetch lab orders' });
  }
}

// =============================================================================
// POST - Create Lab Order
// =============================================================================

async function createLabOrder(req: NextApiRequest, res: NextApiResponse, session: any) {
  // Validate request body with Zod
  const validation = validate(CreateLabOrderSchema, req.body);
  
  if (!validation.success) {
    return res.status(400).json(validation.error.toJSON());
  }

  const { 
    encounterId, 
    tests, 
    indication, 
    priority, 
    specialInstructions, 
    collectionDate 
  } = validation.data;

  try {
    // Verify encounter exists and get patient context
    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { 
        patient: true,
        patientAssessment: true,
      },
    });
    
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    // Get latest assessment for clinical context
    const assessment = encounter.patientAssessment;
    const symptoms = (assessment as any)?.symptoms || [];
    const chiefComplaint = (assessment as any)?.chiefComplaint || indication;
    
    // CLINICAL SAFETY CHECK: Evaluate for red flags
    const redFlagResult = redFlagEvaluator.evaluate({
      symptoms,
      chiefComplaint,
    });
    
    const hasEmergencyRedFlags = redFlagResult.isEmergency;
    
    // If emergency red flags detected, auto-upgrade to STAT if not already
    let effectivePriority = priority;
    let priorityUpgradeReason: string | undefined;
    
    if (hasEmergencyRedFlags && priority !== 'STAT') {
      effectivePriority = 'STAT';
      priorityUpgradeReason = `Auto-upgraded to STAT due to emergency indicators: ${redFlagResult.redFlags.map(rf => rf.message).join(', ')}`;
    }
    
    // Get AI recommendations for additional labs to suggest
    const recommendations = labRecommender.getRecommendations({
      chiefComplaint,
      symptoms,
      age: calculateAge(encounter.patient.dateOfBirth) || 0,
      gender: encounter.patient.gender || 'unknown',
    });
    
    // Separate critical from other recommendations
    const criticalRecs = recommendations.filter(r => r.priority === 'STAT');
    const recommendedRecs = recommendations.filter(r => r.priority !== 'STAT');
    
    // Check if any critical recommended labs are missing from the order
    const orderedTestCodes = tests.map(t => t.code);
    const missingCriticalLabs = criticalRecs.filter(
      rec => !orderedTestCodes.includes(rec.testCode)
    );
    
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
            priority: test.priority || effectivePriority,
            indication,
            specialInstructions: [
              specialInstructions,
              priorityUpgradeReason,
            ].filter(Boolean).join(' | '),
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
    if (effectivePriority === 'STAT') {
      await prisma.notification.create({
        data: {
          userId: session.user.id, // In production, this would be the lab supervisor
          type: 'ALERT',
          title: 'STAT Lab Order',
          message: `STAT lab order for ${encounter.patient.lastName}, ${encounter.patient.firstName}${
            priorityUpgradeReason ? ` - ${priorityUpgradeReason}` : ''
          }`,
          priority: 'HIGH',
          relatedType: 'LabOrder',
          relatedId: labOrders[0].id,
        },
      });
    }
    
    // Log the order with clinical safety metadata
    await createAuditLog(
      session.user.id,
      'CREATE',
      'LabOrder',
      labOrders.map(l => l.id).join(','),
      { 
        tests: tests.map((t) => t.name), 
        priority: effectivePriority,
        originalPriority: priority,
        priorityUpgraded: !!priorityUpgradeReason,
        priorityUpgradeReason,
        redFlagsDetected: redFlagResult.redFlags.map(rf => rf.message),
        patientContext: {
          patientId: encounter.patient.id,
          symptoms,
          chiefComplaint,
        },
      },
      req
    );
    
    // Return response with clinical decision support info
    return res.status(201).json({
      labOrders,
      clinicalDecisionSupport: {
        priorityUpgraded: !!priorityUpgradeReason,
        priorityUpgradeReason,
        redFlagsDetected: redFlagResult.redFlags,
        missingCriticalLabs,
        recommendations: {
          critical: criticalRecs,
          recommended: recommendedRecs,
        },
      },
    });
  } catch (error) {
    console.error('Error creating lab order:', error);
    return res.status(500).json({ error: 'Failed to create lab order' });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateAge(dateOfBirth: Date | string | null): number | undefined {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default requireAuth(handler);
