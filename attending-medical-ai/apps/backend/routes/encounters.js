import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function parseEncounter(e) {
  return {
    ...e,
    intake_data: JSON.parse(e.intake_data || '{}'),
    vitals: JSON.parse(e.vitals || '{}'),
    icd10_codes: JSON.parse(e.icd10_codes || '[]'),
    cpt_codes: JSON.parse(e.cpt_codes || '[]'),
    allergies: e.allergies ? JSON.parse(e.allergies) : undefined,
    medications: e.medications ? JSON.parse(e.medications) : undefined,
    medical_history: e.medical_history ? JSON.parse(e.medical_history) : undefined,
    ai_review: e.ai_review ? JSON.parse(e.ai_review) : null
  };
}

// GET all encounters (with patient info)
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM encounters e
    JOIN patients p ON e.patient_id = p.id
  `;
  const params = [];
  if (status) {
    query += ' WHERE e.status = ?';
    params.push(status);
  }
  query += ' ORDER BY e.created_at DESC';

  const encounters = db.queryAll(query, params);
  res.json(encounters.map(parseEncounter));
});

// GET single encounter
router.get('/:id', (req, res) => {
  const encounter = db.queryOne(`
    SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.allergies, p.medications, p.medical_history
    FROM encounters e
    JOIN patients p ON e.patient_id = p.id
    WHERE e.id = ?
  `, [parseInt(req.params.id)]);

  if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
  res.json(parseEncounter(encounter));
});

// POST create encounter
router.post('/', (req, res) => {
  const { patient_id, chief_complaint } = req.body;
  const result = db.execute(
    `INSERT INTO encounters (patient_id, chief_complaint, status) VALUES (?, ?, 'intake')`,
    [parseInt(patient_id), chief_complaint]
  );

  const encounter = db.queryOne('SELECT * FROM encounters WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(parseEncounter(encounter));
});

// PUT update encounter
router.put('/:id', (req, res) => {
  const fields = { ...req.body };

  // Serialize JSON fields
  for (const key of ['intake_data', 'vitals', 'icd10_codes', 'cpt_codes', 'ai_review']) {
    if (fields[key] && typeof fields[key] === 'object') {
      fields[key] = JSON.stringify(fields[key]);
    }
  }

  if (fields.status === 'completed' && !fields.completed_at) {
    fields.completed_at = new Date().toISOString();
  }

  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);

  db.execute(`UPDATE encounters SET ${sets}, updated_at = datetime('now') WHERE id = ?`, [...values, parseInt(req.params.id)]);

  const encounter = db.queryOne(`
    SELECT e.*, p.first_name, p.last_name, p.date_of_birth, p.gender
    FROM encounters e JOIN patients p ON e.patient_id = p.id
    WHERE e.id = ?
  `, [parseInt(req.params.id)]);

  res.json(parseEncounter(encounter));
});

// PATCH update encounter status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const validTransitions = {
    intake: ['waiting'],
    waiting: ['in_progress'],
    in_progress: ['charting'],
    charting: ['review'],
    review: ['completed']
  };

  const current = db.queryOne('SELECT status FROM encounters WHERE id = ?', [parseInt(req.params.id)]);
  if (!current) return res.status(404).json({ error: 'Encounter not found' });

  if (!validTransitions[current.status]?.includes(status)) {
    return res.status(400).json({
      error: `Cannot transition from '${current.status}' to '${status}'`,
      valid: validTransitions[current.status]
    });
  }

  const params = [status];
  let sql = `UPDATE encounters SET status = ?, updated_at = datetime('now')`;
  if (status === 'completed') {
    sql += `, completed_at = ?`;
    params.push(new Date().toISOString());
  }
  sql += ` WHERE id = ?`;
  params.push(parseInt(req.params.id));

  db.execute(sql, params);
  res.json({ id: parseInt(req.params.id), status });
});

export default router;
