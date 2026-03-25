// =============================================================================
// ATTENDING AI - FHIR R4 Types
// apps/shared/lib/fhir/types.ts
//
// FHIR R4 resource type definitions for EHR interoperability
// =============================================================================

// =============================================================================
// Base FHIR Types
// =============================================================================

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  implicitRules?: string;
  language?: string;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value?: string;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

export interface FhirRatio {
  numerator?: FhirQuantity;
  denominator?: FhirQuantity;
}

export interface FhirAnnotation {
  authorReference?: FhirReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FhirAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

// =============================================================================
// Human Name & Address
// =============================================================================

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

// =============================================================================
// Patient Resource
// =============================================================================

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: FhirAttachment[];
  contact?: FhirPatientContact[];
  communication?: FhirPatientCommunication[];
  generalPractitioner?: FhirReference[];
  managingOrganization?: FhirReference;
  link?: FhirPatientLink[];
}

export interface FhirPatientContact {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FhirReference;
  period?: FhirPeriod;
}

export interface FhirPatientCommunication {
  language: FhirCodeableConcept;
  preferred?: boolean;
}

export interface FhirPatientLink {
  other: FhirReference;
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
}

// =============================================================================
// Observation Resource (Lab Results, Vitals)
// =============================================================================

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  identifier?: FhirIdentifier[];
  basedOn?: FhirReference[];
  partOf?: FhirReference[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  focus?: FhirReference[];
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  effectiveTiming?: unknown;
  effectiveInstant?: string;
  issued?: string;
  performer?: FhirReference[];
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FhirRange;
  valueRatio?: FhirRatio;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  note?: FhirAnnotation[];
  bodySite?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  specimen?: FhirReference;
  device?: FhirReference;
  referenceRange?: FhirObservationReferenceRange[];
  hasMember?: FhirReference[];
  derivedFrom?: FhirReference[];
  component?: FhirObservationComponent[];
}

export interface FhirObservationReferenceRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
  type?: FhirCodeableConcept;
  appliesTo?: FhirCodeableConcept[];
  age?: FhirRange;
  text?: string;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FhirRange;
  valueRatio?: FhirRatio;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: FhirObservationReferenceRange[];
}

// =============================================================================
// Condition Resource (Diagnoses, Problems)
// =============================================================================

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  severity?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  bodySite?: FhirCodeableConcept[];
  subject: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  onsetAge?: FhirQuantity;
  onsetPeriod?: FhirPeriod;
  onsetRange?: FhirRange;
  onsetString?: string;
  abatementDateTime?: string;
  abatementAge?: FhirQuantity;
  abatementPeriod?: FhirPeriod;
  abatementRange?: FhirRange;
  abatementString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  stage?: FhirConditionStage[];
  evidence?: FhirConditionEvidence[];
  note?: FhirAnnotation[];
}

export interface FhirConditionStage {
  summary?: FhirCodeableConcept;
  assessment?: FhirReference[];
  type?: FhirCodeableConcept;
}

export interface FhirConditionEvidence {
  code?: FhirCodeableConcept[];
  detail?: FhirReference[];
}

// =============================================================================
// MedicationRequest Resource
// =============================================================================

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  identifier?: FhirIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  statusReason?: FhirCodeableConcept;
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FhirCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  doNotPerform?: boolean;
  reportedBoolean?: boolean;
  reportedReference?: FhirReference;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: FhirReference;
  subject: FhirReference;
  encounter?: FhirReference;
  supportingInformation?: FhirReference[];
  authoredOn?: string;
  requester?: FhirReference;
  performer?: FhirReference;
  performerType?: FhirCodeableConcept;
  recorder?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FhirReference[];
  groupIdentifier?: FhirIdentifier;
  courseOfTherapyType?: FhirCodeableConcept;
  insurance?: FhirReference[];
  note?: FhirAnnotation[];
  dosageInstruction?: FhirDosage[];
  dispenseRequest?: FhirMedicationRequestDispenseRequest;
  substitution?: FhirMedicationRequestSubstitution;
  priorPrescription?: FhirReference;
  detectedIssue?: FhirReference[];
  eventHistory?: FhirReference[];
}

