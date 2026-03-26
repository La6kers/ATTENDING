import { Router } from 'express';
import db from '../db/database.js';
import { emsTranscriptSummary, emsHandoffBrief, logInteraction } from '../services/claude.js';
import { broadcast } from '../services/websocket.js';
import { featureGate } from '../middleware/featureGate.js';

const router = Router();

const EMS_TRANSITIONS = {
  dispatched:    ['on_scene'],
  on_scene:      ['treating'],
  treating:      ['transporting'],
  transporting:  ['arrived'],
  arrived:       ['handoff_complete'],
};

function parseEms(row) {
  if (!row) return null;
  return {
    ...row,
    scene_assessment: JSON.parse(row.scene_assessment || '{}'),
    interventions: JSON.parse(row.interventions || '[]'),
    medications_given: JSON.parse(row.medications_given || '[]'),
    vitals_timeline: JSON.parse(row.vitals_timeline || '[]'),
    transcript_chunks: JSON.parse(row.transcript_chunks || '[]'),
    allergies: row.allergies ? JSON.parse(row.allergies) : [],
    medications: row.medications ? JSON.parse(row.medications) : [],
    medical_history: row.medical_history ? JSON.parse(row.medical_history) : [],
  };
}

// GET /api/ems — List all EMS encounters
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT e.*, em.*, e.id as encounter_id, e.status as encounter_status,
           p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM encounters e
    JOIN ems_encounters em ON em.encounter_id = e.id
    JOIN patients p ON e.patient_id = p.id
    WHERE e.type = 'ems'
  `;
  const params = [];
  if (status) {
    query += ' AND em.transport_status = ?';
    params.push(status);
  }
  query += ' ORDER BY e.created_at DESC';

  const rows = db.queryAll(query, params);
  res.json(rows.map(parseEms));
});

// GET /api/ems/:id — Single EMS encounter
router.get('/:id', (req, res) => {
  const row = db.queryOne(`
    SELECT e.*, em.*, e.id as encounter_id, e.status as encounter_status,
           p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM encounters e
    JOIN ems_encounters em ON em.encounter_id = e.id
    JOIN patients p ON e.patient_id = p.id
    WHERE e.id = ?
  `, [parseInt(req.params.id)]);

  if (!row) return res.status(404).json({ error: 'EMS encounter not found' });
  res.json(parseEms(row));
});

// POST /api/ems — Create new EMS encounter
router.post('/', (req, res) => {
  const { patient_id, chief_complaint, dispatch_code, scene_address, unit_id, crew_lead } = req.body;

  // Create encounter with type='ems'
  const encResult = db.execute(
    `INSERT INTO encounters (patient_id, chief_complaint, status, type, provider_name) VALUES (?, ?, 'intake', 'ems', ?)`,
    [parseInt(patient_id), chief_complaint, crew_lead || 'Paramedic Davis']
  );
  const encounterId = encResult.lastInsertRowid;

  // Create ems_encounters record
  db.execute(
    `INSERT INTO ems_encounters (encounter_id, dispatch_code, dispatch_time, scene_address, unit_id, crew_lead, transport_status)
     VALUES (?, ?, datetime('now'), ?, ?, ?, 'dispatched')`,
    [encounterId, dispatch_code || '', scene_address || '', unit_id || 'MEDIC-1', crew_lead || 'Paramedic Davis']
  );

  const row = db.queryOne(`
    SELECT e.*, em.*, e.id as encounter_id,
           p.first_name, p.last_name, p.date_of_birth, p.gender
    FROM encounters e
    JOIN ems_encounters em ON em.encounter_id = e.id
    JOIN patients p ON e.patient_id = p.id
    WHERE e.id = ?
  `, [encounterId]);

  const parsed = parseEms(row);
  broadcast('er:incoming', 'ems:new_incoming', parsed);
  res.status(201).json(parsed);
});

// PATCH /api/ems/:id/status — Transport status transition
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const encounterId = parseInt(req.params.id);

  const current = db.queryOne('SELECT transport_status FROM ems_encounters WHERE encounter_id = ?', [encounterId]);
  if (!current) return res.status(404).json({ error: 'EMS encounter not found' });

  if (!EMS_TRANSITIONS[current.transport_status]?.includes(status)) {
    return res.status(400).json({
      error: `Cannot transition from '${current.transport_status}' to '${status}'`,
      valid: EMS_TRANSITIONS[current.transport_status]
    });
  }

  db.execute(
    `UPDATE ems_encounters SET transport_status = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
    [status, encounterId]
  );

  // Also update parent encounter status for consistency
  const encounterStatus = status === 'handoff_complete' ? 'completed' : 'in_progress';
  db.execute(`UPDATE encounters SET status = ?, updated_at = datetime('now') WHERE id = ?`, [encounterStatus, encounterId]);

  const row = db.queryOne(`
    SELECT e.*, em.*, e.id as encounter_id,
           p.first_name, p.last_name
    FROM encounters e JOIN ems_encounters em ON em.encounter_id = e.id
    JOIN patients p ON e.patient_id = p.id WHERE e.id = ?
  `, [encounterId]);

  broadcast('er:incoming', 'ems:status_update', {
    encounterId,
    status,
    patientName: `${row.first_name} ${row.last_name}`,
    eta: row.eta_minutes,
  });
  broadcast(`ems:${encounterId}`, 'ems:status_update', { status });

  res.json({ encounterId, transport_status: status });
});

