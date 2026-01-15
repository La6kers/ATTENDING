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
  getMedication,
  searchMedications,
  getMedicationsByCategory,
  getControlledMedications,
  getAllMedications,
  checkDrugInteractions,
} from './medications';
