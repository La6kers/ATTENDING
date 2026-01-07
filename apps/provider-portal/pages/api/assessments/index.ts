// API Route: /api/assessments
// Handles GET (list) and POST (create) operations for patient assessments

import type { NextApiRequest, NextApiResponse } from 'next';
import { PatientAssessment } from '@/store/assessmentQueueStore';

// In-memory storage for development (replace with database in production)
let assessmentsDB: PatientAssessment[] = [];

// Initialize with mock data if empty
const initializeMockData = () => {
  if (assessmentsDB.length === 0) {
    assessmentsDB = [
      {
        id: 'assess-001',
        patientId: 'pat-001',
        patientName: 'Sarah Johnson',
        patientAge: 45,
        patientGender: 'Female',
        chiefComplaint: 'Persistent headache with visual disturbances for 3 days',
        urgencyLevel: 'moderate',
        redFlags: ['Visual changes', 'Sudden onset', 'Worst headache of life'],
        riskFactors: ['Hypertension', 'Family history of stroke', 'Oral contraceptive use'],
        differentialDiagnosis: [
          { name: 'Migraine with aura', probability: 0.55, supportingEvidence: ['Visual disturbances', 'Throbbing quality', 'Photophobia'] },
          { name: 'Tension-type headache', probability: 0.25, supportingEvidence: ['Stress', 'Bilateral location'] },
          { name: 'Hypertensive urgency', probability: 0.15, supportingEvidence: ['HTN history', 'Sudden onset'] },
        ],
        hpiData: {
          onset: '3 days ago',
          location: 'Bilateral frontal and temporal',
          duration: 'Constant with fluctuating intensity',
          character: 'Throbbing, pulsating',
          severity: 7,
          aggravatingFactors: ['Bright lights', 'Screen time'],
          relievingFactors: ['Dark room', 'Ibuprofen'],
          associatedSymptoms: ['Nausea', 'Light sensitivity'],
        },
        medicalHistory: {
          conditions: ['Hypertension', 'Anxiety'],
          medications: ['Lisinopril 10mg daily', 'Oral contraceptive'],
          allergies: ['Sulfa drugs'],
          surgeries: ['Appendectomy 2015'],
        },
        status: 'pending',
        submittedAt: new Date(Date.now() - 30 * 60000).toISOString(),
        clinicalSummary: null,
      },
      {
        id: 'assess-002',
        patientId: 'pat-002',
        patientName: 'Michael Chen',
        patientAge: 62,
        patientGender: 'Male',
        chiefComplaint: 'Chest tightness and pressure with exertion, started 2 days ago',
        urgencyLevel: 'high',
        redFlags: ['Chest pain', 'Exertional symptoms', 'Multiple CAD risk factors'],
        riskFactors: ['Type 2 Diabetes', 'Current smoker', 'Age > 55', 'Male', 'Hyperlipidemia'],
        differentialDiagnosis: [
          { name: 'Unstable angina', probability: 0.40, supportingEvidence: ['New onset exertional symptoms', 'Multiple risk factors'] },
          { name: 'Stable angina pectoris', probability: 0.30, supportingEvidence: ['Exertional trigger', 'Relieved by rest'] },
          { name: 'NSTEMI', probability: 0.20, supportingEvidence: ['Risk factors', 'Arm radiation'] },
        ],
        hpiData: {
          onset: '2 days ago',
          location: 'Substernal, radiates to left arm',
          duration: 'Episodes lasting 10-20 minutes',
          character: 'Pressure, tightness',
          severity: 6,
          aggravatingFactors: ['Walking upstairs', 'Carrying groceries'],
          relievingFactors: ['Rest'],
          associatedSymptoms: ['Shortness of breath'],
        },
        medicalHistory: {
          conditions: ['Type 2 Diabetes', 'Hyperlipidemia', 'Hypertension'],
          medications: ['Metformin 1000mg BID', 'Atorvastatin 40mg', 'Lisinopril 20mg'],
          allergies: [],
          surgeries: ['Hernia repair 2010'],
        },
        status: 'urgent',
        submittedAt: new Date(Date.now() - 10 * 60000).toISOString(),
        clinicalSummary: null,
      },
    ];
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Initialize mock data
  initializeMockData();

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/assessments - List assessments with optional filtering
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status, urgency, limit, offset } = req.query;

  let results = [...assessmentsDB];

  // Filter by status
  if (status && status !== 'all') {
    results = results.filter(a => a.status === status);
  }

  // Filter by urgency
  if (urgency && urgency !== 'all') {
    results = results.filter(a => a.urgencyLevel === urgency);
  }

  // Sort by urgency (high first) then by submission time (newest first)
  results.sort((a, b) => {
    const urgencyOrder = { high: 0, moderate: 1, standard: 2 };
    const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  // Pagination
  const limitNum = limit ? parseInt(limit as string) : 50;
  const offsetNum = offset ? parseInt(offset as string) : 0;
  const paginatedResults = results.slice(offsetNum, offsetNum + limitNum);

  return res.status(200).json({
    assessments: paginatedResults,
    total: results.length,
    limit: limitNum,
    offset: offsetNum,
  });
}

// POST /api/assessments - Create new assessment (from COMPASS)
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const assessmentData = req.body;

  // Validate required fields
  if (!assessmentData.patientId || !assessmentData.chiefComplaint) {
    return res.status(400).json({ 
      error: 'Missing required fields: patientId and chiefComplaint are required' 
    });
  }

  // Create new assessment
  const newAssessment: PatientAssessment = {
    id: `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patientId: assessmentData.patientId,
    patientName: assessmentData.patientName || 'Unknown Patient',
    patientAge: assessmentData.patientAge || 0,
    patientGender: assessmentData.patientGender || 'Unknown',
    chiefComplaint: assessmentData.chiefComplaint,
    clinicalSummary: assessmentData.clinicalSummary || null,
    urgencyLevel: assessmentData.urgencyLevel || 'standard',
    redFlags: assessmentData.redFlags || [],
    riskFactors: assessmentData.riskFactors || [],
    differentialDiagnosis: assessmentData.differentialDiagnosis || [],
    hpiData: assessmentData.hpiData,
    medicalHistory: assessmentData.medicalHistory,
    status: assessmentData.urgencyLevel === 'high' ? 'urgent' : 'pending',
    submittedAt: new Date().toISOString(),
  };

  // Add to database
  assessmentsDB.unshift(newAssessment);

  // In production, this would trigger notifications for urgent cases
  if (newAssessment.urgencyLevel === 'high') {
    console.log('URGENT ASSESSMENT RECEIVED:', newAssessment.id);
    // TODO: Send notification to provider
  }

  return res.status(201).json({
    success: true,
    assessment: newAssessment,
  });
}
