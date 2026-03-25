-- ATTENDING Medical AI — Seed Data
-- 8 synthetic patients with diverse demographics and conditions

INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, insurance_provider, insurance_id, allergies, medications, medical_history) VALUES
('Maria', 'Santos', '1981-03-15', 'Female', '555-0101', 'maria.santos@email.com', 'Blue Cross', 'BC-44521', '["Penicillin", "Sulfa drugs"]', '["Lisinopril 10mg daily", "Metformin 500mg BID"]', '["Hypertension", "Type 2 Diabetes", "Anxiety"]'),
('James', 'Chen', '1994-07-22', 'Male', '555-0102', 'james.chen@email.com', 'Aetna', 'AE-78834', '[]', '["Albuterol inhaler PRN"]', '["Mild intermittent asthma"]'),
('Aisha', 'Johnson', '1959-11-08', 'Female', '555-0103', 'aisha.j@email.com', 'Medicare', 'MC-55102', '["Codeine"]', '["Amlodipine 5mg daily", "Atorvastatin 20mg daily", "Aspirin 81mg daily"]', '["Hypertension", "Hyperlipidemia", "Osteoarthritis"]'),
('Robert', 'Kim', '1971-01-30', 'Male', '555-0104', 'r.kim@email.com', 'United Health', 'UH-33290', '["Latex"]', '["Metformin 1000mg BID", "Glipizide 5mg daily", "Lisinopril 20mg daily"]', '["Type 2 Diabetes", "Hypertension", "Diabetic neuropathy"]'),
('Sarah', 'Williams', '1998-05-12', 'Female', '555-0105', 's.williams@email.com', 'Cigna', 'CI-91145', '[]', '["Oral contraceptive"]', '["Migraines with aura"]'),
('David', 'Okonkwo', '1985-09-03', 'Male', '555-0106', 'd.okonkwo@email.com', 'Blue Cross', 'BC-67788', '["Ibuprofen"]', '[]', '["Lumbar strain (2024)"]'),
('Lisa', 'Patel', '1953-12-19', 'Female', '555-0107', 'l.patel@email.com', 'Medicare', 'MC-44213', '["ACE inhibitors"]', '["Donepezil 10mg daily", "Metoprolol 25mg BID", "Omeprazole 20mg daily"]', '["Mild cognitive impairment", "Atrial fibrillation", "GERD"]'),
('Marcus', 'Thompson', '2007-04-25', 'Male', '555-0108', 'm.thompson@email.com', 'Aetna', 'AE-12456', '[]', '[]', '["ACL repair (2025)"]');

-- Seed encounters at various stages of the workflow
INSERT INTO encounters (patient_id, status, chief_complaint, intake_data, vitals, started_at) VALUES
(1, 'completed', 'Chest pain and shortness of breath for 2 days', '{"onset": "2 days ago", "severity": "6/10", "character": "pressure-like", "location": "substernal", "radiation": "left arm", "aggravating": "exertion, climbing stairs", "alleviating": "rest", "associated": "shortness of breath, mild diaphoresis", "denies": "fever, cough, leg swelling"}', '{"bp": "158/92", "hr": "88", "rr": "18", "temp": "98.6", "spo2": "96%", "weight": "172 lbs"}', datetime('now', '-3 hours')),

(2, 'in_progress', 'Persistent cough for 3 weeks', '{"onset": "3 weeks ago", "character": "dry, non-productive", "timing": "worse at night", "severity": "4/10", "associated": "occasional wheezing, post-nasal drip", "denies": "fever, hemoptysis, weight loss, night sweats", "exposures": "no sick contacts, no travel", "smoking": "never"}', '{"bp": "122/78", "hr": "72", "rr": "16", "temp": "98.4", "spo2": "99%", "weight": "165 lbs"}', datetime('now', '-1 hour')),

(3, 'waiting', 'Dizzy spells and two falls in past month', '{"onset": "1 month", "frequency": "3-4 episodes per week", "character": "room spinning, lightheaded on standing", "duration": "30 seconds to 2 minutes", "falls": "2 falls, no injuries", "timing": "worse in morning, after standing quickly", "associated": "occasional nausea", "denies": "chest pain, headache, hearing changes"}', '{"bp": "134/82 sitting, 112/68 standing", "hr": "76", "rr": "14", "temp": "98.2", "spo2": "97%", "weight": "148 lbs"}', datetime('now', '-45 minutes')),

