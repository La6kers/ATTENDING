// ============================================================
// ATTENDING AI — Shared HPI Narrative & SOAP Note Generator
// apps/shared/lib/hpiNarrative.ts
//
// Converts structured OLDCARTS data into clinical narrative text.
// Used by both compass-standalone and provider-portal.
// ============================================================

import type { HPIData, RedFlag } from '../types/chat.types';
import type { DifferentialDiagnosisResult } from './ai/differentialDiagnosis.types';

export type SummaryFormat = 'narrative' | 'bulleted' | 'soap';

// One-word or filler responses that should be treated as "not reported"
// rather than dropped into the narrative verbatim. Prevents output like
// "The symptoms are located in the no. Timing: no."
const NON_ANSWER_RE = /^(no|nope|nothing|none|n\/a|na|idk|dunno|unknown|unsure|skip|-|\.)$/i;
function isReal(value: string | undefined | null): value is string {
  if (!value) return false;
  const v = value.trim();
  if (v.length < 2) return false;
  if (NON_ANSWER_RE.test(v)) return false;
  return true;
}

export function buildHpiNarrative(
  hpi: HPIData,
  chiefComplaint?: string,
  patientName?: string
): string {
  const parts: string[] = [];

  const subject = patientName || 'Patient';
  if (chiefComplaint) {
    parts.push(`${subject} presents with a chief complaint of ${chiefComplaint}.`);
  }

  if (isReal(hpi.onset)) {
    parts.push(`The symptoms began ${hpi.onset.toLowerCase().replace(/^started?\s*/i, '')}.`);
  }
  if (isReal(hpi.location)) {
    parts.push(`The symptoms are located in the ${hpi.location.toLowerCase()}.`);
  }
  if (isReal(hpi.duration)) {
    parts.push(`Episodes last ${hpi.duration.toLowerCase()}.`);
  }
  if (isReal(hpi.character)) {
    parts.push(`The quality is described as ${hpi.character.toLowerCase()}.`);
  }
  if (hpi.severity !== undefined && hpi.severity !== null) {
    const severityLabel =
      hpi.severity <= 3 ? 'mild' :
      hpi.severity <= 6 ? 'moderate' :
      hpi.severity <= 8 ? 'severe' : 'very severe';
    parts.push(`Severity is rated ${hpi.severity}/10 (${severityLabel}).`);
  }
  if (isReal(hpi.timing)) {
    parts.push(`Timing: ${hpi.timing}.`);
  }
  const aggFiltered = (hpi.aggravating || []).filter(isReal);
  if (aggFiltered.length > 0) {
    parts.push(`Aggravating factors include ${aggFiltered.join(', ')}.`);
  }
  const relFiltered = (hpi.relieving || []).filter(isReal);
  if (relFiltered.length > 0) {
    parts.push(`Relieving factors include ${relFiltered.join(', ')}.`);
  }
  if (hpi.associated?.length) {
    const filtered = hpi.associated.filter(s => isReal(s) && s.toLowerCase() !== 'no associated symptoms');
    if (filtered.length > 0) {
      parts.push(`Associated symptoms include ${filtered.join(', ')}.`);
    } else {
      parts.push('No associated symptoms reported.');
    }
  }

  return parts.join(' ');
}

export function buildStructuredHpi(hpi: HPIData): Record<string, string> {
  // Apply the same filler-word filter the narrative uses so the structured
  // HPI cards don't display "Timing: Nothing" or "Location: no" when the
  // patient typed a one-word filler answer.
  const structured: Record<string, string> = {};
  if (isReal(hpi.onset)) structured['Onset'] = hpi.onset;
  if (isReal(hpi.location)) structured['Location'] = hpi.location;
  if (isReal(hpi.duration)) structured['Duration'] = hpi.duration;
  if (isReal(hpi.character)) structured['Character'] = hpi.character;
  if (hpi.severity !== undefined) structured['Severity'] = `${hpi.severity}/10`;
  if (isReal(hpi.timing)) structured['Timing'] = hpi.timing;
  const aggFiltered = (hpi.aggravating || []).filter(isReal);
  if (aggFiltered.length) structured['Aggravating Factors'] = aggFiltered.join(', ');
  const relFiltered = (hpi.relieving || []).filter(isReal);
  if (relFiltered.length) structured['Relieving Factors'] = relFiltered.join(', ');
  const assocFiltered = (hpi.associated || []).filter(isReal);
  if (assocFiltered.length) structured['Associated Symptoms'] = assocFiltered.join(', ');
  return structured;
}

