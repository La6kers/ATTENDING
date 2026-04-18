#!/usr/bin/env node
// ============================================================
// NHAMCS 2019 ED → COMPASS case schema ingester
//
// Parses the CDC NHAMCS 2019 ED public-use file (fixed-width ASCII),
// maps RFV codes → English chief complaints and ICD-10 truncated
// codes → canonical COMPASS diagnosis labels.
//
// Focuses on the ~40 most common primary-complaint → diagnosis pairs
// that have clean mappings to COMPASS conditions. Skips visits where
// neither RFV1 nor DIAG1 map cleanly.
//
// Usage:
//   node ingest-nhamcs.mjs --n 300 --seed 42 --out cases-nhamcs-300.json
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'datasets', 'nhamcs');

const getArg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};
const N = parseInt(getArg('n', '300'), 10);
const SEED = parseInt(getArg('seed', '42'), 10);
const OUT = getArg('out', join(__dirname, '..', 'cases-nhamcs.json'));

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- Theme tags used to require CC↔Dx to be in the same body system ----
const THEME = {
  CV: 'cardiovascular',
  PULM: 'pulmonary',
  GI: 'gastrointestinal',
  GU: 'genitourinary',
  NEURO: 'neurologic',
  MSK: 'musculoskeletal',
  SKIN: 'skin',
  GEN: 'general',
  ENT: 'ent',
  PSYCH: 'psych',
  OBGYN: 'obgyn',
  INJURY: 'injury',
};

// ---- RFV → { cc, theme } (top codes from NHAMCS classification) ----
// Module 1: Symptoms. Source: NHAMCS RFV Classification 2019 codebook.
const RFV_TO_CC_RAW = {
  // Cardiovascular
  '10500': ['my chest hurts real bad', THEME.CV],
  '10501': ['chest pain that feels tight', THEME.CV],
  '10502': ['chest feels heavy and pressure', THEME.CV],
  '10650': ['my heart is pounding and racing', THEME.CV],
  '10400': ['feel lightheaded and dizzy', THEME.CV],
  '14500': ['my legs are swelling up', THEME.CV],

  // Respiratory
  '14650': ['cant catch my breath', THEME.PULM],
  '14651': ['shortness of breath', THEME.PULM],
  '14751': ['wheezing and cant breathe', THEME.PULM],
  '14400': ['coughing bad', THEME.PULM],
  '14450': ['cough with green phlegm', THEME.PULM],
  '14460': ['coughing up blood', THEME.PULM],
  '14550': ['sore throat killing me', THEME.ENT],

  // Abdominal / GI
  '15000': ['my belly hurts', THEME.GI],
  '15050': ['stomach pain wont stop', THEME.GI],
  '15075': ['stomach feels cramping', THEME.GI],
  '15100': ['lower right belly hurt bad', THEME.GI],
  '15150': ['upper belly pain', THEME.GI],
  '15200': ['keep throwing up', THEME.GI],
  '15250': ['nausea and vomiting', THEME.GI],
  '15300': ['diarrhea wont stop', THEME.GI],
  '15400': ['bleeding from the rectum', THEME.GI],
  '15450': ['tarry black stool', THEME.GI],

  // GU
  '16000': ['burning when i pee', THEME.GU],
  '16100': ['blood in my urine', THEME.GU],
  '16200': ['cant pee', THEME.GU],
  '16250': ['low belly pain and urinating a lot', THEME.GU],

  // Neuro
  '12100': ['worst headache of my life', THEME.NEURO],
  '12150': ['head throbbing', THEME.NEURO],
  '12200': ['feel dizzy', THEME.NEURO],
  '12300': ['feel confused', THEME.NEURO],
  '12400': ['had a seizure', THEME.NEURO],
  '12500': ['fainted', THEME.NEURO],
  '12600': ['weak on one side', THEME.NEURO],
  '12650': ['face drooping and arm weak', THEME.NEURO],

  // MSK
  '19000': ['back pain killing me', THEME.MSK],
  '19100': ['neck pain', THEME.MSK],
  '19200': ['knee hurts bad', THEME.MSK],
  '19300': ['ankle twisted', THEME.MSK],
  '19400': ['arm hurts after fall', THEME.MSK],

  // Skin
  '18000': ['rash on my skin', THEME.SKIN],
  '18050': ['skin red and hot and swollen', THEME.SKIN],
  '18100': ['sore that wont heal', THEME.SKIN],
  '18200': ['cut that needs stitches', THEME.SKIN],

  // General / infectious
  '10000': ['been running a fever', THEME.GEN],
  '10050': ['fever and chills', THEME.GEN],
  '10100': ['feel exhausted', THEME.GEN],
  '10200': ['feel weak all over', THEME.GEN],

  // ENT
  '11000': ['ear pain', THEME.ENT],
  '11100': ['runny nose and stuffy', THEME.ENT],
  '11200': ['eye red and watery', THEME.ENT],

  // Psych
  '23000': ['feeling really anxious', THEME.PSYCH],
  '23100': ['feel suicidal', THEME.PSYCH],
  '23200': ['cant sleep and racing thoughts', THEME.PSYCH],

  // Injury
  '55000': ['fell and hurt myself', THEME.INJURY],
  '55100': ['car accident', THEME.INJURY],
  '55200': ['injured playing sports', THEME.INJURY],
};

