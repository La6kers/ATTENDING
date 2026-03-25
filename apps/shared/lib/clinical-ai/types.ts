// =============================================================================
// ATTENDING AI - Clinical AI Types
// apps/shared/lib/clinical-ai/types.ts
//
// Type definitions for AI-powered clinical decision support
// =============================================================================

// =============================================================================
// Patient Context Types
// =============================================================================

export interface PatientDemographics {
  age: number;
  ageUnit: 'years' | 'months' | 'days';
  sex: 'male' | 'female' | 'other';
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'in';
  bmi?: number;
  pregnancyStatus?: 'pregnant' | 'not_pregnant' | 'unknown' | 'postpartum';
  gestationalAge?: number;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: 'C' | 'F';
  oxygenSaturation?: number;
  painLevel?: number;
  glucoseLevel?: number;
}

export interface MedicalHistory {
  conditions: string[];
  surgeries?: string[];
  hospitalizations?: string[];
  familyHistory?: string[];
  socialHistory?: {
    smoking?: 'never' | 'former' | 'current';
    alcohol?: 'none' | 'occasional' | 'moderate' | 'heavy';
    drugs?: string[];
    occupation?: string;
  };
}

export interface CurrentMedication {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
}

export interface Allergy {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  type: 'drug' | 'food' | 'environmental' | 'other';
}

export interface LabResult {
  name: string;
  value: number | string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  date?: string;
}

export interface PatientContext {
  demographics: PatientDemographics;
  vitals?: VitalSigns;
  medicalHistory?: MedicalHistory;
  currentMedications?: CurrentMedication[];
  allergies?: Allergy[];
  recentLabs?: LabResult[];
  immunizations?: string[];
}

// =============================================================================
// Symptom & Assessment Types
// =============================================================================

export interface Symptom {
  name: string;
  duration?: string;
  durationValue?: number;
  durationUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  severity?: 'mild' | 'moderate' | 'severe';
  quality?: string;
  location?: string;
  radiation?: string;
  onset?: 'sudden' | 'gradual';
  timing?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  associatedSymptoms?: string[];
}