(4, 'completed', 'Follow-up: diabetes management', '{"reason": "3-month follow-up", "home_glucose": "fasting 140-180, post-meal 200-250", "compliance": "taking medications as prescribed", "diet": "struggling with carb counting", "exercise": "walks 20 min 3x/week", "symptoms": "increased tingling in feet", "denies": "vision changes, wounds, chest pain"}', '{"bp": "142/88", "hr": "80", "rr": "16", "temp": "98.6", "spo2": "98%", "weight": "210 lbs"}', datetime('now', '-5 hours')),

(5, 'waiting', 'Severe headaches with vision changes', '{"onset": "2 weeks", "frequency": "daily", "severity": "8/10", "character": "throbbing, bilateral", "aura": "yes - visual scotoma preceding headache by 20 min", "duration": "4-8 hours", "triggers": "stress, screen time, irregular sleep", "associated": "nausea, photophobia, phonophobia", "denies": "fever, neck stiffness, worst headache of life"}', '{"bp": "118/74", "hr": "68", "rr": "14", "temp": "98.4", "spo2": "99%", "weight": "135 lbs"}', datetime('now', '-30 minutes')),

(6, 'completed', 'Lower back pain for 2 months', '{"onset": "2 months after lifting heavy box", "severity": "5/10 at rest, 8/10 with movement", "location": "lower lumbar, bilateral", "radiation": "occasional right posterior thigh", "aggravating": "bending, prolonged sitting, lifting", "alleviating": "ice, lying flat, stretching", "red_flags_negative": "no bowel/bladder changes, no saddle anesthesia, no progressive weakness", "prior_treatment": "OTC acetaminophen with minimal relief"}', '{"bp": "128/80", "hr": "74", "rr": "14", "temp": "98.6", "spo2": "99%", "weight": "195 lbs"}', datetime('now', '-6 hours')),

(7, 'intake', 'Medication review - family reports confusion', '{"reporter": "daughter", "onset": "gradual over 2 months", "symptoms": "repeating questions, missed medications, left stove on twice", "baseline": "was managing independently until recently", "mood": "more withdrawn", "sleep": "sleeping more during day", "appetite": "decreased"}', '{}', datetime('now', '-10 minutes')),

(8, 'completed', 'Right knee swelling after basketball game', '{"onset": "yesterday during basketball", "mechanism": "pivoting injury, felt pop", "severity": "7/10", "swelling": "significant, started within 2 hours", "weight_bearing": "painful but possible", "instability": "feels like knee gives way", "prior": "ACL reconstruction 1 year ago, same knee", "denies": "locking, numbness"}', '{"bp": "120/72", "hr": "66", "rr": "14", "temp": "98.4", "spo2": "99%", "weight": "185 lbs"}', datetime('now', '-4 hours'));

-- Add completed SOAP notes for finished encounters
UPDATE encounters SET
  exam_notes = 'General: Alert, anxious-appearing female in mild distress. CV: Regular rate and rhythm, no murmurs. Lungs: Clear bilateral. Chest wall non-tender. Extremities: No edema, pulses 2+ bilateral.',
  assessment = 'Acute chest pain - likely musculoskeletal vs anxiety-related. Low probability ACS given age and character. Hypertension uncontrolled.',
  plan = 'ECG performed - normal sinus rhythm. Troponin negative x1. Chest X-ray unremarkable. Reassurance provided. Increase Lisinopril to 20mg. Follow up in 1 week. Return precautions discussed.',
  soap_note = 'S: 45-year-old female presents with 2-day history of substernal chest pressure radiating to left arm, rated 6/10, worse with exertion, relieved by rest. Associated shortness of breath and mild diaphoresis. PMH significant for HTN, T2DM, anxiety.\n\nO: BP 158/92, HR 88, RR 18, T 98.6, SpO2 96%. Alert, anxious. CV: RRR, no murmurs. Lungs CTA bilateral. ECG: NSR, no ST changes. Troponin: negative. CXR: unremarkable.\n\nA:\n1. Acute chest pain - atypical features, low risk ACS. Likely musculoskeletal vs anxiety-related.\n2. Uncontrolled hypertension\n3. T2DM - stable on current regimen\n\nP:\n1. Serial troponins if symptoms recur. Outpatient stress test if persistent.\n2. Increase Lisinopril 10mg → 20mg daily\n3. Continue Metformin 500mg BID\n4. Follow up 1 week\n5. Return to ED for worsening chest pain, dyspnea, or syncope',
  ai_review = '{"completeness": "95%", "missing": ["BMI not documented"], "icd10_suggestions": ["R07.9 - Chest pain, unspecified", "I10 - Essential hypertension", "E11.65 - T2DM with hyperglycemia"], "cpt_suggestions": ["99214 - Office visit, moderate complexity", "93000 - ECG interpretation"], "quality_flags": ["Consider documenting HEART score for chest pain risk stratification", "Document shared decision-making for stress test timing"], "coding_accuracy": "Good - documentation supports level 4 E/M"}',
  icd10_codes = '["R07.9", "I10", "E11.65"]',
  cpt_codes = '["99214", "93000"]',
  completed_at = datetime('now', '-1 hour')
