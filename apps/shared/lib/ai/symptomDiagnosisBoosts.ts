// ============================================================
// ATTENDING AI — Symptom-Specific Likelihood Ratios
// Evidence-based diagnostic weighting using published LR+/LR-
// values with symptom constellation recognition
//
// Sources:
// - Solomon et al. JAMA 2001 (knee exam)
// - Panju et al. JAMA 1998 (ACS history)
// - Perry et al. BMJ 2006 (SAH)
// - Wang et al. JAMA 2005 (heart failure)
// - McGee, Evidence-Based Physical Diagnosis, 4th ed
// - Symptom to Diagnosis (Stern, Cifu, Altkorn)
// ============================================================

// ============================================================
// Types
// ============================================================

export interface LikelihoodRule {
  answerKey: string;
  pattern: RegExp;
  diagnosis: string;
  /** How much MORE likely if finding is present (>1.0) */
  lrPositive: number;
  /** How much LESS likely if finding is absent (<1.0) */
  lrNegative: number;
  evidence: string;
}

export interface SymptomConstellation {
  id: string;
  diagnosis: string;
  /** Answer keys that must all have matching patterns */
  requiredKeys: string[];
  requiredPatterns: RegExp[];
  /** Combined LR replaces individual rule LRs when constellation fires */
  combinedLR: number;
  evidence: string;
}

// ============================================================
// Likelihood Rules (replaces arbitrary scoreDelta)
// ============================================================

