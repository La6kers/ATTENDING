// =============================================================================
// ATTENDING AI - Mock Patient Data
// apps/shared/data/mock/patients.ts
//
// Centralized patient mock data for both portals
// =============================================================================

export type Gender = 'Male' | 'Female' | 'Other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';

export interface Allergy {
  allergen: string;
  severity: AllergySeverity;
  reaction?: string;
}

export interface CurrentAssessment {
  id: string;
  status: 'pending' | 'in_progress' | 'completed';
  urgencyLevel: 'routine' | 'urgent' | 'emergent';
  chiefComplaint: string;
  submittedAt: Date;
  redFlags: string[];
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string;
  avatarColor: string;
  insurancePlan: string;
  allergies: Allergy[];
  medications: string[];
  medicalHistory: string[];
  currentAssessment?: CurrentAssessment;
}

// =============================================================================
// Mock Patient Data
// =============================================================================

export const mockPatients: Patient[] = [
  {
    id: 'P001',
    firstName: 'Emily',
    lastName: 'Chen',
    mrn: 'MRN-2024-001',
    dateOfBirth: '1975-04-12',
    age: 49,
    gender: 'Female',
    phone: '(303) 555-0101',
    email: 'emily.chen@email.com',
    avatarColor: '#7c3aed',
    insurancePlan: 'Blue Cross PPO',
    allergies: [{ allergen: 'Penicillin', severity: 'severe' }],
    medications: ['Metformin 1000mg BID', 'Lisinopril 20mg daily'],
    medicalHistory: ['Type 2 Diabetes', 'Hypertension'],
    currentAssessment: {
      id: 'A001',
      status: 'completed',
      urgencyLevel: 'routine',
      chiefComplaint: 'Diabetes follow-up',
      submittedAt: new Date(Date.now() - 86400000),
      redFlags: [],
    },
  },
  {
    id: 'P002',
    firstName: 'Robert',
    lastName: 'Martinez',
    mrn: 'MRN-2024-002',
    dateOfBirth: '1958-07-22',
    age: 66,
    gender: 'Male',
    phone: '(303) 555-0142',
    email: 'robert.martinez@email.com',
    avatarColor: '#2563eb',
    insurancePlan: 'Medicare',
    allergies: [{ allergen: 'Sulfa', severity: 'moderate' }],
    medications: ['Aspirin 81mg daily', 'Metoprolol 50mg BID', 'Atorvastatin 40mg QHS'],
    medicalHistory: ['CAD', 'Prior MI', 'Hypertension'],
    currentAssessment: {
      id: 'A002',
      status: 'completed',
      urgencyLevel: 'urgent',
      chiefComplaint: 'Chest pain',
      submittedAt: new Date(Date.now() - 7200000),
      redFlags: ['History of CAD', 'Chest pain at rest'],
    },
  },
  {
    id: 'P003',
    firstName: 'Sarah',
    lastName: 'Johnson',
    mrn: 'MRN-2024-003',
    dateOfBirth: '1990-03-15',
    age: 34,
    gender: 'Female',
    phone: '(303) 555-0198',
    email: 'sarah.johnson@email.com',
    avatarColor: '#db2777',
    insurancePlan: 'Aetna HMO',
    allergies: [],
    medications: ['Sumatriptan 100mg PRN'],
    medicalHistory: ['Migraines'],
  },
  {
    id: 'P004',
    firstName: 'Michael',
    lastName: 'Thompson',
    mrn: 'MRN-2024-004',
    dateOfBirth: '1992-09-03',
    age: 32,
    gender: 'Male',
    phone: '(303) 555-0156',
    email: 'michael.thompson@email.com',
    avatarColor: '#059669',
    insurancePlan: 'United Healthcare',
    allergies: [],
    medications: ['Sertraline 100mg daily'],
    medicalHistory: ['GAD', 'Depression'],
  },
  {
    id: 'P005',
    firstName: 'Patricia',
    lastName: 'Anderson',
    mrn: 'MRN-2024-005',
    dateOfBirth: '1962-02-28',
    age: 62,
    gender: 'Female',
    phone: '(303) 555-0167',
    email: 'patricia.anderson@email.com',
    avatarColor: '#d97706',
    insurancePlan: 'Cigna PPO',
    allergies: [{ allergen: 'NSAIDs', severity: 'mild' }],
    medications: ['Acetaminophen PRN', 'Vitamin D 2000IU daily'],
    medicalHistory: ['Osteoarthritis', 'CKD Stage 2'],
  },
  {
    id: 'P006',
    firstName: 'James',
    lastName: 'Wilson',
    mrn: 'MRN-2024-006',
    dateOfBirth: '1969-09-10',
    age: 55,
    gender: 'Male',
    phone: '(303) 555-0178',
    email: 'james.wilson@email.com',
    avatarColor: '#6366f1',
    insurancePlan: 'Blue Shield',
    allergies: [],
    medications: ['Albuterol inhaler PRN', 'Tiotropium daily'],
    medicalHistory: ['COPD', 'Former smoker'],
  },
  {
    id: 'P007',
    firstName: 'Maria',
    lastName: 'Garcia',
    mrn: 'MRN-2024-007',
    dateOfBirth: '1968-03-22',
    age: 56,
    gender: 'Female',
    phone: '(303) 555-0189',
    email: 'maria.garcia@email.com',
    avatarColor: '#ec4899',
    insurancePlan: 'Kaiser',
    allergies: [{ allergen: 'Codeine', severity: 'moderate' }],
    medications: ['Metformin 1000mg BID', 'Glipizide 5mg daily'],
    medicalHistory: ['Type 2 Diabetes'],
  },
  {
    id: 'P008',
    firstName: 'David',
    lastName: 'Lee',
    mrn: 'MRN-2024-008',
    dateOfBirth: '1970-06-19',
    age: 54,
    gender: 'Male',
    phone: '(303) 555-0190',
    email: 'david.lee@email.com',
    avatarColor: '#14b8a6',
    insurancePlan: 'Anthem',
    allergies: [],
    medications: ['Lisinopril 10mg daily', 'Metformin 500mg BID'],
    medicalHistory: ['Type 2 Diabetes', 'Hypertension'],
  },
  {
    id: 'P009',
    firstName: 'Margaret',
    lastName: 'White',
    mrn: 'MRN-2024-009',
    dateOfBirth: '1952-04-15',
    age: 72,
    gender: 'Female',
    phone: '(303) 555-0200',
    email: 'margaret.white@email.com',
    avatarColor: '#f59e0b',
    insurancePlan: 'Medicare Advantage',
    allergies: [{ allergen: 'Aspirin', severity: 'severe' }],
    medications: ['Furosemide 40mg daily', 'Carvedilol 25mg BID', 'Warfarin 5mg daily'],
    medicalHistory: ['CHF', 'AFib', 'Hypertension'],
  },
  {
    id: 'P010',
    firstName: 'Kevin',
    lastName: 'Martinez',
    mrn: 'MRN-2024-010',
    dateOfBirth: '1996-08-22',
    age: 28,
    gender: 'Male',
    phone: '(303) 555-0211',
    email: 'kevin.martinez@email.com',
    avatarColor: '#8b5cf6',
    insurancePlan: 'Cigna',
    allergies: [],
    medications: ['Escitalopram 10mg daily'],
    medicalHistory: ['Anxiety'],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getAllPatients(): Patient[] {
  return mockPatients;
}

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find((p) => p.id === id);
}

export function searchPatients(query: string): Patient[] {
  const lowerQuery = query.toLowerCase();
  return mockPatients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(lowerQuery) ||
      p.lastName.toLowerCase().includes(lowerQuery) ||
      p.mrn.toLowerCase().includes(lowerQuery) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(lowerQuery)
  );
}

export function getPatientsByCondition(condition: string): Patient[] {
  return mockPatients.filter((p) =>
    p.medicalHistory.some((h) => h.toLowerCase().includes(condition.toLowerCase()))
  );
}

export function getPatientsWithActiveAssessments(): Patient[] {
  return mockPatients.filter(
    (p) => p.currentAssessment && p.currentAssessment.status !== 'completed'
  );
}