// ---- ICD-10 prefix → { condition, theme } ----
// Focuses on common ED diagnoses with clear COMPASS mappings.
const ICD_TO_CONDITION_RAW = {
  // Circulatory (I) — CV
  'I21': ['Acute Myocardial Infarction', THEME.CV],
  'I22': ['Acute Myocardial Infarction', THEME.CV],
  'I24': ['Acute Coronary Syndrome', THEME.CV],
  'I25': ['Stable Angina', THEME.CV],
  'I20': ['Unstable Angina', THEME.CV],
  'I48': ['Atrial Fibrillation', THEME.CV],
  'I47': ['Supraventricular Tachycardia', THEME.CV],
  'I50': ['Congestive Heart Failure', THEME.CV],
  'I51': ['Congestive Heart Failure', THEME.CV],
  'I26': ['Pulmonary Embolism', THEME.PULM],
  'I80': ['Deep Vein Thrombosis', THEME.CV],
  'I82': ['Deep Vein Thrombosis', THEME.CV],
  'I63': ['Ischemic Stroke', THEME.NEURO],
  'I61': ['Intracranial Hemorrhage', THEME.NEURO],
  'I60': ['Subarachnoid Hemorrhage', THEME.NEURO],
  'I10': ['Hypertension', THEME.CV],
  'I16': ['Hypertensive Emergency', THEME.CV],
  'I30': ['Pericarditis', THEME.CV],
  'I40': ['Myocarditis', THEME.CV],

  // Respiratory (J) — PULM / ENT
  'J18': ['Pneumonia', THEME.PULM],
  'J13': ['Pneumonia', THEME.PULM],
  'J15': ['Pneumonia', THEME.PULM],
  'J44': ['COPD exacerbation', THEME.PULM],
  'J45': ['Asthma Exacerbation', THEME.PULM],
  'J46': ['Asthma Exacerbation', THEME.PULM],
  'J93': ['Pneumothorax', THEME.PULM],
  'J96': ['Respiratory Failure', THEME.PULM],
  'J06': ['Upper Respiratory Infection', THEME.ENT],
  'J00': ['Upper Respiratory Infection', THEME.ENT],
  'J01': ['Acute Sinusitis', THEME.ENT],
  'J02': ['Pharyngitis', THEME.ENT],
  'J03': ['Pharyngitis', THEME.ENT],
  'J20': ['Acute Bronchitis', THEME.PULM],
  'J21': ['Bronchiolitis', THEME.PULM],
  'J11': ['Influenza', THEME.GEN],
  'J10': ['Influenza', THEME.GEN],
  'J38': ['Acute Laryngitis', THEME.ENT],
  'J05': ['Croup', THEME.ENT],

  // Digestive (K) — GI
  'K35': ['Appendicitis', THEME.GI],
  'K37': ['Appendicitis', THEME.GI],
  'K80': ['Cholelithiasis', THEME.GI],
  'K81': ['Cholecystitis', THEME.GI],
  'K85': ['Acute Pancreatitis', THEME.GI],
  'K29': ['Gastritis', THEME.GI],
  'K21': ['GERD', THEME.GI],
  'K52': ['Gastroenteritis', THEME.GI],
  'K92': ['Gastrointestinal Bleeding', THEME.GI],
  'K57': ['Diverticulitis', THEME.GI],
  'K40': ['Inguinal Hernia', THEME.GI],
  'K56': ['Small Bowel Obstruction', THEME.GI],

  // Genitourinary (N) — GU
  'N39': ['Urinary Tract Infection', THEME.GU],
  'N30': ['Cystitis', THEME.GU],
  'N10': ['Pyelonephritis', THEME.GU],
  'N20': ['Kidney Stone', THEME.GU],
  'N23': ['Kidney Stone', THEME.GU],
  'N13': ['Hydronephrosis', THEME.GU],
  'N17': ['Acute Kidney Injury', THEME.GU],

  // Infectious (A, B) — GEN/GI
  'A04': ['Bacterial Gastroenteritis', THEME.GI],
  'A08': ['Viral Gastroenteritis', THEME.GI],
  'A41': ['Sepsis', THEME.GEN],
  'A49': ['Bacterial Infection', THEME.GEN],
  'B34': ['Viral Infection', THEME.GEN],
  'B97': ['Viral Infection', THEME.GEN],

  // Neuro (G) — NEURO
  'G43': ['Migraine', THEME.NEURO],
  'G44': ['Tension Headache', THEME.NEURO],
  'G40': ['Seizure Disorder', THEME.NEURO],
  'G41': ['Status Epilepticus', THEME.NEURO],
  'G45': ['TIA', THEME.NEURO],
  'G93': ['Encephalopathy', THEME.NEURO],

  // Endo (E) — GEN
  'E10': ['Type 1 Diabetes', THEME.GEN],
  'E11': ['Type 2 Diabetes', THEME.GEN],
  'E13': ['Diabetic Ketoacidosis', THEME.GEN],
  'E14': ['Diabetic Ketoacidosis', THEME.GEN],
  'E16': ['Hypoglycemia', THEME.GEN],
  'E86': ['Dehydration', THEME.GEN],
  'E87': ['Electrolyte Imbalance', THEME.GEN],

  // Mental (F) — PSYCH
  'F10': ['Alcohol Intoxication', THEME.PSYCH],
  'F11': ['Opioid Overdose', THEME.PSYCH],
  'F19': ['Substance Use Disorder', THEME.PSYCH],
  'F32': ['Major Depression', THEME.PSYCH],
  'F33': ['Major Depression', THEME.PSYCH],
  'F41': ['Anxiety Disorder', THEME.PSYCH],
  'F43': ['Acute Stress Reaction', THEME.PSYCH],
  'F90': ['ADHD', THEME.PSYCH],

  // Symptoms / signs (R)
  'R07': ['Chest Pain (undifferentiated)', THEME.CV],
  'R10': ['Abdominal Pain (undifferentiated)', THEME.GI],
  'R11': ['Nausea and Vomiting', THEME.GI],
  'R42': ['Dizziness', THEME.NEURO],
  'R51': ['Headache', THEME.NEURO],
  'R55': ['Syncope', THEME.NEURO],
  'R56': ['Seizure', THEME.NEURO],
  'R50': ['Fever', THEME.GEN],

  // Pregnancy (O) — OBGYN
  'O00': ['Ectopic Pregnancy', THEME.OBGYN],
  'O03': ['Spontaneous Abortion', THEME.OBGYN],
  'O14': ['Preeclampsia', THEME.OBGYN],
  'O20': ['Threatened Abortion', THEME.OBGYN],

  // Skin (L) — SKIN
  'L03': ['Cellulitis', THEME.SKIN],
  'L02': ['Skin/Soft Tissue Abscess', THEME.SKIN],
  'L50': ['Urticaria', THEME.SKIN],
  'L27': ['Drug Reaction', THEME.SKIN],

  // MSK (M) — MSK
  'M54': ['Back Pain', THEME.MSK],
  'M79': ['Musculoskeletal Pain', THEME.MSK],
  'M25': ['Joint Pain', THEME.MSK],
  'M10': ['Gout', THEME.MSK],
  'M11': ['Gout', THEME.MSK],
  'M17': ['Knee Osteoarthritis', THEME.MSK],

  // Injury (S, T) — INJURY
  'S00': ['Head Injury', THEME.INJURY],
  'S01': ['Simple Laceration', THEME.INJURY],
  'S06': ['Concussion', THEME.INJURY],
  'S52': ['Wrist Fracture', THEME.INJURY],
  'S72': ['Hip Fracture', THEME.INJURY],
  'S82': ['Ankle Fracture', THEME.INJURY],
  'S83': ['Knee Sprain', THEME.INJURY],
  'S91': ['Ankle Sprain', THEME.INJURY],
  'T78': ['Allergic Reaction', THEME.SKIN],
  'T88': ['Anaphylaxis', THEME.GEN],

  // Eye/ENT (H)
  'H66': ['Otitis Media', THEME.ENT],
  'H60': ['Otitis Externa', THEME.ENT],
  'H10': ['Conjunctivitis', THEME.ENT],
  'H81': ['BPPV', THEME.NEURO],
};

