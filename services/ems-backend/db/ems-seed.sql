-- EMS Seed Data — 3 encounters at different stages
-- Uses existing seed patients (Maria Santos id=1, James Chen id=2, Aisha Johnson id=3)

-- EMS Encounter 1: Maria Santos (45F) — Cardiac event, currently TRANSPORTING
INSERT INTO encounters (patient_id, status, type, chief_complaint, provider_name, started_at, created_at)
VALUES (1, 'in_progress', 'ems', 'Chest pain with diaphoresis, possible cardiac event', 'Paramedic Davis', datetime('now', '-25 minutes'), datetime('now', '-30 minutes'));

INSERT INTO ems_encounters (encounter_id, dispatch_code, dispatch_time, unit_id, crew_lead, scene_address, scene_assessment, transport_status, destination_facility, eta_minutes, triage_level, interventions, medications_given, vitals_timeline, ai_summary, transcript_raw, transcript_chunks)
VALUES (
  (SELECT MAX(id) FROM encounters),
  '31-D-2 Chest Pain',
  datetime('now', '-30 minutes'),
  'MEDIC-7',
  'Paramedic Davis',
  '425 Oak Street, Apt 3B',
  '{"mechanism": "Medical emergency", "scene_safety": "Secure", "patient_count": 1, "bystander_cpr": false}',
  'transporting',
  'Demo General Hospital',
  8,
  '2',
  '["IV access - 18g right AC", "12-lead ECG obtained", "O2 4L nasal cannula", "Cardiac monitor applied"]',
  '[{"name": "Aspirin", "dose": "324mg", "route": "PO (chewed)", "time": "14:12"}, {"name": "Nitroglycerin", "dose": "0.4mg", "route": "SL", "time": "14:15"}]',
  '[{"time": "14:05", "bp": "182/98", "hr": 102, "rr": 22, "spo2": 94, "gcs": 15, "pain": 8}, {"time": "14:18", "bp": "168/92", "hr": 94, "rr": 20, "spo2": 97, "gcs": 15, "pain": 5}]',
  '**EMS Summary — UPDATING**\n\n45F presenting with acute chest pain, diaphoretic, onset 40min ago while at rest. PMH: HTN, T2DM. Initial BP 182/98, HR 102, SpO2 94%. IV established, ASA 324mg and NTG 0.4mg SL administered. Pain improved 8→5/10. Second vitals show improving trend. 12-lead obtained — transmitting to receiving facility. ESI Level 2.\n\n**Current Status:** Transporting, hemodynamically improving, ETA 8 minutes.',
  'Dispatch, Medic-7 responding to 425 Oak Street apartment 3B for a 45-year-old female, possible cardiac event. Copy that Medic-7, caller reports patient is conscious, complaining of chest pain, diaphoretic. On scene. Patient is Maria Santos, 45 years old, sitting upright on the couch, alert and oriented times three. She reports crushing substernal chest pain radiating to her left arm, started about 40 minutes ago while watching TV. She looks diaphoretic. History of hypertension and type 2 diabetes. Takes metformin and lisinopril daily. No known drug allergies. Initial vitals blood pressure 182 over 98, heart rate 102, respiratory rate 22, SpO2 94 percent on room air, GCS 15. Pain is 8 out of 10. Starting IV access right antecubital 18 gauge, good flow. Applying 4 liters nasal cannula. Cardiac monitor on, sinus tach no ST changes visible on the monitor. Getting a 12-lead now. Administering aspirin 324 milligrams chewed and nitroglycerin 0.4 milligrams sublingual. Patient tolerating nitro well. ECG shows some ST depression in leads V4 through V6. Will transmit to receiving facility. Second set of vitals blood pressure 168 over 92, heart rate 94, respiratory rate 20, SpO2 97 on 4 liters. Patient reports pain decreasing from 8 to 5 out of 10 after nitro. Loading patient for transport to Demo General Hospital. ETA approximately 8 minutes.',
  '[{"timestamp": "14:02", "text": "Dispatch, Medic-7 responding to 425 Oak Street apartment 3B for a 45-year-old female, possible cardiac event.", "ai_extraction": null}, {"timestamp": "14:05", "text": "On scene. Patient is Maria Santos, 45 years old, sitting upright on the couch, alert and oriented times three. She reports crushing substernal chest pain radiating to her left arm.", "ai_extraction": {"vitals": [{"type": "pain", "value": "8/10"}], "assessments": [{"finding": "Crushing substernal chest pain with left arm radiation"}]}}, {"timestamp": "14:08", "text": "Initial vitals blood pressure 182 over 98, heart rate 102, respiratory rate 22, SpO2 94 percent on room air, GCS 15.", "ai_extraction": {"vitals": [{"type": "BP", "value": "182/98"}, {"type": "HR", "value": "102"}, {"type": "RR", "value": "22"}, {"type": "SpO2", "value": "94%"}, {"type": "GCS", "value": "15"}]}}, {"timestamp": "14:10", "text": "Starting IV access right antecubital 18 gauge, good flow. Applying 4 liters nasal cannula. Cardiac monitor on.", "ai_extraction": {"interventions": [{"description": "IV access 18g right AC"}, {"description": "O2 4L nasal cannula"}, {"description": "Cardiac monitor applied"}]}}, {"timestamp": "14:12", "text": "Administering aspirin 324 milligrams chewed and nitroglycerin 0.4 milligrams sublingual.", "ai_extraction": {"medications": [{"name": "Aspirin", "dose": "324mg", "route": "PO"}, {"name": "Nitroglycerin", "dose": "0.4mg", "route": "SL"}]}}, {"timestamp": "14:18", "text": "Second set of vitals blood pressure 168 over 92, heart rate 94, SpO2 97. Pain decreasing from 8 to 5 out of 10.", "ai_extraction": {"vitals": [{"type": "BP", "value": "168/92"}, {"type": "HR", "value": "94"}, {"type": "SpO2", "value": "97%"}, {"type": "pain", "value": "5/10"}]}}]'
);