export interface FhirDosage {
  sequence?: number;
  text?: string;
  additionalInstruction?: FhirCodeableConcept[];
  patientInstruction?: string;
  timing?: FhirTiming;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: FhirCodeableConcept;
  site?: FhirCodeableConcept;
  route?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  doseAndRate?: FhirDosageDoseAndRate[];
  maxDosePerPeriod?: FhirRatio;
  maxDosePerAdministration?: FhirQuantity;
  maxDosePerLifetime?: FhirQuantity;
}

export interface FhirDosageDoseAndRate {
  type?: FhirCodeableConcept;
  doseRange?: FhirRange;
  doseQuantity?: FhirQuantity;
  rateRatio?: FhirRatio;
  rateRange?: FhirRange;
  rateQuantity?: FhirQuantity;
}

export interface FhirTiming {
  event?: string[];
  repeat?: FhirTimingRepeat;
  code?: FhirCodeableConcept;
}

export interface FhirTimingRepeat {
  boundsDuration?: FhirQuantity;
  boundsRange?: FhirRange;
  boundsPeriod?: FhirPeriod;
  count?: number;
  countMax?: number;
  duration?: number;
  durationMax?: number;
  durationUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  frequency?: number;
  frequencyMax?: number;
  period?: number;
  periodMax?: number;
  periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  timeOfDay?: string[];
  when?: string[];
  offset?: number;
}

export interface FhirMedicationRequestDispenseRequest {
  initialFill?: { quantity?: FhirQuantity; duration?: FhirQuantity };
  dispenseInterval?: FhirQuantity;
  validityPeriod?: FhirPeriod;
  numberOfRepeatsAllowed?: number;
  quantity?: FhirQuantity;
  expectedSupplyDuration?: FhirQuantity;
  performer?: FhirReference;
}

export interface FhirMedicationRequestSubstitution {
  allowedBoolean?: boolean;
  allowedCodeableConcept?: FhirCodeableConcept;
  reason?: FhirCodeableConcept;
}

// =============================================================================
// AllergyIntolerance Resource
// =============================================================================

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: FhirCodeableConcept;
  patient: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  onsetAge?: FhirQuantity;
  onsetPeriod?: FhirPeriod;
  onsetRange?: FhirRange;
  onsetString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  lastOccurrence?: string;
  note?: FhirAnnotation[];
  reaction?: FhirAllergyIntoleranceReaction[];
}

export interface FhirAllergyIntoleranceReaction {
  substance?: FhirCodeableConcept;
  manifestation: FhirCodeableConcept[];
  description?: string;
  onset?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  exposureRoute?: FhirCodeableConcept;
  note?: FhirAnnotation[];
}

// =============================================================================
// Encounter Resource
// =============================================================================

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  statusHistory?: FhirEncounterStatusHistory[];
  class: FhirCoding;
  classHistory?: FhirEncounterClassHistory[];
  type?: FhirCodeableConcept[];
  serviceType?: FhirCodeableConcept;
  priority?: FhirCodeableConcept;
  subject?: FhirReference;
  episodeOfCare?: FhirReference[];
  basedOn?: FhirReference[];
  participant?: FhirEncounterParticipant[];
  appointment?: FhirReference[];
  period?: FhirPeriod;
  length?: FhirQuantity;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  diagnosis?: FhirEncounterDiagnosis[];
  account?: FhirReference[];
  hospitalization?: FhirEncounterHospitalization;
  location?: FhirEncounterLocation[];
  serviceProvider?: FhirReference;
  partOf?: FhirReference;
}

export interface FhirEncounterStatusHistory {
  status: FhirEncounter['status'];
  period: FhirPeriod;
}

export interface FhirEncounterClassHistory {
  class: FhirCoding;
  period: FhirPeriod;
}

export interface FhirEncounterParticipant {
  type?: FhirCodeableConcept[];
  period?: FhirPeriod;
  individual?: FhirReference;
}

export interface FhirEncounterDiagnosis {
  condition: FhirReference;
  use?: FhirCodeableConcept;
  rank?: number;
}

