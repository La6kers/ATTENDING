// ============================================================
// ATTENDING AI — Mobile Patient API
// apps/mobile/lib/api/patient.ts
//
// Same contracts as apps/patient-portal/lib/api/patient.ts
// Uses mobile API client instead of web client.
// ============================================================

import api from './mobileApiClient';

// Re-export all types so consumers import from one place
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

export const patientApi = {
  getProfile: () =>
    api.get<PatientProfile>('/patient/profile'),

  updateProfile: (data: Partial<PatientProfile>) =>
    api.put('/patient/profile', data),

  getMedicalID: () =>
    api.get<MedicalID>('/patient/medical-id'),

  saveMedicalID: (data: MedicalID) =>
    api.put('/patient/medical-id', data, { offlineQueue: true }),

  getHealthSummary: () =>
    api.get<HealthSummary>('/patient/health-profile'),

  getVitals: () =>
    api.get<VitalSigns>('/patient/vitals'),

  getMedications: () =>
    api.get<Medication[]>('/patient/medications'),

  getLabResults: (params?: { limit?: number }) =>
    api.get<LabResult[]>(`/patient/labs${params?.limit ? `?limit=${params.limit}` : ''}`),

  getAppointments: (params?: { status?: string; upcoming?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.upcoming) sp.set('upcoming', 'true');
    const qs = sp.toString();
    return api.get<Appointment[]>(`/patient/appointments${qs ? `?${qs}` : ''}`);
  },

  // --- Medication Pricing ---
  getMedicationPrices: () =>
    api.get<MedicationCostSummary>('/patient/medication-prices'),

  searchPharmacyPrices: (params: { medication: string; strength: string; quantity?: number; zipCode?: string }) => {
    const sp = new URLSearchParams();
    sp.set('medication', params.medication);
    sp.set('strength', params.strength);
    if (params.quantity) sp.set('quantity', String(params.quantity));
    if (params.zipCode) sp.set('zipCode', params.zipCode);
    return api.get<{ prices: PharmacyPriceResult[] }>(`/patient/pharmacy-search?${sp}`);
  },
};

// Pricing types
export interface PharmacyPriceResult {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyChain: string | null;
  pharmacyAddress: string;
  price: number;
  source: string;
}

export interface MedicationCostItem {
  name: string;
  genericName: string;
  strength: string;
  quantity: number;
  averageRetailPrice: number;
  lowestPrice: number;
  savings: number;
  savingsPercent: number;
  cheapestPharmacy: string;
  pharmacyPrices: PharmacyPriceResult[];
}

export interface MedicationCostSummary {
  totalMonthlyEstimate: number;
  totalLowestCost: number;
  totalSavings: number;
  medicationCount: number;
  medications: MedicationCostItem[];
}