-- EMS Encounter 2: James Chen (30M) — Respiratory distress, ARRIVED at ED
INSERT INTO encounters (patient_id, status, type, chief_complaint, provider_name, started_at, completed_at, created_at)
VALUES (2, 'in_progress', 'ems', 'Acute asthma exacerbation, severe respiratory distress', 'Paramedic Lopez', datetime('now', '-45 minutes'), NULL, datetime('now', '-50 minutes'));

INSERT INTO ems_encounters (encounter_id, dispatch_code, dispatch_time, unit_id, crew_lead, scene_address, scene_assessment, transport_status, destination_facility, eta_minutes, triage_level, interventions, medications_given, vitals_timeline, ai_summary, handoff_brief, transcript_raw, transcript_chunks)
VALUES (
  (SELECT MAX(id) FROM encounters),
  '6-D-1 Breathing Problems',
  datetime('now', '-50 minutes'),
  'MEDIC-3',
  'Paramedic Lopez',
  '789 Elm Drive',
  '{"mechanism": "Medical emergency", "scene_safety": "Secure", "patient_count": 1, "bystander_cpr": false}',
  'arrived',
  'Demo General Hospital',
  0,
  '2',
  '["O2 15L non-rebreather mask", "Nebulizer treatment administered", "IV access - 20g left hand", "Continuous SpO2 monitoring"]',
  '[{"name": "Albuterol", "dose": "2.5mg", "route": "Nebulizer", "time": "13:42"}, {"name": "Ipratropium", "dose": "0.5mg", "route": "Nebulizer", "time": "13:42"}, {"name": "Methylprednisolone", "dose": "125mg", "route": "IV", "time": "13:50"}]',
  '[{"time": "13:38", "bp": "148/88", "hr": 118, "rr": 32, "spo2": 88, "gcs": 15, "pain": 3}, {"time": "13:50", "bp": "138/82", "hr": 108, "rr": 26, "spo2": 93, "gcs": 15, "pain": 2}]',
  '**EMS Summary — FINAL**\n\n30M with known asthma presenting with acute exacerbation. Found in tripod position, audible wheezing, using accessory muscles. Initial SpO2 88% on RA. History of asthma since childhood, uses albuterol PRN. Nebulizer treatment with albuterol/ipratropium administered with moderate improvement. IV Solu-Medrol 125mg given. SpO2 improved to 93% on high-flow O2. Still with diffuse wheezing but improved air movement. ESI Level 2.',
  '## EMS-TO-ER HANDOFF BRIEF\n\n**PATIENT:** James Chen, 30M\n**CHIEF COMPLAINT:** Acute asthma exacerbation\n**MECHANISM:** Medical — sudden onset dyspnea at home\n\n**VITALS TREND:**\n| Time  | BP      | HR  | RR | SpO2 | GCS |\n|-------|---------|-----|----|------|-----|\n| 13:38 | 148/88  | 118 | 32 | 88%  | 15  |\n| 13:50 | 138/82  | 108 | 26 | 93%  | 15  |\n\n**INTERVENTIONS:**\n1. 13:38 — O2 15L non-rebreather mask\n2. 13:40 — Continuous SpO2 monitoring\n3. 13:42 — Nebulizer treatment (albuterol 2.5mg + ipratropium 0.5mg)\n4. 13:48 — IV access 20g left hand\n5. 13:50 — Methylprednisolone 125mg IV\n\n**MEDICATIONS GIVEN:**\n- Albuterol 2.5mg nebulizer @ 13:42\n- Ipratropium 0.5mg nebulizer @ 13:42\n- Methylprednisolone 125mg IV @ 13:50\n\n**CURRENT STATUS:** Improving. SpO2 93% on 15L NRB. Decreased wheezing. Using accessory muscles less.\n**ALLERGIES:** Penicillin\n**HOME MEDICATIONS:** Albuterol PRN, Fluticasone daily (reports non-compliance)\n**TRIAGE RECOMMENDATION:** ESI Level 2 — Requires immediate respiratory assessment, possible additional nebulizer treatments or escalation to BiPAP.',
  'Dispatch, Medic-3 responding to 789 Elm Drive for a 30-year-old male with breathing problems. On scene, patient is James Chen, found sitting upright in tripod position on living room floor. Audible wheezing from the doorway. He says he cannot catch his breath, started about 20 minutes ago. Known asthmatic, has been using his rescue inhaler but no relief. Vitals blood pressure 148 over 88, heart rate 118, respiratory rate 32, SpO2 88 percent on room air. Applying high flow oxygen 15 liters non-rebreather. Setting up nebulizer with albuterol 2.5 milligrams and ipratropium 0.5 milligrams. IV access established 20 gauge left hand. Neb treatment running. After neb, air movement improving. Still diffuse wheezing but less accessory muscle use. Administering methylprednisolone 125 milligrams IV push. Second vitals BP 138 over 82, heart rate 108, respiratory rate 26, SpO2 improving to 93 percent on high flow. Transporting to Demo General.',
  '[]'
);

-- EMS Encounter 3: Aisha Johnson (65F) — Syncope, DISPATCHED (fresh encounter for demo)
INSERT INTO encounters (patient_id, status, type, chief_complaint, provider_name, started_at, created_at)
VALUES (3, 'intake', 'ems', 'Syncopal episode with fall', 'Paramedic Davis', datetime('now', '-2 minutes'), datetime('now', '-2 minutes'));

INSERT INTO ems_encounters (encounter_id, dispatch_code, dispatch_time, unit_id, crew_lead, scene_address, transport_status, triage_level)
VALUES (
  (SELECT MAX(id) FROM encounters),
  '31-D-3 Syncope',
  datetime('now', '-2 minutes'),
  'MEDIC-7',
  'Paramedic Davis',
  '156 Maple Avenue',
  'dispatched',
  NULL
);
