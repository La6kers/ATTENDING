// =============================================================================
// ATTENDING AI - Mock Assessment Data
// apps/shared/data/mock/assessments.ts
//
// Centralized assessment mock data for both portals
// =============================================================================

import { mockPatients, type Patient } from './patients';

export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'reviewed';
export type UrgencyLevel = 'routine' | 'urgent' | 'emergent';

export interface Assessment {
  id: string;
  patientId: string;
  status: AssessmentStatus;
  urgencyLevel: UrgencyLevel;
  chiefComplaint: string;
  redFlags: string[];
  symptoms: string[];
  duration: string;
  createdAt: Date;
  completedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export interface AssessmentWithPatient extends Assessment {
  patient: Patient;
}

// =============================================================================
// Mock Assessment Data
// =============================================================================

export const mockAssessments: Assessment[] = [
  {
    id: 'A001',
    patientId: 'P001',
    status: 'completed',
    urgencyLevel: 'routine',
    chiefComplaint: 'Diabetes follow-up',
    redFlags: [],
    symptoms: ['Increased thirst', 'Fatigue'],
    duration: '2 weeks',
    createdAt: new Date(Date.now() - 86400000),
    completedAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'A002',
    patientId: 'P002',
    status: 'completed',
    urgencyLevel: 'urgent',
    chiefComplaint: 'Chest pain',
    redFlags: ['History of CAD', 'Chest pain at rest', 'Diaphoresis'],
    symptoms: ['Chest pressure', 'Shortness of breath', 'Sweating'],
    duration: '2 hours',
    createdAt: new Date(Date.now() - 7200000),
    completedAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'A003',
    patientId: 'P003',
    status: 'in_progress',
    urgencyLevel: 'routine',
    chiefComplaint: 'Severe headache',
    redFlags: [],
    symptoms: ['Throbbing headache', 'Nausea', 'Light sensitivity'],
    duration: '6 hours',
    createdAt: new Date(Date.now() - 1800000),
  },
  {
    id: 'A004',
    patientId: 'P004',
    status: 'pending',
    urgencyLevel: 'routine',
    chiefComplaint: 'Anxiety follow-up',
    redFlags: [],
    symptoms: ['Worry', 'Sleep difficulty'],
    duration: 'Ongoing',
    createdAt: new Date(Date.now() - 900000),
  },
  {
    id: 'A005',
    patientId: 'P005',
    status: 'reviewed',
    urgencyLevel: 'routine',
    chiefComplaint: 'Annual physical',
    redFlags: [],
    symptoms: [],
    duration: 'N/A',
    createdAt: new Date(Date.now() - 172800000),
    completedAt: new Date(Date.now() - 86400000),
    reviewedAt: new Date(Date.now() - 43200000),
    reviewedBy: 'Dr. Thomas Reed',
  },
  {
    id: 'A006',
    patientId: 'P009',
    status: 'pending',
    urgencyLevel: 'urgent',
    chiefComplaint: 'Shortness of breath',
    redFlags: ['CHF history', 'Worsening edema', 'Orthopnea'],
    symptoms: ['Progressive SOB', 'Ankle swelling', 'Fatigue'],
    duration: '1 week',
    createdAt: new Date(Date.now() - 600000),
  },
  {
    id: 'A007',
    patientId: 'P006',
    status: 'in_progress',
    urgencyLevel: 'routine',
    chiefComplaint: 'Cough and congestion',
    redFlags: [],
    symptoms: ['Productive cough', 'Nasal congestion', 'Low-grade fever'],
    duration: '4 days',
    createdAt: new Date(Date.now() - 2400000),
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getAllAssessments(): Assessment[] {
  return mockAssessments;
}

export function getAssessmentById(id: string): Assessment | undefined {
  return mockAssessments.find((a) => a.id === id);
}

export function getAssessmentsByStatus(status: AssessmentStatus): Assessment[] {
  return mockAssessments.filter((a) => a.status === status);
}

export function getAssessmentsByUrgency(urgency: UrgencyLevel): Assessment[] {
  return mockAssessments.filter((a) => a.urgencyLevel === urgency);
}

export function getUrgentAssessments(): Assessment[] {
  return mockAssessments.filter(
    (a) => (a.urgencyLevel === 'urgent' || a.urgencyLevel === 'emergent') && a.status !== 'completed'
  );
}

export function getAssessmentsWithPatient(): AssessmentWithPatient[] {
  return mockAssessments.map((assessment) => ({
    ...assessment,
    patient: mockPatients.find((p) => p.id === assessment.patientId)!,
  })).filter((a) => a.patient);
}

export function getAssessmentsByPatientId(patientId: string): Assessment[] {
  return mockAssessments.filter((a) => a.patientId === patientId);
}

export function getPendingAssessmentCount(): number {
  return mockAssessments.filter((a) => a.status === 'pending').length;
}

export function getUrgentAssessmentCount(): number {
  return mockAssessments.filter(
    (a) => (a.urgencyLevel === 'urgent' || a.urgencyLevel === 'emergent') && 
           a.status !== 'completed' && 
           a.status !== 'reviewed'
  ).length;
}