export interface FhirEncounterHospitalization {
  preAdmissionIdentifier?: FhirIdentifier;
  origin?: FhirReference;
  admitSource?: FhirCodeableConcept;
  reAdmission?: FhirCodeableConcept;
  dietPreference?: FhirCodeableConcept[];
  specialCourtesy?: FhirCodeableConcept[];
  specialArrangement?: FhirCodeableConcept[];
  destination?: FhirReference;
  dischargeDisposition?: FhirCodeableConcept;
}

export interface FhirEncounterLocation {
  location: FhirReference;
  status?: 'planned' | 'active' | 'reserved' | 'completed';
  physicalType?: FhirCodeableConcept;
  period?: FhirPeriod;
}

// =============================================================================
// DiagnosticReport Resource
// =============================================================================

export interface FhirDiagnosticReport extends FhirResource {
  resourceType: 'DiagnosticReport';
  identifier?: FhirIdentifier[];
  basedOn?: FhirReference[];
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  issued?: string;
  performer?: FhirReference[];
  resultsInterpreter?: FhirReference[];
  specimen?: FhirReference[];
  result?: FhirReference[];
  imagingStudy?: FhirReference[];
  media?: FhirDiagnosticReportMedia[];
  conclusion?: string;
  conclusionCode?: FhirCodeableConcept[];
  presentedForm?: FhirAttachment[];
}

export interface FhirDiagnosticReportMedia {
  comment?: string;
  link: FhirReference;
}

// =============================================================================
// ServiceRequest Resource (Orders)
// =============================================================================

export interface FhirServiceRequest extends FhirResource {
  resourceType: 'ServiceRequest';
  identifier?: FhirIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FhirReference[];
  replaces?: FhirReference[];
  requisition?: FhirIdentifier;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FhirCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  doNotPerform?: boolean;
  code?: FhirCodeableConcept;
  orderDetail?: FhirCodeableConcept[];
  quantityQuantity?: FhirQuantity;
  quantityRatio?: FhirRatio;
  quantityRange?: FhirRange;
  subject: FhirReference;
  encounter?: FhirReference;
  occurrenceDateTime?: string;
  occurrencePeriod?: FhirPeriod;
  occurrenceTiming?: FhirTiming;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: FhirCodeableConcept;
  authoredOn?: string;
  requester?: FhirReference;
  performerType?: FhirCodeableConcept;
  performer?: FhirReference[];
  locationCode?: FhirCodeableConcept[];
  locationReference?: FhirReference[];
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  insurance?: FhirReference[];
  supportingInfo?: FhirReference[];
  specimen?: FhirReference[];
  bodySite?: FhirCodeableConcept[];
  note?: FhirAnnotation[];
  patientInstruction?: string;
  relevantHistory?: FhirReference[];
}

// =============================================================================
// Bundle Resource (for FHIR searches)
// =============================================================================

export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  identifier?: FhirIdentifier;
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  timestamp?: string;
  total?: number;
  link?: FhirBundleLink[];
  entry?: FhirBundleEntry[];
  signature?: unknown;
}

export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundleEntry {
  link?: FhirBundleLink[];
  fullUrl?: string;
  resource?: FhirResource;
  search?: { mode?: 'match' | 'include' | 'outcome'; score?: number };
  request?: { method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; url: string; ifNoneMatch?: string; ifModifiedSince?: string; ifMatch?: string; ifNoneExist?: string };
  response?: { status: string; location?: string; etag?: string; lastModified?: string; outcome?: FhirResource };
}

// =============================================================================
// SMART on FHIR Types
// =============================================================================

export interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  registration_endpoint?: string;
  management_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  capabilities?: string[];
}

export interface SmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  patient?: string;
  encounter?: string;
  id_token?: string;
  state?: string;
}

export interface SmartLaunchContext {
  patient?: string;
  encounter?: string;
  fhirUser?: string;
  need_patient_banner?: boolean;
  smart_style_url?: string;
}

// =============================================================================
// EHR Vendor Types
// =============================================================================

export type EhrVendor = 'epic' | 'cerner' | 'allscripts' | 'athenahealth' | 'meditech' | 'generic';

export interface EhrConfiguration {
  vendor: EhrVendor;
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  redirectUri: string;
  aud?: string;
}

export interface FhirClientConfig {
  ehr: EhrConfiguration;
  smart?: SmartConfiguration;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  patientId?: string;
  encounterId?: string;
}