// ---- Comorbidity fields (SAS file tells us where these live) ----
// These 1-char fields encode yes(1)/no(0) for each condition.
// Positions (1-indexed per SAS format) — we subtract 1 for 0-indexed substr.
const COMORB_FIELDS = {
  ETOHAB: 152,
  ASTHMA: 154,
  CANCER: 155,
  CEBVD: 156,
  CKD: 157,
  COPD: 158,
  CHF: 159,
  CAD: 160,
  DEPRN: 161,
  DIABTYP1: 162,
  DIABTYP2: 163,
  HTN: 169,
  OBESITY: 170,
};

// ---- Parse fixed-width NHAMCS record ----
function parseRecord(line) {
  // NHAMCS uses 1-indexed column positions, so substring(i-1, i-1+len)
  const sub = (start, len) => line.substring(start - 1, start - 1 + len).trim();
  const num = (start, len) => {
    const s = sub(start, len);
    if (!s || s.startsWith('-')) return null;
    return parseInt(s, 10);
  };

  return {
    age: num(16, 3),
    sex: num(25, 1), // 1=female, 2=male
    rfv1: sub(73, 5),
    rfv2: sub(78, 5),
    diag1: sub(122, 4),
    diag2: sub(126, 4),
    diag3: sub(130, 4),
    painscale: num(69, 2),
    temp: num(48, 4),
    pulse: num(52, 3),
    resp: num(55, 3),
    bpsys: num(58, 3),
    comorb: Object.fromEntries(
      Object.entries(COMORB_FIELDS).map(([k, pos]) => [k, sub(pos, 1) === '1'])
    ),
  };
}

