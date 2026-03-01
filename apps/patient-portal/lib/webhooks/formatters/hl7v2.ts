// =============================================================================
// COMPASS → HL7v2 ORU Formatter
// apps/patient-portal/lib/webhooks/formatters/hl7v2.ts
//
// Converts a COMPASS assessment payload into an HL7v2 ORU^R01 message.
// ORU (Observation Result Unsolicited) is the standard message type for
// sending clinical observations from one system to another.
//
// This is a simplified HL7v2 output for legacy EHR integration.
// Practices with modern FHIR-enabled systems should use fhir_r4 format.
//
// Reference: HL7v2.5.1 Chapter 7 — Observation Reporting
// =============================================================================

import type { CompassWebhookPayload, FormattedPayload } from '../types';

const FIELD_SEP = '|';
const COMP_SEP = '^';
const REP_SEP = '~';
const ESC_CHAR = '\\';
const SUB_SEP = '&';
const ENCODING_CHARS = `${COMP_SEP}${REP_SEP}${ESC_CHAR}${SUB_SEP}`;

/**
 * Build an HL7v2 ORU^R01 message from COMPASS assessment.
 */
export function toHl7v2Oru(payload: CompassWebhookPayload): string {
  const now = formatHl7DateTime(new Date());
  const msgId = payload.compassId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  const nameParts = (payload.patient.name || 'Unknown').split(' ');
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const firstName = nameParts[0] || '';

  const segments: string[] = [];

  // ── MSH — Message Header ──────────────────────────────
  segments.push(buildSegment('MSH', [
    FIELD_SEP,                                   // Field separator (special — MSH-1)
    ENCODING_CHARS,                              // Encoding characters (MSH-2)
    'COMPASS',                                   // Sending Application (MSH-3)
    'COMPASS_FACILITY',                          // Sending Facility (MSH-4)
    '',                                          // Receiving Application (MSH-5)
    '',                                          // Receiving Facility (MSH-6)
    now,                                         // Date/Time of Message (MSH-7)
    '',                                          // Security (MSH-8)
    `ORU${COMP_SEP}R01`,                        // Message Type (MSH-9)
    msgId,                                       // Message Control ID (MSH-10)
    'P',                                         // Processing ID (MSH-11)
    '2.5.1',                                     // Version ID (MSH-12)
  ]));

  // ── PID — Patient Identification ──────────────────────
  segments.push(buildSegment('PID', [
    '1',                                         // Set ID (PID-1)
    '',                                          // Patient ID (PID-2)
    payload.patient.mrn || '',                   // Patient Identifier List (PID-3)
    '',                                          // Alternate Patient ID (PID-4)
    `${lastName}${COMP_SEP}${firstName}`,        // Patient Name (PID-5)
    '',                                          // Mother's Maiden Name (PID-6)
    formatHl7Date(payload.patient.dateOfBirth),  // Date of Birth (PID-7)
    mapHl7Gender(payload.patient.gender),        // Sex (PID-8)
  ]));

  // ── OBR — Observation Request (the assessment) ────────
  segments.push(buildSegment('OBR', [
    '1',                                         // Set ID (OBR-1)
    payload.compassId,                           // Placer Order Number (OBR-2)
    payload.compassId,                           // Filler Order Number (OBR-3)
    `COMPASS${COMP_SEP}COMPASS Pre-Visit Assessment${COMP_SEP}L`, // Universal Service ID (OBR-4)
    '',                                          // Priority (OBR-5)
    now,                                         // Requested Date/Time (OBR-6)
    now,                                         // Observation Date/Time (OBR-7)
  ]));

  // ── OBX segments — one per clinical observation ───────
  let obxSeq = 1;

  // Chief Complaint
  segments.push(buildObx(obxSeq++, 'CC', 'Chief Complaint', payload.assessment.chiefComplaint));

  // HPI fields
  const hpi = payload.assessment.hpi;
  if (hpi.onset) segments.push(buildObx(obxSeq++, 'ONSET', 'HPI Onset', hpi.onset));
  if (hpi.location) segments.push(buildObx(obxSeq++, 'LOC', 'HPI Location', hpi.location));
  if (hpi.duration) segments.push(buildObx(obxSeq++, 'DUR', 'HPI Duration', hpi.duration));
  if (hpi.character) segments.push(buildObx(obxSeq++, 'CHAR', 'HPI Character', hpi.character));
  if (hpi.severity != null) segments.push(buildObx(obxSeq++, 'SEV', 'HPI Severity (0-10)', String(hpi.severity), 'NM'));
  if (hpi.timing) segments.push(buildObx(obxSeq++, 'TIM', 'HPI Timing', hpi.timing));
  if (hpi.aggravating?.length) segments.push(buildObx(obxSeq++, 'AGG', 'Aggravating Factors', hpi.aggravating.join('; ')));
  if (hpi.relieving?.length) segments.push(buildObx(obxSeq++, 'REL', 'Relieving Factors', hpi.relieving.join('; ')));
  if (hpi.associated?.length) segments.push(buildObx(obxSeq++, 'ASSOC', 'Associated Symptoms', hpi.associated.join('; ')));

  // Medications
  if (payload.assessment.medications?.length) {
    segments.push(buildObx(obxSeq++, 'MEDS', 'Current Medications', payload.assessment.medications.join('; ')));
  }

  // Allergies
  if (payload.assessment.allergies?.length) {
    segments.push(buildObx(obxSeq++, 'ALG', 'Allergies', payload.assessment.allergies.join('; ')));
  }

  // Medical History
  if (payload.assessment.medicalHistory?.length) {
    segments.push(buildObx(obxSeq++, 'PMH', 'Past Medical History', payload.assessment.medicalHistory.join('; ')));
  }

  // HPI Narrative
  if (payload.assessment.hpiNarrative) {
    segments.push(buildObx(obxSeq++, 'HPI', 'HPI Narrative', payload.assessment.hpiNarrative));
  }

  // Triage Level
  segments.push(buildObx(obxSeq++, 'TRIAGE', 'Triage Level', payload.triage.level));
  segments.push(buildObx(obxSeq++, 'USCORE', 'Urgency Score (0-100)', String(payload.triage.score), 'NM'));

  // Red Flags
  for (const flag of payload.triage.redFlags) {
    segments.push(buildObx(
      obxSeq++,
      'RFLAG',
      `Red Flag — ${flag.category}`,
      `${flag.symptom} (${flag.severity})`,
      'ST',
      flag.severity === 'critical' ? 'AA' : 'A', // Abnormal flag
    ));
  }

  // Join with carriage return + line feed (HL7 standard segment terminator)
  return segments.join('\r');
}

