// ============================================================
// COMPASS Standalone — HPI Narrative Generator
// Converts structured OLDCARTS data into clinical narrative text
// ============================================================

import type { HPIData } from '@attending/shared/types/chat.types';
import type { DifferentialDiagnosisResult } from '@attending/shared/lib/ai/differentialDiagnosis';
import type { RedFlag } from '@attending/shared/types/chat.types';

export type SummaryFormat = 'narrative' | 'bulleted' | 'soap';

export function buildHpiNarrative(
  hpi: HPIData,
  chiefComplaint?: string,
  patientName?: string
): string {
  const parts: string[] = [];

  // Opening line
  const subject = patientName || 'Patient';
  if (chiefComplaint) {
    parts.push(`${subject} presents with a chief complaint of ${chiefComplaint}.`);
  }

  // Onset
  if (hpi.onset) {
    parts.push(`The symptoms began ${hpi.onset.toLowerCase().replace(/^started?\s*/i, '')}.`);
  }

  // Location
  if (hpi.location) {
    parts.push(`The symptoms are located in the ${hpi.location.toLowerCase()}.`);
  }

  // Duration
  if (hpi.duration) {
    parts.push(`Episodes last ${hpi.duration.toLowerCase()}.`);
  }

  // Character
  if (hpi.character) {
    parts.push(`The quality is described as ${hpi.character.toLowerCase()}.`);
  }

  // Severity
  if (hpi.severity !== undefined && hpi.severity !== null) {
    const severityLabel =
      hpi.severity <= 3 ? 'mild' :
      hpi.severity <= 6 ? 'moderate' :
      hpi.severity <= 8 ? 'severe' : 'very severe';
    parts.push(`Severity is rated ${hpi.severity}/10 (${severityLabel}).`);
  }

  // Timing
  if (hpi.timing) {
    parts.push(`Timing: ${hpi.timing}.`);
  }

  // Aggravating factors
  if (hpi.aggravating?.length) {
    parts.push(`Aggravating factors include ${hpi.aggravating.join(', ')}.`);
  }

  // Relieving factors
  if (hpi.relieving?.length) {
    parts.push(`Relieving factors include ${hpi.relieving.join(', ')}.`);
  }

  // Associated symptoms
  if (hpi.associated?.length) {
    const filtered = hpi.associated.filter(s => s && s.toLowerCase() !== 'no associated symptoms');
    if (filtered.length > 0) {
      parts.push(`Associated symptoms include ${filtered.join(', ')}.`);
    } else {
      parts.push('No associated symptoms reported.');
    }
  }

  return parts.join(' ');
}

export function buildStructuredHpi(hpi: HPIData): Record<string, string> {
  const structured: Record<string, string> = {};
  if (hpi.onset) structured['Onset'] = hpi.onset;
  if (hpi.location) structured['Location'] = hpi.location;
  if (hpi.duration) structured['Duration'] = hpi.duration;
  if (hpi.character) structured['Character'] = hpi.character;
  if (hpi.severity !== undefined) structured['Severity'] = `${hpi.severity}/10`;
  if (hpi.timing) structured['Timing'] = hpi.timing;
  if (hpi.aggravating?.length) structured['Aggravating Factors'] = hpi.aggravating.join(', ');
  if (hpi.relieving?.length) structured['Relieving Factors'] = hpi.relieving.join(', ');
  if (hpi.associated?.length) structured['Associated Symptoms'] = hpi.associated.join(', ');
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
