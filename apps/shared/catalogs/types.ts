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

export type RecommendationCategory = 'critical' | 'recommended' | 'consider' | 'not-indicated' | 'avoid';

export const RECOMMENDATION_CATEGORY_CONFIGS: Record<RecommendationCategory, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
  buttonColor: string;
}> = {
  critical: {
    title: 'Critical - Order Immediately',
    description: 'These tests are essential based on red flag symptoms',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  recommended: {
    title: 'Strongly Recommended',
    description: 'High clinical value based on presentation',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  consider: {
    title: 'Consider Ordering',
    description: 'May provide additional clinical insight',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  'not-indicated': {
    title: 'Not Indicated',
    description: 'Not clinically indicated for this presentation',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
    badgeColor: 'bg-gray-100 text-gray-600',
    buttonColor: 'bg-gray-500 hover:bg-gray-600',
  },
  avoid: {
    title: 'Avoid',
    description: 'May cause harm or is contraindicated',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    iconColor: 'text-red-700',
    badgeColor: 'bg-red-200 text-red-800',
    buttonColor: 'bg-red-700 hover:bg-red-800',
  },
};

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
