// =============================================================================
// ATTENDING AI - Patients API
// apps/provider-portal/pages/api/patients/index.ts
//
// Returns patient data from the centralized mock repository
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAllPatients,
  getPatientById,
  searchPatients,
  getStatistics,
} from '@/lib/mockData';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, search, stats } = req.query;

  // Get statistics
  if (stats === 'true') {
    return res.status(200).json(getStatistics());
  }

  // Get single patient by ID
  if (id && typeof id === 'string') {
    const patient = getPatientById(id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    return res.status(200).json(patient);
  }

  // Search patients
  if (search && typeof search === 'string') {
    const results = searchPatients(search);
    return res.status(200).json({ 
      patients: results.map(transformPatient), 
      total: results.length 
    });
  }

  // Get all patients
  const patients = getAllPatients();
  return res.status(200).json({ 
    patients: patients.map(transformPatient), 
    total: patients.length 
  });
}

function transformPatient(p: ReturnType<typeof getAllPatients>[0]) {
  return {
    id: p.id,
    mrn: p.mrn,
    name: `${p.firstName} ${p.lastName}`,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    age: p.age,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    insurancePlan: p.insurancePlan,
    allergies: p.allergies.map(a => a.allergen),
    allergySeverities: p.allergies,
    conditions: p.medicalHistory,
    medications: p.medications,
    avatarColor: p.avatarColor,
    latestAssessment: p.currentAssessment ? {
      id: p.currentAssessment.id,
      status: p.currentAssessment.status,
      urgencyLevel: p.currentAssessment.urgencyLevel,
      chiefComplaint: p.currentAssessment.chiefComplaint,
      submittedAt: p.currentAssessment.submittedAt,
      redFlagCount: p.currentAssessment.redFlags.length,
    } : null,
    hasActiveAssessment: p.currentAssessment && p.currentAssessment.status === 'pending',
  };
}
