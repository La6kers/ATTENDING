// ============================================================
// Unified Clinical Ordering Types
// apps/shared/types/ordering.ts
//
// FIXED: Re-exports ALL base types from canonical sources.
// Only defines genuinely additive types (Selected*, AI*Recommendation,
// Treatment*, ClinicalStoreConfig) that don't exist elsewhere.
// ============================================================

// =============================================================================
// Re-export canonical types — SINGLE SOURCE OF TRUTH
// =============================================================================

// Core ordering types (from clinical.types.ts)
export type {
  OrderingContext,
  PatientContext,
  AllergyInfo,
  OrderPriority,
  RecommendationCategory,
  BaseCatalogItem,
  BaseSelectedItem,
  BaseAIRecommendation,
} from './clinical.types';

export {
  PRIORITY_CONFIG,
  RECOMMENDATION_CATEGORY_CONFIGS,
  isAllergyInfo,
  normalizeAllergy,
  getAllergenName,
  normalizeAllergies,
  getAllergenNames,
  groupRecommendationsByCategory,
  isActionableCategory,
} from './clinical.types';

// Domain catalog types (from catalogs/types.ts)
export type {
  LabCategory,
  LabTest,
  LabPanel,
  ImagingModality,
  ImagingStudy,
  DrugSchedule,
  DosageForm,
  DrugCategory,
  Medication,
  DrugInteraction,
  ReferralSpecialty as ReferralSpecialtyInfo,
  AIRecommendation,
  ClinicalCatalog,
} from '../catalogs/types';

// =============================================================================
// Import base types for extending
// =============================================================================

import type {
  OrderPriority,
  RecommendationCategory,
  BaseCatalogItem,
  BaseAIRecommendation,
  BaseSelectedItem,
  OrderingContext,
} from './clinical.types';

import type {
  LabTest,
  ImagingStudy,
  ImagingModality,
  Medication,
  DosageForm,
} from '../catalogs/types';

// =============================================================================
// Selected Item Types (genuinely additive — store-specific shapes)
// =============================================================================

export type SelectedLab = BaseSelectedItem<LabTest>;

export interface SelectedStudy extends BaseSelectedItem<ImagingStudy> {
  laterality?: 'left' | 'right' | 'bilateral' | 'none';
  contrast: boolean;
  clinicalHistory?: string;
  specialInstructions?: string;
}

export interface SelectedMedication extends BaseSelectedItem<Medication> {
  strength: string;
  form: DosageForm;
  quantity: number;
  daysSupply: number;
  refills: number;
  directions: string;
  indication: string;
  dispenseAsWritten: boolean;
}

// =============================================================================
// AI Recommendation Subtypes (extend base with domain-specific fields)
// =============================================================================

export interface AILabRecommendation extends BaseAIRecommendation {
  type: 'lab';
}

export interface AIImagingRecommendation extends BaseAIRecommendation {
  type: 'imaging';
  modality: ImagingModality;
}

export interface AIMedicationRecommendation extends BaseAIRecommendation {
  type: 'medication';
  recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid';
  dosageRecommendation?: string;
  durationRecommendation?: string;
  monitoringRequired?: string[];
}

// =============================================================================
// Referral Types
// =============================================================================

export type ReferralSpecialty =
  | 'cardiology' | 'neurology' | 'orthopedics' | 'gastroenterology'
  | 'pulmonology' | 'endocrinology' | 'rheumatology' | 'oncology'
  | 'nephrology' | 'dermatology' | 'psychiatry' | 'physical-therapy'
  | 'pain-management' | 'surgery' | 'urology' | 'ophthalmology' | 'other';

export type ReferralUrgency = 'routine' | 'urgent' | 'emergent';

export interface ReferralProvider {
  id: string;
  name: string;
  credentials: string;
  specialty: ReferralSpecialty;
  organization: string;
  address: string;
  phone: string;
  fax: string;
  email?: string;
  acceptingNewPatients: boolean;
  insurancesAccepted: string[];
  averageWaitDays: number;
  distance?: number;
  rating?: number;
}

export interface SelectedReferral {
  specialty: ReferralSpecialty;
  provider?: ReferralProvider;
  urgency: ReferralUrgency;
  reason: string;
  clinicalQuestion: string;
  relevantHistory: string;
  relevantLabs?: string;
  relevantImaging?: string;
  preferredDate?: string;
  specialInstructions?: string;
}

export interface AIReferralRecommendation extends BaseAIRecommendation {
  type: 'referral';
  specialty: ReferralSpecialty;
  urgencyRecommendation: ReferralUrgency;
  clinicalQuestion: string;
}

// =============================================================================
// Treatment Plan Types
// =============================================================================

export type TreatmentGoalStatus = 'not-started' | 'in-progress' | 'achieved' | 'modified';

export interface TreatmentGoal {
  id: string;
  description: string;
  targetDate?: string;
  status: TreatmentGoalStatus;
  metrics?: string[];
}

export interface TreatmentPlanItem {
  id: string;
  category: 'medication' | 'lifestyle' | 'monitoring' | 'follow-up' | 'referral' | 'procedure';
  description: string;
  instructions: string;
  frequency?: string;
  duration?: string;
  priority: OrderPriority;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  encounterId: string;
  diagnosis: string;
  icdCodes: string[];
  goals: TreatmentGoal[];
  items: TreatmentPlanItem[];
  patientEducation: string[];
  followUpInstructions: string;
  createdAt: string;
  updatedAt: string;
  providerSignature?: string;
}

// =============================================================================
// Store Factory Types
// =============================================================================

export interface ClinicalStoreConfig<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
> {
  name: string;
  catalog: Record<string, TItem>;
  apiEndpoint: string;
  generateRecommendations: (context: OrderingContext) => Promise<TRecommendation[]>;
  createSelectedItem: (item: TItem, options?: Partial<Omit<TSelectedItem, 'item'>>) => TSelectedItem;
  transformForSubmit: (selectedItem: TSelectedItem, context: OrderingContext | null) => Record<string, unknown>;
  getItemSearchFields: (item: TItem) => string[];
}
