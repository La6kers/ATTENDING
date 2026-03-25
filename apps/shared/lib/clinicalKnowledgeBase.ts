/**
 * clinicalKnowledgeBase.ts
 *
 * Static, offline clinical knowledge base for zero-LLM-cost lookups.
 *
 * This module provides diagnostic criteria, physical exam instructions,
 * clinical guidelines, and drug interaction data as plain TypeScript
 * data structures. Every lookup is a synchronous, zero-cost operation —
 * no LLM inference is required. Intended for use by the CostAwareAIRouter
 * and PreVisit pages to avoid unnecessary AI spend on well-defined
 * clinical reference material.
 *
 * Brand palette (for UI consumers):
 *   Deep navy  #0C3547
 *   Mid teal   #1A8FA8
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiagnosticCriteria {
  name: string;
  icdCode: string;
  requiredFindings: string[];
  supportingFindings: string[];
  exclusionCriteria: string[];
}

export interface PhysicalExamInstruction {
  system: string;
  steps: string[];
  redFlags: string[];
  normalFindings: string[];
}

export interface ClinicalGuideline {
  condition: string;
  source: string;
  recommendations: string[];
  urgency: 'routine' | 'urgent' | 'emergent';
}

export interface DrugClassInteraction {
  class1: string;
  class2: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  mechanism: string;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Static Data — Diagnostic Criteria
// ---------------------------------------------------------------------------

export const DIAGNOSTIC_CRITERIA: Record<string, DiagnosticCriteria> = {
  'tension headache': {
    name: 'Tension Headache',
    icdCode: 'G44.209',
    requiredFindings: [
      'Bilateral location',
      'Pressing or tightening (non-pulsating) quality',
      'Mild-to-moderate intensity',
      'Not aggravated by routine physical activity',
    ],
    supportingFindings: [
      'Duration 30 minutes to 7 days',
      'Pericranial muscle tenderness on palpation',
      'Stress or poor posture as precipitant',
      'Relief with OTC analgesics',
    ],
    exclusionCriteria: [
      'Nausea or vomiting',
      'Presence of both photophobia and phonophobia',
      'Aura symptoms',
      'Focal neurological deficits',
      'Fever or meningismus',
    ],
  },

  'migraine': {
    name: 'Migraine',
    icdCode: 'G43.909',
    requiredFindings: [
      'Unilateral headache location (can be bilateral in some attacks)',
      'Pulsating or throbbing quality',
      'Moderate-to-severe pain intensity',
      'Aggravated by or causes avoidance of routine physical activity',
      'At least one of: nausea, photophobia, phonophobia',
    ],
    supportingFindings: [
      'Duration 4–72 hours if untreated',
      'Aura (visual, sensory, or speech disturbances) preceding headache',
      'Family history of migraine',
      'Triggers: hormonal changes, certain foods, stress, sleep disruption',
      'Relief with triptans or ergotamines',
    ],
    exclusionCriteria: [
      'Thunderclap onset (consider subarachnoid hemorrhage)',
      'New onset after age 50 (consider giant cell arteritis)',
      'Progressive worsening over weeks (consider mass lesion)',
      'Focal neurological deficits persisting beyond aura duration',
      'Fever with neck stiffness (consider meningitis)',
    ],
  },

  'gerd': {
    name: 'Gastroesophageal Reflux Disease (GERD)',
    icdCode: 'K21.0',
    requiredFindings: [
      'Heartburn (retrosternal burning)',
      'Acid regurgitation',
    ],
    supportingFindings: [
      'Symptoms worse after meals or when lying down',
      'Relief with antacids or proton pump inhibitors',
      'Chronic cough or hoarseness (extra-esophageal symptoms)',
      'Globus sensation',
      'Dental erosions',
    ],
    exclusionCriteria: [
      'Dysphagia (may indicate stricture or malignancy — requires workup)',
      'Odynophagia (consider infectious or pill esophagitis)',
      'Unintentional weight loss (alarm feature)',
      'GI bleeding or iron deficiency anemia',
      'Onset after age 60 with new symptoms (warrants endoscopy)',
    ],
  },

  'acute bronchitis': {
    name: 'Acute Bronchitis',
    icdCode: 'J20.9',
    requiredFindings: [
      'Cough lasting more than 5 days',
      'Productive sputum (may be clear, white, yellow, or green)',
      'No consolidation on lung exam (rules out pneumonia)',
      'Often preceded by upper respiratory infection',
    ],
    supportingFindings: [
      'Low-grade fever or absence of fever',
      'Rhonchi or scattered wheezing on auscultation',
      'Chest soreness from coughing',
      'Cough duration up to 3 weeks',
      'Normal or near-normal oxygen saturation',
    ],
    exclusionCriteria: [
      'High fever (>38.5 C / 101.3 F) sustained',
      'Tachypnea, tachycardia, or hypoxia (consider pneumonia)',
      'Focal crackles or egophony (consider pneumonia)',
      'Hemoptysis (consider TB, malignancy, or PE)',
      'Immunocompromised host (lower threshold for imaging)',
    ],
  },

  'hypertension': {
    name: 'Hypertension',
    icdCode: 'I10',
    requiredFindings: [
      'Systolic blood pressure >= 130 mmHg OR diastolic blood pressure >= 80 mmHg',
      'Elevated readings confirmed on 2 or more separate occasions',
      'White-coat effect excluded (ambulatory or home monitoring if suspected)',
    ],
    supportingFindings: [
      'Family history of hypertension',
      'Obesity or sedentary lifestyle',
      'High sodium diet',
      'End-organ changes: LVH on ECG, retinal changes, microalbuminuria',
    ],
    exclusionCriteria: [
      'White-coat hypertension (normal ambulatory readings)',
      'Medication-induced hypertension (NSAIDs, decongestants, steroids)',
      'Secondary causes not yet excluded if clinical suspicion (renal artery stenosis, pheochromocytoma, Cushing syndrome, primary aldosteronism)',
    ],
  },

  'type 2 diabetes': {
    name: 'Type 2 Diabetes Mellitus',
    icdCode: 'E11.9',
    requiredFindings: [
      'HbA1c >= 6.5%, OR',
      'Fasting plasma glucose >= 126 mg/dL (confirmed on repeat), OR',
      'Random plasma glucose >= 200 mg/dL with classic symptoms (polyuria, polydipsia, weight loss)',
    ],
    supportingFindings: [
      'Oral glucose tolerance test: 2-hour glucose >= 200 mg/dL',
      'Acanthosis nigricans',
      'BMI >= 25 (>= 23 in Asian populations)',
      'Family history of type 2 diabetes',
      'History of gestational diabetes',
    ],
    exclusionCriteria: [
      'Type 1 diabetes (positive GAD65, IA-2, or ZnT8 antibodies; low C-peptide)',
      'Steroid-induced hyperglycemia (resolves after discontinuation)',
      'Pancreatic disease (chronic pancreatitis, cystic fibrosis)',
      'Stress hyperglycemia in acute illness',
    ],
  },

  'uti': {
    name: 'Urinary Tract Infection (Uncomplicated)',
    icdCode: 'N39.0',
    requiredFindings: [
      'Dysuria (painful urination)',
      'Urinary frequency',
      'Urinary urgency',
      'Positive urinalysis (leukocyte esterase, nitrites, or pyuria)',
      'No fever or flank pain (uncomplicated)',
    ],
    supportingFindings: [
      'Suprapubic tenderness',
      'Hematuria',
      'Cloudy or malodorous urine',
      'Recent sexual activity as risk factor',
      'Positive urine culture (>= 10^5 CFU/mL)',
    ],
    exclusionCriteria: [
      'Fever > 38 C or flank pain (consider pyelonephritis)',
      'Pregnancy (classify as complicated)',
      'Male sex (classify as complicated)',
      'Structural urinary tract abnormality',
      'Recent urinary catheterization',
      'Immunocompromised state',
    ],
  },

  'acute sinusitis': {
    name: 'Acute Sinusitis',
    icdCode: 'J01.90',
    requiredFindings: [
      'Nasal congestion or obstruction',
      'Facial pain or pressure (over affected sinuses)',
      'Purulent nasal drainage',
      'Symptom duration 7–10 days without improvement, or worsening after initial improvement',
    ],
    supportingFindings: [
      'Hyposmia or anosmia',
      'Maxillary tooth pain',
      'Headache',
      'Postnasal drip',
      'Preceded by viral upper respiratory infection',
    ],
    exclusionCriteria: [
      'Symptoms < 7 days (likely viral rhinosinusitis — antibiotics not indicated)',
      'Periorbital edema or erythema (consider orbital cellulitis — emergent)',
      'Visual changes (emergent complication)',
      'Severe unilateral headache with focal neuro signs (consider intracranial complication)',
      'Chronic symptoms > 12 weeks (classify as chronic sinusitis)',
    ],
  },

  'generalized anxiety disorder': {
    name: 'Generalized Anxiety Disorder (GAD)',
    icdCode: 'F41.1',
    requiredFindings: [
      'Excessive anxiety and worry occurring more days than not for >= 6 months',
      'Difficulty controlling the worry',
      '3 or more of: restlessness, easy fatigability, difficulty concentrating, irritability, muscle tension, sleep disturbance',
      'Clinically significant distress or functional impairment',
    ],
    supportingFindings: [
      'GAD-7 score >= 10 (moderate or higher)',
      'Somatic complaints: headaches, GI disturbance, chronic pain',
      'Comorbid depressive symptoms',
      'Avoidance behaviors',
    ],
    exclusionCriteria: [
      'Symptoms better explained by another mental disorder (panic disorder, OCD, PTSD)',
      'Substance-induced anxiety (caffeine, stimulants, withdrawal)',
      'Medical condition causing anxiety (hyperthyroidism, pheochromocytoma)',
      'Anxiety limited to specific situations only (consider specific phobia or social anxiety)',
    ],
  },

  'major depression': {
    name: 'Major Depressive Disorder',
    icdCode: 'F32.9',
    requiredFindings: [
      'Depressed mood most of the day, nearly every day, OR markedly diminished interest/pleasure (anhedonia)',
      '5 or more of the following for >= 2 weeks: depressed mood, anhedonia, weight/appetite change, insomnia/hypersomnia, psychomotor agitation/retardation, fatigue, worthlessness/guilt, impaired concentration, suicidal ideation',
      'Clinically significant functional impairment',
    ],
    supportingFindings: [
      'PHQ-9 score >= 10 (moderate or higher)',
      'Social withdrawal',
      'Somatic complaints without clear medical cause',
      'Family history of depression',
      'History of prior depressive episodes',
    ],
    exclusionCriteria: [
      'Symptoms attributable to substance use or medication',
      'Symptoms better explained by a medical condition (hypothyroidism, anemia, vitamin B12 deficiency)',
      'History of manic or hypomanic episode (consider bipolar disorder)',
      'Bereavement with normal grief response (duration < 2 months, no suicidal ideation, no psychotic features)',
    ],
  },
};

// ---------------------------------------------------------------------------
// Static Data — Physical Exam Instructions
// ---------------------------------------------------------------------------

export const PHYSICAL_EXAM_INSTRUCTIONS: Record<string, PhysicalExamInstruction> = {
  'neurological-headache': {
    system: 'Neurological — Headache Evaluation',
    steps: [
      'Assess mental status and orientation (person, place, time, situation)',
      'Test cranial nerves II–XII systematically',
      'Perform fundoscopic exam to evaluate for papilledema',
      'Check for neck stiffness (meningismus) — passive neck flexion',
      'Assess motor strength in upper and lower extremities (5-point scale)',
      'Test deep tendon reflexes (biceps, triceps, patellar, Achilles)',
      'Evaluate cerebellar function: finger-to-nose, heel-to-shin, Romberg test',
      'Assess gait and tandem walking',
      'Palpate temporal arteries for tenderness or reduced pulsation (if age > 50)',
      'Check for Kernig and Brudzinski signs if meningitis suspected',
    ],
    redFlags: [
      'Papilledema on fundoscopic exam (elevated intracranial pressure)',
      'Focal neurological deficits (hemiparesis, aphasia, visual field cut)',
      'Thunderclap onset — worst headache of life',
      'Neck rigidity with fever',
      'Altered level of consciousness',
      'New onset seizures',
      'Progressive worsening over days to weeks',
    ],
    normalFindings: [
      'Cranial nerves II–XII intact',
      'No papilledema',
      'Supple neck without meningismus',
      'Motor strength 5/5 in all extremities',
      'Reflexes 2+ and symmetric',
      'Normal gait and coordination',
      'Negative Romberg',
    ],
  },

  'cardiovascular-chest-pain': {
    system: 'Cardiovascular — Chest Pain Evaluation',
    steps: [
      'Inspect chest wall for visible pulsations, scars, or deformities',
      'Palpate point of maximal impulse (PMI) — normally at 5th intercostal space, midclavicular line',
      'Auscultate heart in 4 positions: aortic, pulmonic, tricuspid, mitral (with bell and diaphragm)',
      'Listen for murmurs, gallops (S3, S4), rubs, and clicks',
      'Assess jugular venous distension (JVD) at 45-degree elevation',
      'Palpate peripheral pulses bilaterally: radial, dorsalis pedis, posterior tibial',
      'Assess for lower extremity edema (pitting vs. non-pitting, grading 1+–4+)',
      'Check blood pressure in both arms',
      'Palpate chest wall for reproducible tenderness (musculoskeletal cause)',
      'Auscultate for carotid bruits',
    ],
    redFlags: [
      'Hemodynamic instability (hypotension, tachycardia, diaphoresis)',
      'New murmur (consider acute valvular emergency)',
      'Elevated JVD with hypotension (consider tamponade or massive PE)',
      'Unilateral leg swelling with chest pain (consider PE)',
      'Pulsus paradoxus > 10 mmHg',
      'Absent peripheral pulses (consider aortic dissection)',
      'S3 gallop with dyspnea (acute heart failure)',
    ],
    normalFindings: [
      'PMI non-displaced, non-sustained',
      'Regular rate and rhythm, no murmurs, gallops, or rubs',
      'No JVD',
      'Peripheral pulses 2+ and symmetric bilaterally',
      'No peripheral edema',
      'Blood pressure symmetric between arms',
      'No carotid bruits',
    ],
  },

  'abdominal': {
    system: 'Abdominal Examination',
    steps: [
      'Inspect abdomen: contour (flat, scaphoid, distended), scars, visible peristalsis, skin changes',
      'Auscultate all four quadrants for bowel sounds (before palpation)',
      'Auscultate for bruits over aorta, renal, and iliac arteries',
      'Percuss all four quadrants to assess for tympany vs. dullness',
      'Percuss liver span at right midclavicular line (normal 6–12 cm)',
      'Check for shifting dullness if ascites suspected',
      'Light palpation of all four quadrants — assess for tenderness and guarding',
      'Deep palpation — assess for masses, organomegaly',
      'Palpate liver edge, spleen tip, and kidneys',
      'Check for rebound tenderness and involuntary guarding (peritoneal signs)',
      'Special tests as indicated: Murphy sign (cholecystitis), McBurney point (appendicitis), Rovsing sign, psoas sign, obturator sign',
    ],
    redFlags: [
      'Involuntary guarding or board-like rigidity (peritonitis)',
      'Rebound tenderness',
      'Absent bowel sounds (ileus or late obstruction)',
      'High-pitched, tinkling bowel sounds (early obstruction)',
      'Pulsatile abdominal mass (abdominal aortic aneurysm)',
      'Periumbilical ecchymosis (Cullen sign) or flank ecchymosis (Grey Turner sign)',
      'Severe tenderness with hemodynamic instability',
    ],
    normalFindings: [
      'Abdomen soft, non-tender, non-distended',
      'Normoactive bowel sounds in all four quadrants',
      'No organomegaly or palpable masses',
      'No rebound tenderness or guarding',
      'Liver span within normal limits',
      'No bruits auscultated',
      'Tympanitic to percussion over stomach and bowel',
    ],
  },

  'respiratory': {
    system: 'Respiratory Examination',
    steps: [
      'Inspect chest wall: symmetry, use of accessory muscles, respiratory rate and pattern',
      'Assess oxygen saturation via pulse oximetry',
      'Percuss chest wall bilaterally — compare symmetry (resonant vs. dull vs. hyperresonant)',
      'Assess tactile fremitus bilaterally — place ulnar surface of hands on chest and ask patient to say "ninety-nine"',
      'Auscultate anterior and posterior lung fields systematically, comparing side to side',
      'Listen for adventitious sounds: crackles (rales), wheezes, rhonchi, stridor, pleural rub',
      'Assess for egophony ("E-to-A" change) if consolidation suspected',
      'Check for whispered pectoriloquy',
      'Evaluate diaphragmatic excursion by percussion during deep breathing',
      'Assess cough: productive vs. dry, and sputum character if applicable',
    ],
    redFlags: [
      'Oxygen saturation < 92% on room air',
      'Severe respiratory distress (accessory muscle use, tripod positioning)',
      'Stridor (upper airway obstruction)',
      'Absent breath sounds unilaterally (pneumothorax or massive effusion)',
      'Tracheal deviation (tension pneumothorax)',
      'Massive hemoptysis',
      'Cyanosis',
    ],
    normalFindings: [
      'Respiratory rate 12–20 breaths per minute',
      'Oxygen saturation >= 95% on room air',
      'Chest wall symmetric, no accessory muscle use',
      'Resonant to percussion bilaterally',
      'Tactile fremitus symmetric',
      'Clear to auscultation bilaterally, no adventitious sounds',
      'Normal diaphragmatic excursion',
    ],
  },

  'musculoskeletal-back': {
    system: 'Musculoskeletal — Back/Spine Evaluation',
    steps: [
      'Inspect spine: alignment, posture, asymmetry, visible deformity',
      'Palpate spinous processes and paraspinal muscles for tenderness',
      'Assess active range of motion: flexion, extension, lateral bending, rotation',
      'Perform straight leg raise (SLR) test bilaterally — positive if radicular pain 30–70 degrees',
      'Perform crossed straight leg raise for contralateral radiculopathy',
      'Test lower extremity reflexes: patellar (L3-L4), Achilles (S1)',
      'Assess motor strength: hip flexion (L2), knee extension (L3-L4), ankle dorsiflexion (L4-L5), great toe extension (L5), ankle plantarflexion (S1)',
      'Test sensation in dermatomes L2–S1',
      'Assess gait: heel walk (L4-L5), toe walk (S1)',
      'Check for saddle anesthesia and rectal tone if cauda equina syndrome suspected',
    ],
    redFlags: [
      'Saddle anesthesia or bowel/bladder dysfunction (cauda equina syndrome — emergent)',
      'Progressive or severe motor weakness',
      'History of cancer with new back pain (metastatic disease)',
      'Fever with back pain (spinal epidural abscess or osteomyelitis)',
      'History of significant trauma (fracture risk)',
      'Pain unrelieved by rest or position change',
      'IV drug use with back pain (increased infection risk)',
    ],
    normalFindings: [
      'Spine aligned, no visible deformity',
      'No spinous process or paraspinal tenderness',
      'Full range of motion without pain',
      'Straight leg raise negative bilaterally',
      'Reflexes 2+ and symmetric (patellar and Achilles)',
      'Motor strength 5/5 in all lower extremity myotomes',
      'Sensation intact in L2–S1 dermatomes',
      'Normal gait, heel walk, and toe walk',
    ],
  },
};

// ---------------------------------------------------------------------------
// Static Data — Clinical Guidelines
// ---------------------------------------------------------------------------

export const CLINICAL_GUIDELINES: Record<string, ClinicalGuideline> = {
  'hypertension-management': {
    condition: 'Hypertension Management',
    source: 'AHA/ACC 2024',
    recommendations: [
      'Stage 1 (130-139/80-89): Lifestyle modifications for 3–6 months; initiate pharmacotherapy if 10-year ASCVD risk >= 10% or comorbid diabetes/CKD',
      'Stage 2 (>= 140/90): Initiate pharmacotherapy plus lifestyle modifications',
      'Lifestyle modifications: DASH diet, sodium < 1500 mg/day, regular aerobic exercise (150 min/week), weight loss if BMI > 25, limit alcohol, smoking cessation',
      'First-line agents: thiazide diuretics, ACE inhibitors, ARBs, or calcium channel blockers',
      'Goal BP < 130/80 for most adults; individualize for elderly or those with orthostatic hypotension',
      'Follow up within 1 month of initiation or dose change',
      'Annual screening for end-organ damage: renal function, urinalysis, lipid panel, ECG',
    ],
    urgency: 'routine',
  },

  'diabetes-screening': {
    condition: 'Type 2 Diabetes Screening',
    source: 'ADA Standards of Care 2024',
    recommendations: [
      'Screen all adults aged 35–70 who are overweight or obese (BMI >= 25, or >= 23 in Asian Americans)',
      'Screen earlier and more frequently if: first-degree relative with diabetes, high-risk ethnicity, history of GDM, PCOS, or physical inactivity',
      'Preferred screening test: HbA1c (no fasting required) or fasting plasma glucose',
      'If result is prediabetes (A1c 5.7–6.4%): refer to structured lifestyle intervention program, rescreen annually',
      'If result is normal: rescreen every 3 years, or sooner if risk factors change',
      'Consider metformin for prediabetes prevention in high-risk individuals (BMI >= 35, age < 60, prior GDM)',
    ],
    urgency: 'routine',
  },

  'chest-pain-workup': {
    condition: 'Chest Pain Evaluation and Workup',
    source: 'AHA/ACC 2021 Chest Pain Guideline',
    recommendations: [
      'Obtain 12-lead ECG within 10 minutes of presentation for acute chest pain',
      'Obtain high-sensitivity troponin at presentation; repeat at 1–3 hours if initial is negative or indeterminate',
      'Apply HEART score (History, ECG, Age, Risk factors, Troponin) for risk stratification',
      'HEART score 0–3 (low risk): consider early discharge with outpatient follow-up',
      'HEART score 4–6 (moderate risk): observation, serial troponins, consider non-invasive testing',
      'HEART score 7–10 (high risk): cardiology consultation, consider invasive strategy',
      'For non-cardiac chest pain: evaluate for PE (Wells score), aortic dissection (if tearing pain radiating to back), pneumothorax, GERD, musculoskeletal causes',
      'Chest X-ray for all acute presentations to evaluate for pneumothorax, effusion, mediastinal widening',
    ],
    urgency: 'emergent',
  },
};

// ---------------------------------------------------------------------------
// Static Data — Drug Class Interactions
// ---------------------------------------------------------------------------

export const DRUG_CLASS_INTERACTIONS: DrugClassInteraction[] = [
  {
    class1: 'ACE Inhibitors',
    class2: 'Potassium-Sparing Diuretics',
    severity: 'severe',
    mechanism:
      'Both ACE inhibitors and potassium-sparing diuretics reduce potassium excretion, leading to additive hyperkalemia risk. ACE inhibitors decrease aldosterone secretion while potassium-sparing diuretics block aldosterone or ENaC channels.',
    recommendation:
      'Monitor serum potassium within 1 week of co-initiation and periodically thereafter. Avoid combination in patients with eGFR < 30 mL/min. Counsel patients to limit high-potassium foods.',
  },
  {
    class1: 'SSRIs',
    class2: 'MAOIs',
    severity: 'contraindicated',
    mechanism:
      'Combined serotonin reuptake inhibition (SSRI) and monoamine oxidase inhibition (MAOI) causes dangerous accumulation of serotonin in synaptic clefts, resulting in serotonin syndrome — a potentially fatal condition.',
    recommendation:
      'Absolutely contraindicated. A washout period of at least 14 days is required when switching between SSRIs and MAOIs (5 weeks for fluoxetine due to long half-life of norfluoxetine).',
  },
  {
    class1: 'NSAIDs',
    class2: 'Anticoagulants',
    severity: 'severe',
    mechanism:
      'NSAIDs inhibit platelet aggregation via COX-1 inhibition and can cause GI mucosal erosion. Combined with anticoagulants (warfarin, DOACs), this significantly increases bleeding risk, particularly GI hemorrhage.',
    recommendation:
      'Avoid concurrent use when possible. If necessary, use the lowest NSAID dose for the shortest duration, add a PPI for GI protection, and monitor for signs of bleeding. Consider acetaminophen as an alternative analgesic.',
  },
  {
    class1: 'Statins',
    class2: 'Macrolide Antibiotics',
    severity: 'moderate',
    mechanism:
      'Macrolides (especially clarithromycin and erythromycin) inhibit CYP3A4 and OATP1B1 transporters, reducing hepatic metabolism and uptake of statins (particularly simvastatin, lovastatin, atorvastatin). Elevated statin levels increase risk of rhabdomyolysis.',
    recommendation:
      'Temporarily hold statin during short macrolide courses. If antibiotic is needed long-term, switch to azithromycin (minimal CYP3A4 inhibition) or use a statin not metabolized by CYP3A4 (rosuvastatin, pravastatin).',
  },
  {
    class1: 'Beta-Blockers',
    class2: 'Non-Dihydropyridine Calcium Channel Blockers',
    severity: 'severe',
    mechanism:
      'Both beta-blockers and non-dihydropyridine CCBs (verapamil, diltiazem) suppress SA and AV node conduction and decrease myocardial contractility. Combined use can cause severe bradycardia, heart block, or cardiogenic shock.',
    recommendation:
      'Avoid combining beta-blockers with verapamil or diltiazem. If rate control is needed, use one agent and titrate carefully. Monitor ECG and heart rate closely. Dihydropyridine CCBs (amlodipine, nifedipine) are generally safe with beta-blockers.',
  },
];

// ---------------------------------------------------------------------------
// Lookup Functions
// ---------------------------------------------------------------------------

/**
 * Retrieve diagnostic criteria for a given condition.
 * Performs a case-insensitive exact-match lookup.
 */
