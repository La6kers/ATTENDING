/**
 * INTERACT (Interventions to Reduce Acute Care Transfers) v4.0 Type Definitions
 *
 * Type system for structured SNF-to-Hospital transfer documentation
 * following the CMS-endorsed INTERACT transfer communication form.
 *
 * @see docs/specifications/P16-INTERACT-FIELD-MAPPING.md
 */

// ---------------------------------------------------------------------------
// Enums & Union Types
// ---------------------------------------------------------------------------

export type TransferUrgency = 'EMERGENCY' | 'URGENT' | 'PLANNED';

export type TransferMode = 'EMERGENCY' | 'URGENT' | 'PLANNED';

export type TransferStatus =
  | 'INITIATED'
  | 'DATA_COLLECTION'
  | 'MAR_RECONCILIATION'
  | 'DOCUMENT_GENERATION'
  | 'PROVIDER_REVIEW'
  | 'TRANSMITTED'
  | 'ACKNOWLEDGED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type CodeStatus =
  | 'FULL_CODE'
  | 'DNR'
  | 'DNR_DNI'
  | 'COMFORT_MEASURES_ONLY'
  | 'LIMITED_INTERVENTIONS';

export type AdvanceDirectiveDocumentType =
  | 'POLST'
  | 'MOLST'
  | 'ADVANCE_DIRECTIVE'
  | 'DNR_ORDER'
  | 'LIVING_WILL';

export type TreatmentPreference = 'YES' | 'NO' | 'TRIAL_PERIOD';

export type NutritionDirective =
  | 'FULL'
  | 'COMFORT_FEEDING'
  | 'NO_ARTIFICIAL'
  | 'PATIENT_CHOICE';

export type AntibioticsPreference = 'YES' | 'LIMITED' | 'COMFORT_ONLY';

export type PressureInjuryStage =
  | 'STAGE_1'
  | 'STAGE_2'
  | 'STAGE_3'
  | 'STAGE_4'
  | 'UNSTAGEABLE'
  | 'DTI';

export type WoundType =
  | 'PRESSURE_INJURY'
  | 'SURGICAL'
  | 'VENOUS'
  | 'ARTERIAL'
  | 'DIABETIC'
  | 'TRAUMA'
  | 'OTHER';

export type WoundBedType =
  | 'GRANULATION'
  | 'SLOUGH'
  | 'ESCHAR'
  | 'MIXED'
  | 'EPITHELIALIZING';

export type ExudateType = 'SEROUS' | 'SANGUINEOUS' | 'SEROSANGUINEOUS' | 'PURULENT';

export type ExudateAmount = 'NONE' | 'SCANT' | 'MODERATE' | 'COPIOUS';

export type IsolationPrecautionType =
  | 'CONTACT'
  | 'DROPLET'
  | 'AIRBORNE'
  | 'CONTACT_PLUS'
  | 'ENTERIC'
  | 'NEUTROPENIC_REVERSE';

export type CultureSource = 'wound' | 'blood' | 'urine' | 'sputum' | 'stool' | 'nares';

export type FunctionalInstrumentType =
  | 'BARTHEL'
  | 'KATZ_ADL'
  | 'MORSE_FALL'
  | 'MDS_GG'
  | 'BRADEN'
  | 'CUSTOM';

export type TransferAssistanceLevel =
  | 'INDEPENDENT'
  | 'STANDBY'
  | 'MIN_ASSIST'
  | 'MOD_ASSIST'
  | 'MAX_ASSIST'
  | 'DEPENDENT';

export type CognitiveStatus = 'INTACT' | 'MILD_IMPAIRMENT' | 'MODERATE' | 'SEVERE';

export type WeightBearingStatus = 'FULL' | 'PARTIAL' | 'NON_WEIGHT_BEARING' | 'TOUCH_DOWN';

export type TransportMode =
  | 'AMBULANCE_BLS'
  | 'AMBULANCE_ALS'
  | 'PRIVATE'
  | 'WHEELCHAIR_VAN';

export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export type MedicationAdminStatus = 'GIVEN' | 'HELD' | 'REFUSED' | 'OMITTED' | 'LATE';