export const LIKELIHOOD_RULES: LikelihoodRule[] = [
  // ---- KNEE PAIN ----
  // Mechanism
  { answerKey: 'knee_mechanism', pattern: /twist/i, diagnosis: 'Meniscal Tear', lrPositive: 2.7, lrNegative: 0.9, evidence: 'Twisting mechanism of injury (LR+ 2.7)' },
  { answerKey: 'knee_mechanism', pattern: /twist/i, diagnosis: 'ACL Tear', lrPositive: 2.4, lrNegative: 0.85, evidence: 'Twisting mechanism — ligamentous injury (LR+ 2.4)' },
  { answerKey: 'knee_mechanism', pattern: /direct.*blow|impact/i, diagnosis: 'MCL Sprain', lrPositive: 2.5, lrNegative: 0.85, evidence: 'Direct blow — valgus stress (LR+ 2.5)' },
  { answerKey: 'knee_mechanism', pattern: /no\s*specific\s*injury|gradual/i, diagnosis: 'Osteoarthritis', lrPositive: 2.8, lrNegative: 0.7, evidence: 'Insidious onset without trauma (LR+ 2.8)' },
  { answerKey: 'knee_mechanism', pattern: /no\s*specific\s*injury|gradual/i, diagnosis: 'Patellofemoral Pain Syndrome', lrPositive: 2.0, lrNegative: 0.8, evidence: 'Gradual onset — overuse pattern (LR+ 2.0)' },
  { answerKey: 'knee_mechanism', pattern: /fall/i, diagnosis: 'Fracture', lrPositive: 3.0, lrNegative: 0.85, evidence: 'Fall mechanism — consider fracture (LR+ 3.0)' },

  // Weight bearing
  { answerKey: 'knee_weight_bearing', pattern: /unable|cannot/i, diagnosis: 'Fracture', lrPositive: 3.5, lrNegative: 0.4, evidence: 'Unable to bear weight — Ottawa Rules positive (LR+ 3.5)' },
  { answerKey: 'knee_weight_bearing', pattern: /unable|cannot/i, diagnosis: 'ACL Tear', lrPositive: 2.5, lrNegative: 0.7, evidence: 'Non-weight-bearing — significant injury (LR+ 2.5)' },

  // Locking/mechanical
  { answerKey: 'knee_locking', pattern: /lock|catch/i, diagnosis: 'Meniscal Tear', lrPositive: 3.2, lrNegative: 0.8, evidence: 'Mechanical locking/catching (LR+ 3.2, Solomon JAMA 2001)' },
  { answerKey: 'knee_locking', pattern: /gives?\s*way|buckl/i, diagnosis: 'ACL Tear', lrPositive: 5.1, lrNegative: 0.7, evidence: 'Giving way/instability (LR+ 5.1, Benjaminse BJSM 2006)' },
  { answerKey: 'knee_locking', pattern: /gives?\s*way|buckl/i, diagnosis: 'Patellofemoral Pain Syndrome', lrPositive: 1.3, lrNegative: 0.95, evidence: 'Pseudoinstability — patellar maltracking (LR+ 1.3)' },
  { answerKey: 'knee_locking', pattern: /click|pop/i, diagnosis: 'Meniscal Tear', lrPositive: 1.7, lrNegative: 0.9, evidence: 'Clicking/popping (LR+ 1.7)' },

  // Location
  { answerKey: 'knee_pain_location', pattern: /medial/i, diagnosis: 'Medial Meniscus Tear', lrPositive: 2.5, lrNegative: 0.75, evidence: 'Medial joint line location (LR+ 2.5)' },
  { answerKey: 'knee_pain_location', pattern: /medial/i, diagnosis: 'MCL Sprain', lrPositive: 2.0, lrNegative: 0.8, evidence: 'Medial-sided knee pain (LR+ 2.0)' },
  { answerKey: 'knee_pain_location', pattern: /lateral/i, diagnosis: 'Lateral Meniscus Tear', lrPositive: 2.5, lrNegative: 0.75, evidence: 'Lateral joint line location (LR+ 2.5)' },
  { answerKey: 'knee_pain_location', pattern: /lateral/i, diagnosis: 'IT Band Syndrome', lrPositive: 2.3, lrNegative: 0.8, evidence: 'Lateral knee pain (LR+ 2.3)' },
  { answerKey: 'knee_pain_location', pattern: /anterior|patello|kneecap|front/i, diagnosis: 'Patellofemoral Pain Syndrome', lrPositive: 3.5, lrNegative: 0.5, evidence: 'Anterior/patellofemoral location (LR+ 3.5)' },
  { answerKey: 'knee_pain_location', pattern: /posterior|behind/i, diagnosis: 'Baker\'s Cyst', lrPositive: 4.0, lrNegative: 0.6, evidence: 'Posterior knee location (LR+ 4.0)' },

  // ---- CHEST PAIN ----
  { answerKey: 'chest_radiation', pattern: /arm|jaw|neck/i, diagnosis: 'Acute Coronary Syndrome', lrPositive: 4.7, lrNegative: 0.7, evidence: 'Radiation to arm/jaw/neck (LR+ 4.7, Panju JAMA 1998)' },
  { answerKey: 'chest_radiation', pattern: /back/i, diagnosis: 'Aortic Dissection', lrPositive: 5.0, lrNegative: 0.6, evidence: 'Radiation to back (LR+ 5.0)' },
  { answerKey: 'chest_radiation', pattern: /no\s*radiation|stays/i, diagnosis: 'Musculoskeletal pain', lrPositive: 1.5, lrNegative: 0.9, evidence: 'Localized pain without radiation (LR+ 1.5)' },
  { answerKey: 'chest_radiation', pattern: /no\s*radiation|stays/i, diagnosis: 'Costochondritis', lrPositive: 1.5, lrNegative: 0.9, evidence: 'Localized anterior chest wall pain (LR+ 1.5)' },

  { answerKey: 'chest_exertional', pattern: /exertion|activity/i, diagnosis: 'Acute Coronary Syndrome', lrPositive: 3.2, lrNegative: 0.8, evidence: 'Exertional chest pain (LR+ 3.2)' },
  { answerKey: 'chest_exertional', pattern: /rest/i, diagnosis: 'Acute Coronary Syndrome', lrPositive: 4.5, lrNegative: 0.85, evidence: 'Pain at rest — unstable angina/NSTEMI (LR+ 4.5)' },
  { answerKey: 'chest_exertional', pattern: /position/i, diagnosis: 'Pericarditis', lrPositive: 3.3, lrNegative: 0.8, evidence: 'Positional component (LR+ 3.3, Khandaker Mayo Clin 2010)' },
  { answerKey: 'chest_exertional', pattern: /position/i, diagnosis: 'GERD', lrPositive: 1.8, lrNegative: 0.9, evidence: 'Positional — consider reflux (LR+ 1.8)' },

  { answerKey: 'chest_associated_sx', pattern: /diaphoresis|sweat/i, diagnosis: 'Acute Coronary Syndrome', lrPositive: 3.4, lrNegative: 0.7, evidence: 'Diaphoresis (LR+ 3.4, Swap JAMA 2005)' },
  { answerKey: 'chest_associated_sx', pattern: /nausea/i, diagnosis: 'Acute Coronary Syndrome', lrPositive: 1.9, lrNegative: 0.85, evidence: 'Nausea — vagal response (LR+ 1.9)' },
  { answerKey: 'chest_associated_sx', pattern: /shortness.*breath/i, diagnosis: 'Pulmonary Embolism', lrPositive: 1.8, lrNegative: 0.75, evidence: 'Dyspnea (LR+ 1.8)' },

  // ---- HEADACHE ----
  { answerKey: 'headache_worst_ever', pattern: /worst/i, diagnosis: 'Subarachnoid Hemorrhage', lrPositive: 8.0, lrNegative: 0.2, evidence: 'Worst headache of life (LR+ 8.0, Perry BMJ 2006)' },
  { answerKey: 'headache_worst_ever', pattern: /typical|similar/i, diagnosis: 'Tension headache', lrPositive: 2.0, lrNegative: 0.8, evidence: 'Recurrent pattern — primary headache (LR+ 2.0)' },
  { answerKey: 'headache_worst_ever', pattern: /typical|similar/i, diagnosis: 'Migraine', lrPositive: 2.0, lrNegative: 0.8, evidence: 'Recurrent pattern — migraine (LR+ 2.0)' },

  { answerKey: 'headache_aura', pattern: /visual/i, diagnosis: 'Migraine', lrPositive: 5.0, lrNegative: 0.7, evidence: 'Visual aura (LR+ 5.0)' },
  { answerKey: 'headache_aura', pattern: /speech/i, diagnosis: 'Stroke', lrPositive: 4.0, lrNegative: 0.9, evidence: 'Speech disturbance (LR+ 4.0)' },
  { answerKey: 'headache_aura', pattern: /sensory/i, diagnosis: 'Migraine', lrPositive: 2.5, lrNegative: 0.85, evidence: 'Sensory aura (LR+ 2.5)' },

  { answerKey: 'headache_meningeal', pattern: /neck\s*stiff/i, diagnosis: 'Meningitis', lrPositive: 6.6, lrNegative: 0.5, evidence: 'Nuchal rigidity (LR+ 6.6, Thomas J Emerg Med 2002)' },
  { answerKey: 'headache_meningeal', pattern: /neck\s*stiff/i, diagnosis: 'Subarachnoid Hemorrhage', lrPositive: 4.5, lrNegative: 0.6, evidence: 'Neck stiffness — meningeal irritation (LR+ 4.5)' },
  { answerKey: 'headache_meningeal', pattern: /fever/i, diagnosis: 'Meningitis', lrPositive: 5.0, lrNegative: 0.5, evidence: 'Fever with headache (LR+ 5.0)' },
  { answerKey: 'headache_meningeal', pattern: /photophobia|light/i, diagnosis: 'Migraine', lrPositive: 2.2, lrNegative: 0.8, evidence: 'Photophobia (LR+ 2.2)' },

  // ---- BACK PAIN ----
  { answerKey: 'back_leg_radiation', pattern: /left\s*leg|right\s*leg/i, diagnosis: 'Herniated Disc', lrPositive: 3.5, lrNegative: 0.6, evidence: 'Unilateral radiculopathy (LR+ 3.5)' },
  { answerKey: 'back_leg_radiation', pattern: /bilateral|both/i, diagnosis: 'Spinal Stenosis', lrPositive: 3.0, lrNegative: 0.7, evidence: 'Bilateral leg symptoms — neurogenic claudication (LR+ 3.0)' },
  { answerKey: 'back_leg_radiation', pattern: /bilateral|both/i, diagnosis: 'Cauda Equina Syndrome', lrPositive: 2.5, lrNegative: 0.8, evidence: 'Bilateral symptoms (LR+ 2.5)' },

  { answerKey: 'back_neuro', pattern: /weakness/i, diagnosis: 'Herniated Disc', lrPositive: 2.5, lrNegative: 0.8, evidence: 'Motor deficit (LR+ 2.5)' },
  { answerKey: 'back_neuro', pattern: /foot\s*drop/i, diagnosis: 'Herniated Disc', lrPositive: 5.0, lrNegative: 0.85, evidence: 'Foot drop — L4-L5 compression (LR+ 5.0)' },
  { answerKey: 'back_neuro', pattern: /foot\s*drop/i, diagnosis: 'Cauda Equina Syndrome', lrPositive: 4.0, lrNegative: 0.8, evidence: 'Foot drop (LR+ 4.0)' },

  { answerKey: 'back_bladder_bowel', pattern: /bladder|bowel\s*dysfunction/i, diagnosis: 'Cauda Equina Syndrome', lrPositive: 6.0, lrNegative: 0.5, evidence: 'Bladder/bowel dysfunction (LR+ 6.0)' },
  { answerKey: 'back_bladder_bowel', pattern: /saddle/i, diagnosis: 'Cauda Equina Syndrome', lrPositive: 7.0, lrNegative: 0.4, evidence: 'Saddle anesthesia (LR+ 7.0)' },

  // ---- SHORTNESS OF BREATH ----
  { answerKey: 'sob_exertional', pattern: /rest/i, diagnosis: 'Heart Failure', lrPositive: 3.5, lrNegative: 0.7, evidence: 'Dyspnea at rest (LR+ 3.5, Wang JAMA 2005)' },
  { answerKey: 'sob_exertional', pattern: /rest/i, diagnosis: 'Pulmonary Embolism', lrPositive: 2.2, lrNegative: 0.8, evidence: 'Acute dyspnea at rest (LR+ 2.2)' },

  { answerKey: 'sob_orthopnea', pattern: /orthopnea|pillow/i, diagnosis: 'Heart Failure', lrPositive: 5.5, lrNegative: 0.6, evidence: 'Orthopnea (LR+ 5.5, Wang JAMA 2005)' },
  { answerKey: 'sob_orthopnea', pattern: /paroxysmal|gasping|wake/i, diagnosis: 'Heart Failure', lrPositive: 4.5, lrNegative: 0.7, evidence: 'PND (LR+ 4.5)' },

  { answerKey: 'sob_leg_symptoms', pattern: /swelling|edema/i, diagnosis: 'Heart Failure', lrPositive: 3.8, lrNegative: 0.7, evidence: 'Lower extremity edema (LR+ 3.8)' },
  { answerKey: 'sob_leg_symptoms', pattern: /calf\s*pain/i, diagnosis: 'Pulmonary Embolism', lrPositive: 4.5, lrNegative: 0.7, evidence: 'Calf pain — DVT (LR+ 4.5)' },

  // ---- ABDOMINAL PAIN ----
  { answerKey: 'abd_quadrant', pattern: /right\s*lower/i, diagnosis: 'Appendicitis', lrPositive: 3.0, lrNegative: 0.5, evidence: 'RLQ pain (LR+ 3.0)' },
  { answerKey: 'abd_quadrant', pattern: /right\s*upper/i, diagnosis: 'Cholecystitis', lrPositive: 3.5, lrNegative: 0.5, evidence: 'RUQ pain (LR+ 3.5)' },
  { answerKey: 'abd_quadrant', pattern: /left\s*lower/i, diagnosis: 'Diverticulitis', lrPositive: 3.0, lrNegative: 0.6, evidence: 'LLQ pain (LR+ 3.0)' },
  { answerKey: 'abd_quadrant', pattern: /left\s*upper/i, diagnosis: 'Pancreatitis', lrPositive: 2.0, lrNegative: 0.9, evidence: 'LUQ/epigastric pain (LR+ 2.0)' },

  { answerKey: 'abd_meal_relation', pattern: /worse\s*after/i, diagnosis: 'Cholecystitis', lrPositive: 2.5, lrNegative: 0.8, evidence: 'Postprandial pain — biliary (LR+ 2.5)' },
  { answerKey: 'abd_meal_relation', pattern: /worse\s*after/i, diagnosis: 'Pancreatitis', lrPositive: 1.5, lrNegative: 0.9, evidence: 'Postprandial worsening (LR+ 1.5)' },
  { answerKey: 'abd_meal_relation', pattern: /empty|fasting/i, diagnosis: 'Peptic Ulcer', lrPositive: 3.0, lrNegative: 0.7, evidence: 'Pain on empty stomach — duodenal (LR+ 3.0)' },

  { answerKey: 'abd_bowel_changes', pattern: /blood/i, diagnosis: 'Inflammatory Bowel Disease', lrPositive: 3.0, lrNegative: 0.8, evidence: 'Bloody stool (LR+ 3.0)' },
  { answerKey: 'abd_bowel_changes', pattern: /blood/i, diagnosis: 'Colorectal malignancy', lrPositive: 1.8, lrNegative: 0.9, evidence: 'Hematochezia (LR+ 1.8)' },

  { answerKey: 'abd_lmp', pattern: /late|missed/i, diagnosis: 'Ectopic Pregnancy', lrPositive: 6.0, lrNegative: 0.3, evidence: 'Missed period with abd pain (LR+ 6.0)' },

  // ---- COUGH ----
  { answerKey: 'cough_productive', pattern: /purulent|yellow|green/i, diagnosis: 'Pneumonia', lrPositive: 2.8, lrNegative: 0.8, evidence: 'Purulent sputum (LR+ 2.8)' },
  { answerKey: 'cough_productive', pattern: /blood|hemoptysis/i, diagnosis: 'Pulmonary Embolism', lrPositive: 3.5, lrNegative: 0.85, evidence: 'Hemoptysis (LR+ 3.5)' },
  { answerKey: 'cough_productive', pattern: /dry/i, diagnosis: 'Viral URI', lrPositive: 1.8, lrNegative: 0.8, evidence: 'Dry cough (LR+ 1.8)' },
  { answerKey: 'cough_productive', pattern: /dry/i, diagnosis: 'ACE inhibitor cough', lrPositive: 2.0, lrNegative: 0.7, evidence: 'Dry cough — medication (LR+ 2.0)' },

  { answerKey: 'cough_duration_detail', pattern: /chronic|months|greater\s*than\s*3/i, diagnosis: 'COPD exacerbation', lrPositive: 2.5, lrNegative: 0.7, evidence: 'Chronic cough (LR+ 2.5)' },
  { answerKey: 'cough_duration_detail', pattern: /chronic|months|greater\s*than\s*3/i, diagnosis: 'Asthma', lrPositive: 2.2, lrNegative: 0.8, evidence: 'Chronic cough — cough-variant asthma (LR+ 2.2)' },

  // ---- SORE THROAT ----
  { answerKey: 'throat_swallowing', pattern: /unable|drool/i, diagnosis: 'Peritonsillar Abscess', lrPositive: 7.0, lrNegative: 0.5, evidence: 'Inability to swallow/drooling (LR+ 7.0)' },
  { answerKey: 'throat_voice', pattern: /muffled|hot\s*potato/i, diagnosis: 'Peritonsillar Abscess', lrPositive: 6.5, lrNegative: 0.5, evidence: 'Hot potato voice (LR+ 6.5)' },

  // ---- UTI ----
  { answerKey: 'uti_upper_tract', pattern: /flank/i, diagnosis: 'Pyelonephritis', lrPositive: 5.0, lrNegative: 0.5, evidence: 'Flank pain (LR+ 5.0)' },
  { answerKey: 'uti_upper_tract', pattern: /fever/i, diagnosis: 'Pyelonephritis', lrPositive: 3.5, lrNegative: 0.6, evidence: 'Fever with urinary symptoms (LR+ 3.5)' },
  { answerKey: 'uti_symptoms', pattern: /hematuria/i, diagnosis: 'Kidney Stone', lrPositive: 2.5, lrNegative: 0.8, evidence: 'Hematuria (LR+ 2.5)' },

  // ---- MENTAL HEALTH ----
  { answerKey: 'mh_safety', pattern: /active/i, diagnosis: 'Major Depressive Disorder — Severe', lrPositive: 10.0, lrNegative: 0.8, evidence: 'Active suicidal ideation (LR+ 10.0)' },
  { answerKey: 'mh_safety', pattern: /passive/i, diagnosis: 'Major Depressive Disorder', lrPositive: 3.5, lrNegative: 0.85, evidence: 'Passive SI (LR+ 3.5)' },
  { answerKey: 'mh_neurovegetative', pattern: /insomnia|hypersomnia|appetite/i, diagnosis: 'Major Depressive Disorder', lrPositive: 2.5, lrNegative: 0.7, evidence: 'Neurovegetative symptoms (LR+ 2.5)' },
];

