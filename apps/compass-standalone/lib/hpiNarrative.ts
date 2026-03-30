// ============================================================
// COMPASS Standalone — HPI Narrative Generator
// Converts structured OLDCARTS data into clinical narrative text
// ============================================================

import type { HPIData } from '@attending/shared/types/chat.types';

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