export type MedicationStatus = 'ACTIVE' | 'HELD' | 'DISCONTINUED' | 'PENDING';

// ---------------------------------------------------------------------------
// INTERACT Document Section Interfaces
// ---------------------------------------------------------------------------

export interface InteractPatientIdentification {
  patientFullName: string;
  dateOfBirth: string;
  gender: string;
  ssnLast4?: string;
  insuranceNumber: string;
  insuranceProvider: string;
  snfFacilityName: string;
  snfPhone: string;
  snfFax?: string;
  snfAddress: string;
  attendingPhysician: string;
  attendingPhysicianPhone: string;
  responsibleParty?: string;
  responsiblePartyPhone?: string;
  transferDateTime: string;
}

export interface InteractTransferReason {
  urgencyLevel: TransferUrgency;
  primaryReason: string;
  primaryDiagnosisIcd10: string;
  secondaryDiagnoses: string[];
  presentingSigns: string;
  onsetDateTime: string;
  earlyWarningSignsDocumented: string[];
  interventionsAttempted: InteractIntervention[];
  physicianNotificationTime: string;
  physicianResponse: string;
  familyNotifiedTime?: string;
}

export interface InteractIntervention {
  intervention: string;
  timestamp: string;
  result: string;
}

export interface InteractMedicationEntry {
  medicationName: string;
  genericName?: string;
  dose: string;
  doseUnit: string;
  frequency: string;
  route: string;
  lastAdministeredTime?: string;
  lastAdministeredStatus?: MedicationAdminStatus;
  isPRN: boolean;
  prnIndication?: string;
  prnLastUse?: string;
  isHeld: boolean;
  holdReason?: string;
  isRecentChange: boolean;
  previousDose?: string;
  isControlled: boolean;
  deaSchedule?: string;
}

export interface InteractMedications {
  medications: InteractMedicationEntry[];
  totalCount: number;
  prnCount: number;
  heldCount: number;
  recentChangeCount: number;
  controlledCount: number;
  reconciliationSummary?: string;
  discrepancies?: InteractMedicationDiscrepancy[];
}

export interface InteractMedicationDiscrepancy {
  medicationName: string;
  discrepancyType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  resolution?: string;
}

export interface InteractAllergyEntry {
  allergen: string;
  reactions: string[];
  severity: AllergySeverity;
}

export interface InteractAllergies {
  allergies: InteractAllergyEntry[];
  nkda: boolean;
}

export interface InteractAdvanceDirectives {
  codeStatus: CodeStatus;
  documentType: AdvanceDirectiveDocumentType;
  documentDate: string;
  intubationPreference?: TreatmentPreference;
  dialysisPreference?: TreatmentPreference;
  antibioticsPreference?: AntibioticsPreference;
  nutritionDirective?: NutritionDirective;
  treatmentLimitations?: string[];
  verificationStatus: string;
  verifiedWithinNinetyDays: boolean;
  scannedDocumentAvailable: boolean;
}

export interface InteractFunctionalAssessment {
  instrumentType: FunctionalInstrumentType;
  totalScore: number;
  interpretation: string;
  subscores: Record<string, number>;
  assessmentDate: string;
}

export interface InteractFunctionalStatus {
  assessments: InteractFunctionalAssessment[];
  mobilityAids: string[];
  weightBearingStatus?: WeightBearingStatus;
  transferAssistance: TransferAssistanceLevel;
  cognitiveStatus: CognitiveStatus;
  cognitiveBaseline: string;
}

export interface InteractWoundEntry {
  location: string;
  woundType: WoundType;
  stage?: PressureInjuryStage;
  lengthCm?: number;
  widthCm?: number;
  depthCm?: number;
  woundBed?: WoundBedType;
  exudateType?: ExudateType;
  exudateAmount?: ExudateAmount;
  periWoundSkin?: string;
  odorPresent: boolean;
  currentTreatment: string;
  bradenScore?: number;
  bradenSubscores?: BradenSubscores;
  photoReferences?: string[];
  aiStagingSuggestion?: PressureInjuryStage;
  aiNarrative?: string;
}

