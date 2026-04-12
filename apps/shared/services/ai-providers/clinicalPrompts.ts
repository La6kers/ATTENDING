// ============================================================================
// ATTENDING AI - Shared Clinical Prompt Templates
// apps/shared/services/ai-providers/clinicalPrompts.ts
//
// Centralized prompt definitions used across all AI providers.
// Avoids duplication and ensures consistent behavior regardless of model.
// ============================================================================

import type { PatientContext, EncounterData } from './AIProviderFactory';

/**
 * System prompt for all clinical AI interactions.
 * Sent once per conversation/session where supported (Azure OpenAI, Anthropic).
 */
export const CLINICAL_SYSTEM_PROMPT = `You are a clinical decision support assistant for ATTENDING AI. You assist physicians by generating structured clinical data. You do NOT make diagnoses — you support diagnostic reasoning. Always return valid JSON when requested. Never fabricate clinical evidence. If uncertain, indicate low confidence.`;

/**
 * Clinical extraction prompt — structured data from free text.
 * Expected output: ~300-500 tokens.
 */
export function buildExtractionPrompt(text: string): string {
  return `Extract structured clinical information from the following patient narrative. Return JSON with: chiefComplaint, symptoms (array), duration, severity, medications (array), allergies (array), vitalSigns (object), redFlags (array).

Patient narrative:
${text}

JSON output:`;
}

/**
 * Differential diagnosis prompt — ranked diagnoses from symptoms.
 * Expected output: ~500-1000 tokens.
 */
export function buildDifferentialPrompt(
  symptoms: string[],
  context?: PatientContext
): string {
  const contextStr = context
    ? `Patient: ${context.age || 'unknown'} year old ${context.sex || 'patient'}
Medical History: ${context.medicalHistory?.join(', ') || 'None reported'}
Current Medications: ${context.currentMedications?.join(', ') || 'None'}
Allergies: ${context.allergies?.join(', ') || 'NKDA'}\n`
    : '';

  return `Generate a differential diagnosis for a patient with the following presentation:
${contextStr}Symptoms: ${symptoms.join(', ')}

Provide up to 5 diagnoses ranked by probability. For each include:
- ICD-10 code
- Probability (0-100)
- Supporting findings
- Contradicting findings
- Recommended tests

Also assess urgency level (routine/urgent/emergent).
Return as JSON.`;
}

/**
 * Documentation prompt — SOAP, HPI, assessment, plan.
 * Expected output: ~500-1500 tokens depending on format.
 */
export function buildDocumentationPrompt(
  encounter: EncounterData,
  format: 'soap' | 'hpi' | 'assessment' | 'plan'
): string {
  const templates: Record<string, string> = {
    soap: `Generate a complete SOAP note for the following encounter:\n${JSON.stringify(encounter, null, 2)}`,
    hpi: `Generate a detailed HPI narrative for: Chief Complaint: ${encounter.chiefComplaint}\nSymptoms: ${encounter.symptoms?.join(', ')}`,
    assessment: `Generate a clinical assessment section for:\n${JSON.stringify(encounter, null, 2)}`,
    plan: `Generate a treatment plan for:\n${JSON.stringify(encounter, null, 2)}`,
  };
  return templates[format] || templates.soap;
}

/**
 * Drug interaction check prompt.
 * Expected output: ~200-500 tokens.
 */
export function buildInteractionPrompt(medications: string[]): string {
  return `Check for drug interactions between these medications: ${medications.join(', ')}

Return JSON with:
- interactions: array of { drugs: string[], severity: minor|moderate|major|contraindicated, description, recommendation }
- overallRisk: low|moderate|high`;
}

/**
 * Order recommendation prompt.
 * Expected output: ~200-500 tokens.
 */
export function buildOrderPrompt(diagnosis: string, currentOrders: string[]): string {
  return `For a patient with diagnosis: ${diagnosis}
Current orders: ${currentOrders.join(', ') || 'None'}

Recommend additional labs, imaging, referrals, or procedures. Return JSON array with:
- type: lab|imaging|referral|procedure
- name: order name
- code: CPT/LOINC if applicable
- rationale: brief explanation
- priority: routine|urgent|stat
- confidence: 0-1`;
}
