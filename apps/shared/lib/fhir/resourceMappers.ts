// =============================================================================
// ATTENDING AI - FHIR Resource Mappers
// apps/shared/lib/fhir/resourceMappers.ts
//
// Transform FHIR R4 resources ↔ ATTENDING internal formats
// =============================================================================

import {
  FhirPatient, FhirObservation, FhirCondition, FhirMedicationRequest,
  FhirAllergyIntolerance, FhirEncounter, FhirBundle, FhirHumanName,
  FhirAddress, FhirContactPoint, FhirCodeableConcept, FhirQuantity,
  FhirReference, FhirDosage,
} from './types';

// =============================================================================
// ATTENDING Internal Types
// =============================================================================

export interface AttendingPatient {
  id: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  primaryCareProvider?: string;
  insuranceInfo?: string;
  preferredLanguage?: string;
  active: boolean;
}

export interface AttendingLabResult {
  id: string;
  patientId: string;
  testName: string;
  testCode?: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  interpretation?: 'normal' | 'abnormal' | 'critical' | 'high' | 'low';
  status: 'preliminary' | 'final' | 'amended' | 'cancelled';
  collectedAt?: string;
  resultedAt: string;
  performedBy?: string;
  notes?: string;
}

export interface AttendingVitalSign {
  id: string;
  patientId: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'respiratory_rate' | 'oxygen_saturation' | 'weight' | 'height' | 'bmi';
  value: string;
  unit: string;
  systolic?: number;
  diastolic?: number;
  recordedAt: string;
  recordedBy?: string;
}

export interface AttendingCondition {
  id: string;
  patientId: string;
  code?: string;
  codeSystem?: string;
  name: string;
  clinicalStatus: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
  verificationStatus?: 'unconfirmed' | 'provisional' | 'differential' | 'confirmed' | 'refuted';
  severity?: 'mild' | 'moderate' | 'severe';
  category: 'problem' | 'diagnosis' | 'health-concern';
  onsetDate?: string;
  abatementDate?: string;
  recordedDate: string;
  recorder?: string;
  notes?: string;
}

export interface AttendingMedication {
  id: string;
  patientId: string;
  medicationName: string;
  medicationCode?: string;
  dosage: string;
  frequency: string;
  route?: string;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft';
  prescribedDate: string;
  prescriber?: string;
  startDate?: string;
  endDate?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  isControlled?: boolean;
}

export interface AttendingAllergy {
  id: string;
  patientId: string;
  allergen: string;
  allergenCode?: string;
  type: 'allergy' | 'intolerance';
  category: 'food' | 'medication' | 'environment' | 'biologic';
  criticality: 'low' | 'high' | 'unable-to-assess';
  clinicalStatus: 'active' | 'inactive' | 'resolved';
  reactions?: {
    manifestation: string;
    severity?: 'mild' | 'moderate' | 'severe';
  }[];
  recordedDate: string;
  recorder?: string;
  notes?: string;
}

