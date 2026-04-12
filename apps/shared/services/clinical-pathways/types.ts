// ============================================================
// ATTENDING AI - Clinical Pathway Types
// apps/shared/services/clinical-pathways/types.ts
//
// Type definitions for automated clinical pathways
// ============================================================

// ============================================================
// CORE PATHWAY TYPES
// ============================================================

export interface ClinicalPathway {
  id: string;
  name: string;
  shortName: string;
  description: string;
  version: string;
  lastUpdated: string;
  source: string;  // e.g., "ACC/AHA Guidelines 2023"
  
  // Trigger conditions
  trigger: PathwayTrigger;
  
  // Pathway steps
  steps: PathwayStep[];
  
  // Risk stratification tool (if applicable)
  riskTool?: RiskStratificationTool;
  
  // Outcome tracking
  outcomes: OutcomeDefinition[];
  
  // Metadata
  category: PathwayCategory;
  specialty: MedicalSpecialty[];
  tags: string[];
  enabled: boolean;
}

export type PathwayCategory = 
  | 'emergency'
  | 'cardiovascular'
  | 'respiratory'
  | 'neurological'
  | 'infectious'
  | 'metabolic'
  | 'preventive'
  | 'chronic_disease';

export type MedicalSpecialty =
  | 'emergency_medicine'
  | 'internal_medicine'
  | 'family_medicine'
  | 'cardiology'
  | 'neurology'
  | 'pulmonology'
  | 'infectious_disease'
  | 'endocrinology';

// ============================================================
// TRIGGER DEFINITIONS
// ============================================================

export interface PathwayTrigger {
  // Symptom-based triggers
  symptoms?: SymptomTrigger[];
  
  // Vital sign triggers
  vitals?: VitalTrigger[];
  
  // Lab result triggers
  labs?: LabTrigger[];
  
  // Diagnosis triggers
  diagnoses?: DiagnosisTrigger[];
  
  // Patient demographic requirements
  demographics?: DemographicRequirement;
  
  // Logic operator (all must match vs any)
  operator: 'AND' | 'OR';
  
  // Minimum confidence to trigger
  minConfidence?: number;
}

export interface SymptomTrigger {
  symptom: string;
  synonyms?: string[];
  required: boolean;
  severity?: 'any' | 'mild' | 'moderate' | 'severe';
  duration?: DurationCriteria;
}

export interface VitalTrigger {
  vital: 'heart_rate' | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 
         'respiratory_rate' | 'temperature' | 'oxygen_saturation' | 'pain_scale';
  operator: '>' | '>=' | '<' | '<=' | '==' | 'between';
  value: number;
  valueEnd?: number;  // For 'between' operator
}

export interface LabTrigger {
  labCode: string;
  labName: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | 'between' | 'positive' | 'negative';
  value?: number;
  valueEnd?: number;
}

export interface DiagnosisTrigger {
  icdCode?: string;
  icdCodeRange?: { start: string; end: string };
  diagnosisName?: string;
  keywords?: string[];
}

export interface DemographicRequirement {
  minAge?: number;
  maxAge?: number;
  gender?: 'male' | 'female' | 'any';
  riskFactors?: string[];
}

export interface DurationCriteria {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
  operator: '>' | '>=' | '<' | '<=';
}

// ============================================================
// PATHWAY STEPS
// ============================================================

export interface PathwayStep {
  order: number;
  id: string;
  name: string;
  description: string;
  
  // Step type
  type: StepType;
  
  // Timing
  timing: StepTiming;
  
  // Actions to take
  actions: StepAction[];
  
  // Branching logic
  branches?: StepBranch[];
  
  // Requirements before this step
  prerequisites?: string[];  // IDs of previous steps
  
  // Can be skipped?
  optional: boolean;
  
  // Clinical rationale
  rationale?: string;
  evidence?: EvidenceReference[];
}

export type StepType =
  | 'assessment'
  | 'order'
  | 'medication'
  | 'procedure'
  | 'consultation'
  | 'monitoring'
  | 'disposition'
  | 'education'
  | 'documentation';

export interface StepTiming {
  target: number;
  targetUnit: 'minutes' | 'hours' | 'days';
  critical: boolean;  // Must be completed within target
  trackMetric?: string;  // e.g., "door_to_ekg_time"
}

export interface StepAction {
  type: ActionType;
  description: string;
  autoOrder?: boolean;  // Automatically create order?
  orderDetails?: OrderDetails;
  documentation?: DocumentationRequirement;
}

export type ActionType =
  | 'order_lab'
  | 'order_imaging'
  | 'order_medication'
  | 'order_procedure'
  | 'consult'
  | 'document'
  | 'notify'
  | 'calculate_score'
  | 'patient_education';

