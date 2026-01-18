// =============================================================================
// ATTENDING AI - Assessments API
// apps/provider-portal/pages/api/assessments/index.ts
//
// Returns assessment data from the centralized mock repository
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllAssessments,
  getAssessmentsByStatus,
  getAssessmentsByUrgency,
  getUrgentAssessments,
  getPatientById,
  type AssessmentStatus,
  type UrgencyLevel,
} from '@/lib/mockData';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { status, urgency, urgent } = req.query;

  // Get urgent assessments with patient data
  if (urgent === 'true') {
    const urgentAssessments = getUrgentAssessments();
    return res.status(200).json({ 
      assessments: urgentAssessments.map(a => ({
        ...a,
        patient: {
          id: a.patient.id,
          name: `${a.patient.firstName} ${a.patient.lastName}`,
          mrn: a.patient.mrn,
          age: a.patient.age,
          gender: a.patient.gender,
          avatarColor: a.patient.avatarColor,
        },
      })),
      total: urgentAssessments.length,
    });
  }

  // Filter by status
  if (status && typeof status === 'string') {
    const assessments = getAssessmentsByStatus(status as AssessmentStatus);
    return res.status(200).json({ 
      assessments: enrichAssessmentsWithPatient(assessments),
      total: assessments.length,
    });
  }

  // Filter by urgency
  if (urgency && typeof urgency === 'string') {
    const assessments = getAssessmentsByUrgency(urgency as UrgencyLevel);
    return res.status(200).json({ 
      assessments: enrichAssessmentsWithPatient(assessments),
      total: assessments.length,
    });
  }

  // Get all assessments
  const assessments = getAllAssessments();
  return res.status(200).json({ 
    assessments: enrichAssessmentsWithPatient(assessments),
    total: assessments.length,
  });
}

function enrichAssessmentsWithPatient(assessments: ReturnType<typeof getAllAssessments>) {
  return assessments.map(assessment => {
    const patient = getPatientById(assessment.patientId);
    return {
      ...assessment,
      patient: patient ? {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
        age: patient.age,
        gender: patient.gender,
        avatarColor: patient.avatarColor,
        allergies: patient.allergies,
        medications: patient.medications,
        medicalHistory: patient.medicalHistory,
      } : null,
    };
  });
}
