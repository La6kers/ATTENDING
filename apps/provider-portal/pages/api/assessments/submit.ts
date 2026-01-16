// API Route: /api/assessments/submit
// Endpoint for COMPASS to submit completed patient assessments to provider queue
// This is the main integration point between Patient Portal (COMPASS) and Provider Portal

import type { NextApiRequest, NextApiResponse } from 'next';
import { ClinicalSummary, UrgencyLevel, Diagnosis } from '@/types/medical';

// Response types
interface SubmitAssessmentRequest {
  // Patient information
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  
  // Clinical data from COMPASS
  chiefComplaint: string;
  urgencyLevel: UrgencyLevel;
  redFlags: string[];
  riskFactors: string[];
  differentialDiagnosis: Diagnosis[];
  
  // Detailed assessment data
  clinicalSummary?: ClinicalSummary;
  hpiData?: {
    onset?: string;
    location?: string;
    duration?: string;
    character?: string;
    severity?: number;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    associatedSymptoms?: string[];
  };
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  reviewOfSystems?: Record<string, string[]>;
  
  // Session metadata
  sessionId?: string;
  compassVersion?: string;
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
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const submissionData: SubmitAssessmentRequest = req.body;

    // Validate required fields
    const validationError = validateSubmission(submissionData);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Generate assessment ID
    const assessmentId = `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate queue position and estimated review time
    // In production, this would query the actual queue
    const queuePosition = await calculateQueuePosition(submissionData.urgencyLevel);
    const estimatedReviewTime = calculateEstimatedReviewTime(queuePosition, submissionData.urgencyLevel);

    // Store assessment (in production, this would go to a database)
    const assessment = {
      id: assessmentId,
      ...submissionData,
      status: submissionData.urgencyLevel === 'high' ? 'urgent' : 'pending',
      submittedAt: new Date().toISOString(),
    };

    // Log for development
    console.log('New assessment submitted:', {
      id: assessmentId,
      patient: submissionData.patientName,
      urgency: submissionData.urgencyLevel,
      redFlags: submissionData.redFlags.length,
    });

    // In production, store in database
    // await db.assessments.create(assessment);

    // Handle urgent cases
    const urgentAlert = submissionData.urgencyLevel === 'high' || submissionData.redFlags.length >= 3;
    if (urgentAlert) {
      // In production, trigger notifications
      await handleUrgentAssessment(assessmentId, submissionData);
    }

    // Return success response
    return res.status(201).json({
      success: true,
      assessmentId,
      queuePosition,
      estimatedReviewTime,
      urgentAlert,
      message: urgentAlert 
        ? 'Your assessment has been flagged as urgent and will be reviewed immediately.'
        : 'Your assessment has been submitted successfully and will be reviewed by a healthcare provider.',
    });

  } catch (error) {
    console.error('Assessment submission error:', error);
    return res.status(500).json({ 
      error: 'Failed to submit assessment. Please try again or contact support.' 
    });
  }
}

// Validation function
function validateSubmission(data: SubmitAssessmentRequest): string | null {
  if (!data.patientId) {
    return 'Patient ID is required';
  }
  if (!data.patientName) {
    return 'Patient name is required';
  }
  if (!data.chiefComplaint) {
    return 'Chief complaint is required';
  }
  if (!data.urgencyLevel) {
    return 'Urgency level is required';
  }
  if (!['standard', 'moderate', 'high', 'emergency'].includes(data.urgencyLevel)) {
    return 'Invalid urgency level. Must be standard, moderate, high, or emergency';
  }
  return null;
}

// Calculate queue position based on urgency
async function calculateQueuePosition(urgencyLevel: UrgencyLevel): Promise<number> {
  // In production, this would query the actual queue
  const mockQueueSizes: Record<UrgencyLevel, number> = {
    emergency: 0,
    high: 2,
    moderate: 5,
    standard: 12,
  };
  return mockQueueSizes[urgencyLevel] ?? 10;
}

// Calculate estimated review time
function calculateEstimatedReviewTime(queuePosition: number, urgencyLevel: UrgencyLevel): string {
  const baseMinutesPerCase: Record<UrgencyLevel, number> = {
    emergency: 0,
    high: 5,
    moderate: 15,
    standard: 30,
  };
  
  const minutes = queuePosition * (baseMinutesPerCase[urgencyLevel] ?? 20);
  
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes < 120) {
    return `About 1 hour`;
  } else {
    const hours = Math.round(minutes / 60);
    return `About ${hours} hours`;
  }
}

// Handle urgent assessment notifications
async function handleUrgentAssessment(assessmentId: string, data: SubmitAssessmentRequest): Promise<void> {
  // In production, this would:
  // 1. Send push notification to on-call providers
  // 2. Send SMS/email alerts
  // 3. Update real-time dashboard
  // 4. Log to audit system
  
  console.log(`🚨 URGENT ASSESSMENT ALERT 🚨`);
  console.log(`Assessment ID: ${assessmentId}`);
  console.log(`Patient: ${data.patientName}`);
  console.log(`Chief Complaint: ${data.chiefComplaint}`);
  console.log(`Red Flags: ${data.redFlags.join(', ')}`);
  console.log(`Risk Factors: ${data.riskFactors.join(', ')}`);
  
  // Simulate notification delay
  await new Promise(resolve => setTimeout(resolve, 100));
}