// PUT /api/ems/:id — Update EMS encounter fields
router.put('/:id', (req, res) => {
  const fields = { ...req.body };
  const encounterId = parseInt(req.params.id);

  // Serialize JSON fields
  for (const key of ['scene_assessment', 'interventions', 'medications_given', 'vitals_timeline', 'transcript_chunks']) {
    if (fields[key] && typeof fields[key] === 'object') {
      fields[key] = JSON.stringify(fields[key]);
    }
  }

  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);

  db.execute(`UPDATE ems_encounters SET ${sets}, updated_at = datetime('now') WHERE encounter_id = ?`, [...values, encounterId]);

  const row = db.queryOne(`
    SELECT e.*, em.*, e.id as encounter_id,
           p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM encounters e JOIN ems_encounters em ON em.encounter_id = e.id
    JOIN patients p ON e.patient_id = p.id WHERE e.id = ?
  `, [encounterId]);

  res.json(parseEms(row));
});

// POST /api/ems/:id/vitals — Log timestamped vitals
router.post('/:id/vitals', (req, res) => {
  const encounterId = parseInt(req.params.id);
  const vitals = req.body; // { bp, hr, rr, spo2, gcs, pain, time }

  const ems = db.queryOne('SELECT vitals_timeline FROM ems_encounters WHERE encounter_id = ?', [encounterId]);
  if (!ems) return res.status(404).json({ error: 'EMS encounter not found' });

  const timeline = JSON.parse(ems.vitals_timeline || '[]');
  timeline.push({ ...vitals, time: vitals.time || new Date().toTimeString().slice(0, 5) });

  db.execute(
    `UPDATE ems_encounters SET vitals_timeline = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
    [JSON.stringify(timeline), encounterId]
  );

  broadcast('er:incoming', 'ems:vitals_update', { encounterId, vitals: timeline });
  broadcast(`ems:${encounterId}`, 'ems:vitals_update', { vitals: timeline });

  res.json({ vitals_timeline: timeline });
});

// POST /api/ems/:id/intervention — Log intervention
router.post('/:id/intervention', (req, res) => {
  const encounterId = parseInt(req.params.id);
  const { description, time } = req.body;

  const ems = db.queryOne('SELECT interventions FROM ems_encounters WHERE encounter_id = ?', [encounterId]);
  if (!ems) return res.status(404).json({ error: 'EMS encounter not found' });

  const interventions = JSON.parse(ems.interventions || '[]');
  interventions.push(typeof description === 'string' ? description : `${description} @ ${time || 'now'}`);

  db.execute(
    `UPDATE ems_encounters SET interventions = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
    [JSON.stringify(interventions), encounterId]
  );

  res.json({ interventions });
});

