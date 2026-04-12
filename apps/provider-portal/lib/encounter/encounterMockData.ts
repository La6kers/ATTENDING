// ============================================================
// ATTENDING AI - Encounter Page Mock Data
// Extracted from [id].tsx for code-splitting / bundle size reduction
// ============================================================

import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
} from 'lucide-react';

// ============================================================
// Types (re-exported for use in [id].tsx)
// ============================================================
export type FindingState = 'present' | 'absent' | 'unknown';

export interface Finding {
  name: string;
  state: FindingState;
}

export interface Diagnosis {
  name: string;
  icdCode: string;
  probability: number;
  findings: Finding[];
  evidence: string;
  category: string;
}

export interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  inStock: boolean;
  quantity?: number;
  alternative?: string;
}

export interface TreatmentPlan {
  diagnosis: string;
  medications: Medication[];
  nonPharm: string[];
  ordered: boolean[];
}

// ============================================================
// Scenario 1: Sarah Chen (Headache)
// ============================================================
const PATIENT = {
  name: 'Sarah Chen',
  initials: 'SC',
  age: 34,
  gender: 'Female',
  mrn: 'MRN-2024-0847',
  dob: '06/15/1991',
  appointmentTime: '10:30 AM',
  appointmentDate: 'March 7, 2026',
  insurance: 'Blue Cross PPO',
  primaryCare: 'Dr. Thomas Reed',
};

const VITALS = [
  { label: 'BP', value: '142/88', unit: 'mmHg', icon: Heart, status: 'high' as const },
  { label: 'HR', value: '92', unit: 'bpm', icon: Activity, status: 'elevated' as const },
  { label: 'Temp', value: '99.1', unit: '\u00B0F', icon: Thermometer, status: 'elevated' as const },
  { label: 'RR', value: '18', unit: '/min', icon: Wind, status: 'normal' as const },
  { label: 'SpO2', value: '98', unit: '%', icon: Droplets, status: 'normal' as const },
];

const CURRENT_MEDICATIONS = [
  { name: 'Ibuprofen 400mg', frequency: 'PRN for headache', duration: 'Since 2023' },
  { name: 'Oral Contraceptive', frequency: 'Daily', duration: 'Since 2018' },
];

const INITIAL_DIAGNOSES: Diagnosis[] = [
  {
    name: 'Migraine without aura',
    icdCode: 'G43.009',
    probability: 0.65,
    category: 'Headache',
    evidence: 'Patient reports pulsating unilateral headache with nausea and photophobia. History of similar episodes. OCP use may increase frequency.',
    findings: [
      { name: 'Unilateral location', state: 'present' },
      { name: 'Pulsating quality', state: 'present' },
      { name: 'Nausea/vomiting', state: 'present' },
      { name: 'Photophobia', state: 'present' },
      { name: 'Duration 4-72 hours', state: 'unknown' },
      { name: 'Aggravated by activity', state: 'unknown' },
    ],
  },
  {
    name: 'Tension-type headache',
    icdCode: 'G44.209',
    probability: 0.45,
    category: 'Headache',
    evidence: 'Bilateral pressing headache quality reported. Elevated BP and stress factors noted. No aura symptoms.',
    findings: [
      { name: 'Bilateral location', state: 'present' },
      { name: 'Pressing/tightening quality', state: 'present' },
      { name: 'Mild-moderate intensity', state: 'absent' },
      { name: 'No nausea or vomiting', state: 'absent' },
      { name: 'Not aggravated by activity', state: 'unknown' },
      { name: 'Pericranial tenderness', state: 'unknown' },
    ],
  },
  {
    name: 'Subarachnoid hemorrhage',
    icdCode: 'I60.9',
    probability: 0.25,
    category: 'Headache',
    evidence: 'Thunderclap onset described as "worst headache of my life". Elevated BP. Requires urgent CT and possibly lumbar puncture to rule out.',
    findings: [
      { name: 'Thunderclap onset', state: 'present' },
      { name: '"Worst headache of life"', state: 'present' },
      { name: 'Neck stiffness', state: 'unknown' },
      { name: 'Loss of consciousness', state: 'absent' },
      { name: 'Focal neurological deficit', state: 'unknown' },
      { name: 'Elevated BP', state: 'present' },
    ],
  },
  {
    name: 'Medication overuse headache',
    icdCode: 'G44.40',
    probability: 0.20,
    category: 'Headache',
    evidence: 'Patient uses ibuprofen PRN for headaches. If frequency exceeds 15 days/month for >3 months, MOH should be considered.',
    findings: [
      { name: 'Regular analgesic use', state: 'present' },
      { name: 'Headache >15 days/month', state: 'unknown' },
      { name: 'Worsening despite treatment', state: 'unknown' },
      { name: '>3 months overuse', state: 'unknown' },
    ],
  },
  {
    name: 'Cluster headache',
    icdCode: 'G44.009',
    probability: 0.15,
    category: 'Headache',
    evidence: 'Severe unilateral headache reported. However, patient demographics (34F) atypical for cluster headache (more common in males).',
    findings: [
      { name: 'Severe unilateral pain', state: 'present' },
      { name: 'Orbital/temporal location', state: 'unknown' },
      { name: 'Lacrimation/rhinorrhea', state: 'absent' },
      { name: 'Restlessness', state: 'unknown' },
      { name: 'Duration 15-180 min', state: 'unknown' },
      { name: 'Circadian pattern', state: 'absent' },
    ],
  },
];

