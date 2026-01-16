// ============================================================
// Clinical Catalogs - Barrel Export
// apps/shared/data/catalogs/index.ts
// ============================================================

// Lab Catalog
export { 
  LAB_CATALOG, 
  LAB_PANELS,
  type LabTest, 
  type LabPanel, 
  type LabCategory 
} from './labCatalog';

// Imaging Catalog
export { 
  IMAGING_CATALOG,
  type ImagingStudy, 
  type ImagingModality 
} from './imagingCatalog';

// Medication Catalog
export { 
  MEDICATION_CATALOG,
  DRUG_INTERACTIONS,
  type Medication, 
  type DrugCategory,
  type DrugSchedule,
  type DosageForm,
  type DrugInteraction
} from './medicationCatalog';

// Referral Catalog
export {
  SPECIALTY_CATALOG,
  PROVIDER_DIRECTORY,
  getSpecialtyByCode,
  getSpecialtiesByCategory,
  getProvidersBySpecialty,
  getPreferredProviders,
  getProvidersAcceptingNew,
  hasRedFlagIndications,
  type Specialty,
  type SpecialtyCategory,
  type ReferralUrgency,
  type ReferralStatus,
  type ReferralProvider
} from './referralCatalog';