export function getDiagnosticCriteria(
  condition: string,
): DiagnosticCriteria | undefined {
  return DIAGNOSTIC_CRITERIA[condition.toLowerCase()];
}

/**
 * Retrieve physical exam instructions for a given body system/context.
 * Performs a case-insensitive exact-match lookup.
 */
export function getPhysicalExamInstructions(
  system: string,
): PhysicalExamInstruction | undefined {
  return PHYSICAL_EXAM_INSTRUCTIONS[system.toLowerCase()];
}

/**
 * Retrieve clinical guideline for a given condition key.
 * Performs a case-insensitive exact-match lookup.
 */
export function getGuideline(
  condition: string,
): ClinicalGuideline | undefined {
  return CLINICAL_GUIDELINES[condition.toLowerCase()];
}

/**
 * Given a list of drug class names, check all pairs against known interactions.
 * Returns all matching DrugClassInteraction entries.
 */
export function checkDrugClassInteractions(
  classes: string[],
): DrugClassInteraction[] {
  if (classes.length < 2) return [];

  const normalized = classes.map((c) => c.toLowerCase());
  const matches: DrugClassInteraction[] = [];

  for (const interaction of DRUG_CLASS_INTERACTIONS) {
    const c1 = interaction.class1.toLowerCase();
    const c2 = interaction.class2.toLowerCase();

    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const a = normalized[i];
        const b = normalized[j];
        if (
          (a.includes(c1) || c1.includes(a)) &&
          (b.includes(c2) || c2.includes(b))
        ) {
          matches.push(interaction);
        } else if (
          (a.includes(c2) || c2.includes(a)) &&
          (b.includes(c1) || c1.includes(b))
        ) {
          matches.push(interaction);
        }
      }
    }
  }

  return matches;
}