// ---- Main ----
console.log('Loading NHAMCS ED 2019...');
const lines = readFileSync(join(DATA_DIR, 'ed2019'), 'utf-8').split(/\r?\n/);
console.log(`Total records: ${lines.length}`);

// Parse and filter — require CC + Dx to share a theme so the pairing is clinically coherent
const candidates = [];
// Themes that are considered compatible across systems (e.g., GEN infection can explain many CCs)
const COMPAT = {
  [THEME.CV]: new Set([THEME.CV, THEME.PULM]),       // chest pain ↔ PE
  [THEME.PULM]: new Set([THEME.PULM, THEME.CV, THEME.ENT, THEME.GEN]),
  [THEME.GI]: new Set([THEME.GI, THEME.GEN]),
  [THEME.GU]: new Set([THEME.GU, THEME.GI, THEME.GEN]),  // UTI can present as GI
  [THEME.NEURO]: new Set([THEME.NEURO]),
  [THEME.MSK]: new Set([THEME.MSK, THEME.INJURY]),
  [THEME.SKIN]: new Set([THEME.SKIN, THEME.INJURY]),
  [THEME.GEN]: new Set([THEME.GEN, THEME.GI, THEME.PULM, THEME.GU, THEME.SKIN]),
  [THEME.ENT]: new Set([THEME.ENT, THEME.PULM]),
  [THEME.PSYCH]: new Set([THEME.PSYCH]),
  [THEME.INJURY]: new Set([THEME.INJURY, THEME.MSK, THEME.SKIN]),
  [THEME.OBGYN]: new Set([THEME.OBGYN, THEME.GU, THEME.GI]),
};
const themeMatches = (ccTheme, dxTheme) => {
  const s = COMPAT[ccTheme];
  return s ? s.has(dxTheme) : ccTheme === dxTheme;
};

