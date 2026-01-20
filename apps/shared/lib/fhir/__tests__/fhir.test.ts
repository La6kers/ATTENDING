// =============================================================================
// ATTENDING AI - FHIR Module Tests
// apps/shared/lib/fhir/__tests__/fhir.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapFhirPatientToAttending,
  mapFhirObservationToLabResult,
  mapFhirObservationToVitalSign,
  mapFhirConditionToAttending,
  mapFhirMedicationRequestToAttending,
  mapFhirAllergyToAttending,
  mapFhirEncounterToAttending,
  extractLabResultsFromBundle,
} from '../resourceMappers';
import type {
  FhirPatient,
  FhirObservation,
  FhirCondition,
  FhirMedicationRequest,
  FhirAllergyIntolerance,
  FhirEncounter,
  FhirBundle,
} from '../types';

// =============================================================================
// Patient Mapping Tests
// =============================================================================

describe('mapFhirPatientToAttending', () => {
  it('maps a complete FHIR Patient resource', () => {
    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: 'patient-123',
      active: true,
      name: [
        {
          use: 'official',
          family: 'Smith',
          given: ['John', 'Robert'],
        },
      ],
      gender: 'male',
      birthDate: '1980-05-15',
      telecom: [
        { system: 'phone', value: '555-123-4567', use: 'home' },
        { system: 'email', value: 'john.smith@email.com' },
      ],
      address: [
        {
          use: 'home',
          line: ['123 Main St', 'Apt 4B'],
          city: 'Denver',
          state: 'CO',
          postalCode: '80202',
          country: 'USA',
        },
      ],
      identifier: [
        {
          type: { coding: [{ code: 'MR' }] },
          value: 'MRN123456',
        },
      ],
    };

    const result = mapFhirPatientToAttending(fhirPatient);

    expect(result.id).toBe('patient-123');
    expect(result.mrn).toBe('MRN123456');
    expect(result.firstName).toBe('John Robert');
    expect(result.lastName).toBe('Smith');
    expect(result.gender).toBe('male');
    expect(result.dateOfBirth).toBe('1980-05-15');
    expect(result.phone).toBe('555-123-4567');
    expect(result.email).toBe('john.smith@email.com');
    expect(result.address?.city).toBe('Denver');
    expect(result.address?.state).toBe('CO');
    expect(result.active).toBe(true);
  });

  it('handles minimal patient data', () => {
    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: 'patient-456',
    };

    const result = mapFhirPatientToAttending(fhirPatient);

    expect(result.id).toBe('patient-456');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.gender).toBe('unknown');
    expect(result.active).toBe(true);
  });
});

// =============================================================================
// Lab Result Mapping Tests
// =============================================================================

describe('mapFhirObservationToLabResult', () => {
  it('maps a lab result with quantity value', () => {
    const fhirObs: FhirObservation = {
      resourceType: 'Observation',
      id: 'obs-123',
      status: 'final',
      category: [{ coding: [{ code: 'laboratory' }] }],
      code: {
        coding: [{ code: '2345-7', display: 'Glucose' }],
        text: 'Blood Glucose',
      },
      subject: { reference: 'Patient/patient-123' },
      effectiveDateTime: '2024-01-15T10:30:00Z',
      issued: '2024-01-15T14:00:00Z',
      valueQuantity: {
        value: 95,
        unit: 'mg/dL',
      },
      referenceRange: [
        {
          low: { value: 70, unit: 'mg/dL' },
          high: { value: 100, unit: 'mg/dL' },
        },
      ],
      interpretation: [{ coding: [{ code: 'N' }] }],
    };

    const result = mapFhirObservationToLabResult(fhirObs);

    expect(result.id).toBe('obs-123');
    expect(result.testName).toBe('Blood Glucose');
    expect(result.testCode).toBe('2345-7');
    expect(result.value).toBe('95 mg/dL');
    expect(result.unit).toBe('mg/dL');
    expect(result.referenceRange).toBe('70 - 100 mg/dL');
    expect(result.interpretation).toBe('normal');
    expect(result.status).toBe('final');
  });

  it('maps abnormal lab result', () => {
    const fhirObs: FhirObservation = {
      resourceType: 'Observation',
      id: 'obs-456',
      status: 'final',
      code: { coding: [{ code: '2345-7', display: 'Glucose' }] },
      subject: { reference: 'Patient/patient-123' },
      valueQuantity: { value: 250, unit: 'mg/dL' },
      interpretation: [{ coding: [{ code: 'HH' }] }],
    };

    const result = mapFhirObservationToLabResult(fhirObs);

    expect(result.interpretation).toBe('high');
  });
});