WHERE patient_id = 1;

UPDATE encounters SET
  exam_notes = 'General: Well-appearing male. HEENT: Oropharynx clear, no erythema. Neck: Supple, no lymphadenopathy. Lungs: Mild expiratory wheezing bilateral lower lobes. CV: RRR. Abdomen: Soft, non-tender.',
  assessment = 'Persistent cough - likely cough-variant asthma vs post-nasal drip syndrome. No red flags for serious pathology.',
  plan = 'Trial of inhaled corticosteroid (Flovent 110mcg BID). Continue albuterol PRN. Add nasal fluticasone. If no improvement in 4 weeks, consider CXR and PFTs.'
WHERE patient_id = 2;

UPDATE encounters SET
  exam_notes = 'General: Well-nourished male. Back: Paravertebral muscle tenderness L4-S1 bilateral, negative SLR, intact distal neuro exam. Gait: Antalgic.',
  assessment = 'Chronic mechanical low back pain with right radiculopathy symptoms. No red flags.',
  plan = 'Physical therapy referral 2x/week x 6 weeks. Naproxen 500mg BID with food x 2 weeks. Lumbar MRI if no improvement in 6 weeks. Ergonomic counseling provided.',
  soap_note = 'S: 41-year-old male with 2-month history of lower back pain after lifting injury. Pain 5/10 at rest, 8/10 with movement. Occasional radiation to right posterior thigh. No red flag symptoms.\n\nO: BP 128/80, HR 74. Paravertebral tenderness L4-S1. Negative SLR bilateral. Strength 5/5 bilateral LE. Intact sensation. DTRs 2+ and symmetric. Antalgic gait.\n\nA:\n1. Chronic mechanical low back pain with right radicular symptoms\n2. History of lumbar strain\n\nP:\n1. Physical therapy 2x/week x 6 weeks\n2. Naproxen 500mg BID with food x 2 weeks\n3. Lumbar MRI if no improvement in 6 weeks\n4. Avoid heavy lifting, ergonomic counseling\n5. Follow up 6 weeks',
  ai_review = '{"completeness": "92%", "missing": ["BMI not documented", "Work status not addressed"], "icd10_suggestions": ["M54.5 - Low back pain", "M54.16 - Radiculopathy, lumbar region"], "cpt_suggestions": ["99213 - Office visit, low complexity"], "quality_flags": ["Consider documenting occupational history given mechanism", "Document functional status and work restrictions"], "coding_accuracy": "Good - supports level 3 E/M"}',
  icd10_codes = '["M54.5", "M54.16"]',
  cpt_codes = '["99213"]',
  completed_at = datetime('now', '-4 hours')
WHERE patient_id = 6;

