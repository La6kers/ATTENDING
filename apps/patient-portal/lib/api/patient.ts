// ============================================================
// ATTENDING AI — Patient API Service
// apps/patient-portal/lib/api/patient.ts
//
// Patient profile, medical ID, health data, vitals, allergies,
// conditions, and medications.
// ============================================================

import api from './client';

// ============================================================
// Types
// ============================================================

export interface PatientProfile {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  sex: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  primaryLanguage: string;
  isActive: boolean;
  allergies: Allergy[];
  conditions: MedicalCondition[];
  createdAt: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  isActive: boolean;
}

export interface MedicalCondition {
  id: string;
  code: string;
  name: string;
  onsetDate: string | null;
  isActive: boolean;
}

export interface MedicalID {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  bloodType: string;
  height: string;
  weight: string;
  allergies: { name: string; severity: string; reaction: string }[];
  conditions: { name: string; since: string }[];
  medications: { name: string; dosage: string; frequency: string }[];
  emergencyNotes: string;
  organDonor: boolean;
}

export interface VitalSigns {
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  weight: number;
  recordedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  refillDate: string | null;
  isActive: boolean;
}

export interface LabResult {
  id: string;
  testName: string;
  testCode: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'Abnormal' | 'Critical';
  trend: 'up' | 'down' | 'stable' | null;
  collectedAt: string;
}

export interface HealthSummary {
  vitals: VitalSigns | null;
  allergies: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];
  recentLabs: LabResult[];
}

export interface Appointment {
  id: string;
  provider: string;
  specialty: string;
  type: string;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

// ============================================================
// API Functions
// ============================================================

export const patientApi = {
  /** Get full patient profile by ID */
  getProfile: (patientId: string) =>
    api.get<PatientProfile>(`/patient/profile`, { target: 'next' }),

  /** Update patient profile fields */
  updateProfile: (data: Partial<PatientProfile>) =>
    api.put(`/patient/profile`, data),

  /** Get medical ID (emergency card data) */
  getMedicalID: () =>
    api.get<MedicalID>(`/patient/medical-id`),

  /** Save medical ID */
  saveMedicalID: (data: MedicalID) =>
    api.put(`/patient/medical-id`, data, { offlineQueue: true }),

  /** Get health summary (vitals, allergies, conditions, meds, labs) */
  getHealthSummary: () =>
    api.get<HealthSummary>(`/patient/health-profile`),

  /** Get latest vitals */
  getVitals: () =>
    api.get<VitalSigns>(`/patient/vitals`),

  /** Add allergy (via backend) */
  addAllergy: (patientId: string, data: { allergen: string; severity: string; reaction: string }) =>
    api.post(`/patients/${patientId}/allergies`, data, { target: 'backend' }),

  /** Add condition (via backend) */
  addCondition: (patientId: string, data: { code: string; name: string; onsetDate: string }) =>
    api.post(`/patients/${patientId}/conditions`, data, { target: 'backend' }),

  /** Get medications list */
  getMedications: () =>
    api.get<Medication[]>(`/patient/medications`),

  /** Get lab results */
  getLabResults: (params?: { limit?: number }) =>
    api.get<LabResult[]>(`/patient/labs${params?.limit ? `?limit=${params.limit}` : ''}`),

  /** Get appointments */
  getAppointments: (params?: { status?: string; upcoming?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.upcoming) searchParams.set('upcoming', 'true');
    const qs = searchParams.toString();
    return api.get<Appointment[]>(`/patient/appointments${qs ? `?${qs}` : ''}`);
  },
};

export default patientApi;