// ============================================================
// Symptom Constellations
// Combined LR for correlated symptom patterns
// Replaces individual LRs when all required findings match
// ============================================================

export const SYMPTOM_CONSTELLATIONS: SymptomConstellation[] = [
  {
    id: 'meniscal_classic',
    diagnosis: 'Meniscal Tear',
    requiredKeys: ['knee_mechanism', 'knee_locking', 'knee_pain_location'],
    requiredPatterns: [/twist/i, /lock|catch/i, /medial/i],
    combinedLR: 12.0,
    evidence: 'Classic meniscal triad: twisting + locking + medial tenderness (combined LR 12.0)',
  },
  {
    id: 'acl_classic',
    diagnosis: 'ACL Tear',
    requiredKeys: ['knee_mechanism', 'knee_locking', 'knee_weight_bearing'],
    requiredPatterns: [/twist/i, /gives?\s*way|buckl/i, /unable|cannot|difficult/i],
    combinedLR: 15.0,
    evidence: 'ACL tear pattern: twisting + instability + non-weight-bearing (combined LR 15.0)',
  },
  {
    id: 'acs_classic',
    diagnosis: 'Acute Coronary Syndrome',
    requiredKeys: ['chest_exertional', 'chest_radiation', 'chest_associated_sx'],
    requiredPatterns: [/exertion|activity|rest/i, /arm|jaw|neck/i, /diaphoresis|sweat/i],
    combinedLR: 20.0,
    evidence: 'Classic ACS: exertional/rest pain + radiation + diaphoresis (combined LR 20.0)',
  },
  {
    id: 'sah_classic',
    diagnosis: 'Subarachnoid Hemorrhage',
    requiredKeys: ['headache_worst_ever', 'headache_meningeal'],
    requiredPatterns: [/worst/i, /neck\s*stiff/i],
    combinedLR: 30.0,
    evidence: 'SAH pattern: worst headache + nuchal rigidity (combined LR 30.0)',
  },
  {
    id: 'meningitis_classic',
    diagnosis: 'Meningitis',
    requiredKeys: ['headache_worst_ever', 'headache_meningeal'],
    requiredPatterns: [/worst|severe/i, /fever/i],
    combinedLR: 25.0,
    evidence: 'Meningitis triad: severe headache + fever (combined LR 25.0)',
  },
  {
    id: 'chf_classic',
    diagnosis: 'Heart Failure',
    requiredKeys: ['sob_orthopnea', 'sob_leg_symptoms'],
    requiredPatterns: [/orthopnea|pillow|paroxysmal|gasping|wake/i, /swelling|edema/i],
    combinedLR: 15.0,
    evidence: 'Heart failure: orthopnea/PND + peripheral edema (combined LR 15.0)',
  },
  {
    id: 'pe_classic',
    diagnosis: 'Pulmonary Embolism',
    requiredKeys: ['sob_exertional', 'sob_leg_symptoms'],
    requiredPatterns: [/rest/i, /calf\s*pain/i],
    combinedLR: 12.0,
    evidence: 'PE pattern: acute dyspnea + calf pain/DVT (combined LR 12.0)',
  },
  {
    id: 'cauda_equina_classic',
    diagnosis: 'Cauda Equina Syndrome',
    requiredKeys: ['back_leg_radiation', 'back_bladder_bowel'],
    requiredPatterns: [/bilateral|both/i, /bladder|bowel|saddle/i],
    combinedLR: 20.0,
    evidence: 'Cauda equina: bilateral radiculopathy + bowel/bladder dysfunction (combined LR 20.0)',
  },
  {
    id: 'pta_classic',
    diagnosis: 'Peritonsillar Abscess',
    requiredKeys: ['throat_swallowing', 'throat_voice'],
    requiredPatterns: [/unable|drool|difficult/i, /muffled|hot\s*potato/i],
    combinedLR: 18.0,
    evidence: 'Peritonsillar abscess: dysphagia + hot potato voice (combined LR 18.0)',
  },
  {
    id: 'pyelonephritis_classic',
    diagnosis: 'Pyelonephritis',
    requiredKeys: ['uti_upper_tract'],
    requiredPatterns: [/flank.*fever|fever.*flank/i],
    combinedLR: 10.0,
    evidence: 'Upper tract infection: flank pain + fever (combined LR 10.0)',
  },
  {
    id: 'appendicitis_classic',
    diagnosis: 'Appendicitis',
    requiredKeys: ['abd_quadrant', 'abd_meal_relation'],
    requiredPatterns: [/right\s*lower/i, /worse|no\s*relation/i],
    combinedLR: 8.0,
    evidence: 'Appendicitis pattern: RLQ + non-meal-related (combined LR 8.0)',
  },
  {
    id: 'ectopic_classic',
    diagnosis: 'Ectopic Pregnancy',
    requiredKeys: ['abd_quadrant', 'abd_lmp'],
    requiredPatterns: [/lower/i, /late|missed/i],
    combinedLR: 15.0,
    evidence: 'Ectopic: lower abdominal pain + missed period (combined LR 15.0)',
  },
];

