// =============================================================================
// ATTENDING AI - Assessment Submit API
// apps/patient-portal/pages/api/assessments/submit.ts
//
// Handles COMPASS assessment submission from chat interface
// This is the main endpoint called when patient completes the assessment
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// Types
interface SubmitAssessmentRequest {
  sessionId: string;
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
    aggravating?: string[];
    relieving?: string[];
    associated?: string[];
  };
  reviewOfSystems: Record<string, string[]>;
  medications: string[];
  allergies: string[];
  medicalHistory: string[];
  surgicalHistory: string[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingSituation?: string;
  };
  familyHistory: string[];
  redFlags: string[];
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  urgencyScore: number;
  conversationHistory: Array<{
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

    // Generate assessment ID
    const assessmentId = `ASSESS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Determine if this needs urgent attention
    const isUrgent = data.urgencyLevel === 'high' || data.urgencyLevel === 'emergency';
    const hasRedFlags = data.redFlags && data.redFlags.length > 0;

    // In production, this would:
    // 1. Save to database (Prisma)
    // 2. Notify providers via WebSocket
    // 3. Trigger any urgent alerts
    // 4. Create audit log entry

    // TODO: Save to database
    // const assessment = await prisma.assessment.create({
    //   data: {
    //     id: assessmentId,
    //     sessionId: data.sessionId,
    //     patientName: data.patientName,
    //     chiefComplaint: data.chiefComplaint,
    //     urgencyLevel: data.urgencyLevel,
    //     urgencyScore: data.urgencyScore,
    //     status: 'pending',
    //     clinicalData: data,
    //     redFlags: data.redFlags,
    //     submittedAt: new Date(data.submittedAt),
    //   },
    // });

    // TODO: Notify providers if urgent
    // if (isUrgent || hasRedFlags) {
    //   await notifyProviders({
    //     type: 'urgent_assessment',
    //     assessmentId,
    //     urgencyLevel: data.urgencyLevel,
    //     redFlags: data.redFlags,
    //   });
    // }

    // Calculate queue position (mock for now)
    const queuePosition = isUrgent ? 1 : Math.floor(Math.random() * 5) + 2;

    // Estimate review time based on urgency
    let estimatedReviewTime = '2-4 hours';
    if (data.urgencyLevel === 'emergency') {
      estimatedReviewTime = 'Immediate';
    } else if (data.urgencyLevel === 'high') {
      estimatedReviewTime = '30 minutes';
    } else if (data.urgencyLevel === 'moderate') {
      estimatedReviewTime = '1-2 hours';
    }

    // Log submission for audit
    console.log(`[ASSESSMENT SUBMITTED] ID: ${assessmentId}, Urgency: ${data.urgencyLevel}, RedFlags: ${data.redFlags.length}`);

    return res.status(201).json({
      success: true,
      assessmentId,
      queuePosition,
      estimatedReviewTime,
      urgentAlert: isUrgent || hasRedFlags,
      message: isUrgent
        ? 'Your assessment has been flagged as urgent and will be reviewed immediately.'
        : 'Your assessment has been submitted successfully. A provider will review it shortly.',
    });
  } catch (error) {
    console.error('[ASSESSMENT SUBMIT ERROR]', error);
    return res.status(500).json({
      error: 'Failed to submit assessment. Please try again.',
    });
  }
}
