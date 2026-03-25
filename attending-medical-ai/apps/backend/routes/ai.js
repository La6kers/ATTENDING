import { Router } from 'express';
import db from '../db/database.js';
import { intakeFollowup, intakeSummary, encounterAssist, generateNote, qualityReview, logInteraction } from '../services/claude.js';
import { featureGate } from '../middleware/featureGate.js';
import { recordUsage } from '../services/billing/usage.js';
import { ROUTE_TO_INTERACTION_TYPE } from '../services/billing/plans.js';

const router = Router();

/**
 * Helper: record AI usage for billing after a successful call.
 * Uses the billing context attached by featureGate middleware.
 */
function trackUsage(req, interactionType, tokens, encounterId) {
  if (!req.billing) return;
  try {
    recordUsage({
      organizationId: req.billing.organizationId,
      subscriptionId: req.billing.subscriptionId,
      encounterId: encounterId || null,
      interactionType,
      tokensInput: Math.round(tokens * 0.6),   // estimate split
      tokensOutput: Math.round(tokens * 0.4),
      providerName: 'Dr. Demo',  // from auth in production
      periodStart: req.billing.periodStart,
      periodEnd: req.billing.periodEnd,
    });
  } catch (err) {
    console.error('Usage tracking error (non-fatal):', err.message);
  }
}

function getAge(dob) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

// POST /api/ai/intake-followup
router.post('/intake-followup', featureGate('intake-followup'), async (req, res) => {
  try {
    const { patient_id, current_symptoms } = req.body;
    const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [parseInt(patient_id)]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const patientData = {
      ...patient,
      age: getAge(patient.date_of_birth),
      medical_history: JSON.parse(patient.medical_history || '[]'),
      medications: JSON.parse(patient.medications || '[]'),
      allergies: JSON.parse(patient.allergies || '[]')
    };

    const result = await intakeFollowup(patientData, current_symptoms);
    logInteraction(null, 'intake_followup', { patient_id, current_symptoms }, result.questions, result.model, result.tokens);
    trackUsage(req, 'intake_followup', result.tokens, null);

    res.json({ questions: result.questions });
  } catch (err) {
    console.error('AI intake-followup error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

// POST /api/ai/intake-summary
router.post('/intake-summary', featureGate('intake-summary'), async (req, res) => {
  try {
    const { encounter_id } = req.body;
    const encounter = db.queryOne(`
      SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
      FROM encounters e JOIN patients p ON e.patient_id = p.id WHERE e.id = ?
    `, [parseInt(encounter_id)]);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    const patientData = {
      ...encounter,
      age: getAge(encounter.date_of_birth),
      medical_history: JSON.parse(encounter.medical_history || '[]'),
      medications: JSON.parse(encounter.medications || '[]'),
      allergies: JSON.parse(encounter.allergies || '[]')
    };

    const result = await intakeSummary(patientData, JSON.parse(encounter.intake_data || '{}'));
    logInteraction(parseInt(encounter_id), 'intake_summary', { encounter_id }, result.summary, result.model, result.tokens);
    trackUsage(req, 'intake_summary', result.tokens, parseInt(encounter_id));

    db.execute('UPDATE encounters SET intake_summary = ? WHERE id = ?', [result.summary, parseInt(encounter_id)]);

    res.json({ summary: result.summary });
  } catch (err) {
    console.error('AI intake-summary error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

// POST /api/ai/encounter-assist
router.post('/encounter-assist', featureGate('encounter-assist'), async (req, res) => {
  try {
    const { encounter_id, current_notes } = req.body;
    const encounter = db.queryOne(`
      SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
      FROM encounters e JOIN patients p ON e.patient_id = p.id WHERE e.id = ?
    `, [parseInt(encounter_id)]);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    const patientData = {
      ...encounter,
      age: getAge(encounter.date_of_birth),
      medical_history: JSON.parse(encounter.medical_history || '[]'),
      medications: JSON.parse(encounter.medications || '[]'),
      allergies: JSON.parse(encounter.allergies || '[]')
    };

    const intakeData = {
      ...JSON.parse(encounter.intake_data || '{}'),
      chief_complaint: encounter.chief_complaint,
      vitals: JSON.parse(encounter.vitals || '{}')
    };

    const result = await encounterAssist(patientData, intakeData, current_notes);
    logInteraction(parseInt(encounter_id), 'encounter_assist', { encounter_id, current_notes }, result.assist, result.model, result.tokens);
    trackUsage(req, 'encounter_assist', result.tokens, parseInt(encounter_id));

    res.json({ assist: result.assist });
  } catch (err) {
    console.error('AI encounter-assist error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

// POST /api/ai/generate-note
router.post('/generate-note', featureGate('generate-note'), async (req, res) => {
  try {
    const { encounter_id } = req.body;
    const encounter = db.queryOne(`
      SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
      FROM encounters e JOIN patients p ON e.patient_id = p.id WHERE e.id = ?
    `, [parseInt(encounter_id)]);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    const patientData = {
      ...encounter,
      age: getAge(encounter.date_of_birth),
      medical_history: JSON.parse(encounter.medical_history || '[]'),
      medications: JSON.parse(encounter.medications || '[]'),
      allergies: JSON.parse(encounter.allergies || '[]')
    };

    const encounterData = {
      ...encounter,
      intake_data: JSON.parse(encounter.intake_data || '{}'),
      vitals: JSON.parse(encounter.vitals || '{}')
    };

    const result = await generateNote(patientData, encounterData);
    logInteraction(parseInt(encounter_id), 'generate_note', { encounter_id }, result.note, result.model, result.tokens);
    trackUsage(req, 'generate_note', result.tokens, parseInt(encounter_id));

    db.execute('UPDATE encounters SET soap_note = ? WHERE id = ?', [result.note, parseInt(encounter_id)]);

    res.json({ note: result.note });
  } catch (err) {
    console.error('AI generate-note error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

// POST /api/ai/review
router.post('/review', featureGate('review'), async (req, res) => {
  try {
    const { encounter_id } = req.body;
    const encounter = db.queryOne('SELECT * FROM encounters WHERE id = ?', [parseInt(encounter_id)]);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
    if (!encounter.soap_note) return res.status(400).json({ error: 'No SOAP note to review' });

    const encounterData = {
      chief_complaint: encounter.chief_complaint,
      vitals: JSON.parse(encounter.vitals || '{}')
    };

    const result = await qualityReview(encounter.soap_note, encounterData);
    logInteraction(parseInt(encounter_id), 'quality_review', { encounter_id }, result.review, result.model, result.tokens);
    trackUsage(req, 'quality_review', result.tokens, parseInt(encounter_id));

    db.execute(
      `UPDATE encounters SET ai_review = ?, icd10_codes = ?, cpt_codes = ? WHERE id = ?`,
      [JSON.stringify(result.review), JSON.stringify(result.review.icd10_suggestions || []), JSON.stringify(result.review.cpt_suggestions || []), parseInt(encounter_id)]
    );

    res.json({ review: result.review });
  } catch (err) {
    console.error('AI review error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

export default router;