// ============================================================
// Bulleted Summary Format
// ============================================================

export function buildBulletedSummary(
  hpi: HPIData,
  chiefComplaint?: string,
  patientName?: string
): string {
  const lines: string[] = [];
  const subject = patientName || 'Patient';

  if (chiefComplaint) {
    lines.push(`Chief Complaint: ${chiefComplaint}`);
    lines.push('');
  }

  lines.push(`Patient: ${subject}`);
  lines.push('');
  lines.push('Symptom Details:');

  if (hpi.onset) lines.push(`  - Onset: ${hpi.onset}`);
  if (hpi.location) lines.push(`  - Location: ${hpi.location}`);
  if (hpi.duration) lines.push(`  - Duration: ${hpi.duration}`);
  if (hpi.character) lines.push(`  - Character: ${hpi.character}`);
  if (hpi.severity !== undefined && hpi.severity !== null) {
    const label = hpi.severity <= 3 ? 'mild' : hpi.severity <= 6 ? 'moderate' : hpi.severity <= 8 ? 'severe' : 'very severe';
    lines.push(`  - Severity: ${hpi.severity}/10 (${label})`);
  }
  if (hpi.timing) lines.push(`  - Timing: ${hpi.timing}`);

  if (hpi.aggravating?.length) {
    lines.push('');
    lines.push('Aggravating Factors:');
    hpi.aggravating.forEach(f => lines.push(`  - ${f}`));
  }

  if (hpi.relieving?.length) {
    lines.push('');
    lines.push('Relieving Factors:');
    hpi.relieving.forEach(f => lines.push(`  - ${f}`));
  }

  if (hpi.associated?.length) {
    const filtered = hpi.associated.filter(s => s && s.toLowerCase() !== 'no associated symptoms');
    if (filtered.length > 0) {
      lines.push('');
      lines.push('Associated Symptoms:');
      filtered.forEach(s => lines.push(`  - ${s}`));
    }
  }

  return lines.join('\n');
}

// ============================================================
// SOAP Note Format
// ============================================================

export function buildSoapNote(
  hpi: HPIData,
  chiefComplaint?: string,
  patientName?: string,
  diagnosisResult?: DifferentialDiagnosisResult | null,
  redFlags?: RedFlag[]
): string {
  const sections: string[] = [];

  // --- Subjective ---
  sections.push('SUBJECTIVE:');
  sections.push(buildHpiNarrative(hpi, chiefComplaint, patientName));

  if (redFlags && redFlags.length > 0) {
    sections.push('');
    sections.push('Red Flags:');
    redFlags.forEach(rf => sections.push(`  - ${rf.symptom} (${rf.severity})`));
  }

  // --- Objective ---
  sections.push('');
  sections.push('OBJECTIVE:');
  sections.push('Physical exam pending — pre-visit assessment.');

  // --- Assessment ---
  sections.push('');
  sections.push('ASSESSMENT:');
  if (diagnosisResult && diagnosisResult.differentials.length > 0) {
    if (diagnosisResult.clinicalImpression) {
      sections.push(diagnosisResult.clinicalImpression);
      sections.push('');
    }
    sections.push('Differential Diagnoses:');
    diagnosisResult.differentials.slice(0, 5).forEach((dx, i) => {
      const urgTag = dx.urgency === 'emergent' ? ' [EMERGENT]' : dx.urgency === 'urgent' ? ' [URGENT]' : '';
      sections.push(`  ${i + 1}. ${dx.diagnosis} — ${dx.confidence}% confidence${urgTag}`);
      if (dx.icdCode) sections.push(`     ICD-10: ${dx.icdCode}`);
    });
  } else {
    sections.push('Differential diagnosis pending clinical evaluation.');
  }

  // --- Plan ---
  sections.push('');
  sections.push('PLAN:');
  if (diagnosisResult && diagnosisResult.recommendedActions.length > 0) {
    diagnosisResult.recommendedActions.forEach((action, i) => {
      sections.push(`  ${i + 1}. ${action}`);
    });
  } else {
    sections.push('Pending provider review.');
  }

  return sections.join('\n');
}
