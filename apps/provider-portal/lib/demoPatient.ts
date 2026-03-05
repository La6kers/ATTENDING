// ============================================================
// Shared Demo Patient — Single Source of Truth
// apps/provider-portal/lib/demoPatient.ts
//
// Used by all ordering pages (labs, imaging, medications, referrals)
// when no real patientId is provided via URL params.
//
// Keep this consistent so demos look polished across all pages.
// ============================================================

import type { OrderingContext } from '@attending/shared/catalogs';

/**
 * Full demo patient context for ordering pages that use OrderingContext.
 * Includes imaging safety fields (weight, creatinine, gfr, pregnant)
 * and referral fields (insurancePlan, pcp).
 */
export const DEMO_PATIENT: OrderingContext = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-001',
  chiefComplaint: 'Severe headache with visual disturbances and confusion for 3 days',
  primaryDiagnosis: 'Headache - Rule out secondary cause',
  allergies: [
    { allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' },
    { allergen: 'Sulfa drugs', reaction: 'Hives', severity: 'mild' },
  ],
  currentMedications: ['Oral contraceptive', 'Metformin 500mg BID', 'Lisinopril 10mg daily'],
  medicalHistory: ['Type 2 Diabetes', 'Hypertension', 'Migraines'],
  redFlags: ['Worst headache of life', 'Confusion', 'Visual changes'],
  // Imaging safety
  weight: 68,
  creatinine: 0.9,
  gfr: 95,
  pregnant: false,
  // Referral / administrative
  insurancePlan: 'Blue Cross Blue Shield',
  pcp: 'Dr. Robert Johnson',
};

/**
 * Compact demo patient for the medications page, which uses a simpler PatientContext.
 * Derived from DEMO_PATIENT to stay consistent.
 */
export const DEMO_PATIENT_COMPACT = {
  id: DEMO_PATIENT.id,
  name: DEMO_PATIENT.name,
  age: DEMO_PATIENT.age,
  gender: DEMO_PATIENT.gender,
  mrn: DEMO_PATIENT.mrn,
  allergies: DEMO_PATIENT.allergies.map((a) =>
    typeof a === 'string'
      ? { allergen: a, reaction: 'Unknown', severity: 'moderate' as const }
      : { allergen: a.allergen, reaction: a.reaction || 'Unknown', severity: (a.severity || 'moderate') as 'mild' | 'moderate' | 'severe' },
  ),
  currentMedications: DEMO_PATIENT.currentMedications,
};
