// ============================================================
// Clinical Catalogs - Barrel Export
// apps/shared/catalogs/index.ts
//
// Central export for all clinical catalogs
// ============================================================

// Types
export * from './types';

// Lab Catalog
export {
  LAB_CATALOG,
  LAB_PANELS,
  getLabTest,
  getLabPanel,
  searchLabs,
  getLabsByCategory,
  getAllLabTests,
  getAllLabPanels,
} from './labs';

// Imaging Catalog
export {
  IMAGING_CATALOG,
  getImagingStudy,
  searchImaging,
  getImagingByModality,
  getImagingByBodyPart,
  getAllImagingStudies,
  getContrastStudies,
  getNonContrastAlternative,
} from './imaging';

// Medication Catalog
export {
  MEDICATION_CATALOG,
  DRUG_INTERACTIONS,
  CROSS_REACTIVITY,
  PREGNANCY_CONTRAINDICATED,
  RENAL_ADJUSTMENT_DRUGS,
  getMedication,
  searchMedications,
  getMedicationsByCategory,
  getControlledMedications,
  getAllMedications,
  checkDrugInteractions,
} from './medications';

// Referral Catalog
export {
  SPECIALTY_CATALOG,
  PROVIDER_DIRECTORY,
  getSpecialty,
  getAllSpecialties,
  searchSpecialties,
  getSpecialtiesByCategory,
  getProvidersBySpecialty,
  getPreferredProviders,
  generateReferralRecommendations,
  type Specialty,
  type SpecialtyCategory,
  type ReferralProvider,
  type ReferralRecommendation,
  type ReferralUrgency,
  type PatientReferralContext,
} from './referrals';