export interface BradenSubscores {
  sensoryPerception: number; // 1-4
  moisture: number; // 1-4
  activity: number; // 1-4
  mobility: number; // 1-4
  nutrition: number; // 1-4
  frictionShear: number; // 1-3
}

export interface InteractWoundStatus {
  wounds: InteractWoundEntry[];
  totalCount: number;
}

export interface InteractIsolationEntry {
  precautionType: IsolationPrecautionType;
  organism: string;
  organismCode?: string;
  cultureDate: string;
  cultureSource: CultureSource;
  susceptibilities?: Record<string, string>;
  ppeRequirements: string[];
  roomRequirements: string;
  clearanceCriteria?: string;
}

export interface InteractIsolationPrecautions {
  hasActiveIsolation: boolean;
  precautions: InteractIsolationEntry[];
}

export interface InteractLabResult {
  testName: string;
  result: string;
  units: string;
  referenceRange: string;
  isAbnormal: boolean;
  isCritical: boolean;
  resultDate: string;
}

export interface InteractVitalSigns {
  timestamp: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: 'F' | 'C';
  oxygenSaturation?: number;
  supplementalOxygen?: string;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
}

export interface InteractDiagnostics {
  labResults: InteractLabResult[];
  criticalLabs: InteractLabResult[];
  imagingResults: InteractImagingResult[];
  vitalSignsTrend: InteractVitalSigns[];
  mostRecentVitals: InteractVitalSigns;
}

export interface InteractImagingResult {
  studyType: string;
  modality: string;
  date: string;
  findings: string;
  status: string;
}

export interface InteractTransferLogistics {
  receivingHospital: string;
  receivingHospitalPhone: string;
  receivingPhysician?: string;
  estimatedDeparture: string;
  estimatedArrival: string;
  transportMode: TransportMode;
  pprFlagged: boolean;
  pprDiagnosisMatch?: string;
  thirtyDayTransferHistory: InteractTransferHistoryEntry[];
  interactComplianceScore: number;
  documentTransmissionTime?: string;
  hospitalAcknowledgmentTime?: string;
}

export interface InteractTransferHistoryEntry {
  date: string;
  reason: string;
  hospital: string;
  returnDate?: string;
}

// ---------------------------------------------------------------------------
// Complete INTERACT Document
// ---------------------------------------------------------------------------

export interface InteractDocument {
  id: string;
  version: '4.0';
  transferRequestId: string;
  generatedAt: string;
  generatedBy: string;
  transferMode: TransferMode;

  // Sections in INTERACT order
  patientIdentification: InteractPatientIdentification;
  transferReason: InteractTransferReason;
  medications: InteractMedications;
  allergies: InteractAllergies;
  advanceDirectives: InteractAdvanceDirectives;
  functionalStatus?: InteractFunctionalStatus; // Deferred in emergency mode
  woundStatus?: InteractWoundStatus; // Deferred in emergency mode
  isolationPrecautions: InteractIsolationPrecautions;
  diagnostics: InteractDiagnostics;
  transferLogistics: InteractTransferLogistics;

  // Metadata
  completionPercentage: number;
  missingSections: InteractSectionId[];
  validationErrors: InteractValidationError[];
}

export type InteractSectionId =
  | 'PATIENT_IDENTIFICATION'
  | 'TRANSFER_REASON'
  | 'MEDICATIONS'
  | 'ALLERGIES'
  | 'ADVANCE_DIRECTIVES'
  | 'FUNCTIONAL_STATUS'
  | 'WOUND_STATUS'
  | 'ISOLATION_PRECAUTIONS'
  | 'DIAGNOSTICS'
  | 'TRANSFER_LOGISTICS';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type InteractValidationRule =
  | 'NON_EMPTY'
  | 'ENUM_MATCH'
  | 'VALID_DATE'
  | 'VALID_ICD10'
  | 'NUMERIC_RANGE'
  | 'CONDITIONAL_REQUIRED'
  | 'CROSS_REFERENCE'
  | 'FRESHNESS';

export interface InteractValidationError {
  fieldId: string;
  section: InteractSectionId;
  rule: InteractValidationRule;
  message: string;
  severity: 'error' | 'warning';
}

