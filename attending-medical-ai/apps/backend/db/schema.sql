-- ATTENDING Medical AI — Database Schema

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  insurance_provider TEXT,
  insurance_id TEXT,
  allergies TEXT DEFAULT '[]',
  medications TEXT DEFAULT '[]',
  medical_history TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'intake',
  -- status flow: intake → waiting → in_progress → charting → review → completed
  chief_complaint TEXT,
  intake_data TEXT DEFAULT '{}',
  intake_summary TEXT,
  vitals TEXT DEFAULT '{}',
  exam_notes TEXT,
  assessment TEXT,
  plan TEXT,
  soap_note TEXT,
  ai_review TEXT,
  icd10_codes TEXT DEFAULT '[]',
  cpt_codes TEXT DEFAULT '[]',
  provider_name TEXT DEFAULT 'Dr. Demo',
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER,
  interaction_type TEXT NOT NULL,
  -- types: intake_followup, intake_summary, encounter_assist, generate_note, quality_review
  input_data TEXT NOT NULL,
  output_data TEXT NOT NULL,
  model TEXT DEFAULT 'claude-sonnet-4-5-20250514',
  tokens_used INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);
