// ============================================================
// Unified Clinical Ordering Types
// apps/shared/types/ordering.ts
//
// Single source of truth for all ordering-related types
// Eliminates duplication across store files
// ============================================================

// =============================================================================
// Priority Types - Unified across all modules
// =============================================================================

export type OrderPriority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';

export const PRIORITY_CONFIG: Record<OrderPriority, {
  label: string;
  color: string;
  bgColor: string;
  sortOrder: number;
}> = {
  STAT: { label: 'STAT', color: 'text-red-700', bgColor: 'bg-red-100', sortOrder: 0 },
  URGENT: { label: 'Urgent', color: 'text-orange-700', bgColor: 'bg-orange-100', sortOrder: 1 },
  ASAP: { label: 'ASAP', color: 'text-yellow-700', bgColor: 'bg-yellow-100', sortOrder: 2 },
  ROUTINE: { label: 'Routine', color: 'text-gray-700', bgColor: 'bg-gray-100', sortOrder: 3 },
};

// =============================================================================
// Patient Context - Shared across ALL ordering modules
// =============================================================================

export interface AllergyInfo {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  type?: 'drug' | 'food' | 'environmental' | 'contrast' | 'other';
  crossReactivity?: string[];
}

export interface PatientContext {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | string;
  weight?: number;
  height?: number;
  chiefComplaint: string;
  redFlags: string[];
  allergies: AllergyInfo[] | string[];
  currentMedications: string[];
  medicalHistory: string[];
  renalFunction?: { creatinine: number; gfr: number };
  hepaticFunction?: { alt: number; ast: number };
  pregnant?: boolean;
  breastfeeding?: boolean;
  insurancePlan?: string;
}

// =============================================================================
// AI Recommendation Types
// =============================================================================

export type RecommendationCategory = 
  | 'critical' | 'recommended' | 'consider' | 'not-indicated' | 'avoid';

export interface BaseAIRecommendation {
  id: string;
  itemCode: string;
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
// Catalog Item Types
// =============================================================================

export interface BaseCatalogItem {
  code: string;
  name: string;
  description: string;
  category: string;
  defaultPriority: OrderPriority;
  cost: number | { generic: number; brand: number }; // Allow both formats
}

export interface BaseSelectedItem<T extends BaseCatalogItem = BaseCatalogItem> {
  item: T;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

// =============================================================================
// Lab Types
// =============================================================================

export type LabCategory = 
  | 'hematology' | 'chemistry' | 'endocrine' | 'coagulation' 
  | 'microbiology' | 'urinalysis' | 'immunology' | 'toxicology' | 'other';

export interface LabTest extends BaseCatalogItem {
  category: LabCategory;
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

export interface SelectedLab extends BaseSelectedItem<LabTest> {}

export interface AILabRecommendation extends BaseAIRecommendation {
  type: 'lab';
}

// =============================================================================
// Imaging Types
// =============================================================================

export type ImagingModality = 'CT' | 'MRI' | 'XRAY' | 'US' | 'NM' | 'FLUORO' | 'MAMMO' | 'DEXA';

export interface ImagingStudy extends BaseCatalogItem {
  modality: ImagingModality;
  bodyPart: string;
  durationMinutes: number;
  radiationDose?: string;
  contrast?: boolean;
  contrastType?: string;
  turnaroundHours: number;
  contraindications?: string[];
  preparation?: string;
  cptCode?: string;
}

export interface SelectedStudy extends BaseSelectedItem<ImagingStudy> {
  laterality?: 'left' | 'right' | 'bilateral' | 'none';
  contrast: boolean;
  clinicalHistory?: string;
  specialInstructions?: string;
}

export interface AIImagingRecommendation extends BaseAIRecommendation {
  type: 'imaging';
  modality: ImagingModality;
}

// =============================================================================
// Medication Types
// =============================================================================

export type DrugSchedule = 'OTC' | 'RX' | 'II' | 'III' | 'IV' | 'V';
export type DosageForm = 
  | 'tablet' | 'capsule' | 'liquid' | 'injection' 
  | 'topical' | 'inhaler' | 'patch' | 'suppository' | 'drops' | 'spray';

export type DrugCategory = 
  | 'analgesic' | 'antibiotic' | 'antihypertensive' | 'antidiabetic' 
  | 'anticoagulant' | 'antidepressant' | 'anxiolytic' | 'anticonvulsant' 
  | 'antihistamine' | 'antacid' | 'bronchodilator' | 'corticosteroid' 
  | 'diuretic' | 'lipid-lowering' | 'migraine' | 'muscle-relaxant' 
  | 'nsaid' | 'opioid' | 'proton-pump-inhibitor' | 'thyroid' | 'vitamin' | 'other';

export interface Medication extends BaseCatalogItem {
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

export interface AIMedicationRecommendation extends BaseAIRecommendation {
  type: 'medication';
  recommendationType: 'first-line' | 'alternative' | 'adjunct' | 'avoid';
  dosageRecommendation?: string;
  durationRecommendation?: string;
  monitoringRequired?: string[];
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
  generateRecommendations: (context: PatientContext) => Promise<TRecommendation[]>;
  createSelectedItem: (item: TItem, options?: Partial<Omit<TSelectedItem, 'item'>>) => TSelectedItem;
  transformForSubmit: (selectedItem: TSelectedItem, context: PatientContext | null) => Record<string, unknown>;
  getItemSearchFields: (item: TItem) => string[];
}
