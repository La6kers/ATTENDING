// ============================================================
// Shared Clinical Catalog Types
// apps/shared/catalogs/types.ts
//
// Types specific to clinical catalogs (labs, imaging, medications)
// Re-exports unified types from clinical.types.ts
// ============================================================

// =============================================================================
// Re-export core types from clinical.types.ts (Single Source of Truth)
// =============================================================================

export {
  // Allergy types and helpers
  type AllergyInfo,
  isAllergyInfo,
  normalizeAllergy,
  getAllergenName,
  normalizeAllergies,
  getAllergenNames,
  
  // Patient/Ordering context
  type OrderingContext,
  type PatientContext,
  
  // Priority types
  type OrderPriority,
  PRIORITY_CONFIG,
  
  // Recommendation types
  type RecommendationCategory,
  RECOMMENDATION_CATEGORY_CONFIGS,
  groupRecommendationsByCategory,
  isActionableCategory,
  
  // Base types
  type BaseCatalogItem,
  type BaseSelectedItem,
  type BaseAIRecommendation,
} from '../types/clinical.types';

// =============================================================================
// Drug Schedule Type
// =============================================================================

export type DrugSchedule = 'none' | 'OTC' | 'RX' | 'I' | 'II' | 'III' | 'IV' | 'V';

// =============================================================================
// Lab Types
// =============================================================================

export type LabCategory = 
  | 'hematology' | 'chemistry' | 'endocrine' | 'coagulation' 
  | 'microbiology' | 'urinalysis' | 'immunology' | 'toxicology' | 'cardiac' | 'other';

export interface LabTest {
  code: string;
  name: string;
  description: string;
  category: LabCategory;
  defaultPriority: 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';
  cost: number;
  turnaroundHours: number;
  requiresFasting?: boolean;
  specimenType?: string;
  cptCode?: string;
  loincCode?: string;
}

export interface LabPanel {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  tests: string[];
  cost: number;
  category: LabCategory;
  commonIndications: string[];
}

// =============================================================================
// Imaging Types
// =============================================================================

export type ImagingModality = 'CT' | 'MRI' | 'XRAY' | 'US' | 'NM' | 'FLUORO' | 'MAMMO' | 'DEXA';

export interface ImagingStudy {
  code: string;
  name: string;
  description: string;
  modality: ImagingModality;
  bodyPart: string;
  defaultPriority: 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';
  cost: number;
  durationMinutes: number;
  radiationDose?: string;
  contrast?: boolean;
  contrastType?: string;
  turnaroundHours: number;
  contraindications?: string[];
  preparation?: string;
  cptCode?: string;
}

// =============================================================================
// Medication Types
// =============================================================================

export type DosageForm = 
  | 'tablet' | 'capsule' | 'liquid' | 'injection' | 'topical' 
  | 'inhaler' | 'patch' | 'suppository' | 'drops' | 'spray';

export type DrugCategory = 
  | 'analgesic' | 'antibiotic' | 'antihypertensive' | 'antidiabetic' | 'anticoagulant'
  | 'antidepressant' | 'anxiolytic' | 'anticonvulsant' | 'antihistamine' | 'antacid'
  | 'bronchodilator' | 'corticosteroid' | 'diuretic' | 'lipid-lowering' | 'migraine'
  | 'muscle-relaxant' | 'nsaid' | 'opioid' | 'proton-pump-inhibitor' | 'thyroid'
  | 'vitamin' | 'other';

export interface Medication {
  id: string;
  brandName: string;
  genericName: string;
  category: DrugCategory;
  schedule: DrugSchedule;
  dosageForms: DosageForm[];
  strengths: string[];
  defaultStrength: string;
  defaultForm: DosageForm;
  defaultQuantity: number;
  defaultDaysSupply: number;
  defaultRefills: number;
  maxRefills: number;
  defaultDirections: string;
  commonIndications: string[];
  contraindications: string[];
  blackBoxWarning?: string;
  pregnancyCategory?: string;
  requiresPriorAuth?: boolean;
  isControlled: boolean;
  cost: { generic: number; brand: number };
  ndc?: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffect: string;
  management: string;
}

// =============================================================================
// Referral Types
// =============================================================================

export interface ReferralSpecialty {
  id: string;
  name: string;
  description: string;
  commonIndications: string[];
  urgentIndications: string[];
  typicalWaitDays: { routine: number; urgent: number };
  cost: { consultation: number; followUp: number };
}

// =============================================================================
// Generic AI Recommendation Type
// =============================================================================

export interface AIRecommendation<T = string> {
  id: string;
  itemCode: T;
  itemName: string;
  priority: 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: 'critical' | 'recommended' | 'consider' | 'avoid' | 'not-indicated';
  redFlagRelated?: boolean;
  warningMessage?: string;
}

// =============================================================================
// Catalog Interface
// =============================================================================

export interface ClinicalCatalog<T> {
  items: Record<string, T>;
  search: (query: string) => T[];
  getByCode: (code: string) => T | undefined;
  getAll: () => T[];
}
