import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET all patients
router.get('/', (req, res) => {
  const patients = db.queryAll('SELECT * FROM patients ORDER BY updated_at DESC');

  // Get latest encounter for each patient
  const result = patients.map(p => {
    const enc = db.queryOne(
      'SELECT id, status, chief_complaint, started_at FROM encounters WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1',
      [p.id]
    );
    return {
      ...p,
      allergies: JSON.parse(p.allergies || '[]'),
      medications: JSON.parse(p.medications || '[]'),
      medical_history: JSON.parse(p.medical_history || '[]'),
      latest_encounter: enc
    };
  });

  res.json(result);
});

// GET single patient
router.get('/:id', (req, res) => {
  const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [parseInt(req.params.id)]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const encounters = db.queryAll(
    'SELECT * FROM encounters WHERE patient_id = ? ORDER BY created_at DESC',
    [parseInt(req.params.id)]
  );

  res.json({
    ...patient,
    allergies: JSON.parse(patient.allergies || '[]'),
    medications: JSON.parse(patient.medications || '[]'),
    medical_history: JSON.parse(patient.medical_history || '[]'),
    encounters: encounters.map(e => ({
      ...e,
      intake_data: JSON.parse(e.intake_data || '{}'),
      vitals: JSON.parse(e.vitals || '{}'),
      icd10_codes: JSON.parse(e.icd10_codes || '[]'),
      cpt_codes: JSON.parse(e.cpt_codes || '[]'),
      ai_review: e.ai_review ? JSON.parse(e.ai_review) : null
    }))
  });
});

// POST create patient
router.post('/', (req, res) => {
  const { first_name, last_name, date_of_birth, gender, phone, email, insurance_provider, insurance_id, allergies, medications, medical_history } = req.body;

  const result = db.execute(
    `INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, insurance_provider, insurance_id, allergies, medications, medical_history)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, date_of_birth, gender, phone || null, email || null,
     insurance_provider || null, insurance_id || null,
     JSON.stringify(allergies || []),
     JSON.stringify(medications || []),
     JSON.stringify(medical_history || [])]
  );

  const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(patient);
});

// PUT update patient
router.put('/:id', (req, res) => {
  const fields = { ...req.body };
  if (fields.allergies && Array.isArray(fields.allergies)) fields.allergies = JSON.stringify(fields.allergies);
  if (fields.medications && Array.isArray(fields.medications)) fields.medications = JSON.stringify(fields.medications);
  if (fields.medical_history && Array.isArray(fields.medical_history)) fields.medical_history = JSON.stringify(fields.medical_history);

  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);

  db.execute(`UPDATE patients SET ${sets}, updated_at = datetime('now') WHERE id = ?`, [...values, parseInt(req.params.id)]);

  const patient = db.queryOne('SELECT * FROM patients WHERE id = ?', [parseInt(req.params.id)]);
  res.json(patient);
});

export default router;