export interface OrderDetails {
  orderType: 'lab' | 'imaging' | 'medication' | 'procedure' | 'referral';
  orderCodes?: string[];
  orderNames: string[];
  priority: 'stat' | 'urgent' | 'routine';
  instructions?: string;
}

export interface DocumentationRequirement {
  template?: string;
  requiredFields?: string[];
  smartPhrase?: string;
}

export interface StepBranch {
  condition: BranchCondition;
  nextStepId: string;
  description: string;
}

export interface BranchCondition {
  type: 'lab_result' | 'vital' | 'score' | 'clinical_decision' | 'time_elapsed';
  field: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'contains';
  value: string | number | boolean;
}

export interface EvidenceReference {
  source: string;
  citation: string;
  level: 'A' | 'B' | 'C';  // Evidence level
  recommendation: 'I' | 'IIa' | 'IIb' | 'III';  // Recommendation class
  url?: string;
}

// ============================================================
// RISK STRATIFICATION
// ============================================================

export interface RiskStratificationTool {
  name: string;
  shortName: string;
  description: string;
  
  // Input fields
  inputs: RiskInput[];
  
  // Scoring logic
  scoringMethod: 'additive' | 'multiplicative' | 'formula';
  maxScore?: number;
  
  // Risk categories
  categories: RiskCategory[];
  
  // Actions per category
  categoryActions: Record<string, string[]>;
}

export interface RiskInput {
  id: string;
  label: string;
  type: 'boolean' | 'numeric' | 'select';
  options?: { value: string | number; label: string; points: number }[];
  points?: number;  // For boolean inputs
  source?: 'manual' | 'auto_labs' | 'auto_vitals' | 'auto_history';
}

export interface RiskCategory {
  name: string;
  minScore: number;
  maxScore: number;
  risk: 'low' | 'moderate' | 'high' | 'very_high';
  color: string;
  recommendation: string;
}

// ============================================================
// OUTCOMES TRACKING
// ============================================================

export interface OutcomeDefinition {
  id: string;
  name: string;
  description: string;
  measureType: 'time' | 'rate' | 'percentage' | 'count';
  
  // Benchmark values
  target: number;
  benchmark?: number;
  
  // Tracking period
  trackingPeriod: '24h' | '48h' | '72h' | '7d' | '30d' | '90d';
  
  // Data source
  dataSource: 'pathway_completion' | 'ehr_data' | 'manual_entry' | 'claims';
}

// ============================================================
// PATHWAY EXECUTION
// ============================================================

export interface PathwayExecution {
  id: string;
  pathwayId: string;
  patientId: string;
  providerId: string;
  encounterId: string;
  
  // Status
  status: 'active' | 'completed' | 'paused' | 'abandoned' | 'deviated';
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  
  // Step tracking
  currentStepId: string;
  completedSteps: CompletedStep[];
  
  // Deviations
  deviations: PathwayDeviation[];
  
  // Risk score (if applicable)
  riskScore?: number;
  riskCategory?: string;
  
  // Outcomes
  outcomes: RecordedOutcome[];
}

export interface CompletedStep {
  stepId: string;
  completedAt: Date;
  completedBy: string;
  duration: number;  // in minutes
  orders?: string[];  // Order IDs created
  notes?: string;
}

export interface PathwayDeviation {
  stepId: string;
  timestamp: Date;
  reason: DeviationReason;
  description: string;
  approvedBy?: string;
}

export type DeviationReason =
  | 'patient_refused'
  | 'contraindicated'
  | 'already_completed'
  | 'clinical_judgment'
  | 'resource_unavailable'
  | 'other';

export interface RecordedOutcome {
  outcomeId: string;
  value: number;
  recordedAt: Date;
  metTarget: boolean;
}

// ============================================================
// PATHWAY ANALYTICS
// ============================================================

export interface PathwayAnalytics {
  pathwayId: string;
  period: string;
  
  // Usage metrics
  totalExecutions: number;
  completedExecutions: number;
  completionRate: number;
  
  // Timing metrics
  avgTimeToCompletion: number;
  medianTimeToCompletion: number;
  
  // Step-level metrics
  stepMetrics: StepMetrics[];
  
  // Outcome metrics
  outcomeMetrics: OutcomeMetrics[];
  
  // Deviation analysis
  deviationRate: number;
  topDeviationReasons: { reason: string; count: number }[];
}

export interface StepMetrics {
  stepId: string;
  stepName: string;
  completionRate: number;
  avgDuration: number;
  targetMet: number;  // percentage meeting time target
}

export interface OutcomeMetrics {
  outcomeId: string;
  outcomeName: string;
  avgValue: number;
  targetMetRate: number;
  trend: 'improving' | 'stable' | 'declining';
}