// =============================================================================
// Vital Signs Mapping Tests
// =============================================================================

describe('mapFhirObservationToVitalSign', () => {
  it('maps blood pressure with components', () => {
    const fhirObs: FhirObservation = {
      resourceType: 'Observation',
      id: 'bp-123',
      status: 'final',
      category: [{ coding: [{ code: 'vital-signs' }] }],
      code: { coding: [{ code: '85354-9', display: 'Blood Pressure' }] },
      subject: { reference: 'Patient/patient-123' },
      effectiveDateTime: '2024-01-15T10:30:00Z',
      component: [
        {
          code: { coding: [{ code: '8480-6' }] },
          valueQuantity: { value: 120, unit: 'mmHg' },
        },
        {
          code: { coding: [{ code: '8462-4' }] },
          valueQuantity: { value: 80, unit: 'mmHg' },
        },
      ],
    };

    const result = mapFhirObservationToVitalSign(fhirObs);

    expect(result.type).toBe('blood_pressure');
    expect(result.value).toBe('120/80');
    expect(result.systolic).toBe(120);
    expect(result.diastolic).toBe(80);
  });

  it('maps heart rate', () => {
    const fhirObs: FhirObservation = {
      resourceType: 'Observation',
      id: 'hr-123',
      status: 'final',
      code: { coding: [{ code: '8867-4', display: 'Heart Rate' }] },
      subject: { reference: 'Patient/patient-123' },
      effectiveDateTime: '2024-01-15T10:30:00Z',
      valueQuantity: { value: 72, unit: 'bpm' },
    };

    const result = mapFhirObservationToVitalSign(fhirObs);

    expect(result.type).toBe('heart_rate');
    expect(result.value).toBe('72');
    expect(result.unit).toBe('bpm');
  });
});

// =============================================================================
// Condition Mapping Tests
// =============================================================================

describe('mapFhirConditionToAttending', () => {
  it('maps a condition resource', () => {
    const fhirCondition: FhirCondition = {
      resourceType: 'Condition',
      id: 'cond-123',
      subject: { reference: 'Patient/patient-123' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      verificationStatus: { coding: [{ code: 'confirmed' }] },
      category: [{ coding: [{ code: 'problem-list-item' }] }],
      severity: { coding: [{ code: 'moderate' }] },
      code: {
        coding: [{ system: 'http://snomed.info/sct', code: '44054006', display: 'Type 2 Diabetes' }],
        text: 'Type 2 Diabetes Mellitus',
      },
      onsetDateTime: '2020-03-15',
      recordedDate: '2020-03-15',
    };

    const result = mapFhirConditionToAttending(fhirCondition);

    expect(result.id).toBe('cond-123');
    expect(result.name).toBe('Type 2 Diabetes Mellitus');
    expect(result.code).toBe('44054006');
    expect(result.clinicalStatus).toBe('active');
    expect(result.verificationStatus).toBe('confirmed');
    expect(result.severity).toBe('moderate');
    expect(result.category).toBe('problem');
  });
});

// =============================================================================
// Medication Mapping Tests
// =============================================================================

describe('mapFhirMedicationRequestToAttending', () => {
  it('maps a medication request', () => {
    const fhirMed: FhirMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: 'med-123',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/patient-123' },
      medicationCodeableConcept: {
        coding: [{ code: '197361', display: 'Metformin 500 MG' }],
        text: 'Metformin 500mg tablet',
      },
      authoredOn: '2024-01-15',
      requester: { display: 'Dr. Jane Smith' },
      dosageInstruction: [
        {
          text: 'Take 1 tablet twice daily with meals',
          timing: { code: { text: 'BID' } },
          route: { text: 'Oral' },
        },
      ],
      dispenseRequest: {
        quantity: { value: 60 },
        numberOfRepeatsAllowed: 3,
      },
    };

    const result = mapFhirMedicationRequestToAttending(fhirMed);

    expect(result.id).toBe('med-123');
    expect(result.medicationName).toBe('Metformin 500mg tablet');
    expect(result.status).toBe('active');
    expect(result.dosage).toBe('Take 1 tablet twice daily with meals');
    expect(result.frequency).toBe('BID');
    expect(result.route).toBe('Oral');
    expect(result.prescriber).toBe('Dr. Jane Smith');
    expect(result.quantity).toBe(60);
    expect(result.refills).toBe(3);
  });
});

