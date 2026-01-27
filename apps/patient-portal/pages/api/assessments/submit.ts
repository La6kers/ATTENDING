// =============================================================================
// ATTENDING AI - Assessment Submit API
// apps/patient-portal/pages/api/assessments/submit.ts
//
// Handles COMPASS assessment submission from chat interface
// This is the main endpoint called when patient completes the assessment
//
// UPDATED: Now saves to database via Prisma
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Types
interface SubmitAssessmentRequest {
  sessionId: string;
  patientId?: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi: {
    onset?: string;
    location?: string;
    duration?: string;
    character?: string;
    severity?: number;
    timing?: string;
    aggravating?: string[];
    relieving?: string[];
    associated?: string[];
  };
  reviewOfSystems?: Record<string, string[]>;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  surgicalHistory?: string[];
  socialHistory?: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory?: string[];
  redFlags: string[];
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  urgencyScore: number;
  conversationHistory?: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  submittedAt: string;
}

interface SubmitAssessmentResponse {
  success: boolean;
  assessmentId: string;
  queuePosition?: number;
  estimatedReviewTime?: string;
  urgentAlert?: boolean;
  message: string;
}

// Map frontend urgency levels to database enum values
function mapUrgencyLevel(level: string): string {
  const mapping: Record<string, string> = {
    'standard': 'STANDARD',
    'moderate': 'MODERATE',
    'high': 'HIGH',
    'emergency': 'EMERGENCY',
    'routine': 'STANDARD',
    'urgent': 'HIGH',
    'critical': 'EMERGENCY',
    'emergent': 'EMERGENCY',
  };
  return mapping[level.toLowerCase()] || 'STANDARD';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitAssessmentResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const data: SubmitAssessmentRequest = req.body;

    // Validate required fields
    if (!data.sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!data.chiefComplaint) {
      return res.status(400).json({ error: 'Chief complaint is required' });
    }

    // Determine if this needs urgent attention
    const isUrgent = data.urgencyLevel === 'high' || data.urgencyLevel === 'emergency';
    const hasRedFlags = data.redFlags && data.redFlags.length > 0;

    // =========================================================================
    // SAVE TO DATABASE
    // =========================================================================
    
    // First, find or create a patient record
    let patientId = data.patientId;
    
    if (!patientId) {
      // Create anonymous patient for demo/unlinked assessments
      const anonymousPatient = await prisma.patient.create({
        data: {
          mrn: `ANON-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          firstName: data.patientName?.split(' ')[0] || 'Anonymous',
          lastName: data.patientName?.split(' ').slice(1).join(' ') || 'Patient',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
          gender: data.gender || 'Unknown',
        },
      });
      patientId = anonymousPatient.id;
    }

    // Create the assessment record
    const assessment = await prisma.patientAssessment.create({
      data: {
        sessionId: data.sessionId,
        patientId: patientId,
        chiefComplaint: data.chiefComplaint,
        
        // HPI fields
        hpiOnset: data.hpi?.onset || null,
        hpiLocation: data.hpi?.location || null,
        hpiDuration: data.hpi?.duration || null,
        hpiCharacter: data.hpi?.character || null,
        hpiSeverity: data.hpi?.severity || null,
        hpiTiming: data.hpi?.timing || null,
        hpiAggravating: JSON.stringify(data.hpi?.aggravating || []),
        hpiRelieving: JSON.stringify(data.hpi?.relieving || []),
        hpiAssociated: JSON.stringify(data.hpi?.associated || []),
        
        // History fields
        reviewOfSystems: data.reviewOfSystems ? JSON.stringify(data.reviewOfSystems) : null,
        medications: JSON.stringify(data.medications || []),
        allergies: JSON.stringify(data.allergies || []),
        medicalHistory: JSON.stringify(data.medicalHistory || []),
        surgicalHistory: JSON.stringify(data.surgicalHistory || []),
        socialHistory: data.socialHistory ? JSON.stringify(data.socialHistory) : null,
        familyHistory: data.familyHistory ? JSON.stringify(data.familyHistory) : null,
        
        // Urgency and risk
        urgencyLevel: mapUrgencyLevel(data.urgencyLevel),
        urgencyScore: data.urgencyScore || 0,
        redFlags: JSON.stringify(data.redFlags || []),
        
        // Status
        status: 'PENDING',
        submittedAt: new Date(data.submittedAt || new Date()),
      },
    });

    // =========================================================================
    // CREATE AUDIT LOG
    // =========================================================================
    
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_SUBMITTED',
        entityType: 'PatientAssessment',
        entityId: assessment.id,
        changes: JSON.stringify({
          urgencyLevel: data.urgencyLevel,
          redFlagCount: data.redFlags?.length || 0,
          hasRedFlags,
          isUrgent,
        }),
        success: true,
      },
    });

    // =========================================================================
    // CREATE EMERGENCY EVENT IF CRITICAL
    // =========================================================================
    
    if (isUrgent || hasRedFlags) {
      await prisma.emergencyEvent.create({
        data: {
          assessmentId: assessment.id,
          patientId: patientId,
          eventType: hasRedFlags ? 'RED_FLAG_DETECTED' : 'URGENT_ASSESSMENT',
          triggeredBy: 'COMPASS_SYSTEM',
          severity: data.urgencyLevel === 'emergency' ? 'CRITICAL' : 'HIGH',
          protocol: 'PROVIDER_NOTIFICATION',
          autoOrders: JSON.stringify([]),
          notes: `Red flags: ${data.redFlags?.join(', ') || 'None'}`,
        },
      });
    }

    // =========================================================================
    // CALCULATE QUEUE POSITION
    // =========================================================================
    
    const pendingCount = await prisma.patientAssessment.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        submittedAt: { lt: new Date(data.submittedAt || new Date()) },
      },
    });
    
    // Urgent cases go to front of queue
    const queuePosition = isUrgent ? 1 : pendingCount + 1;

    // Estimate review time based on urgency
    let estimatedReviewTime = '2-4 hours';
    if (data.urgencyLevel === 'emergency') {
      estimatedReviewTime = 'Immediate';
    } else if (data.urgencyLevel === 'high') {
      estimatedReviewTime = '30 minutes';
    } else if (data.urgencyLevel === 'moderate') {
      estimatedReviewTime = '1-2 hours';
    }

    // Log submission
    console.log(`[ASSESSMENT SUBMITTED] ID: ${assessment.id}, Session: ${data.sessionId}, Urgency: ${data.urgencyLevel}, RedFlags: ${data.redFlags?.length || 0}`);

    return res.status(201).json({
      success: true,
      assessmentId: assessment.id,
      queuePosition,
      estimatedReviewTime,
      urgentAlert: isUrgent || hasRedFlags,
      message: isUrgent
        ? 'Your assessment has been flagged as urgent and will be reviewed immediately.'
        : 'Your assessment has been submitted successfully. A provider will review it shortly.',
    });
  } catch (error) {
    console.error('[ASSESSMENT SUBMIT ERROR]', error);
    
    // Log failed attempt
    try {
      await prisma.auditLog.create({
        data: {
          action: 'ASSESSMENT_SUBMIT_FAILED',
          entityType: 'PatientAssessment',
          entityId: req.body?.sessionId || 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        },
      });
    } catch (logError) {
      console.error('[AUDIT LOG ERROR]', logError);
    }

    return res.status(500).json({
      error: 'Failed to submit assessment. Please try again.',
    });
  }
}