export interface ChiefComplaint {
  complaint: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface ClinicalAssessment {
  chiefComplaint: ChiefComplaint;
  symptoms: Symptom[];
  historyOfPresentIllness?: string;
  reviewOfSystems?: Record<string, string[]>;
  physicalExam?: Record<string, string>;
}

// =============================================================================
// Red Flag Types
// =============================================================================

export type RedFlagSeverity = 'critical' | 'high' | 'moderate';

export type RedFlagCategory =
  | 'cardiovascular'
  | 'neurological'
  | 'respiratory'
  | 'infectious'
  | 'trauma'
  | 'psychiatric'
  | 'obstetric'
  | 'pediatric'
  | 'metabolic'
  | 'oncologic'
  | 'other';

export interface RedFlag {
  id: string;
  name: string;
  description: string;
  severity: RedFlagSeverity;
  category: RedFlagCategory;
  triggerCriteria: string[];
  recommendedAction: string;
  timeframe: 'immediate' | 'urgent' | 'soon';
  icdCodes?: string[];
}

export interface RedFlagMatch {
  redFlag: RedFlag;
  matchedCriteria: string[];
  confidence: number;
  reasoning: string;
}

export interface RedFlagEvaluation {
  hasRedFlags: boolean;
  matches: RedFlagMatch[];
  overallSeverity: RedFlagSeverity | null;
  recommendedDisposition: 'emergency' | 'urgent_care' | 'routine' | 'self_care';
  summary: string;
  evaluatedAt: string;
}

// =============================================================================
// Differential Diagnosis Types
// =============================================================================

export interface Diagnosis {
  name: string;
  icdCode?: string;
  snomedCode?: string;
  probability: number;
  confidence: 'low' | 'moderate' | 'high';
  category?: string;
  acuity?: 'emergent' | 'urgent' | 'non_urgent';
  mustNotMiss?: boolean;
}

export interface DiagnosisReasoning {
  supportingFindings: string[];
  contradictingFindings: string[];
  missingInformation?: string[];
  clinicalPearls?: string[];
}

export interface DifferentialDiagnosis {
  diagnosis: Diagnosis;
  reasoning: DiagnosisReasoning;
  recommendedWorkup?: string[];
  alternativeConsiderations?: string[];
}

export interface DifferentialDiagnosisResult {
  primaryDiagnoses: DifferentialDiagnosis[];
  mustNotMissDiagnoses: DifferentialDiagnosis[];
  lessLikelyDiagnoses: DifferentialDiagnosis[];
  recommendedTests: RecommendedTest[];
  clinicalNotes: string;
  generatedAt: string;
  modelVersion: string;
}

// =============================================================================
// Treatment Recommendation Types
// =============================================================================

export type TreatmentCategory =
  | 'medication'
  | 'procedure'
  | 'therapy'
  | 'lifestyle'
  | 'referral'
  | 'monitoring'
  | 'education';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'expert_opinion';

export interface MedicationRecommendation {
  name: string;
  genericName?: string;
  brandNames?: string[];
  dose: string;
  frequency: string;
  duration?: string;
  route: string;
  indication: string;
  contraindications?: string[];
  interactions?: string[];
  warnings?: string[];
  monitoringRequired?: string[];
  costCategory?: 'low' | 'moderate' | 'high';
  isControlled?: boolean;
  schedule?: 'II' | 'III' | 'IV' | 'V';
}

export interface TreatmentRecommendation {
  id: string;
  category: TreatmentCategory;
  name: string;
  description: string;
  rationale: string;
  evidenceLevel: EvidenceLevel;
  guidelineSource?: string;
  priority: 'essential' | 'recommended' | 'optional';
  medication?: MedicationRecommendation;
  precautions?: string[];
  followUp?: string;
  patientEducation?: string[];
}

export interface TreatmentPlan {
  forDiagnosis: string;
  recommendations: TreatmentRecommendation[];
  contraindications: string[];
  patientSpecificConsiderations: string[];
  monitoringPlan?: string[];
  followUpSchedule?: string;
  referrals?: string[];
  generatedAt: string;
}

// =============================================================================
// Recommended Test Types
// =============================================================================

export type TestCategory = 'laboratory' | 'imaging' | 'procedure' | 'referral';
export type TestPriority = 'stat' | 'urgent' | 'routine';

export interface RecommendedTest {
  id: string;
  name: string;
  category: TestCategory;
  priority: TestPriority;
  rationale: string;
  targetDiagnoses: string[];
  cptCode?: string;
  loincCode?: string;
  estimatedCost?: 'low' | 'moderate' | 'high';
  turnaroundTime?: string;
  specialInstructions?: string;
}

// =============================================================================
// Clinical Protocol Types
// =============================================================================

export interface ClinicalProtocol {
  id: string;
  name: string;
  version: string;
  category: string;
  applicableDiagnoses: string[];
  triggerCriteria: string[];
  steps: ProtocolStep[];
  contraindications: string[];
  references: string[];
  lastUpdated: string;
}

export interface ProtocolStep {
  order: number;
  action: string;
  type: 'assessment' | 'intervention' | 'monitoring' | 'education' | 'referral';
  timing?: string;
  conditions?: string[];
  alternatives?: string[];
}

// =============================================================================
// AI Request/Response Types
// =============================================================================

export interface ClinicalAIRequest {
  requestId: string;
  requestType: 'differential' | 'treatment' | 'red_flags' | 'protocol' | 'comprehensive';
  patientContext: PatientContext;
  assessment: ClinicalAssessment;
  options?: ClinicalAIOptions;
}

export interface ClinicalAIOptions {
  maxDiagnoses?: number;
  includeRareDiseases?: boolean;
  focusSpecialty?: string;
  evidenceLevelThreshold?: EvidenceLevel;
  includeOffLabelTreatments?: boolean;
  pediatricConsiderations?: boolean;
  geriatricConsiderations?: boolean;
  pregnancyConsiderations?: boolean;
}

export interface ClinicalAIResponse {
  requestId: string;
  redFlagEvaluation?: RedFlagEvaluation;
  differentialDiagnosis?: DifferentialDiagnosisResult;
  treatmentPlan?: TreatmentPlan;
  applicableProtocols?: ClinicalProtocol[];
  clinicalSummary: string;
  disclaimer: string;
  processingTime: number;
  modelInfo: {
    name: string;
    version: string;
    confidenceScore: number;
  };
}

// =============================================================================
// AI Client Configuration
// =============================================================================

export interface ClinicalAIConfig {
  apiUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
  enableAuditLog: boolean;
}

export const DEFAULT_CLINICAL_AI_CONFIG: ClinicalAIConfig = {
  apiUrl: process.env.NEXT_PUBLIC_CLINICAL_AI_URL || 'http://localhost:8000',
  model: 'biomistral-7b',
  maxTokens: 4096,
  temperature: 0.3,
  timeout: 60000,
  retryAttempts: 3,
  enableAuditLog: true,
};

// =============================================================================
// Audit & Compliance Types
// =============================================================================

export interface ClinicalAIAuditEntry {
  id: string;
  timestamp: string;
  requestId: string;
  userId: string;
  patientId?: string;
  encounterId?: string;
  requestType: ClinicalAIRequest['requestType'];
  requestSummary: string;
  responseReceived: boolean;
  processingTime: number;
  redFlagsDetected: number;
  diagnosesGenerated: number;
  userAcceptedRecommendations?: boolean;
  userModifications?: string;
}
