// ============================================================
// API Route: /api/assessments/submit
// apps/patient-portal/pages/api/assessments/submit.ts
//
// Submits completed COMPASS assessment directly to database
// Triggers WebSocket notification for providers
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { UrgencyLevel, AssessmentStatus } from '@prisma/client';

// WebSocket server URL for notifications
const WS_URL = process.env.WEBSOCKET_URL || 'http://localhost:3003';

interface SubmitRequest {
  sessionId: string;
  patientId?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  dateOfBirth?: string;
  chiefComplaint?: string;
  clinicalData?: {
    chiefComplaint?: string;
    hpi?: any;
    ros?: any;
    pmh?: any;
    medications?: string[];
    allergies?: string[];
    riskFactors?: string[];
    redFlags?: string[];
    socialHistory?: any;
    familyHistory?: any;
  };
  hpiData?: any;
  medicalHistory?: any;
  urgencyLevel?: string;
  urgencyScore?: number;
  redFlags?: string[];
  riskFactors?: string[];
  conversationHistory?: any[];
  submittedAt?: string;
  compassVersion?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body as SubmitRequest;

    // Get chief complaint from either location
    const chiefComplaint = data.chiefComplaint || data.clinicalData?.chiefComplaint;

    // Validate required fields
    if (!data.sessionId || !chiefComplaint) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId and chiefComplaint',
      });
    }

    // Map urgency level to Prisma enum
    const urgencyLevel = mapUrgencyLevel(data.urgencyLevel || 'standard');
    
    // Determine status based on urgency
    const status: AssessmentStatus = 
      urgencyLevel === UrgencyLevel.HIGH || urgencyLevel === UrgencyLevel.EMERGENCY
        ? AssessmentStatus.URGENT
        : AssessmentStatus.PENDING;

    // Calculate urgency score if not provided
    const urgencyScore = data.urgencyScore || calculateUrgencyScore(data);

    // Get or create patient
    let patientId = data.patientId;
    
    if (!patientId || patientId.startsWith('temp_')) {
      // Create a temporary patient record for anonymous submissions
      const tempPatient = await prisma.patient.create({
        data: {
          mrn: `COMPASS-${Date.now()}`,
          firstName: data.patientName?.split(' ')[0] || 'Anonymous',
          lastName: data.patientName?.split(' ').slice(1).join(' ') || 'Patient',
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
          gender: data.patientGender || 'Unknown',
        },
      });
      patientId = tempPatient.id;
    }

    // Extract HPI data
    const hpi = data.hpiData || data.clinicalData?.hpi || {};
    const medHistory = data.medicalHistory || {};

    // Create assessment in database
    const assessment = await prisma.patientAssessment.create({
      data: {
        patientId,
        sessionId: data.sessionId,
        chiefComplaint,
        urgencyLevel,
        urgencyScore,
        status,
        
        // HPI fields
        hpiOnset: hpi.onset,
        hpiLocation: hpi.location,
        hpiDuration: hpi.duration,
        hpiCharacter: hpi.character,
        hpiSeverity: hpi.severity ? parseInt(hpi.severity) : null,
        hpiTiming: hpi.timing,
        hpiAggravating: hpi.aggravatingFactors || hpi.aggravating || [],
        hpiRelieving: hpi.relievingFactors || hpi.relieving || [],
        hpiAssociated: hpi.associatedSymptoms || hpi.associated || [],
        
        // Medical history
        medications: medHistory.medications || data.clinicalData?.medications || [],
        allergies: medHistory.allergies || data.clinicalData?.allergies || [],
        medicalHistory: medHistory.conditions || data.clinicalData?.pmh?.conditions || [],
        surgicalHistory: medHistory.surgeries || data.clinicalData?.pmh?.surgeries || [],
        
        // Review of systems and history
        reviewOfSystems: data.clinicalData?.ros || {},
        socialHistory: data.clinicalData?.socialHistory || {},
        familyHistory: data.clinicalData?.familyHistory ? JSON.stringify(data.clinicalData.familyHistory) : null,
        
        // Risk assessment
        redFlags: data.redFlags || data.clinicalData?.redFlags || [],
        riskFactors: data.riskFactors || data.clinicalData?.riskFactors || [],
        
        // AI-generated content
        differentialDx: { primary: generateDifferentialDx(chiefComplaint, data.redFlags || []) },
        aiRecommendations: generateRecommendations(data),
        clinicalPearls: [],
        
        // Metadata
        compassVersion: data.compassVersion || '1.0.0',
        aiModelUsed: 'COMPASS-NLP-v1',
        submittedAt: new Date(),
      },
      include: {
        patient: true,
      },
    });

    // Get queue position
    const queuePosition = await getQueuePosition(assessment.id);

    // Create notification for providers
    const provider = await prisma.user.findFirst({
      where: { role: 'PROVIDER', isActive: true },
    });

    if (provider) {
      await prisma.notification.create({
        data: {
          userId: provider.id,
          type: status === AssessmentStatus.URGENT ? 'URGENT_ASSESSMENT' : 'NEW_ASSESSMENT',
          title: `${status === AssessmentStatus.URGENT ? '🚨 URGENT' : '📋 New'}: ${assessment.patient.firstName} ${assessment.patient.lastName}`,
          message: chiefComplaint.substring(0, 200),
          priority: status === AssessmentStatus.URGENT ? 'CRITICAL' : 'NORMAL',
          relatedType: 'PatientAssessment',
          relatedId: assessment.id,
          actionUrl: `/assessments/${assessment.id}`,
        },
      });
    }

    // Notify WebSocket server for real-time update
    await notifyWebSocket({
      id: assessment.id,
      sessionId: assessment.sessionId,
      patientName: `${assessment.patient.firstName} ${assessment.patient.lastName}`,
      chiefComplaint,
      urgencyLevel: data.urgencyLevel || 'standard',
      urgencyScore,
      redFlags: assessment.redFlags,
      status: status.toLowerCase(),
    });

    // Return success response
    return res.status(200).json({
      success: true,
      assessmentId: assessment.id,
      sessionId: assessment.sessionId,
      queuePosition,
      estimatedReviewTime: getEstimatedReviewTime(urgencyLevel),
      urgentAlert: status === AssessmentStatus.URGENT,
      message: 'Assessment submitted successfully',
    });

  } catch (error) {
    console.error('Assessment submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit assessment. Please try again.',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function mapUrgencyLevel(level: string): UrgencyLevel {
  const mapping: Record<string, UrgencyLevel> = {
    standard: UrgencyLevel.STANDARD,
    moderate: UrgencyLevel.MODERATE,
    high: UrgencyLevel.HIGH,
    emergency: UrgencyLevel.EMERGENCY,
  };
  return mapping[level?.toLowerCase()] || UrgencyLevel.STANDARD;
}

function calculateUrgencyScore(data: SubmitRequest): number {
  let score = 0;

  // Severity contribution (0-50)
  const severity = data.hpiData?.severity || data.clinicalData?.hpi?.severity;
  if (severity) {
    score += parseInt(severity) * 5;
  }

  // Red flags contribution
  const redFlagCount = (data.redFlags || data.clinicalData?.redFlags)?.length || 0;
  score += redFlagCount * 15;

  // Risk factors contribution
  const riskFactorCount = (data.riskFactors || data.clinicalData?.riskFactors)?.length || 0;
  score += riskFactorCount * 5;

  // Urgency level override
  if (data.urgencyLevel === 'high' || data.urgencyLevel === 'emergency') {
    score = Math.max(score, 80);
  } else if (data.urgencyLevel === 'moderate') {
    score = Math.max(score, 50);
  }

  return Math.min(100, score);
}

function generateDifferentialDx(chiefComplaint: string, redFlags: string[]): any[] {
  const complaint = chiefComplaint.toLowerCase();
  const differentials: any[] = [];

  // Headache differentials
  if (complaint.includes('headache') || complaint.includes('head pain')) {
    if (redFlags.some(f => f.toLowerCase().includes('thunderclap') || f.toLowerCase().includes('worst'))) {
      differentials.push({
        name: 'Subarachnoid Hemorrhage',
        probability: 0.3,
        icdCode: 'I60.9',
        supportingEvidence: ['Sudden onset', 'Worst headache of life'],
      });
    }
    differentials.push(
      { name: 'Migraine', probability: 0.4, icdCode: 'G43.909', supportingEvidence: [] },
      { name: 'Tension Headache', probability: 0.3, icdCode: 'G44.209', supportingEvidence: [] }
    );
  }

  // Chest pain differentials
  if (complaint.includes('chest') && (complaint.includes('pain') || complaint.includes('pressure'))) {
    differentials.push(
      { name: 'Acute Coronary Syndrome', probability: 0.35, icdCode: 'I24.9', supportingEvidence: redFlags.filter(f => f.includes('Chest') || f.includes('Cardiac')) },
      { name: 'Musculoskeletal Chest Pain', probability: 0.3, icdCode: 'R07.89', supportingEvidence: [] },
      { name: 'GERD', probability: 0.2, icdCode: 'K21.0', supportingEvidence: [] }
    );
  }

  // Abdominal pain differentials
  if (complaint.includes('abdominal') || complaint.includes('stomach') || complaint.includes('belly')) {
    differentials.push(
      { name: 'Gastroenteritis', probability: 0.35, icdCode: 'K52.9', supportingEvidence: [] },
      { name: 'Appendicitis', probability: 0.2, icdCode: 'K35.80', supportingEvidence: [] }
    );
  }

  // Default
  if (differentials.length === 0) {
    differentials.push({
      name: 'Further Evaluation Needed',
      probability: 1.0,
      supportingEvidence: ['Awaiting provider review'],
    });
  }

  return differentials;
}

function generateRecommendations(data: SubmitRequest): string[] {
  const recommendations: string[] = [];
  const redFlags = data.redFlags || data.clinicalData?.redFlags || [];

  if (data.urgencyLevel === 'high' || data.urgencyLevel === 'emergency') {
    recommendations.push('Immediate provider evaluation recommended');
    recommendations.push('Consider STAT labs and imaging based on presentation');
  }

  if (redFlags.some(f => f.toLowerCase().includes('chest'))) {
    recommendations.push('STAT ECG recommended');
    recommendations.push('Serial troponins');
  }

  if (redFlags.some(f => f.toLowerCase().includes('headache'))) {
    recommendations.push('STAT CT Head without contrast');
    recommendations.push('Consider LP if CT negative');
  }

  if (recommendations.length === 0) {
    recommendations.push('Complete history and physical examination');
    recommendations.push('Consider appropriate labs based on clinical presentation');
  }

  return recommendations;
}

async function getQueuePosition(assessmentId: string): Promise<number> {
  const assessment = await prisma.patientAssessment.findUnique({
    where: { id: assessmentId },
  });
  
  if (!assessment) return 1;

  const count = await prisma.patientAssessment.count({
    where: {
      status: { in: [AssessmentStatus.PENDING, AssessmentStatus.URGENT] },
      createdAt: { lt: assessment.createdAt },
    },
  });
  
  return count + 1;
}

function getEstimatedReviewTime(urgency: UrgencyLevel): string {
  switch (urgency) {
    case UrgencyLevel.EMERGENCY:
    case UrgencyLevel.HIGH:
      return '5-10 minutes';
    case UrgencyLevel.MODERATE:
      return '15-30 minutes';
    default:
      return '1-2 hours';
  }
}

async function notifyWebSocket(assessment: any): Promise<void> {
  try {
    await fetch(`${WS_URL}/webhook/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment }),
    });
  } catch (error) {
    console.error('WebSocket notification failed:', error);
    // Don't fail the request if WS notification fails
  }
}