// =============================================================================
// Allergy Mapping Tests
// =============================================================================

describe('mapFhirAllergyToAttending', () => {
  it('maps an allergy with reactions', () => {
    const fhirAllergy: FhirAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: 'allergy-123',
      patient: { reference: 'Patient/patient-123' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      type: 'allergy',
      category: ['medication'],
      criticality: 'high',
      code: {
        coding: [{ code: '7980', display: 'Penicillin' }],
        text: 'Penicillin',
      },
      recordedDate: '2015-06-20',
      reaction: [
        {
          manifestation: [
            { text: 'Hives' },
            { text: 'Difficulty breathing' },
          ],
          severity: 'severe',
        },
      ],
    };

    const result = mapFhirAllergyToAttending(fhirAllergy);

    expect(result.id).toBe('allergy-123');
    expect(result.allergen).toBe('Penicillin');
    expect(result.type).toBe('allergy');
    expect(result.category).toBe('medication');
    expect(result.criticality).toBe('high');
    expect(result.clinicalStatus).toBe('active');
    expect(result.reactions).toHaveLength(1);
    expect(result.reactions![0].manifestation).toBe('Hives, Difficulty breathing');
    expect(result.reactions![0].severity).toBe('severe');
  });
});

// =============================================================================
// Encounter Mapping Tests
// =============================================================================

describe('mapFhirEncounterToAttending', () => {
  it('maps an encounter resource', () => {
    const fhirEncounter: FhirEncounter = {
      resourceType: 'Encounter',
      id: 'enc-123',
      status: 'finished',
      class: { code: 'AMB', display: 'Ambulatory' },
      type: [{ text: 'Office Visit' }],
      subject: { reference: 'Patient/patient-123' },
      participant: [{ individual: { display: 'Dr. John Doe' } }],
      period: {
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T09:30:00Z',
      },
      reasonCode: [{ text: 'Annual checkup' }],
      location: [{ location: { display: 'Main Clinic Room 5' } }],
    };

    const result = mapFhirEncounterToAttending(fhirEncounter);

    expect(result.id).toBe('enc-123');
    expect(result.status).toBe('finished');
    expect(result.class).toBe('ambulatory');
    expect(result.type).toBe('Office Visit');
    expect(result.provider).toBe('Dr. John Doe');
    expect(result.location).toBe('Main Clinic Room 5');
    expect(result.reasonForVisit).toBe('Annual checkup');
  });
});

// =============================================================================
// Bundle Extraction Tests
// =============================================================================

describe('extractLabResultsFromBundle', () => {
  it('extracts lab observations from a bundle', () => {
    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 2,
      entry: [
        {
          resource: {
            resourceType: 'Observation',
            id: 'lab-1',
            status: 'final',
            category: [{ coding: [{ code: 'laboratory' }] }],
            code: { text: 'Glucose' },
            subject: { reference: 'Patient/123' },
            valueQuantity: { value: 95, unit: 'mg/dL' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'vital-1',
            status: 'final',
            category: [{ coding: [{ code: 'vital-signs' }] }],
            code: { text: 'Heart Rate' },
            subject: { reference: 'Patient/123' },
            valueQuantity: { value: 72, unit: 'bpm' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'lab-2',
            status: 'final',
            category: [{ coding: [{ code: 'laboratory' }] }],
            code: { text: 'Hemoglobin' },
            subject: { reference: 'Patient/123' },
            valueQuantity: { value: 14.2, unit: 'g/dL' },
          },
        },
      ],
    };

    const results = extractLabResultsFromBundle(bundle);

    expect(results).toHaveLength(2);
    expect(results[0].testName).toBe('Glucose');
    expect(results[1].testName).toBe('Hemoglobin');
  });

  it('returns empty array for empty bundle', () => {
    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 0,
    };

    const results = extractLabResultsFromBundle(bundle);

    expect(results).toHaveLength(0);
  });
});
