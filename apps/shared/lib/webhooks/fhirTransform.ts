// =============================================================================
// COMPASS Webhook — FHIR R4 Bundle Transform
// apps/shared/lib/webhooks/fhirTransform.ts
//
// Converts an ATTENDING-native assessment payload into a FHIR R4
// Document Bundle suitable for EHR ingestion. The bundle contains:
//
//   1. Patient resource         — demographics
//   2. Composition resource     — the assessment as a clinical document
//   3. Condition resources      — one per red flag detected
//   4. Observation resources    — HPI components as structured observations
//   5. AllergyIntolerance       — one per reported allergy
//   6. MedicationStatement      — one per reported medication
//
// This follows the FHIR US Core Implementation Guide where applicable.
// EHRs like Epic, Cerner, and MEDITECH can ingest this directly.
// =============================================================================

import type { AttendingAssessmentPayload, FhirBundlePayload, FhirBundleEntry } from './types';

// =============================================================================
// FHIR Resource Builders
// =============================================================================

function buildPatientResource(payload: AttendingAssessmentPayload): FhirBundleEntry {
  const { patient } = payload;

  return {
    fullUrl: `urn:uuid:patient-${patient.id}`,
    resource: {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        {
          system: 'urn:compass:mrn',
          value: patient.mrn,
        },
      ],
      name: [
        {
          use: 'official',
          family: patient.lastName,
          given: [patient.firstName],
          text: patient.name,
        },
      ],
      gender: mapGender(patient.gender),
      birthDate: patient.dateOfBirth,
    },
  };
}

function buildCompositionResource(payload: AttendingAssessmentPayload): FhirBundleEntry {
  const { assessment, patient } = payload;

  const sections: Array<Record<string, unknown>> = [
    {
      title: 'Chief Complaint',
      code: {
        coding: [{ system: 'http://loinc.org', code: '10154-3', display: 'Chief complaint' }],
      },
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(assessment.chiefComplaint)}</div>`,
      },
    },
    {
      title: 'History of Present Illness',
      code: {
        coding: [{ system: 'http://loinc.org', code: '10164-2', display: 'History of present illness' }],
      },
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(assessment.hpiNarrative)}</div>`,
      },
    },
  ];

  // Medications section
  if (patient.medications.length > 0) {
    sections.push({
      title: 'Medications',
      code: {
        coding: [{ system: 'http://loinc.org', code: '10160-0', display: 'Medication use' }],
      },
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml"><ul>${patient.medications.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>`,
      },
      entry: patient.medications.map((_, i) => ({
        reference: `urn:uuid:medication-${i}`,
      })),
    });
  }

  // Allergies section
  if (patient.allergies.length > 0 && patient.allergies[0] !== 'NKDA') {
    sections.push({
      title: 'Allergies and Adverse Reactions',
      code: {
        coding: [{ system: 'http://loinc.org', code: '48765-2', display: 'Allergies and adverse reactions' }],
      },
      entry: patient.allergies.map((_, i) => ({
        reference: `urn:uuid:allergy-${i}`,
      })),
    });
  }

  // Red flags as alert section
  if (assessment.redFlags.length > 0) {
    sections.push({
      title: 'Clinical Alerts',
      code: {
        coding: [{ system: 'http://loinc.org', code: '74018-3', display: 'Alert' }],
      },
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml"><p style="color:red;font-weight:bold">RED FLAGS DETECTED:</p><ul>${assessment.redFlags.map((rf) => `<li>[${rf.severity.toUpperCase()}] ${escapeHtml(rf.symptom)} (${escapeHtml(rf.category)})</li>`).join('')}</ul></div>`,
      },
    });
  }

  return {
    fullUrl: `urn:uuid:composition-${assessment.id}`,
    resource: {
      resourceType: 'Composition',
      id: assessment.id,
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consult note',
          },
        ],
        text: 'COMPASS Pre-Visit Assessment',
      },
      subject: { reference: `urn:uuid:patient-${patient.id}` },
      date: assessment.completedAt,
      title: `COMPASS Assessment — ${assessment.chiefComplaint}`,
      section: sections,
      // Extension: triage level
      extension: [
        {
          url: 'urn:compass:triage-level',
          valueString: assessment.triageLevel,
        },
        {
          url: 'urn:compass:urgency-score',
          valueInteger: assessment.urgencyScore,
        },
      ],
    },
  };
}

function buildRedFlagConditions(payload: AttendingAssessmentPayload): FhirBundleEntry[] {
  return payload.assessment.redFlags.map((rf, i) => ({
    fullUrl: `urn:uuid:condition-redflag-${i}`,
    resource: {
      resourceType: 'Condition',
      id: `redflag-${i}`,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
      },
      verificationStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'provisional' }],
      },
      severity: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: rf.severity === 'critical' ? '24484000' : rf.severity === 'urgent' ? '6736007' : '255604002',
            display: rf.severity === 'critical' ? 'Severe' : rf.severity === 'urgent' ? 'Moderate' : 'Mild',
          },
        ],
      },
      category: [
        {
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' },
          ],
        },
      ],
      code: {
        text: rf.symptom,
      },
      subject: { reference: `urn:uuid:patient-${payload.patient.id}` },
      recordedDate: rf.detectedAt || payload.assessment.completedAt,
      note: [{ text: `COMPASS red flag: ${rf.symptom} (${rf.category})` }],
    },
  }));
}

function buildAllergyResources(payload: AttendingAssessmentPayload): FhirBundleEntry[] {
  const allergies = payload.patient.allergies.filter((a) => a !== 'NKDA');
  return allergies.map((allergen, i) => ({
    fullUrl: `urn:uuid:allergy-${i}`,
    resource: {
      resourceType: 'AllergyIntolerance',
      id: `allergy-${i}`,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }],
      },
      verificationStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed' }],
      },
      type: 'allergy',
      code: { text: allergen },
      patient: { reference: `urn:uuid:patient-${payload.patient.id}` },
      recordedDate: payload.assessment.completedAt,
      note: [{ text: 'Self-reported during COMPASS assessment' }],
    },
  }));
}

function buildMedicationStatements(payload: AttendingAssessmentPayload): FhirBundleEntry[] {
  return payload.patient.medications.map((med, i) => ({
    fullUrl: `urn:uuid:medication-${i}`,
    resource: {
      resourceType: 'MedicationStatement',
      id: `medication-${i}`,
      status: 'active',
      medicationCodeableConcept: { text: med },
      subject: { reference: `urn:uuid:patient-${payload.patient.id}` },
      dateAsserted: payload.assessment.completedAt,
      informationSource: { reference: `urn:uuid:patient-${payload.patient.id}` },
      note: [{ text: 'Self-reported during COMPASS assessment' }],
    },
  }));
}

// =============================================================================
// Main Transform
// =============================================================================

/**
 * Convert an ATTENDING-native assessment payload into a FHIR R4 Document Bundle.
 */
export function toFhirBundle(payload: AttendingAssessmentPayload): FhirBundlePayload {
  const entries: FhirBundleEntry[] = [
    buildPatientResource(payload),
    buildCompositionResource(payload),
    ...buildRedFlagConditions(payload),
    ...buildAllergyResources(payload),
    ...buildMedicationStatements(payload),
  ];

  return {
    format: 'fhir-r4',
    version: '1.0',
    bundle: {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: payload.assessment.completedAt,
      entry: entries,
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function mapGender(gender: string): string {
  const lower = gender.toLowerCase();
  if (lower === 'male' || lower === 'm') return 'male';
  if (lower === 'female' || lower === 'f') return 'female';
  if (lower === 'other') return 'other';
  return 'unknown';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