export interface AttendingEncounter {
  id: string;
  patientId: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'finished' | 'cancelled';
  type: string;
  class: 'ambulatory' | 'emergency' | 'inpatient' | 'observation' | 'virtual';
  startTime: string;
  endTime?: string;
  provider?: string;
  location?: string;
  reasonForVisit?: string;
  chiefComplaint?: string;
  diagnoses?: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function extractName(names?: FhirHumanName[]): { firstName: string; lastName: string; fullName: string } {
  const officialName = names?.find((n) => n.use === 'official') || names?.[0];
  const firstName = officialName?.given?.join(' ') || '';
  const lastName = officialName?.family || '';
  const fullName = officialName?.text || `${firstName} ${lastName}`.trim();
  return { firstName, lastName, fullName };
}

function extractAddress(addresses?: FhirAddress[]): AttendingPatient['address'] | undefined {
  const homeAddress = addresses?.find((a) => a.use === 'home') || addresses?.[0];
  if (!homeAddress) return undefined;
  return {
    line1: homeAddress.line?.[0],
    line2: homeAddress.line?.[1],
    city: homeAddress.city,
    state: homeAddress.state,
    postalCode: homeAddress.postalCode,
    country: homeAddress.country,
  };
}

function extractContactPoint(telecoms?: FhirContactPoint[], system?: string): string | undefined {
  return telecoms?.find((t) => t.system === system)?.value;
}

function extractCodeableConceptText(concept?: FhirCodeableConcept): string {
  return concept?.text || concept?.coding?.[0]?.display || concept?.coding?.[0]?.code || '';
}

function extractCodeableConceptCode(concept?: FhirCodeableConcept): string | undefined {
  return concept?.coding?.[0]?.code;
}

function extractQuantityValue(quantity?: FhirQuantity): string {
  if (!quantity) return '';
  return `${quantity.value}${quantity.unit ? ' ' + quantity.unit : ''}`;
}

function extractReferenceId(ref?: FhirReference): string | undefined {
  if (!ref?.reference) return undefined;
  const parts = ref.reference.split('/');
  return parts[parts.length - 1];
}

function mapObservationInterpretation(interpretations?: FhirCodeableConcept[]): AttendingLabResult['interpretation'] {
  const code = interpretations?.[0]?.coding?.[0]?.code;
  switch (code) {
    case 'N': return 'normal';
    case 'A': case 'AA': return 'abnormal';
    case 'H': case 'HH': return 'high';
    case 'L': case 'LL': return 'low';
    case 'HU': case 'LU': return 'critical';
    default: return undefined;
  }
}

// =============================================================================
// FHIR → ATTENDING Mappers
// =============================================================================

export function mapFhirPatientToAttending(fhir: FhirPatient): AttendingPatient {
  const { firstName, lastName, fullName } = extractName(fhir.name);
  const mrn = fhir.identifier?.find((id) => id.type?.coding?.[0]?.code === 'MR')?.value;

  return {
    id: fhir.id || '',
    mrn,
    firstName,
    lastName,
    fullName,
    dateOfBirth: fhir.birthDate || '',
    gender: fhir.gender || 'unknown',
    email: extractContactPoint(fhir.telecom, 'email'),
    phone: extractContactPoint(fhir.telecom, 'phone'),
    address: extractAddress(fhir.address),
    emergencyContact: fhir.contact?.[0] ? {
      name: fhir.contact[0].name?.text || extractName([fhir.contact[0].name!]).fullName,
      relationship: extractCodeableConceptText(fhir.contact[0].relationship?.[0]),
      phone: extractContactPoint(fhir.contact[0].telecom, 'phone') || '',
    } : undefined,
    primaryCareProvider: fhir.generalPractitioner?.[0]?.display,
    preferredLanguage: fhir.communication?.find((c) => c.preferred)?.language?.text,
    active: fhir.active !== false,
  };
}

export function mapFhirObservationToLabResult(fhir: FhirObservation): AttendingLabResult {
  let value = '';
  if (fhir.valueQuantity) value = extractQuantityValue(fhir.valueQuantity);
  else if (fhir.valueString) value = fhir.valueString;
  else if (fhir.valueCodeableConcept) value = extractCodeableConceptText(fhir.valueCodeableConcept);
  else if (fhir.valueBoolean !== undefined) value = fhir.valueBoolean ? 'Positive' : 'Negative';

  const refRange = fhir.referenceRange?.[0];
  let referenceRange: string | undefined;
  if (refRange?.low && refRange?.high) {
    referenceRange = `${refRange.low.value} - ${refRange.high.value} ${refRange.low.unit || ''}`.trim();
  } else if (refRange?.text) {
    referenceRange = refRange.text;
  }

  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.subject) || '',
    testName: extractCodeableConceptText(fhir.code),
    testCode: extractCodeableConceptCode(fhir.code),
    value,
    unit: fhir.valueQuantity?.unit,
    referenceRange,
    interpretation: mapObservationInterpretation(fhir.interpretation),
    status: fhir.status === 'final' ? 'final' : fhir.status === 'amended' ? 'amended' : fhir.status === 'cancelled' ? 'cancelled' : 'preliminary',
    collectedAt: fhir.effectiveDateTime,
    resultedAt: fhir.issued || fhir.effectiveDateTime || '',
    performedBy: fhir.performer?.[0]?.display,
    notes: fhir.note?.[0]?.text,
  };
}