const TREATMENT_PLANS: TreatmentPlan[] = [
  {
    diagnosis: 'Migraine without aura',
    medications: [
      { name: 'Sumatriptan', dose: '50mg', route: 'PO', frequency: 'PRN at onset, max 200mg/day', inStock: true, quantity: 120 },
      { name: 'Ondansetron', dose: '4mg', route: 'ODT', frequency: 'PRN for nausea', inStock: true, quantity: 60 },
      { name: 'Metoclopramide', dose: '10mg', route: 'PO', frequency: 'PRN', inStock: true, quantity: 45 },
    ],
    nonPharm: ['Dark quiet room during attacks', 'Cold compress to forehead', 'Migraine diary to track triggers'],
    ordered: [false, false, false],
  },
  {
    diagnosis: 'Tension-type headache',
    medications: [
      { name: 'Acetaminophen', dose: '1000mg', route: 'PO', frequency: 'PRN, max 3g/day', inStock: true, quantity: 500 },
      { name: 'Amitriptyline', dose: '10mg', route: 'PO', frequency: 'QHS (preventive)', inStock: true, quantity: 90 },
    ],
    nonPharm: ['Stress management techniques', 'Physical therapy for cervical muscles', 'Regular sleep schedule'],
    ordered: [false, false],
  },
  {
    diagnosis: 'Subarachnoid hemorrhage',
    medications: [
      { name: 'Nimodipine', dose: '60mg', route: 'PO', frequency: 'Q4H x 21 days', inStock: false, alternative: 'Available via pharmacy order (24h)' },
      { name: 'Levetiracetam', dose: '500mg', route: 'IV', frequency: 'BID (seizure prophylaxis)', inStock: true, quantity: 30 },
    ],
    nonPharm: ['STAT non-contrast CT head', 'Lumbar puncture if CT negative', 'Neurosurgery consult', 'ICU admission if confirmed'],
    ordered: [false, false],
  },
];

const PHARMACY_INVENTORY = [
  { name: 'Sumatriptan 50mg', inStock: true, quantity: 120 },
  { name: 'Ondansetron 4mg ODT', inStock: true, quantity: 60 },
  { name: 'Metoclopramide 10mg', inStock: true, quantity: 45 },
  { name: 'Acetaminophen 500mg', inStock: true, quantity: 500 },
  { name: 'Amitriptyline 10mg', inStock: true, quantity: 90 },
  { name: 'Levetiracetam 500mg', inStock: true, quantity: 30 },
  { name: 'Nimodipine 60mg', inStock: false, quantity: 0 },
  { name: 'Ketorolac 30mg', inStock: true, quantity: 24 },
];

const SOAP_NOTE = {
  subjective: `34-year-old female presents with chief complaint of "worst headache of my life" with sudden onset 3 days ago. Patient describes the pain as pulsating, primarily unilateral (right temporal/frontal), rated 9/10 in severity. Associated symptoms include nausea (no vomiting), photophobia, and phonophobia. Patient reports the headache began suddenly while at work. She has tried ibuprofen 400mg without significant relief. No recent head trauma, fever, neck stiffness, or visual changes reported. Past medical history significant for occasional headaches managed with OTC analgesics.

Current medications: Ibuprofen 400mg PRN, oral contraceptive daily.
Allergies: Sulfa drugs (rash), Codeine (nausea).`,

  objective: `Vitals: BP 142/88 mmHg, HR 92 bpm, Temp 99.1\u00B0F, RR 18/min, SpO2 98%

General: Alert, oriented x4, appears uncomfortable, holding head
HEENT: No papilledema on fundoscopic exam, PERRLA, no scleral icterus
Neck: Supple, no meningismus, no lymphadenopathy
Neuro: CN II-XII intact, 5/5 strength all extremities, DTRs 2+ symmetric, no pronator drift, finger-to-nose intact, negative Kernig and Brudzinski signs
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally`,

  assessment: `1. Severe headache - differential includes migraine without aura (most likely, 65%), tension-type headache, and SAH (low probability but must rule out given "worst headache" presentation)
2. Elevated blood pressure - likely pain-related, monitor
3. Low-grade temperature - monitor, likely not infectious`,

  plan: `1. STAT non-contrast CT head to rule out subarachnoid hemorrhage
2. If CT negative and clinical suspicion persists, consider lumbar puncture
3. Sumatriptan 50mg PO x1 for acute migraine treatment (after CT results)
4. Ondansetron 4mg ODT PRN for nausea
5. IV normal saline for hydration
6. Recheck vitals in 1 hour
7. Migraine education and trigger diary
8. Follow-up in 1 week or sooner if worsening
9. Return precautions discussed: sudden worsening, vision changes, weakness, fever`,
};

const BILLING_CODES = [
  { code: '99214', description: 'Office visit, established patient, moderate complexity', selected: true },
  { code: 'G43.009', description: 'Migraine without aura, not intractable', selected: true },
  { code: '70450', description: 'CT head without contrast', selected: false },
  { code: 'R51.9', description: 'Headache, unspecified', selected: false },
];