UPDATE encounters SET
  exam_notes = 'General: Well-appearing male, obese. Extremities: Decreased monofilament sensation bilateral feet. No ulcers or wounds. Pedal pulses palpable.',
  assessment = 'T2DM uncontrolled (A1c pending). Progressive diabetic neuropathy. Hypertension at goal.',
  plan = 'Increase Metformin to 1000mg BID if tolerated. Consider adding GLP-1 RA. A1c, BMP, lipid panel ordered. Diabetic foot care education. Endocrinology referral. Nutrition counseling referral. Follow up 3 months.',
  soap_note = 'S: 55-year-old male with T2DM presenting for 3-month follow-up. Home glucose fasting 140-180, post-meal 200-250. Taking medications as prescribed but struggling with diet. Walking 20 min 3x/week. Reports increased tingling in feet bilaterally.\n\nO: BP 142/88, HR 80, Weight 210 lbs. General: obese male in no distress. Feet: intact skin, no ulcers, decreased monofilament sensation bilateral plantar surfaces. Pedal pulses 2+ bilateral.\n\nA:\n1. T2DM - uncontrolled, A1c pending\n2. Diabetic peripheral neuropathy - progressive\n3. Hypertension - borderline controlled\n4. Obesity\n\nP:\n1. Increase Metformin to 1000mg BID\n2. Consider GLP-1 receptor agonist (discuss cost/insurance)\n3. Labs: A1c, BMP, lipid panel, urine microalbumin\n4. Endocrinology referral\n5. Nutrition counseling referral\n6. Diabetic foot care education provided\n7. Continue current antihypertensives\n8. Follow up 3 months',
  ai_review = '{"completeness": "97%", "missing": ["Eye exam status not documented"], "icd10_suggestions": ["E11.42 - T2DM with diabetic polyneuropathy", "E11.65 - T2DM with hyperglycemia", "I10 - Essential hypertension", "E66.01 - Morbid obesity"], "cpt_suggestions": ["99214 - Office visit, moderate complexity", "G0108 - Diabetes management"], "quality_flags": ["Excellent documentation of diabetic complications", "Consider documenting last retinal exam date", "Document smoking status for quality measures"], "coding_accuracy": "Excellent - documentation supports moderate complexity E/M with chronic disease management"}',
  icd10_codes = '["E11.42", "E11.65", "I10", "E66.01"]',
  cpt_codes = '["99214"]',
  completed_at = datetime('now', '-3 hours')
WHERE patient_id = 4;

UPDATE encounters SET
  exam_notes = 'General: Athletic male, right knee in brace. MSK: Right knee - moderate effusion, positive Lachman test, positive anterior drawer, negative McMurray, tender along joint line. ROM limited by pain.',
  assessment = 'Right knee acute injury - concern for ACL re-tear vs graft failure given prior reconstruction and mechanism. Meniscal injury possible.',
  plan = 'Knee immobilizer applied. Crutches provided. MRI right knee ordered. Orthopedic surgery referral (urgent). Ice, elevation, acetaminophen for pain. No NSAIDs given. Return if numbness, severe worsening, or inability to bear weight.',
  soap_note = 'S: 19-year-old male with history of right ACL reconstruction 1 year ago, presents after pivoting injury during basketball. Felt pop, immediate pain 7/10, rapid swelling within 2 hours. Knee feels unstable. Able to bear weight with pain.\n\nO: BP 120/72, HR 66. Right knee: moderate effusion, positive Lachman (soft endpoint), positive anterior drawer, negative McMurray, joint line tenderness medial > lateral. ROM 10-90 degrees limited by pain and effusion. NV intact distally.\n\nA:\n1. Right knee acute ligamentous injury - likely ACL graft failure vs re-tear\n2. Possible meniscal injury\n3. History of prior ACL reconstruction\n\nP:\n1. Knee immobilizer and crutches\n2. MRI right knee (urgent)\n3. Orthopedic surgery referral - Dr. Martinez, urgent\n4. Acetaminophen 1000mg Q6H PRN\n5. Ice 20 min Q2H, elevation\n6. No weight-bearing sports\n7. Return precautions discussed',
  ai_review = '{"completeness": "96%", "missing": ["Contralateral knee exam not documented for comparison"], "icd10_suggestions": ["S83.511A - Sprain of ACL of right knee, initial encounter", "M23.611 - Other spontaneous disruption of ACL of right knee"], "cpt_suggestions": ["99214 - Office visit, moderate complexity"], "quality_flags": ["Good documentation of mechanism and prior surgical history", "Consider noting graft type from prior surgery if available", "Document return-to-play expectations discussed with patient"], "coding_accuracy": "Good - supports moderate complexity with acute injury and surgical history consideration"}',
  icd10_codes = '["S83.511A"]',
  cpt_codes = '["99214"]',
  completed_at = datetime('now', '-2 hours')