export function mapFhirObservationToVitalSign(fhir: FhirObservation): AttendingVitalSign {
  const code = fhir.code?.coding?.[0]?.code;
  let type: AttendingVitalSign['type'] = 'heart_rate';

  switch (code) {
    case '85354-9': type = 'blood_pressure'; break;
    case '8867-4': type = 'heart_rate'; break;
    case '8310-5': type = 'temperature'; break;
    case '9279-1': type = 'respiratory_rate'; break;
    case '2708-6': case '59408-5': type = 'oxygen_saturation'; break;
    case '29463-7': type = 'weight'; break;
    case '8302-2': type = 'height'; break;
    case '39156-5': type = 'bmi'; break;
  }

  let value = '';
  let systolic: number | undefined;
  let diastolic: number | undefined;

  if (type === 'blood_pressure' && fhir.component) {
    const systolicComp = fhir.component.find((c) => c.code?.coding?.[0]?.code === '8480-6');
    const diastolicComp = fhir.component.find((c) => c.code?.coding?.[0]?.code === '8462-4');
    systolic = systolicComp?.valueQuantity?.value;
    diastolic = diastolicComp?.valueQuantity?.value;
    value = `${systolic}/${diastolic}`;
  } else if (fhir.valueQuantity) {
    value = String(fhir.valueQuantity.value);
  }

  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.subject) || '',
    type,
    value,
    unit: fhir.valueQuantity?.unit || 'mmHg',
    systolic,
    diastolic,
    recordedAt: fhir.effectiveDateTime || '',
    recordedBy: fhir.performer?.[0]?.display,
  };
}

export function mapFhirConditionToAttending(fhir: FhirCondition): AttendingCondition {
  const categoryCode = fhir.category?.[0]?.coding?.[0]?.code;
  let category: AttendingCondition['category'] = 'problem';
  if (categoryCode === 'encounter-diagnosis') category = 'diagnosis';
  else if (categoryCode === 'health-concern') category = 'health-concern';

  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.subject) || '',
    code: extractCodeableConceptCode(fhir.code),
    codeSystem: fhir.code?.coding?.[0]?.system,
    name: extractCodeableConceptText(fhir.code),
    clinicalStatus: (fhir.clinicalStatus?.coding?.[0]?.code as AttendingCondition['clinicalStatus']) || 'active',
    verificationStatus: fhir.verificationStatus?.coding?.[0]?.code as AttendingCondition['verificationStatus'],
    severity: fhir.severity?.coding?.[0]?.code as AttendingCondition['severity'],
    category,
    onsetDate: fhir.onsetDateTime,
    abatementDate: fhir.abatementDateTime,
    recordedDate: fhir.recordedDate || '',
    recorder: fhir.recorder?.display,
    notes: fhir.note?.[0]?.text,
  };
}

export function mapFhirMedicationRequestToAttending(fhir: FhirMedicationRequest): AttendingMedication {
  const dosageText = fhir.dosageInstruction?.[0]?.text || '';
  const timing = fhir.dosageInstruction?.[0]?.timing;
  let frequency = timing?.code?.text || '';
  if (!frequency && timing?.repeat) {
    const r = timing.repeat;
    if (r.frequency && r.period && r.periodUnit) {
      frequency = `${r.frequency} time(s) per ${r.period} ${r.periodUnit}`;
    }
  }

  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.subject) || '',
    medicationName: extractCodeableConceptText(fhir.medicationCodeableConcept),
    medicationCode: extractCodeableConceptCode(fhir.medicationCodeableConcept),
    dosage: dosageText,
    frequency,
    route: extractCodeableConceptText(fhir.dosageInstruction?.[0]?.route),
    status: fhir.status as AttendingMedication['status'],
    prescribedDate: fhir.authoredOn || '',
    prescriber: fhir.requester?.display,
    startDate: fhir.dispenseRequest?.validityPeriod?.start,
    endDate: fhir.dispenseRequest?.validityPeriod?.end,
    quantity: fhir.dispenseRequest?.quantity?.value,
    refills: fhir.dispenseRequest?.numberOfRepeatsAllowed,
    instructions: fhir.dosageInstruction?.[0]?.patientInstruction,
  };
}

