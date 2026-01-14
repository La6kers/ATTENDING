// ============================================================
// Shared Clinical Catalog Types
// apps/shared/catalogs/types.ts
//
// Unified types for all clinical ordering catalogs
// ============================================================

// =============================================================================
// Common Enums
// =============================================================================

export type OrderPriority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';

export type DrugSchedule = 'OTC' | 'RX' | 'II' | 'III' | 'IV' | 'V';

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
  defaultPriority: OrderPriority;
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
  defaultPriority: OrderPriority;
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
// Unified Patient Context
// =============================================================================

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  allergies: Array<{ allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }>;
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  breastfeeding?: boolean;
}

// =============================================================================
// AI Recommendation Types
// =============================================================================

export type RecommendationCategory = 'critical' | 'recommended' | 'consider' | 'avoid';

export interface AIRecommendation<T = string> {
  id: string;
  itemCode: T;
  itemName: string;
  priority: OrderPriority;
  rationale: string;
  clinicalEvidence: string[];
  confidence: number;
  category: RecommendationCategory;
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
