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
  type TEXT NOT NULL DEFAULT 'clinical',
  -- type: 'clinical' (standard) or 'ems' (first responder)
  -- clinical status flow: intake → waiting → in_progress → charting → review → completed
  -- ems status flow: dispatched → on_scene → treating → transporting → arrived → handoff_complete
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

-- Override tracking: captures clinician responses to every AI suggestion
CREATE TABLE IF NOT EXISTS ai_suggestion_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER NOT NULL,
  ai_interaction_id INTEGER,
  -- Where in the workflow the suggestion appeared
  stage TEXT NOT NULL,
  -- stages: intake_followup, encounter_assist, soap_generation, quality_review
  -- What kind of suggestion item this was
  suggestion_type TEXT NOT NULL,
  -- types: followup_question, differential_dx, recommended_question, exam_focus,
  --        workup_item, red_flag, soap_section, icd10_code, cpt_code,
  --        missing_doc, quality_flag
  -- What the AI originally suggested (single item, not the whole response)
  ai_suggestion TEXT NOT NULL,
  -- What the clinician did with it
  clinician_action TEXT NOT NULL,
  -- actions: accepted, modified, rejected, added
  --   accepted = used as-is
  --   modified = used but changed (clinician_value captures the edit)
  --   rejected = explicitly dismissed or ignored
  --   added    = clinician added something the AI did not suggest
  clinician_value TEXT,
  -- The provider who took the action
  provider_name TEXT DEFAULT 'Dr. Demo',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id),
  FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions(id)
);

-- Index for analytics queries: aggregate by stage, type, action
CREATE INDEX IF NOT EXISTS idx_overrides_stage_type
  ON ai_suggestion_overrides(stage, suggestion_type);
CREATE INDEX IF NOT EXISTS idx_overrides_encounter
  ON ai_suggestion_overrides(encounter_id);
CREATE INDEX IF NOT EXISTS idx_overrides_provider
  ON ai_suggestion_overrides(provider_name);
