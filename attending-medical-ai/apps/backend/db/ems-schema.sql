-- ATTENDING Medical AI — EMS Encounter Schema

-- Add encounter type to existing encounters table
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS,
-- so we wrap in a try-catch at the application level.
-- The column defaults to 'clinical' for all existing rows.

-- EMS-specific encounter data
CREATE TABLE IF NOT EXISTS ems_encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER NOT NULL UNIQUE,

  -- Dispatch
  dispatch_code TEXT,
  dispatch_time TEXT,
  unit_id TEXT DEFAULT 'MEDIC-1',
  crew_lead TEXT DEFAULT 'Paramedic Davis',

  -- Scene
  scene_address TEXT,
  scene_assessment TEXT DEFAULT '{}',

  -- Transport
  transport_status TEXT DEFAULT 'dispatched',
  -- statuses: dispatched → on_scene → treating → transporting → arrived → handoff_complete
  destination_facility TEXT DEFAULT 'Demo General Hospital',
  eta_minutes INTEGER,

  -- Clinical
  triage_level TEXT,
  interventions TEXT DEFAULT '[]',
  medications_given TEXT DEFAULT '[]',
  vitals_timeline TEXT DEFAULT '[]',

  -- AI
  ai_summary TEXT,
  handoff_brief TEXT,

  -- Transcript
  transcript_raw TEXT DEFAULT '',
  transcript_chunks TEXT DEFAULT '[]',

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE INDEX IF NOT EXISTS idx_ems_encounter_id ON ems_encounters(encounter_id);
CREATE INDEX IF NOT EXISTS idx_ems_transport_status ON ems_encounters(transport_status);
