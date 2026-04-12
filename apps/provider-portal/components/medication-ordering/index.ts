// ============================================================
// Medication Ordering Components - Barrel Export
// components/medication-ordering/index.ts
// ============================================================

export { MedicationCard } from './MedicationCard';
export { AIMedicationRecommendationsPanel } from './AIMedicationRecommendationsPanel';
export { MedicationOrderSummary } from './MedicationOrderSummary';
export { MedicationCatalogBrowser } from './MedicationCatalogBrowser';
export { DrugInteractionAlert } from './DrugInteractionAlert';
export { AllergyAlert } from './AllergyAlert';

// Re-export types for convenience
export type {
  Medication,
  DrugSchedule,
  DosageForm,
  DrugCategory,
  PrescriptionPriority,
  SelectedMedication,
  AIMedicationRecommendation,
  DrugInteraction,
  DrugAllergy,
  PatientContext,
  PharmacyInfo,
} from '../../store/medicationOrderingStore';