export function mapFhirAllergyToAttending(fhir: FhirAllergyIntolerance): AttendingAllergy {
  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.patient) || '',
    allergen: extractCodeableConceptText(fhir.code),
    allergenCode: extractCodeableConceptCode(fhir.code),
    type: fhir.type || 'allergy',
    category: fhir.category?.[0] || 'medication',
    criticality: fhir.criticality || 'unable-to-assess',
    clinicalStatus: (fhir.clinicalStatus?.coding?.[0]?.code as AttendingAllergy['clinicalStatus']) || 'active',
    reactions: fhir.reaction?.map((r) => ({
      manifestation: r.manifestation.map((m) => extractCodeableConceptText(m)).join(', '),
      severity: r.severity,
    })),
    recordedDate: fhir.recordedDate || '',
    recorder: fhir.recorder?.display,
    notes: fhir.note?.[0]?.text,
  };
}

export function mapFhirEncounterToAttending(fhir: FhirEncounter): AttendingEncounter {
  const classMap: Record<string, AttendingEncounter['class']> = {
    AMB: 'ambulatory', EMER: 'emergency', IMP: 'inpatient', OBSENC: 'observation', VR: 'virtual',
  };

  return {
    id: fhir.id || '',
    patientId: extractReferenceId(fhir.subject) || '',
    status: fhir.status as AttendingEncounter['status'],
    type: extractCodeableConceptText(fhir.type?.[0]),
    class: classMap[fhir.class?.code || ''] || 'ambulatory',
    startTime: fhir.period?.start || '',
    endTime: fhir.period?.end,
    provider: fhir.participant?.[0]?.individual?.display,
    location: fhir.location?.[0]?.location?.display,
    reasonForVisit: fhir.reasonCode?.[0] ? extractCodeableConceptText(fhir.reasonCode[0]) : undefined,
    diagnoses: fhir.diagnosis?.map((d) => d.condition?.display || '').filter(Boolean),
  };
}

// =============================================================================
// Bundle Extraction Helpers
// =============================================================================

export function extractResourcesFromBundle<T extends { resourceType: string }>(
  bundle: FhirBundle,
  resourceType: string
): T[] {
  return (bundle.entry || [])
    .map((entry) => entry.resource)
    .filter((resource): resource is T => resource?.resourceType === resourceType);
}

export function extractPatientsFromBundle(bundle: FhirBundle): AttendingPatient[] {
  return extractResourcesFromBundle<FhirPatient>(bundle, 'Patient').map(mapFhirPatientToAttending);
}

export function extractLabResultsFromBundle(bundle: FhirBundle): AttendingLabResult[] {
  return extractResourcesFromBundle<FhirObservation>(bundle, 'Observation')
    .filter((obs) => obs.category?.some((c) => c.coding?.some((code) => code.code === 'laboratory')))
    .map(mapFhirObservationToLabResult);
}

export function extractVitalsFromBundle(bundle: FhirBundle): AttendingVitalSign[] {
  return extractResourcesFromBundle<FhirObservation>(bundle, 'Observation')
    .filter((obs) => obs.category?.some((c) => c.coding?.some((code) => code.code === 'vital-signs')))
    .map(mapFhirObservationToVitalSign);
}

export function extractConditionsFromBundle(bundle: FhirBundle): AttendingCondition[] {
  return extractResourcesFromBundle<FhirCondition>(bundle, 'Condition').map(mapFhirConditionToAttending);
}

export function extractMedicationsFromBundle(bundle: FhirBundle): AttendingMedication[] {
  return extractResourcesFromBundle<FhirMedicationRequest>(bundle, 'MedicationRequest').map(mapFhirMedicationRequestToAttending);
}

export function extractAllergiesFromBundle(bundle: FhirBundle): AttendingAllergy[] {
  return extractResourcesFromBundle<FhirAllergyIntolerance>(bundle, 'AllergyIntolerance').map(mapFhirAllergyToAttending);
}

export function extractEncountersFromBundle(bundle: FhirBundle): AttendingEncounter[] {
  return extractResourcesFromBundle<FhirEncounter>(bundle, 'Encounter').map(mapFhirEncounterToAttending);
}