// POST /api/ems/:id/transcript — Append transcript chunk + AI extraction
router.post('/:id/transcript', featureGate('ems-transcript'), async (req, res) => {
  const encounterId = parseInt(req.params.id);
  const { text, timestamp } = req.body;

  const ems = db.queryOne(`
    SELECT em.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM ems_encounters em
    JOIN encounters e ON e.id = em.encounter_id
    JOIN patients p ON e.patient_id = p.id
    WHERE em.encounter_id = ?
  `, [encounterId]);
  if (!ems) return res.status(404).json({ error: 'EMS encounter not found' });

  // Append to raw transcript
  const rawTranscript = (ems.transcript_raw || '') + ' ' + text;
  const chunks = JSON.parse(ems.transcript_chunks || '[]');

  const newChunk = { timestamp: timestamp || new Date().toTimeString().slice(0, 5), text, ai_extraction: null };

  // Try AI extraction (non-blocking on failure)
  try {
    const patientData = {
      first_name: ems.first_name, last_name: ems.last_name,
      date_of_birth: ems.date_of_birth, gender: ems.gender,
      allergies: JSON.parse(ems.allergies || '[]'),
      medications: JSON.parse(ems.medications || '[]'),
      medical_history: JSON.parse(ems.medical_history || '[]'),
    };

    const aiResult = await emsTranscriptSummary(
      [...chunks, newChunk],
      patientData,
      ems.ai_summary
    );

    newChunk.ai_extraction = aiResult.extraction;
    logInteraction(encounterId, 'ems_transcript_summary', { text }, aiResult, aiResult.model, aiResult.tokens);

    // Update AI summary
    db.execute(
      `UPDATE ems_encounters SET ai_summary = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
      [aiResult.summary, encounterId]
    );

    // Broadcast updated summary to ER
    broadcast('er:incoming', 'ems:summary_update', {
      encounterId,
      summary: aiResult.summary,
      extraction: aiResult.extraction,
    });
    broadcast(`ems:${encounterId}`, 'ems:summary_update', {
      summary: aiResult.summary,
      extraction: aiResult.extraction,
    });
  } catch (err) {
    console.error('EMS AI extraction error (non-fatal):', err.message);
  }

  chunks.push(newChunk);

  db.execute(
    `UPDATE ems_encounters SET transcript_raw = ?, transcript_chunks = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
    [rawTranscript.trim(), JSON.stringify(chunks), encounterId]
  );

  res.json({ chunk: newChunk, total_chunks: chunks.length });
});

// POST /api/ems/:id/handoff — Generate final handoff brief
router.post('/:id/handoff', featureGate('ems-handoff'), async (req, res) => {
  const encounterId = parseInt(req.params.id);

  const ems = db.queryOne(`
    SELECT em.*, e.chief_complaint,
           p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM ems_encounters em
    JOIN encounters e ON e.id = em.encounter_id
    JOIN patients p ON e.patient_id = p.id
    WHERE em.encounter_id = ?
  `, [encounterId]);
  if (!ems) return res.status(404).json({ error: 'EMS encounter not found' });

  try {
    const patientData = {
      first_name: ems.first_name, last_name: ems.last_name,
      date_of_birth: ems.date_of_birth, gender: ems.gender,
      allergies: JSON.parse(ems.allergies || '[]'),
      medications: JSON.parse(ems.medications || '[]'),
      medical_history: JSON.parse(ems.medical_history || '[]'),
    };

    const emsData = {
      chief_complaint: ems.chief_complaint,
      dispatch_code: ems.dispatch_code,
      unit_id: ems.unit_id,
      crew_lead: ems.crew_lead,
      triage_level: ems.triage_level,
      interventions: JSON.parse(ems.interventions || '[]'),
      medications_given: JSON.parse(ems.medications_given || '[]'),
      vitals_timeline: JSON.parse(ems.vitals_timeline || '[]'),
    };

    const result = await emsHandoffBrief(ems.transcript_raw || '', emsData, patientData);
    logInteraction(encounterId, 'ems_handoff_brief', { encounterId }, result, result.model, result.tokens);

    db.execute(
      `UPDATE ems_encounters SET handoff_brief = ?, updated_at = datetime('now') WHERE encounter_id = ?`,
      [result.brief, encounterId]
    );

    broadcast('er:incoming', 'ems:handoff_ready', { encounterId, handoffBrief: result.brief });

    res.json({ handoff_brief: result.brief });
  } catch (err) {
    console.error('EMS handoff brief error:', err);
    res.status(500).json({ error: 'AI service error', details: err.message });
  }
});

export default router;
