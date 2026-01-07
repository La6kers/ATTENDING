// Assessment Submission API Route
// Patient Portal: apps/patient-portal/pages/api/assessments/submit.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import type { 
  PatientAssessment, 
  UrgencyLevel, 
  ClinicalData,
  SubmitAssessmentResponse,
} from '@attending/shared';

interface SubmitRequest {
  sessionId: string;
  clinicalData: Partial<ClinicalData>;
  urgencyLevel: UrgencyLevel;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  patientId?: string;
  patientName?: string;
}

// Generate differential diagnosis based on symptoms
function generateDifferentialDiagnosis(clinicalData: Partial<ClinicalData>) {
  // This would be replaced with actual AI-generated differentials
  const differentials = [
    { name: 'Primary diagnosis to be determined', probability: 0.5, supportingEvidence: ['Patient history'] },
  ];

  // Add condition-specific differentials based on chief complaint
  const complaint = (clinicalData.chiefComplaint || '').toLowerCase();
  
  if (complaint.includes('headache')) {
    differentials.push(
      { name: 'Tension-type headache', probability: 0.4, supportingEvidence: ['Headache symptoms'] },
      { name: 'Migraine', probability: 0.3, supportingEvidence: ['Headache presentation'] }
    );
  }
  
  if (complaint.includes('chest') || complaint.includes('heart')) {
    differentials.push(
      { name: 'Angina pectoris', probability: 0.3, supportingEvidence: ['Chest symptoms'] },
      { name: 'Musculoskeletal chest pain', probability: 0.3, supportingEvidence: ['Chest wall tenderness'] }
    );
  }
  
  if (complaint.includes('cough') || complaint.includes('cold') || complaint.includes('throat')) {
    differentials.push(
      { name: 'Viral upper respiratory infection', probability: 0.5, supportingEvidence: ['URI symptoms'] },
      { name: 'Pharyngitis', probability: 0.3, supportingEvidence: ['Sore throat'] }
    );
  }

  return differentials;
}

// Calculate urgency score
function calculateUrgencyScore(clinicalData: Partial<ClinicalData>, urgencyLevel: UrgencyLevel): number {
  let score = 0;
  
  // Base score from urgency level
  switch (urgencyLevel) {
    case 'high': score += 70; break;
    case 'moderate': score += 40; break;
    default: score += 10;
  }
  
  // Add for red flags
  score += (clinicalData.redFlags?.length || 0) * 15;
  
  // Add for risk factors
  score += (clinicalData.riskFactors?.length || 0) * 5;
  
  return Math.min(100, score);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitAssessmentResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      sessionId, 
      clinicalData, 
      urgencyLevel, 
      messages,
      patientId,
      patientName 
    } = req.body as SubmitRequest;

    if (!sessionId || !clinicalData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate assessment ID
    const assessmentId = `assess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Build the assessment object
    const assessment: Partial<PatientAssessment> = {
      id: assessmentId,
      patientId: patientId || `patient_${sessionId}`,
      patientName: patientName || 'Patient',
      patientAge: 0, // Would come from patient profile
      patientGender: 'Unknown',
      sessionId,
      chiefComplaint: clinicalData.chiefComplaint || 'See assessment details',
      urgencyLevel,
      redFlags: clinicalData.redFlags || [],
      riskFactors: clinicalData.riskFactors || [],
      differentialDiagnosis: generateDifferentialDiagnosis(clinicalData),
      hpiData: clinicalData.hpi,
      medicalHistory: {
        conditions: clinicalData.pmh?.conditions || [],
        medications: clinicalData.medications?.map(m => 
          typeof m === 'string' ? m : m.name
        ) || [],
        allergies: clinicalData.allergies?.map(a => 
          typeof a === 'string' ? a : a.allergen
        ) || [],
        surgeries: clinicalData.pmh?.surgeries || [],
      },
      status: urgencyLevel === 'high' ? 'urgent' : 'pending',
      submittedAt: new Date().toISOString(),
    };

    // In production, save to database:
    // await prisma.patientAssessment.create({ data: assessment });

    // In production, notify provider portal via WebSocket:
    // await CompassBridge.submitAssessment(sessionId);

    // Calculate queue position (mock)
    const queuePosition = Math.floor(Math.random() * 5) + 1;
    const estimatedMinutes = queuePosition * 5 + Math.floor(Math.random() * 10);

    // Log for development
    console.log('[Assessment Submitted]', {
      assessmentId,
      urgencyLevel,
      redFlags: assessment.redFlags,
      queuePosition,
    });

    return res.status(201).json({
      success: true,
      assessmentId,
      queuePosition,
      estimatedReviewTime: `${estimatedMinutes} minutes`,
      urgentAlert: urgencyLevel === 'high',
      message: urgencyLevel === 'high' 
        ? 'Your assessment has been flagged as urgent and will be reviewed immediately.'
        : 'Your assessment has been submitted and will be reviewed shortly.',
    });

  } catch (error) {
    console.error('Assessment submission error:', error);
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
}