for (const line of lines) {
  if (!line || line.length < 200) continue;
  const rec = parseRecord(line);

  // Gather all candidate (CC, theme) pairs from RFV1–2
  const ccCandidates = [];
  for (const r of [rec.rfv1, rec.rfv2]) {
    if (!r) continue;
    if (RFV_TO_CC_RAW[r]) ccCandidates.push(RFV_TO_CC_RAW[r]);
    else {
      const broad = r.substring(0, 3) + '00';
      if (RFV_TO_CC_RAW[broad]) ccCandidates.push(RFV_TO_CC_RAW[broad]);
    }
  }
  if (ccCandidates.length === 0) continue;

  // Gather all candidate (Dx, theme) from DIAG1–3
  const dxCandidates = [];
  for (const d of [rec.diag1, rec.diag2, rec.diag3]) {
    if (!d) continue;
    const prefix3 = d.substring(0, 3).toUpperCase();
    if (ICD_TO_CONDITION_RAW[prefix3]) dxCandidates.push(ICD_TO_CONDITION_RAW[prefix3]);
  }
  if (dxCandidates.length === 0) continue;

  // Find first compatible pairing
  let pick = null;
  for (const [cc, ccTheme] of ccCandidates) {
    for (const [dx, dxTheme] of dxCandidates) {
      if (themeMatches(ccTheme, dxTheme)) {
        pick = { cc, expected: dx };
        break;
      }
    }
    if (pick) break;
  }
  if (!pick) continue;

  candidates.push({ rec, expected: pick.expected, cc: pick.cc });
}

console.log(`Candidates with clean RFV+ICD mapping: ${candidates.length}`);

// Stratified sample across conditions
const byCond = new Map();
for (const c of candidates) {
  if (!byCond.has(c.expected)) byCond.set(c.expected, []);
  byCond.get(c.expected).push(c);
}
console.log(`Conditions represented: ${byCond.size}`);

const conds = Array.from(byCond.keys());
const perCond = Math.max(2, Math.floor(N / conds.length));
const sampled = [];
for (const cond of conds) {
  const b = shuffle(byCond.get(cond));
  for (let i = 0; i < Math.min(perCond, b.length); i++) sampled.push(b[i]);
}
const topUp = shuffle(candidates);
let k = 0;
while (sampled.length < N && k < topUp.length) {
  if (!sampled.includes(topUp[k])) sampled.push(topUp[k]);
  k++;
}
const final = shuffle(sampled).slice(0, N);

// Build cases
const cases = [];
let id = 22000;
for (const { rec, expected, cc } of final) {
  const age = rec.age ?? 40;
  const gender = rec.sex === 1 ? 'female' : rec.sex === 2 ? 'male' : 'unspecified';
  const demo = age >= 65 ? 'geri' : age >= 18 ? 'adult' : 'peds';

  const medications = [];
  if (rec.comorb.DIABTYP1 || rec.comorb.DIABTYP2) medications.push('insulin or oral diabetic medication');
  if (rec.comorb.HTN) medications.push('antihypertensive');
  if (rec.comorb.CHF) medications.push('diuretic');
  if (rec.comorb.COPD || rec.comorb.ASTHMA) medications.push('inhaler');
  if (rec.comorb.CAD) medications.push('statin, aspirin');

  const associated = [];
  if (rec.temp && rec.temp > 1010) associated.push('fever');
  if (rec.pulse && rec.pulse > 100) associated.push('fast heart rate');
  if (rec.resp && rec.resp > 20) associated.push('rapid breathing');
  if (rec.bpsys && rec.bpsys < 90 && rec.bpsys > 0) associated.push('low blood pressure');
  if (rec.comorb.COPD) associated.push('history of COPD');
  if (rec.comorb.CHF) associated.push('history of heart failure');
  if (rec.comorb.DIABTYP2) associated.push('history of diabetes');
  if (rec.comorb.CAD) associated.push('history of coronary artery disease');

  const severity = rec.painscale && rec.painscale > 0 ? Math.min(10, rec.painscale) : 6;

  cases.push({
    id: id++,
    demo,
    setting: 'ED',
    expected,
    source: 'nhamcs',
    body: {
      chiefComplaint: cc,
      gender,
      age,
      hpi: {
        onset: 'acute',
        location: 'varies',
        duration: 'hours to a day',
        character: 'varies',
        severity,
        aggravating: [],
        relieving: [],
        associated: associated.slice(0, 5),
      },
      medications,
    },
  });
}

writeFileSync(OUT, JSON.stringify({
  source: 'nhamcs-2019-ed',
  generatedAt: new Date().toISOString(),
  seed: SEED,
  cases,
}, null, 2));
console.log(`Wrote ${cases.length} cases → ${OUT}`);