const PAST_VISITS = [
  { date: '01/15/2026', complaint: 'Annual physical', provider: 'Dr. Thomas Reed', diagnosis: 'Routine exam - no acute findings', notes: 'Labs ordered: CBC, BMP, Lipid Panel. All normal except LDL 142 (elevated).' },
  { date: '11/02/2025', complaint: 'Migraine follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'Migraine stable on current regimen', notes: 'Frequency decreased to 2x/month. Continue current management.' },
  { date: '08/20/2025', complaint: 'BP check', provider: 'NP Wilson', diagnosis: 'Hypertension - controlled', notes: 'BP 128/82. Continue monitoring. Lifestyle modifications discussed.' },
  { date: '05/10/2025', complaint: 'Allergy consult', provider: 'Dr. Kim', diagnosis: 'Seasonal allergic rhinitis', notes: 'Started on loratadine 10mg daily. Nasal saline irrigation recommended.' },
  { date: '02/12/2025', complaint: 'Sinus infection', provider: 'Dr. Thomas Reed', diagnosis: 'Acute sinusitis', notes: 'Amoxicillin 500mg TID x 10 days. Resolved without complications.' },
];

const CHRONIC_CONDITIONS = [
  { name: 'Migraine with aura', since: '2019', status: 'Active' },
  { name: 'Hypertension, Stage 1', since: '2023', status: 'Active' },
  { name: 'Seasonal allergic rhinitis', since: '2015', status: 'Active' },
];

const SURGICAL_HISTORY = [
  { procedure: 'Appendectomy', date: '2012', notes: 'Uncomplicated, laparoscopic' },
  { procedure: 'Wisdom teeth extraction', date: '2010', notes: 'All four removed under general anesthesia' },
];

const FAMILY_HISTORY = [
  { relation: 'Mother', conditions: 'Migraine, Hypertension, Type 2 Diabetes' },
  { relation: 'Father', conditions: 'Coronary artery disease, Hyperlipidemia' },
  { relation: 'Maternal grandmother', conditions: 'Stroke at age 72' },
];

const SOCIAL_HISTORY = {
  occupation: 'Software Engineer',
  tobacco: 'Never smoker',
  alcohol: 'Social, 2-3 drinks/week',
  exercise: '3x/week (yoga, running)',
  diet: 'Generally healthy, vegetarian',
  stress: 'High - work deadlines',
  sleep: '6-7 hours/night, irregular schedule',
};

// ============================================================
// AI-Mined Prior Visit Insights (related to current complaint)
// ============================================================
const AI_PRIOR_VISIT_INSIGHTS = [
  {
    type: 'prior_visit' as const,
    title: 'Migraine Follow-up \u2014 11/02/2025',
    detail: 'Frequency was 2x/month, stable on sumatriptan. Patient reported stress as primary trigger. No aura at that visit.',
    relevance: 'high' as const,
    aiNote: 'Current presentation differs: "worst headache of life" + thunderclap onset suggests this is NOT typical migraine pattern.',
  },
  {
    type: 'prior_visit' as const,
    title: 'Annual Physical \u2014 01/15/2026',
    detail: 'BP was 132/84 (borderline). LDL 142 (elevated). No headache complaints at that visit.',
    relevance: 'medium' as const,
    aiNote: 'BP trending upward: 124/78 \u2192 128/82 \u2192 132/84 \u2192 142/88 today. Consider secondary hypertension workup.',
  },
  {
    type: 'medication' as const,
    title: 'Ibuprofen Use Pattern',
    detail: 'PRN since 2023. Patient mentioned using "a few times a week" at 11/02/2025 visit.',
    relevance: 'medium' as const,
    aiNote: 'Frequent NSAID use + OCP combination increases cardiovascular risk. If >15 days/month, consider medication overuse headache.',
  },
  {
    type: 'family' as const,
    title: 'Family History: Stroke Risk',
    detail: 'Maternal grandmother had stroke at age 72. Mother has migraine + HTN + DM2. Father has CAD.',
    relevance: 'high' as const,
    aiNote: 'Strong family history of cerebrovascular disease. Combined with OCP use, elevated BP, and thunderclap headache \u2014 lowers threshold for SAH workup.',
  },
];

const AI_DRUG_INTERACTIONS = [
  {
    severity: 'warning' as const,
    drugs: ['Ibuprofen', 'Oral Contraceptive'],
    detail: 'NSAIDs may reduce efficacy of hormonal contraceptives. Additionally, both increase cardiovascular risk.',
  },
  {
    severity: 'caution' as const,
    drugs: ['Sumatriptan', 'OCP'],
    detail: 'Triptans are generally safe with OCPs, but monitor for vascular events in patients with aura. Current presentation has no aura.',
  },
  {
    severity: 'info' as const,
    drugs: ['Ibuprofen', 'Sumatriptan'],
    detail: 'Can be used together. Some evidence supports NSAID + triptan combination for refractory migraine.',
  },
];

const AI_VITALS_TREND = [
  { date: '05/2025', bp: '124/78', label: 'Normal' },
  { date: '08/2025', bp: '128/82', label: 'Normal' },
  { date: '11/2025', bp: '132/84', label: 'Elevated' },
  { date: '01/2026', bp: '132/84', label: 'Elevated' },
  { date: 'Today', bp: '142/88', label: 'Stage 1 HTN' },
];

const FULL_MEDICATION_LIST = [
  { name: 'Sumatriptan 100mg', route: 'PO', frequency: 'PRN', purpose: 'Migraine', prescriber: 'Dr. Reed', since: '03/2019', status: 'Active' },
  { name: 'Lisinopril 10mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '06/2023', status: 'Active' },
  { name: 'Loratadine 10mg', route: 'PO', frequency: 'Daily', purpose: 'Allergies', prescriber: 'Dr. Reed', since: '04/2015', status: 'Active' },
  { name: 'Oral Contraceptive', route: 'PO', frequency: 'Daily', purpose: 'Contraception', prescriber: 'Dr. Patel', since: '01/2018', status: 'Active' },
  { name: 'Ibuprofen 400mg', route: 'PO', frequency: 'PRN', purpose: 'Headache', prescriber: 'OTC', since: '2023', status: 'Active' },
];

const ALLERGIES = [
  { substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' },
  { substance: 'Codeine', reaction: 'Nausea/vomiting', severity: 'Mild' },
];

const RECENT_LABS = [
  { date: '01/15/2026', test: 'CBC', result: 'WNL', flag: '' },
  { date: '01/15/2026', test: 'BMP', result: 'WNL', flag: '' },
  { date: '01/15/2026', test: 'Lipid Panel', result: 'LDL 142 mg/dL', flag: 'High' },
  { date: '01/15/2026', test: 'TSH', result: '2.1 mIU/L', flag: '' },
  { date: '01/15/2026', test: 'HbA1c', result: '5.4%', flag: '' },
];

const AMBIENT_TRANSCRIPT_LINES = [
  { time: '0:00', speaker: 'Dr. Reed', text: 'Good morning, Sarah. I see you\'re here for a severe headache. Can you tell me more about when it started?' },
  { time: '0:15', speaker: 'Patient', text: 'It started about three days ago. I was at work and suddenly this terrible headache hit me. It\'s the worst headache I\'ve ever had.' },
  { time: '0:32', speaker: 'Dr. Reed', text: 'And the pain -- can you describe the quality? Is it throbbing, sharp, pressure-like?' },
  { time: '0:40', speaker: 'Patient', text: 'It\'s pulsating, mainly on the right side of my head, around my temple and behind my eye.' },
  { time: '0:52', speaker: 'Dr. Reed', text: 'Any nausea, vomiting, or sensitivity to light or sound?' },
  { time: '0:58', speaker: 'Patient', text: 'Yes, definitely nauseous, and lights really bother me. I\'ve been staying in a dark room mostly.' },
  { time: '1:10', speaker: 'Dr. Reed', text: 'Have you tried anything for the pain?' },
  { time: '1:15', speaker: 'Patient', text: 'I took some ibuprofen but it barely touched it.' },
];

const EXTRACTED_ENTITIES = [
  { type: 'Symptom', text: 'Severe headache', time: '0:15' },
  { type: 'Symptom', text: 'Pulsating quality', time: '0:40' },
  { type: 'Location', text: 'Right temporal/retro-orbital', time: '0:40' },
  { type: 'Symptom', text: 'Nausea', time: '0:58' },
  { type: 'Symptom', text: 'Photophobia', time: '0:58' },
  { type: 'Medication', text: 'Ibuprofen (ineffective)', time: '1:15' },
];

// ============================================================
// Scenario 2: James Rodriguez (Chest Pain)
// ============================================================
const PATIENT_2 = {
  name: 'James Rodriguez',
  initials: 'JR',
  age: 62,
  gender: 'Male',
  mrn: 'MRN-2024-0892',
  dob: '09/03/1963',
  appointmentTime: '2:15 PM',
  appointmentDate: 'March 7, 2026',
  insurance: 'Medicare Advantage',
  primaryCare: 'Dr. Thomas Reed',
};

const VITALS_2 = [
  { label: 'BP', value: '158/94', unit: 'mmHg', icon: Heart, status: 'high' as const },
  { label: 'HR', value: '96', unit: 'bpm', icon: Activity, status: 'elevated' as const },
  { label: 'Temp', value: '98.4', unit: '\u00B0F', icon: Thermometer, status: 'normal' as const },
  { label: 'RR', value: '22', unit: '/min', icon: Wind, status: 'elevated' as const },
  { label: 'SpO2', value: '94', unit: '%', icon: Droplets, status: 'high' as const },
  { label: 'Pain', value: '7', unit: '/10', icon: AlertTriangle, status: 'high' as const },
];

const CURRENT_MEDICATIONS_2 = [
  { name: 'Metformin 1000mg', frequency: 'BID', duration: 'Since 2015' },
  { name: 'Aspirin 81mg', frequency: 'Daily', duration: 'Since 2012' },
  { name: 'Metoprolol 50mg', frequency: 'BID', duration: 'Since 2018' },
  { name: 'Atorvastatin 40mg', frequency: 'Daily', duration: 'Since 2012' },
  { name: 'Lisinopril 20mg', frequency: 'Daily', duration: 'Since 2010' },
];

const INITIAL_DIAGNOSES_2: Diagnosis[] = [
  {
    name: 'Acute Coronary Syndrome',
    icdCode: 'I21.9',
    probability: 0.65,
    category: 'Chest Pain',
    evidence: 'Patient presents with substernal chest pressure radiating to left arm, diaphoresis, and exertional worsening. Multiple cardiac risk factors including DM2, hyperlipidemia, HTN, and significant smoking history. Family history of early MI.',
    findings: [
      { name: 'Substernal pressure', state: 'present' },
      { name: 'Radiation to left arm', state: 'present' },
      { name: 'Diaphoresis', state: 'present' },
      { name: 'Exertional component', state: 'present' },
      { name: 'Cardiac risk factors', state: 'present' },
      { name: 'Troponin elevation', state: 'unknown' },
    ],
  },
  {
    name: 'Pulmonary Embolism',
    icdCode: 'I26.99',
    probability: 0.15,
    category: 'Chest Pain',
    evidence: 'Dyspnea, tachycardia, and hypoxia (SpO2 94%) present. Chest pain could be pleuritic. However, radiation pattern and diaphoresis favor cardiac etiology.',
    findings: [
      { name: 'Dyspnea', state: 'present' },
      { name: 'Tachycardia', state: 'present' },
      { name: 'Hypoxia', state: 'present' },
      { name: 'Chest pain', state: 'present' },
      { name: 'Unilateral leg swelling', state: 'unknown' },
      { name: 'Pleuritic quality', state: 'absent' },
    ],
  },
  {
    name: 'Unstable Angina',
    icdCode: 'I20.0',
    probability: 0.12,
    category: 'Chest Pain',
    evidence: 'Exertional chest pain with multiple risk factors and reproducible pattern. May represent crescendo angina if prior episodes occurred. Differentiation from ACS requires troponin and ECG.',
    findings: [
      { name: 'Exertional chest pain', state: 'present' },
      { name: 'Risk factors present', state: 'present' },
      { name: 'Reproducible pattern', state: 'unknown' },
      { name: 'Prior angina episodes', state: 'unknown' },
      { name: 'Relief with rest', state: 'unknown' },
    ],
  },
  {
    name: 'Aortic Dissection',
    icdCode: 'I71.01',
    probability: 0.05,
    category: 'Chest Pain',
    evidence: 'Severe chest pain with hypertension present. However, pain described as pressure rather than tearing, and no pulse deficit or mediastinal widening noted.',
    findings: [
      { name: 'Severe chest pain', state: 'present' },
      { name: 'Hypertension', state: 'present' },
      { name: 'Tearing quality', state: 'absent' },
      { name: 'Pulse deficit', state: 'unknown' },
      { name: 'Back pain radiation', state: 'absent' },
    ],
  },
  {
    name: 'Musculoskeletal',
    icdCode: 'M79.3',
    probability: 0.03,
    category: 'Chest Pain',
    evidence: 'Chest wall tenderness would support this diagnosis. However, associated symptoms (diaphoresis, dyspnea, radiation) and risk factor profile make this unlikely.',
    findings: [
      { name: 'Chest wall tenderness', state: 'unknown' },
      { name: 'Reproducible with palpation', state: 'unknown' },
      { name: 'No associated symptoms', state: 'absent' },
      { name: 'Recent physical exertion', state: 'unknown' },
    ],
  },
];

const TREATMENT_PLANS_2: TreatmentPlan[] = [
  {
    diagnosis: 'Acute Coronary Syndrome',
    medications: [
      { name: 'Heparin', dose: '60 units/kg bolus then 12 units/kg/hr', route: 'IV', frequency: 'Continuous drip', inStock: true, quantity: 50 },
      { name: 'Nitroglycerin', dose: '0.4mg', route: 'SL', frequency: 'Q5min x3 PRN chest pain', inStock: true, quantity: 100 },
      { name: 'Morphine', dose: '2-4mg', route: 'IV', frequency: 'Q5-15min PRN severe pain', inStock: true, quantity: 30 },
      { name: 'Clopidogrel', dose: '300mg loading then 75mg', route: 'PO', frequency: 'Daily', inStock: true, quantity: 90 },
      { name: 'Atorvastatin', dose: '80mg', route: 'PO', frequency: 'Daily (high-intensity)', inStock: true, quantity: 90 },
    ],
    nonPharm: ['STAT 12-lead ECG', 'Serial troponins Q3H x3', 'Continuous telemetry', 'Cardiology consult', 'NPO for possible cath lab'],
    ordered: [false, false, false, false, false],
  },
  {
    diagnosis: 'Pulmonary Embolism',
    medications: [
      { name: 'Enoxaparin', dose: '1mg/kg', route: 'SQ', frequency: 'BID', inStock: true, quantity: 40 },
      { name: 'Alteplase', dose: '100mg', route: 'IV', frequency: 'Over 2 hours (if massive PE)', inStock: false, alternative: 'Available via pharmacy order (2h)' },
    ],
    nonPharm: ['CT Pulmonary Angiography', 'D-dimer if low clinical suspicion', 'Lower extremity doppler', 'Supplemental O2 to maintain SpO2 >94%'],
    ordered: [false, false],
  },
  {
    diagnosis: 'Aortic Dissection',
    medications: [
      { name: 'Esmolol', dose: '500mcg/kg bolus then 50-200mcg/kg/min', route: 'IV', frequency: 'Continuous', inStock: true, quantity: 10 },
      { name: 'Nicardipine', dose: '5-15mg/hr', route: 'IV', frequency: 'Continuous (target SBP <120)', inStock: true, quantity: 15 },
    ],
    nonPharm: ['STAT CT Angiography chest/abdomen/pelvis', 'Cardiothoracic surgery consult', 'Type and screen 6 units pRBC', 'Bilateral arm BPs'],
    ordered: [false, false],
  },
];

const PHARMACY_INVENTORY_2 = [
  { name: 'Heparin drip', inStock: true, quantity: 50 },
  { name: 'Nitroglycerin 0.4mg SL', inStock: true, quantity: 100 },
  { name: 'Morphine 4mg/mL', inStock: true, quantity: 30 },
  { name: 'Clopidogrel 75mg', inStock: true, quantity: 90 },
  { name: 'Atorvastatin 80mg', inStock: true, quantity: 90 },
  { name: 'Enoxaparin 80mg', inStock: true, quantity: 40 },
  { name: 'Esmolol drip', inStock: true, quantity: 10 },
  { name: 'Alteplase 100mg', inStock: false, quantity: 0 },
];

const SOAP_NOTE_2 = {
  subjective: `62-year-old male presents with chief complaint of "chest pain and shortness of breath for 2 days." Patient describes substernal chest pressure radiating to the left arm, worse with exertion, associated with dyspnea and diaphoresis. Pain rated 7/10, intermittent but increasing in frequency. No relief with rest. Denies palpitations, syncope, or leg swelling. History of type 2 diabetes (since 2015), hyperlipidemia (2012), hypertension (2010), GERD, peripheral neuropathy, and depression. 30-pack-year smoking history, quit 2 years ago. Father died of MI at age 58.

Current medications: Metformin 1000mg BID, Glipizide 10mg daily, Atorvastatin 40mg daily, Lisinopril 20mg daily, Aspirin 81mg daily, Metoprolol 50mg BID, Omeprazole 20mg daily, Gabapentin 300mg TID, Duloxetine 60mg daily, Amlodipine 5mg daily, Jardiance 10mg daily, Fish Oil 1000mg daily.
Allergies: Sulfa drugs (rash), Codeine (nausea/vomiting), Latex (contact dermatitis).`,

  objective: `Vitals: BP 158/94 mmHg, HR 96 bpm, Temp 98.4\u00B0F, RR 22/min, SpO2 94% on RA, Pain 7/10

General: Alert, oriented x4, appears anxious, mild diaphoresis noted
HEENT: Atraumatic, no JVD at 30 degrees
Neck: No carotid bruits, no lymphadenopathy
Cardiovascular: Regular rate and rhythm, S1/S2 present, no S3/S4, no murmurs, no rubs; bilateral radial pulses 2+ symmetric
Respiratory: Tachypneic, clear to auscultation bilaterally, no wheezes/crackles
Abdomen: Soft, non-tender, no organomegaly
Extremities: No edema, no calf tenderness, pedal pulses intact bilaterally
Neuro: Alert, oriented x4, no focal deficits`,

  assessment: `1. Acute chest pain -- differential includes ACS (most likely, 65%), pulmonary embolism (15%), unstable angina (12%), aortic dissection (5% but must rule out)
2. Hypertension -- acutely elevated, likely pain/stress related but requires urgent management
3. Hypoxia -- SpO2 94%, concerning in setting of chest pain; needs supplemental O2
4. Multiple cardiac risk factors -- DM2, HLD, HTN, former smoker, FHx early MI`,

  plan: `1. STAT 12-lead ECG
2. Serial troponins Q3H x3
3. Continuous telemetry monitoring
4. Aspirin 325mg PO x1 (already on 81mg daily)
5. Nitroglycerin 0.4mg SL PRN chest pain
6. Heparin drip per ACS protocol if troponin elevated
7. Supplemental O2 via NC to maintain SpO2 >95%
8. Cardiology consult for possible cardiac catheterization
9. Hold Metformin (contrast risk)
10. BMP, CBC, Coag panel, BNP, lipid panel
11. CXR portable
12. Return precautions: worsening pain, dyspnea, syncope, diaphoresis`,
};

const BILLING_CODES_2 = [
  { code: '99215', description: 'Office visit, established patient, high complexity', selected: true },
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', selected: true },
  { code: '93000', description: '12-lead ECG with interpretation', selected: true },
  { code: 'R07.9', description: 'Chest pain, unspecified', selected: false },
  { code: 'I10', description: 'Essential hypertension', selected: false },
];

const PAST_VISITS_2 = [
  { date: '01/08/2026', complaint: 'Diabetes follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'DM2 controlled, A1c 7.2%', notes: 'Adjusted Glipizide from 5mg to 10mg. Added Jardiance 10mg for cardiovascular benefit. Foot exam normal.' },
  { date: '10/15/2025', complaint: 'HTN follow-up', provider: 'Dr. Thomas Reed', diagnosis: 'Hypertension - suboptimal control', notes: 'BP 148/90. Added Amlodipine 5mg to regimen. Dietary counseling provided.' },
  { date: '07/22/2025', complaint: 'Peripheral neuropathy', provider: 'Dr. Thomas Reed', diagnosis: 'Diabetic peripheral neuropathy', notes: 'Started Gabapentin 300mg TID. Nerve conduction study ordered.' },
  { date: '04/10/2025', complaint: 'Depression screening', provider: 'Dr. Thomas Reed', diagnosis: 'Major depressive disorder, moderate', notes: 'PHQ-9 score 14. Started Duloxetine 60mg daily. Referral to counseling.' },
  { date: '01/20/2025', complaint: 'Annual physical', provider: 'Dr. Thomas Reed', diagnosis: 'Routine exam - multiple chronic conditions', notes: 'A1c 7.8%, LDL 128, BP 144/88. Smoking cessation counseling, quit date set. Cardiac stress test recommended.' },
];

const CHRONIC_CONDITIONS_2 = [
  { name: 'Type 2 Diabetes Mellitus', since: '2015', status: 'Active' },
  { name: 'Hyperlipidemia', since: '2012', status: 'Active' },
  { name: 'Essential Hypertension', since: '2010', status: 'Active' },
  { name: 'GERD', since: '2018', status: 'Active' },
  { name: 'Diabetic Peripheral Neuropathy', since: '2025', status: 'Active' },
  { name: 'Major Depressive Disorder', since: '2025', status: 'Active' },
];

const SURGICAL_HISTORY_2 = [
  { procedure: 'Right inguinal hernia repair', date: '2008', notes: 'Open repair, uncomplicated' },
  { procedure: 'Cholecystectomy', date: '2016', notes: 'Laparoscopic, symptomatic gallstones' },
];

const FAMILY_HISTORY_2 = [
  { relation: 'Father', conditions: 'MI at age 58 (deceased), Hypertension, Hyperlipidemia' },
  { relation: 'Mother', conditions: 'Type 2 Diabetes, Hypertension, alive age 84' },
  { relation: 'Brother', conditions: 'CABG at age 59, Type 2 Diabetes' },
];

const SOCIAL_HISTORY_2 = {
  occupation: 'Retired construction worker',
  tobacco: '30-pack-year history, quit 2 years ago',
  alcohol: 'Occasional, 1-2 beers/week',
  exercise: 'Limited \u2014 walks 10 min/day',
  diet: 'High sodium, working on changes',
  stress: 'Moderate \u2014 adjusting to retirement',
  sleep: '5-6 hours/night, snores (no formal OSA eval)',
};

const AI_PRIOR_VISIT_INSIGHTS_2 = [
  {
    type: 'prior_visit' as const,
    title: 'Diabetes Follow-up \u2014 01/08/2026',
    detail: 'A1c 7.2%, Jardiance added for CV benefit. No cardiac complaints at that visit.',
    relevance: 'high' as const,
    aiNote: 'Jardiance was added for cardiovascular risk reduction \u2014 prescient given today\'s presentation. A1c well-controlled. Metformin should be held if contrast studies needed.',
  },
  {
    type: 'prior_visit' as const,
    title: 'HTN Follow-up \u2014 10/15/2025',
    detail: 'BP was 148/90, Amlodipine added. Patient reported occasional exertional dyspnea at that visit.',
    relevance: 'high' as const,
    aiNote: 'Exertional dyspnea was documented 5 months ago \u2014 may have been early anginal equivalent. BP remains suboptimally controlled today at 158/94.',
  },
  {
    type: 'medication' as const,
    title: 'Polypharmacy Review \u2014 12 Active Medications',
    detail: 'Patient is on 12 medications across 6 conditions. Multiple drug interactions possible.',
    relevance: 'medium' as const,
    aiNote: 'Key interactions: Metformin hold if contrast planned. Aspirin already on board (good). Metoprolol may mask tachycardia as a sign of deterioration. Duloxetine + cardiac meds need monitoring.',
  },
  {
    type: 'family' as const,
    title: 'Family History: Premature CAD',
    detail: 'Father died of MI at 58. Brother had CABG at 59. Mother has DM2 and HTN.',
    relevance: 'high' as const,
    aiNote: 'Strong family history of premature coronary artery disease. Combined with patient\'s own risk factors (DM2, HTN, HLD, smoking hx), this patient has extremely high pre-test probability for ACS.',
  },
];

const AI_DRUG_INTERACTIONS_2 = [
  {
    severity: 'warning' as const,
    drugs: ['Metformin', 'IV Contrast'],
    detail: 'Hold Metformin 48 hours before and after contrast administration. Risk of lactic acidosis, especially with renal impairment.',
  },
  {
    severity: 'warning' as const,
    drugs: ['Heparin', 'Aspirin'],
    detail: 'Increased bleeding risk. Monitor closely. Necessary in ACS protocol but watch for signs of hemorrhage.',
  },
  {
    severity: 'caution' as const,
    drugs: ['Metoprolol', 'Amlodipine'],
    detail: 'Additive hypotensive and bradycardic effects. Monitor HR and BP closely during acute management.',
  },
  {
    severity: 'info' as const,
    drugs: ['Duloxetine', 'Morphine'],
    detail: 'Serotonergic and CNS depressant interaction. Use lowest effective morphine dose. Monitor for serotonin syndrome signs.',
  },
];

const AI_VITALS_TREND_2 = [
  { date: '01/2025', bp: '144/88', label: 'Stage 1 HTN' },
  { date: '04/2025', bp: '140/86', label: 'Stage 1 HTN' },
  { date: '07/2025', bp: '146/90', label: 'Stage 2 HTN' },
  { date: '10/2025', bp: '148/90', label: 'Stage 2 HTN' },
  { date: 'Today', bp: '158/94', label: 'Stage 2 HTN' },
];

const FULL_MEDICATION_LIST_2 = [
  { name: 'Metformin 1000mg', route: 'PO', frequency: 'BID', purpose: 'Type 2 Diabetes', prescriber: 'Dr. Reed', since: '03/2015', status: 'Active' },
  { name: 'Glipizide 10mg', route: 'PO', frequency: 'Daily', purpose: 'Type 2 Diabetes', prescriber: 'Dr. Reed', since: '01/2026', status: 'Active' },
  { name: 'Atorvastatin 40mg', route: 'PO', frequency: 'Daily', purpose: 'Hyperlipidemia', prescriber: 'Dr. Reed', since: '06/2012', status: 'Active' },
  { name: 'Lisinopril 20mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '09/2010', status: 'Active' },
  { name: 'Aspirin 81mg', route: 'PO', frequency: 'Daily', purpose: 'Cardiac prophylaxis', prescriber: 'Dr. Reed', since: '06/2012', status: 'Active' },
  { name: 'Metoprolol 50mg', route: 'PO', frequency: 'BID', purpose: 'Hypertension / Rate control', prescriber: 'Dr. Reed', since: '03/2018', status: 'Active' },
  { name: 'Omeprazole 20mg', route: 'PO', frequency: 'Daily', purpose: 'GERD', prescriber: 'Dr. Reed', since: '05/2018', status: 'Active' },
  { name: 'Gabapentin 300mg', route: 'PO', frequency: 'TID', purpose: 'Peripheral neuropathy', prescriber: 'Dr. Reed', since: '07/2025', status: 'Active' },
  { name: 'Duloxetine 60mg', route: 'PO', frequency: 'Daily', purpose: 'Depression / Neuropathy', prescriber: 'Dr. Reed', since: '04/2025', status: 'Active' },
  { name: 'Amlodipine 5mg', route: 'PO', frequency: 'Daily', purpose: 'Hypertension', prescriber: 'Dr. Reed', since: '10/2025', status: 'Active' },
  { name: 'Jardiance 10mg', route: 'PO', frequency: 'Daily', purpose: 'DM2 / CV risk reduction', prescriber: 'Dr. Reed', since: '01/2026', status: 'Active' },
  { name: 'Fish Oil 1000mg', route: 'PO', frequency: 'Daily', purpose: 'Lipid support', prescriber: 'OTC', since: '2020', status: 'Active' },
];

const ALLERGIES_2 = [
  { substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' },
  { substance: 'Codeine', reaction: 'Nausea/vomiting', severity: 'Mild' },
  { substance: 'Latex', reaction: 'Contact dermatitis', severity: 'Moderate' },
];

const RECENT_LABS_2 = [
  { date: '01/08/2026', test: 'HbA1c', result: '7.2%', flag: 'High' },
  { date: '01/08/2026', test: 'BMP', result: 'Creatinine 1.3', flag: 'High' },
  { date: '01/08/2026', test: 'Lipid Panel', result: 'LDL 98 mg/dL', flag: '' },
  { date: '01/08/2026', test: 'CBC', result: 'WNL', flag: '' },
  { date: '01/08/2026', test: 'eGFR', result: '58 mL/min', flag: 'Low' },
  { date: '01/08/2026', test: 'BNP', result: '89 pg/mL', flag: '' },
];

const AMBIENT_TRANSCRIPT_LINES_2 = [
  { time: '0:00', speaker: 'Dr. Reed', text: 'Good afternoon, James. I understand you\'ve been having chest pain. Tell me about it.' },
  { time: '0:18', speaker: 'Patient', text: 'It started two days ago. This pressure right in the center of my chest. It\'s been coming and going but getting worse.' },
  { time: '0:35', speaker: 'Dr. Reed', text: 'Does the pain go anywhere else? To your arm, jaw, or back?' },
  { time: '0:42', speaker: 'Patient', text: 'Yeah, it goes down my left arm. And I\'ve been sweating a lot, even when I\'m not doing anything.' },
  { time: '0:55', speaker: 'Dr. Reed', text: 'Any shortness of breath, dizziness, or nausea?' },
  { time: '1:02', speaker: 'Patient', text: 'Shortness of breath for sure. I couldn\'t even walk to the mailbox yesterday without getting winded.' },
  { time: '1:15', speaker: 'Dr. Reed', text: 'And you have a history of diabetes and high blood pressure, correct? Your father had a heart attack at 58?' },
  { time: '1:25', speaker: 'Patient', text: 'Yes, he passed from it. My brother had bypass surgery two years ago too.' },
];

const EXTRACTED_ENTITIES_2 = [
  { type: 'Symptom', text: 'Substernal chest pressure', time: '0:18' },
  { type: 'Symptom', text: 'Progressive worsening', time: '0:18' },
  { type: 'Symptom', text: 'Left arm radiation', time: '0:42' },
  { type: 'Symptom', text: 'Diaphoresis', time: '0:42' },
  { type: 'Symptom', text: 'Dyspnea on exertion', time: '1:02' },
  { type: 'Family', text: 'Father MI at 58', time: '1:25' },
  { type: 'Family', text: 'Brother CABG', time: '1:25' },
];

// ============================================================
// PATIENT_SCENARIOS -- wrapper for both demo patients
// ============================================================
export const PATIENT_SCENARIOS = {
  sarahChen: {
    label: 'Sarah Chen \u2014 Headache',
    patient: PATIENT,
    vitals: VITALS,
    currentMedications: CURRENT_MEDICATIONS,
    initialDiagnoses: INITIAL_DIAGNOSES,
    treatmentPlans: TREATMENT_PLANS,
    pharmacyInventory: PHARMACY_INVENTORY,
    soapNote: SOAP_NOTE,
    billingCodes: BILLING_CODES,
    pastVisits: PAST_VISITS,
    chronicConditions: CHRONIC_CONDITIONS,
    surgicalHistory: SURGICAL_HISTORY,
    familyHistory: FAMILY_HISTORY,
    socialHistory: SOCIAL_HISTORY,
    aiPriorVisitInsights: AI_PRIOR_VISIT_INSIGHTS,
    aiDrugInteractions: AI_DRUG_INTERACTIONS,
    aiVitalsTrend: AI_VITALS_TREND,
    fullMedicationList: FULL_MEDICATION_LIST,
    allergies: ALLERGIES,
    recentLabs: RECENT_LABS,
    ambientTranscriptLines: AMBIENT_TRANSCRIPT_LINES,
    extractedEntities: EXTRACTED_ENTITIES,
    presentationNarrative: '38-year-old female presenting with \u201cthe worst headache of my life,\u201d sudden onset 3 days ago while at work. Pain is right temporal/frontal, pulsating, continuous, rated 9/10. Associated with nausea, photophobia, and phonophobia. Ibuprofen 400mg provided no relief. Patient has a history of migraine with aura (diagnosed 2019) and stage 1 hypertension (2023). Family history significant for maternal migraine, HTN, and DM2; paternal CAD; grandmother with stroke at 72. Non-smoker, moderate alcohol use. Currently on Lisinopril 10mg daily and Sumatriptan 50mg PRN.',
    redFlags: ['Thunderclap onset', '"Worst headache"', 'Elevated BP', 'FHx stroke'],
    complaintCategories: ['Headache', 'Hypertension'],
    differentialHistory: '<div style="margin-bottom: 6px"><strong style="color: #0C3547">PMH:</strong> Migraine w/ aura (2019), HTN Stage 1 (2023)</div><div style="margin-bottom: 6px"><strong style="color: #0C3547">FHx:</strong> Mother \u2014 migraine, HTN, DM2; Father \u2014 CAD; Grandmother \u2014 stroke @ 72</div><div><strong style="color: #0C3547">Social:</strong> Software eng, non-smoker, high stress, 6-7hr sleep</div>',
  },
  jamesRodriguez: {
    label: 'James Rodriguez \u2014 Chest Pain',
    patient: PATIENT_2,
    vitals: VITALS_2,
    currentMedications: CURRENT_MEDICATIONS_2,
    initialDiagnoses: INITIAL_DIAGNOSES_2,
    treatmentPlans: TREATMENT_PLANS_2,
    pharmacyInventory: PHARMACY_INVENTORY_2,
    soapNote: SOAP_NOTE_2,
    billingCodes: BILLING_CODES_2,
    pastVisits: PAST_VISITS_2,
    chronicConditions: CHRONIC_CONDITIONS_2,
    surgicalHistory: SURGICAL_HISTORY_2,
    familyHistory: FAMILY_HISTORY_2,
    socialHistory: SOCIAL_HISTORY_2,
    aiPriorVisitInsights: AI_PRIOR_VISIT_INSIGHTS_2,
    aiDrugInteractions: AI_DRUG_INTERACTIONS_2,
    aiVitalsTrend: AI_VITALS_TREND_2,
    fullMedicationList: FULL_MEDICATION_LIST_2,
    allergies: ALLERGIES_2,
    recentLabs: RECENT_LABS_2,
    ambientTranscriptLines: AMBIENT_TRANSCRIPT_LINES_2,
    extractedEntities: EXTRACTED_ENTITIES_2,
    presentationNarrative: '62-year-old male with 2-day history of substernal chest pressure radiating to left arm, worse with exertion, associated with dyspnea and diaphoresis. Pain rated 7/10, intermittent but increasing in frequency and severity. No relief with rest or position change. History of type 2 diabetes (A1c 7.2%), hyperlipidemia on statin therapy, hypertension on triple-agent regimen, and 30-pack-year smoking history (quit 2 years ago). Father died of MI at 58, brother had CABG at 59. Currently on 12 medications including Metformin, Glipizide, Atorvastatin, Lisinopril, Aspirin, Metoprolol, Amlodipine, Jardiance, Omeprazole, Gabapentin, Duloxetine, and Fish Oil. SpO2 94% on room air is concerning for acute cardiopulmonary process.',
    redFlags: ['Substernal chest pain', 'Radiation to arm', 'Diaphoresis', 'FHx MI <60', 'Smoking history'],
    complaintCategories: ['Chest Pain'],
    differentialHistory: '<div style="margin-bottom: 6px"><strong style="color: #0C3547">PMH:</strong> DM2 (2015), HLD (2012), HTN (2010), GERD, Peripheral neuropathy, Depression</div><div style="margin-bottom: 6px"><strong style="color: #0C3547">FHx:</strong> Father \u2014 MI at 58 (deceased); Mother \u2014 DM2, HTN; Brother \u2014 CABG at 59</div><div><strong style="color: #0C3547">Social:</strong> Retired construction, 30-pk-yr smoker (quit 2y), occasional alcohol</div>',
  },
};

export type ScenarioKey = keyof typeof PATIENT_SCENARIOS;