WHERE patient_id = 8;

-- ============================================================================
-- Override tracking seed data — demonstrates analytics for completed encounters
-- ============================================================================

-- Encounter 1 (Maria Santos — chest pain): Clinician accepted most, modified a few
INSERT INTO ai_suggestion_overrides (encounter_id, stage, suggestion_type, ai_suggestion, clinician_action, clinician_value, provider_name, created_at) VALUES
(1, 'encounter_assist', 'differential_dx', 'Acute coronary syndrome (ACS) — given substernal pressure, radiation to left arm, and diaphoresis', 'rejected', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'differential_dx', 'Musculoskeletal chest wall pain — reproducible on palpation', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'differential_dx', 'Anxiety/panic disorder — history of anxiety, pressure-like quality', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'differential_dx', 'GERD — substernal location, but no GI symptoms reported', 'rejected', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'recommended_question', 'Any history of blood clots or DVT?', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'recommended_question', 'Family history of premature cardiac disease?', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'exam_focus', 'Cardiac auscultation for murmurs, gallops', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'exam_focus', 'Chest wall palpation for reproducible tenderness', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'workup_item', 'Troponin I, serial x2', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'encounter_assist', 'workup_item', 'D-dimer', 'rejected', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(1, 'soap_generation', 'soap_section', 'AI-generated SOAP note for chest pain encounter', 'modified', 'Clinician revised assessment to emphasize musculoskeletal etiology over ACS', 'Dr. Demo', datetime('now', '-2 hours')),
(1, 'quality_review', 'icd10_code', 'R07.9 - Chest pain, unspecified', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'icd10_code', 'I10 - Essential hypertension', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'icd10_code', 'E11.65 - T2DM with hyperglycemia', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'cpt_code', '99214 - Office visit, moderate complexity', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'cpt_code', '93000 - ECG interpretation', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'missing_doc', 'BMI not documented', 'rejected', NULL, 'Dr. Demo', datetime('now', '-1 hour')),
(1, 'quality_review', 'quality_flag', 'Consider documenting HEART score for chest pain risk stratification', 'accepted', NULL, 'Dr. Demo', datetime('now', '-1 hour'));

-- Encounter 4 (Robert Kim — diabetes follow-up): High acceptance, clinician added items
INSERT INTO ai_suggestion_overrides (encounter_id, stage, suggestion_type, ai_suggestion, clinician_action, clinician_value, provider_name, created_at) VALUES
(4, 'encounter_assist', 'differential_dx', 'Uncontrolled T2DM with progressive neuropathy', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'differential_dx', 'Peripheral vascular disease contributing to neuropathy', 'modified', 'Diabetic peripheral neuropathy — no PVD signs on exam', 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'recommended_question', 'Last dilated eye exam?', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'recommended_question', 'Any wounds or ulcers on feet?', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'workup_item', 'HbA1c, BMP, lipid panel', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'workup_item', 'Urine microalbumin', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'workup_item', 'Nerve conduction study', 'rejected', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'encounter_assist', 'exam_focus', 'Monofilament testing bilateral feet', 'accepted', NULL, 'Dr. Demo', datetime('now', '-5 hours')),
(4, 'soap_generation', 'soap_section', 'AI-generated SOAP note for diabetes follow-up', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(4, 'quality_review', 'icd10_code', 'E11.42 - T2DM with diabetic polyneuropathy', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'icd10_code', 'E11.65 - T2DM with hyperglycemia', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'icd10_code', 'I10 - Essential hypertension', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'icd10_code', 'E66.01 - Morbid obesity', 'modified', 'E66.9 - Obesity, unspecified (BMI not documented to support morbid)', 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'cpt_code', '99214 - Office visit, moderate complexity', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'cpt_code', 'G0108 - Diabetes management', 'rejected', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'missing_doc', 'Eye exam status not documented', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'quality_flag', 'Document smoking status for quality measures', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(4, 'quality_review', 'quality_flag', 'Consider documenting last retinal exam date', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours'));

-- Encounter 6 (David Okonkwo — low back pain): Mixed acceptance
INSERT INTO ai_suggestion_overrides (encounter_id, stage, suggestion_type, ai_suggestion, clinician_action, clinician_value, provider_name, created_at) VALUES
(6, 'encounter_assist', 'differential_dx', 'Lumbar disc herniation with radiculopathy', 'accepted', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'differential_dx', 'Lumbar spinal stenosis', 'rejected', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'differential_dx', 'Mechanical low back pain', 'accepted', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'differential_dx', 'Sacroiliac joint dysfunction', 'rejected', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'workup_item', 'Lumbar MRI without contrast', 'modified', 'Defer MRI — try PT first for 6 weeks', 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'workup_item', 'ESR/CRP to rule out inflammatory', 'rejected', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'exam_focus', 'Straight leg raise bilateral', 'accepted', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'exam_focus', 'Lower extremity neuro exam', 'accepted', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'encounter_assist', 'exam_focus', 'Gait assessment', 'accepted', NULL, 'Dr. Demo', datetime('now', '-6 hours')),
(6, 'soap_generation', 'soap_section', 'AI-generated SOAP note for low back pain', 'modified', 'Clinician added occupational history and work restriction details', 'Dr. Demo', datetime('now', '-5 hours')),
(6, 'quality_review', 'icd10_code', 'M54.5 - Low back pain', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(6, 'quality_review', 'icd10_code', 'M54.16 - Radiculopathy, lumbar region', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(6, 'quality_review', 'cpt_code', '99213 - Office visit, low complexity', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(6, 'quality_review', 'missing_doc', 'BMI not documented', 'rejected', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(6, 'quality_review', 'missing_doc', 'Work status not addressed', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(6, 'quality_review', 'quality_flag', 'Consider documenting occupational history given mechanism', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours'));

-- Encounter 8 (Marcus Thompson — knee injury): Clinician added an item AI missed
INSERT INTO ai_suggestion_overrides (encounter_id, stage, suggestion_type, ai_suggestion, clinician_action, clinician_value, provider_name, created_at) VALUES
(8, 'encounter_assist', 'differential_dx', 'ACL graft re-rupture', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'differential_dx', 'Meniscal tear', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'differential_dx', 'Patellar dislocation', 'rejected', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'differential_dx', 'MCL sprain', 'modified', 'MCL less likely given mechanism — pivot not valgus', 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'workup_item', 'MRI right knee with contrast', 'modified', 'MRI right knee without contrast (sufficient for ligamentous eval)', 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'workup_item', 'AP and lateral knee X-ray', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'exam_focus', 'Lachman test', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'exam_focus', 'Anterior drawer', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'exam_focus', 'McMurray test', 'accepted', NULL, 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'encounter_assist', 'exam_focus', 'Posterior drawer', 'added', 'Clinician also performed posterior drawer (not suggested by AI)', 'Dr. Demo', datetime('now', '-4 hours')),
(8, 'soap_generation', 'soap_section', 'AI-generated SOAP note for knee injury', 'accepted', NULL, 'Dr. Demo', datetime('now', '-3 hours')),
(8, 'quality_review', 'icd10_code', 'S83.511A - Sprain of ACL of right knee, initial encounter', 'accepted', NULL, 'Dr. Demo', datetime('now', '-2 hours')),
(8, 'quality_review', 'icd10_code', 'M23.611 - Other spontaneous disruption of ACL of right knee', 'rejected', NULL, 'Dr. Demo', datetime('now', '-2 hours')),
(8, 'quality_review', 'cpt_code', '99214 - Office visit, moderate complexity', 'accepted', NULL, 'Dr. Demo', datetime('now', '-2 hours')),
(8, 'quality_review', 'missing_doc', 'Contralateral knee exam not documented for comparison', 'rejected', NULL, 'Dr. Demo', datetime('now', '-2 hours')),
(8, 'quality_review', 'quality_flag', 'Document return-to-play expectations discussed with patient', 'accepted', NULL, 'Dr. Demo', datetime('now', '-2 hours'));