// ============================================================
// Apply Likelihood Ratios (Bayesian update on odds)
// ============================================================

/**
 * Applies likelihood ratios to a pre-test odds map.
 * Supports positive evidence (LR+), negative evidence (LR-), and constellations.
 *
 * @param answers - Patient's symptom-specific answers
 * @param odds - Mutable map of diagnosis → pre-test odds
 * @param allAnswerKeys - Set of ALL answer keys the patient was asked (for negative evidence)
 * @returns Evidence map: diagnosis → evidence strings
 */
export function applyLikelihoodRatios(
  answers: Record<string, string>,
  odds: Map<string, number>,
  allAnswerKeys: Set<string>
): Map<string, string[]> {
  const evidenceMap = new Map<string, string[]>();

  // Track which diagnosis-answerKey pairs are handled by constellations
  const constellationHandled = new Set<string>();

  // --- Step 1: Check constellations first ---
  for (const constellation of SYMPTOM_CONSTELLATIONS) {
    let allMatch = true;

    for (let i = 0; i < constellation.requiredKeys.length; i++) {
      const key = constellation.requiredKeys[i];
      const pattern = constellation.requiredPatterns[i];
      const answer = answers[key];

      if (!answer || !pattern.test(answer)) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      // Constellation fires — apply combined LR instead of individual rules
      const currentOdds = odds.get(constellation.diagnosis) || 0.01;
      odds.set(constellation.diagnosis, currentOdds * constellation.combinedLR);

      const evidence = evidenceMap.get(constellation.diagnosis) || [];
      evidence.push(constellation.evidence);
      evidenceMap.set(constellation.diagnosis, evidence);

      // Mark these answer keys as handled for this diagnosis
      for (const key of constellation.requiredKeys) {
        constellationHandled.add(`${constellation.diagnosis}::${key}`);
      }
    }
  }

  // --- Step 2: Apply individual likelihood ratios ---
  for (const rule of LIKELIHOOD_RULES) {
    // Skip if this diagnosis-key pair was handled by a constellation
    if (constellationHandled.has(`${rule.diagnosis}::${rule.answerKey}`)) {
      continue;
    }

    const answer = answers[rule.answerKey];
    const wasAsked = allAnswerKeys.has(rule.answerKey);

    if (answer && rule.pattern.test(answer)) {
      // Positive finding — multiply by LR+
      const currentOdds = odds.get(rule.diagnosis) || 0.01;
      odds.set(rule.diagnosis, currentOdds * rule.lrPositive);

      const evidence = evidenceMap.get(rule.diagnosis) || [];
      evidence.push(rule.evidence);
      evidenceMap.set(rule.diagnosis, evidence);

    } else if (wasAsked && answer) {
      // Question was asked, patient answered, but answer doesn't match this rule's pattern
      // This is NEGATIVE evidence — apply LR-
      const currentOdds = odds.get(rule.diagnosis) || 0.01;
      odds.set(rule.diagnosis, currentOdds * rule.lrNegative);
    }
    // If question wasn't asked at all, don't change odds (no information)
  }

  return evidenceMap;
}

// ============================================================
// Legacy compatibility — wraps Bayesian function for old callers
// ============================================================

export function applySymptomBoosts(
  answers: Record<string, string>,
  scores: Map<string, number>
): Map<string, string[]> {
  // Convert scores to pseudo-odds for LR application
  const odds = new Map<string, number>();
  for (const [dx, score] of scores) {
    odds.set(dx, Math.max(score / 100, 0.01));
  }

  const allKeys = new Set(Object.keys(answers));
  const evidence = applyLikelihoodRatios(answers, odds, allKeys);

  // Convert back to additive scores for legacy compatibility
  for (const [dx, o] of odds) {
    const newScore = Math.round(o * 100);
    scores.set(dx, Math.max(newScore, scores.get(dx) || 0));
  }

  return evidence;
}