/**
 * Fuzzy text search across all diagnostic criteria and clinical guidelines.
 * Splits the query into tokens and matches against names, findings, conditions,
 * and recommendations. Returns all entries where at least one token matches.
 */
export function searchKnowledgeBase(query: string): {
  criteria: DiagnosticCriteria[];
  guidelines: ClinicalGuideline[];
} {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (tokens.length === 0) {
    return { criteria: [], guidelines: [] };
  }

  const matchedCriteria: DiagnosticCriteria[] = [];
  const matchedGuidelines: ClinicalGuideline[] = [];

  // Search diagnostic criteria
  for (const entry of Object.values(DIAGNOSTIC_CRITERIA)) {
    const searchableText = [
      entry.name,
      entry.icdCode,
      ...entry.requiredFindings,
      ...entry.supportingFindings,
      ...entry.exclusionCriteria,
    ]
      .join(' ')
      .toLowerCase();

    if (tokens.some((token) => searchableText.includes(token))) {
      matchedCriteria.push(entry);
    }
  }

  // Search clinical guidelines
  for (const entry of Object.values(CLINICAL_GUIDELINES)) {
    const searchableText = [
      entry.condition,
      entry.source,
      ...entry.recommendations,
    ]
      .join(' ')
      .toLowerCase();

    if (tokens.some((token) => searchableText.includes(token))) {
      matchedGuidelines.push(entry);
    }
  }

  return { criteria: matchedCriteria, guidelines: matchedGuidelines };
}