export interface InteractValidationResult {
  isValid: boolean;
  errors: InteractValidationError[];
  warnings: InteractValidationError[];
  completionPercentage: number;
  sectionCompleteness: Record<InteractSectionId, number>;
}

// ---------------------------------------------------------------------------
// Transfer Acknowledgment
// ---------------------------------------------------------------------------

export interface TransferAcknowledgment {
  transferRequestId: string;
  receivedAt: string;
  receivedBy: string;
  receivingPhysician?: string;
  isolationRoomAssigned?: string;
  estimatedEvaluationReadiness?: string;
  additionalRequests?: string[];
}

// ---------------------------------------------------------------------------
// INTERACT Field Catalog Types
// ---------------------------------------------------------------------------

export interface InteractFieldDefinition {
  id: string;
  section: InteractSectionId;
  label: string;
  description: string;
  required: boolean;
  requiredInEmergency: boolean;
  sourceModel: string;
  sourceFields: string[];
  transformationRule: string;
  validationRule: InteractValidationRule;
  validationParams?: Record<string, unknown>;
  cmsReference?: string;
  interactReference: string;
  priorityTier: 1 | 2 | 3 | 4; // Emergency mode priority
}

// ---------------------------------------------------------------------------
// PPR (Potentially Preventable Readmission) Types
// ---------------------------------------------------------------------------

export interface PPRFlag {
  transferRequestId: string;
  isFlagged: boolean;
  matchedCategories: PPRCategory[];
  thirtyDayHistory: InteractTransferHistoryEntry[];
  daysSinceLastDischarge?: number;
  daysSinceSNFAdmission?: number;
  clinicalIndicators: string[];
}

export interface PPRCategory {
  code: string;
  description: string;
  icd10Codes: string[];
  matchedDiagnosis: string;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isEmergencyTransfer(mode: TransferMode): mode is 'EMERGENCY' {
  return mode === 'EMERGENCY';
}

export function isActiveIsolation(
  precautions: InteractIsolationPrecautions
): boolean {
  return precautions.hasActiveIsolation && precautions.precautions.length > 0;
}

export function isCriticalLab(lab: InteractLabResult): boolean {
  return lab.isCritical;
}

export function isPressureInjury(wound: InteractWoundEntry): wound is InteractWoundEntry & { stage: PressureInjuryStage } {
  return wound.woundType === 'PRESSURE_INJURY' && wound.stage !== undefined;
}

export function isDNR(directives: InteractAdvanceDirectives): boolean {
  return (
    directives.codeStatus === 'DNR' ||
    directives.codeStatus === 'DNR_DNI' ||
    directives.codeStatus === 'COMFORT_MEASURES_ONLY'
  );
}

export function needsVerification(directives: InteractAdvanceDirectives): boolean {
  return !directives.verifiedWithinNinetyDays;
}

export function isPPRFlagged(flag: PPRFlag): boolean {
  return flag.isFlagged && flag.matchedCategories.length > 0;
}

export function calculateBradenTotal(subscores: BradenSubscores): number {
  return (
    subscores.sensoryPerception +
    subscores.moisture +
    subscores.activity +
    subscores.mobility +
    subscores.nutrition +
    subscores.frictionShear
  );
}

export function getBradenRiskLevel(
  score: number
): 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'MILD' | 'NO_RISK' {
  if (score <= 9) return 'VERY_HIGH';
  if (score <= 12) return 'HIGH';
  if (score <= 14) return 'MODERATE';
  if (score <= 18) return 'MILD';
  return 'NO_RISK';
}

export function getMorseFallRiskLevel(
  score: number
): 'LOW' | 'MODERATE' | 'HIGH' {
  if (score <= 24) return 'LOW';
  if (score <= 44) return 'MODERATE';
  return 'HIGH';
}

export function getBarthelInterpretation(
  score: number
): 'TOTAL' | 'SEVERE' | 'MODERATE' | 'SLIGHT' | 'INDEPENDENT' {
  if (score <= 20) return 'TOTAL';
  if (score <= 60) return 'SEVERE';
  if (score <= 90) return 'MODERATE';
  if (score <= 99) return 'SLIGHT';
  return 'INDEPENDENT';
}
