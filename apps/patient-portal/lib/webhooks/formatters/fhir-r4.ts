// =============================================================================
// COMPASS → FHIR R4 Bundle Formatter
// apps/patient-portal/lib/webhooks/formatters/fhir-r4.ts
//
// Converts a COMPASS assessment payload into a FHIR R4 Bundle containing:
//   - Patient resource (demographics)
//   - QuestionnaireResponse (OLDCARTS assessment answers)
//   - Condition resources (one per red flag, provisional status)
//   - RiskAssessment (triage level + urgency score)
//   - AllergyIntolerance resources (if allergies reported)
//
// Reference: https://hl7.org/fhir/R4/
// =============================================================================

import type { CompassWebhookPayload, FormattedPayload } from '../types';

interface FhirResource {
  resourceType: string;
  [key: string]: any;
}

interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
}

interface FhirBundle {
  resourceType: 'Bundle';
  type: 'document';
  timestamp: string;
  identifier?: { system: string; value: string };
  entry: FhirBundleEntry[];
}

/**
 * Convert COMPASS payload to FHIR R4 Bundle.
 */
export function toFhirR4Bundle(payload: CompassWebhookPayload): FhirBundle {
  const entries: FhirBundleEntry[] = [];
  const patientId = `Patient/${payload.compassId}-patient`;

  // ── Patient ─────────────────────────────────────────────
  const nameParts = (payload.patient.name || '').split(' ');
  entries.push({
    fullUrl: `urn:uuid:${patientId}`,
    resource: {
      resourceType: 'Patient',
      identifier: payload.patient.mrn
        ? [{ system: 'urn:compass:mrn', value: payload.patient.mrn }]
        : [],
      name: [{
        use: 'official',
        family: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
        given: nameParts.length > 0 ? [nameParts[0]] : [],
        text: payload.patient.name,
      }],
      birthDate: payload.patient.dateOfBirth || undefined,
      gender: mapGender(payload.patient.gender),
      telecom: payload.patient.phone
        ? [{ system: 'phone', value: payload.patient.phone, use: 'mobile' }]
        : [],
    },
  });

  // ── QuestionnaireResponse (OLDCARTS) ────────────────────
  const qrItems: Array<{ linkId: string; text: string; answer: Array<{ [key: string]: any }> }> = [];
  const hpi = payload.assessment.hpi;

  qrItems.push({
    linkId: 'chief-complaint',
    text: 'Chief Complaint',
    answer: [{ valueString: payload.assessment.chiefComplaint }],
  });

  if (hpi.onset) qrItems.push({ linkId: 'hpi-onset', text: 'Onset', answer: [{ valueString: hpi.onset }] });
  if (hpi.location) qrItems.push({ linkId: 'hpi-location', text: 'Location', answer: [{ valueString: hpi.location }] });
  if (hpi.duration) qrItems.push({ linkId: 'hpi-duration', text: 'Duration', answer: [{ valueString: hpi.duration }] });
  if (hpi.character) qrItems.push({ linkId: 'hpi-character', text: 'Character', answer: [{ valueString: hpi.character }] });
  if (hpi.severity != null) qrItems.push({ linkId: 'hpi-severity', text: 'Severity (0-10)', answer: [{ valueInteger: hpi.severity }] });
  if (hpi.timing) qrItems.push({ linkId: 'hpi-timing', text: 'Timing', answer: [{ valueString: hpi.timing }] });
  if (hpi.aggravating?.length) qrItems.push({ linkId: 'hpi-aggravating', text: 'Aggravating Factors', answer: hpi.aggravating.map(v => ({ valueString: v })) });
  if (hpi.relieving?.length) qrItems.push({ linkId: 'hpi-relieving', text: 'Relieving Factors', answer: hpi.relieving.map(v => ({ valueString: v })) });
  if (hpi.associated?.length) qrItems.push({ linkId: 'hpi-associated', text: 'Associated Symptoms', answer: hpi.associated.map(v => ({ valueString: v })) });

  // Medications
  if (payload.assessment.medications?.length) {
    qrItems.push({
      linkId: 'medications',
      text: 'Current Medications',
      answer: payload.assessment.medications.map(m => ({ valueString: m })),
    });
  }

  // Medical history
  if (payload.assessment.medicalHistory?.length) {
    qrItems.push({
      linkId: 'medical-history',
      text: 'Medical History',
      answer: payload.assessment.medicalHistory.map(h => ({ valueString: h })),
    });
  }

  entries.push({
    fullUrl: `urn:uuid:QuestionnaireResponse/${payload.compassId}`,
    resource: {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      authored: payload.metadata.completedAt,
      questionnaire: 'urn:compass:oldcarts-v2',
      subject: { reference: patientId },
      item: qrItems,
    },
  });

  // ── AllergyIntolerance ──────────────────────────────────
  if (payload.assessment.allergies?.length) {
    for (const allergy of payload.assessment.allergies) {
      if (allergy.toLowerCase() === 'nkda' || allergy.toLowerCase().includes('no known')) continue;
      entries.push({
        resource: {
          resourceType: 'AllergyIntolerance',
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }],
          },
          verificationStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed' }],
          },
          patient: { reference: patientId },
          code: { text: allergy },
          note: [{ text: 'Reported during COMPASS assessment' }],
        },
      });
    }
  }

  // ── Condition (one per red flag) ────────────────────────
  for (const flag of payload.triage.redFlags) {
    entries.push({
      resource: {
        resourceType: 'Condition',
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
        },
        verificationStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'provisional' }],
        },
        severity: { text: flag.severity },
        code: { text: flag.symptom },
        category: [{
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }],
          text: flag.category,
        }],
        subject: { reference: patientId },
        note: flag.detectedFrom
          ? [{ text: `Detected from patient input: "${flag.detectedFrom}"` }]
          : [],
      },
    });
  }

  // ── RiskAssessment (triage) ─────────────────────────────
  entries.push({
    resource: {
      resourceType: 'RiskAssessment',
      status: 'final',
      subject: { reference: patientId },
      occurrenceDateTime: payload.metadata.completedAt,
      prediction: [{
        outcome: { text: `Triage Level: ${payload.triage.level}` },
        probabilityDecimal: payload.triage.score / 100,
      }],
      note: payload.triage.reasoning
        ? [{ text: payload.triage.reasoning }]
        : [{ text: `COMPASS urgency score: ${payload.triage.score}/100, ${payload.triage.redFlags.length} red flag(s)` }],
    },
  });

  return {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: payload.timestamp,
    identifier: {
      system: 'urn:compass:assessment',
      value: payload.compassId,
    },
    entry: entries,
  };
}

/**
 * Format as FHIR R4 string payload.
 */
export function formatFhirR4(payload: CompassWebhookPayload): FormattedPayload {
  return {
    body: JSON.stringify(toFhirR4Bundle(payload), null, 0),
    contentType: 'application/fhir+json',
  };
}

// ── Helpers ─────────────────────────────────────────────────

function mapGender(gender?: string): string | undefined {
  if (!gender) return undefined;
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return 'male';
  if (g === 'female' || g === 'f') return 'female';
  if (g === 'other') return 'other';
  return 'unknown';
}