/**
 * Format as HL7v2 string payload.
 */
export function formatHl7v2(payload: CompassWebhookPayload): FormattedPayload {
  return {
    body: toHl7v2Oru(payload),
    contentType: 'application/hl7-v2',
  };
}

// ── Segment Builders ────────────────────────────────────────

function buildSegment(name: string, fields: string[]): string {
  // MSH is special — MSH-1 IS the field separator
  if (name === 'MSH') {
    return `MSH${fields.join(FIELD_SEP)}`;
  }
  return `${name}${FIELD_SEP}${fields.join(FIELD_SEP)}`;
}

function buildObx(
  seq: number,
  observationId: string,
  observationText: string,
  value: string,
  valueType: string = 'ST',
  abnormalFlag: string = '',
): string {
  return buildSegment('OBX', [
    String(seq),                                                // Set ID (OBX-1)
    valueType,                                                  // Value Type (OBX-2)
    `${observationId}${COMP_SEP}${observationText}${COMP_SEP}L`, // Observation Identifier (OBX-3)
    '',                                                         // Observation Sub-ID (OBX-4)
    escapeHl7(value),                                           // Observation Value (OBX-5)
    '',                                                         // Units (OBX-6)
    '',                                                         // Reference Range (OBX-7)
    abnormalFlag,                                               // Abnormal Flags (OBX-8)
    '',                                                         // Probability (OBX-9)
    '',                                                         // Nature of Abnormal Test (OBX-10)
    'F',                                                        // Observation Result Status (OBX-11) — F = Final
  ]);
}

// ── Helpers ─────────────────────────────────────────────────

function formatHl7DateTime(date: Date): string {
  return date.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
}

function formatHl7Date(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:T.Z]/g, '').substring(0, 8);
  } catch {
    return '';
  }
}

function mapHl7Gender(gender?: string): string {
  if (!gender) return 'U';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return 'M';
  if (g === 'female' || g === 'f') return 'F';
  if (g === 'other') return 'O';
  return 'U';
}

function escapeHl7(value: string): string {
  return value
    .replace(/\\/g, '\\E\\')
    .replace(/\|/g, '\\F\\')
    .replace(/\^/g, '\\S\\')
    .replace(/~/g, '\\R\\')
    .replace(/&/g, '\\T\\');
}
