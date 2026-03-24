import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database.js';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are ATTENDING, a clinical AI assistant for healthcare providers. You provide evidence-based clinical decision support.

IMPORTANT GUIDELINES:
- Always note that AI suggestions require clinician review and clinical judgment
- Use standard medical terminology and abbreviations
- Be concise and structured in responses
- Reference current clinical guidelines when applicable
- Flag any red flags or safety concerns prominently
- Never provide a definitive diagnosis — always frame as differential considerations
- Include relevant ICD-10 and CPT codes when appropriate`;

async function callClaude(prompt, systemOverride) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 2048,
    system: systemOverride || SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  return {
    content: message.content[0].text,
    tokens: message.usage.input_tokens + message.usage.output_tokens,
    model: message.model
  };
}

function logInteraction(encounterId, type, input, output, model, tokens) {
  db.execute(
    `INSERT INTO ai_interactions (encounter_id, interaction_type, input_data, output_data, model, tokens_used) VALUES (?, ?, ?, ?, ?, ?)`,
    [encounterId, type, JSON.stringify(input), JSON.stringify(output), model, tokens]
  );
}

export async function intakeFollowup(patientData, currentSymptoms) {
  const prompt = `A patient is completing their intake form. Based on their information, generate 3-5 targeted follow-up questions to gather clinically relevant details.

Patient Info:
- Age: ${patientData.age}, Gender: ${patientData.gender}
- Medical History: ${JSON.stringify(patientData.medical_history)}
- Current Medications: ${JSON.stringify(patientData.medications)}
- Allergies: ${JSON.stringify(patientData.allergies)}

Current Symptoms/Chief Complaint: ${currentSymptoms}

Return a JSON array of objects with "question" and "category" fields. Categories: history, severity, timing, associated, social.
Example: [{"question": "When did the symptoms first begin?", "category": "timing"}]

Return ONLY the JSON array, no other text.`;

  const result = await callClaude(prompt);
  return { questions: JSON.parse(result.content), tokens: result.tokens, model: result.model };
}

export async function intakeSummary(patientData, intakeData) {
  const prompt = `Generate a structured clinical intake summary for the clinician.

Patient: ${patientData.first_name} ${patientData.last_name}, ${patientData.age}yo ${patientData.gender}
PMH: ${JSON.stringify(patientData.medical_history)}
Medications: ${JSON.stringify(patientData.medications)}
Allergies: ${JSON.stringify(patientData.allergies)}

Intake Data: ${JSON.stringify(intakeData)}

Provide:
1. **One-line Summary** — chief complaint in context
2. **Key History Points** — relevant positives and negatives
3. **Preliminary Triage** — urgency level (routine/urgent/emergent) with reasoning
4. **Suggested Focus Areas** — what the clinician should explore

Format as clean markdown.`;

  const result = await callClaude(prompt);
  return { summary: result.content, tokens: result.tokens, model: result.model };
}

export async function encounterAssist(patientData, intakeData, currentNotes) {
  const prompt = `Provide clinical decision support for this encounter.

Patient: ${patientData.first_name} ${patientData.last_name}, ${patientData.age}yo ${patientData.gender}
PMH: ${JSON.stringify(patientData.medical_history)}
Medications: ${JSON.stringify(patientData.medications)}
Allergies: ${JSON.stringify(patientData.allergies)}
Chief Complaint: ${intakeData.chief_complaint || 'See intake data'}
Intake Data: ${JSON.stringify(intakeData)}
Vitals: ${JSON.stringify(intakeData.vitals || {})}
${currentNotes ? `Clinician Notes So Far: ${currentNotes}` : ''}

Provide:
1. **Differential Diagnoses** — top 3-5 with likelihood reasoning
2. **Recommended Questions** — key history items not yet addressed
3. **Suggested Physical Exam** — focused exam components
4. **Recommended Workup** — labs, imaging, tests to consider
5. **Red Flags** — any concerning features requiring immediate attention

Format as clean markdown. Be concise.`;

  const result = await callClaude(prompt);
  return { assist: result.content, tokens: result.tokens, model: result.model };
}

export async function generateNote(patientData, encounterData) {
  const prompt = `Generate a complete SOAP note for this encounter.

Patient: ${patientData.first_name} ${patientData.last_name}, ${patientData.age}yo ${patientData.gender}
PMH: ${JSON.stringify(patientData.medical_history)}
Medications: ${JSON.stringify(patientData.medications)}
Allergies: ${JSON.stringify(patientData.allergies)}

Chief Complaint: ${encounterData.chief_complaint}
Intake Data: ${JSON.stringify(encounterData.intake_data)}
Vitals: ${JSON.stringify(encounterData.vitals)}
Exam Notes: ${encounterData.exam_notes || 'Not yet documented'}
Assessment: ${encounterData.assessment || 'Not yet documented'}
Plan: ${encounterData.plan || 'Not yet documented'}

Generate a professional SOAP note with:
- S: Subjective — patient's reported symptoms and history
- O: Objective — vitals, exam findings, results
- A: Assessment — numbered problem list with reasoning
- P: Plan — numbered, specific action items for each problem

Use standard medical formatting. Be thorough but concise.`;

  const result = await callClaude(prompt);
  return { note: result.content, tokens: result.tokens, model: result.model };
}

export async function qualityReview(soapNote, encounterData) {
  const prompt = `Review this completed clinical note for quality, completeness, and coding accuracy.

SOAP Note:
${soapNote}

Encounter Data:
- Chief Complaint: ${encounterData.chief_complaint}
- Vitals: ${JSON.stringify(encounterData.vitals)}

Provide a JSON response with:
{
  "completeness": "percentage as string",
  "missing": ["array of missing documentation elements"],
  "icd10_suggestions": ["array of relevant ICD-10 codes with descriptions"],
  "cpt_suggestions": ["array of supported CPT codes with descriptions"],
  "quality_flags": ["array of improvement suggestions"],
  "coding_accuracy": "brief assessment of whether documentation supports the coding level"
}

Return ONLY valid JSON, no other text.`;

  const result = await callClaude(prompt);
  return { review: JSON.parse(result.content), tokens: result.tokens, model: result.model };
}

export { callClaude, logInteraction };
