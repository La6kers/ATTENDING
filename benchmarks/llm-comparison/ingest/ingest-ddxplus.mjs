#!/usr/bin/env node
// ============================================================
// DDXPlus → COMPASS case schema ingester
//
// Reads DDXPlus test patients CSV + evidence/condition metadata
// and emits cases matching benchmarks/llm-comparison/cases.json
// format:
//   { id, demo, setting, expected, body: { chiefComplaint, gender, age, hpi, medications } }
//
// Stratified sample across 49 pathologies using Mulberry32 seeded PRNG.
//
// Usage:
//   node ingest-ddxplus.mjs --n 600 --seed 42 --out cases-ddxplus-600.json
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'datasets', 'ddxplus');

// ---- CLI ----
const getArg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};
const N = parseInt(getArg('n', '600'), 10);
const SEED = parseInt(getArg('seed', '42'), 10);
const OUT = getArg('out', join(__dirname, '..', 'cases-ddxplus.json'));

// ---- Seeded PRNG (matches existing harness) ----
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---- Load metadata ----
const evidences = JSON.parse(readFileSync(join(DATA_DIR, 'release_evidences.json'), 'utf-8'));
const conditions = JSON.parse(readFileSync(join(DATA_DIR, 'release_conditions.json'), 'utf-8'));

// Map DDXPlus pathology → canonical COMPASS expected label
// Leverages existing match-aliases.json grading logic — keep names close to
// DDXPlus originals and let the aliases file handle fuzzy matching.
const PATHOLOGY_MAP = {
  'Bronchitis': 'Bronchitis',
  'GERD': 'GERD',
  'Possible NSTEMI / STEMI': 'Acute Myocardial Infarction',
  'Unstable angina': 'Unstable Angina',
  'Stable angina': 'Stable Angina',
  'Pericarditis': 'Pericarditis',
  'Anemia': 'Iron Deficiency Anemia',
  'Boerhaave': 'Boerhaave Syndrome',
  'Spontaneous pneumothorax': 'Pneumothorax',
  'Spontaneous rib fracture': 'Rib Fracture',
  'Pulmonary embolism': 'Pulmonary Embolism',
  'Pneumonia': 'Pneumonia',
  'Acute COPD exacerbation / infection': 'COPD exacerbation',
  'Bronchospasm / acute asthma exacerbation': 'Asthma Exacerbation',
  'Atrial fibrillation': 'Atrial Fibrillation',
  'PSVT': 'Supraventricular Tachycardia',
  'Viral pharyngitis': 'Pharyngitis',
  'Acute laryngitis': 'Acute Laryngitis',
  'Croup': 'Croup',
  'Epiglottitis': 'Epiglottitis',
  'Bronchiolitis': 'Bronchiolitis',
  'Whooping cough': 'Pertussis',
  'URTI': 'Upper Respiratory Infection',
  'Influenza': 'Influenza',
  'Tuberculosis': 'Tuberculosis',
  'Acute rhinosinusitis': 'Acute Sinusitis',
  'Chronic rhinosinusitis': 'Chronic Sinusitis',
  'Allergic sinusitis': 'Allergic Rhinitis',
  'Anaphylaxis': 'Anaphylaxis',
  'Laryngospasm': 'Laryngospasm',
  'Cluster headache': 'Cluster Headache',
  'Acute otitis media': 'Otitis Media',
  'Panic attack': 'Panic Attack',
  'Guillain-Barré syndrome': 'Guillain-Barré Syndrome',
  'Myasthenia gravis': 'Myasthenia Gravis',
  'HIV (initial infection)': 'HIV Primary Infection',
  'Chagas': 'Chagas Disease',
  'Scombroid food poisoning': 'Scombroid Poisoning',
  'Myocarditis': 'Myocarditis',
  'Acute dystonic reactions': 'Acute Dystonic Reaction',
  'Localized edema': 'Localized Edema',
  'SLE': 'Systemic Lupus Erythematosus',
  'Ebola': 'Ebola',
  'Inguinal hernia': 'Inguinal Hernia',
  'Bronchiectasis': 'Bronchiectasis',
  'Sarcoidosis': 'Sarcoidosis',
  'Pulmonary neoplasm': 'Lung Cancer',
  'Pancreatic neoplasm': 'Pancreatic Cancer',
  'Acute pulmonary edema': 'Congestive Heart Failure',
};

// ---- Evidence → English declarative phrase ----
// DDXPlus stores evidences as questions; the listed evidences are all POSITIVE.
// Convert "Do you have X?" → "X" so COMPASS pattern matchers recognize symptoms.
function questionToDeclarative(q) {
  let s = (q || '').trim();
  // Drop meta-questions that don't encode a symptom
  if (/related to your reason for consulting/i.test(s)) return null;
  if (/how intense is the pain/i.test(s)) return null;
  if (/on a scale of/i.test(s)) return null;
  s = s.replace(/^Do you (have|feel|experience)/i, '');
  s = s.replace(/^Are you /i, '');
  s = s.replace(/^Have you been /i, '');
  s = s.replace(/^Have you /i, '');
  s = s.replace(/^Is there /i, '');
  s = s.replace(/\?$/, '');
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  // Short-circuit some long questions into common symptom terms
  const map = [
    ['fever', 'fever'],
    ['cough', 'cough'],
    ['shortness of breath', 'shortness of breath'],
    ['difficulty breathing', 'hard to breathe'],
    ['chest pain', 'chest pain'],
    ['sore throat', 'sore throat'],
    ['runny nose', 'runny nose'],
    ['wheez', 'wheezing'],
    ['vomit', 'vomiting'],
    ['nausea', 'nausea'],
    ['diarr', 'diarrhea'],
    ['headache', 'headache'],
    ['dizz', 'dizziness'],
    ['palpit', 'palpitations'],
    ['rash', 'rash'],
    ['swell', 'swelling'],
    ['weight loss', 'weight loss'],
    ['fatigue', 'fatigue'],
    ['hemoptysis', 'coughing up blood'],
    ['hematemesis', 'vomiting blood'],
    ['melena', 'black tarry stool'],
    ['jaundice', 'yellow skin'],
    ['smok', 'smoker'],
    ['pregnant', 'pregnant'],
    ['hypertension', 'history of hypertension'],
    ['asthma', 'history of asthma'],
    ['copd', 'history of COPD'],
    ['heart failure', 'history of heart failure'],
    ['diabet', 'history of diabetes'],
  ];
  for (const [needle, canonical] of map) {
    if (s.includes(needle)) return canonical;
  }
  return s.length < 60 ? s : null;
}

function evidenceToPhrase(code) {
  // Format examples: "E_201", "E_54_@_V_112", "E_56_@_6"
  const m = code.match(/^(E_\d+)(?:_@_(V_\d+|\d+))?$/);
  if (!m) return null;
  const eCode = m[1];
  const vCode = m[2];
  const ev = evidences[eCode];
  if (!ev) return null;
  const qEn = ev.question_en || '';
  // Categorical answer — e.g. pain quality V_181=burning
  if (vCode && ev.value_meaning && ev.value_meaning[vCode]) {
    const en = ev.value_meaning[vCode].en;
    // Skip NA values
    if (en === 'NA' || en === 'N/A') return null;
    // Pain characterization
    if (/characterize your pain/i.test(qEn)) return `${en} pain`;
    // Pain location
    if (/pain somewhere/i.test(qEn) || /where.*pain/i.test(qEn)) return `pain in ${en}`;
    // Pain radiation
    if (/radiate/i.test(qEn)) return `pain radiates to ${en}`;
    return `${en}`;
  }
  if (vCode && /^\d+$/.test(vCode)) {
    // Numeric intensity — pain severity
    if (/how intense|pain.*scale/i.test(qEn)) return null; // handled separately
    return null;
  }
  return questionToDeclarative(qEn);
}

// Convert INITIAL_EVIDENCE to a casual chief-complaint-style phrase
function initialToCC(code, age, sex) {
  const ev = evidences[code];
  if (!ev) return 'not feeling well';
  const q = (ev.question_en || '').toLowerCase();
  // Simplify common questions into CC phrases
  if (q.includes('pain somewhere')) return 'ive got pain that wont go away';
  if (q.includes('cough')) return 'cant stop coughing';
  if (q.includes('fever')) return 'been running a fever';
  if (q.includes('shortness of breath') || q.includes('hard to breathe')) return 'its hard to catch my breath';
  if (q.includes('chest') && q.includes('pain')) return 'my chest hurts';
  if (q.includes('throat') && q.includes('sore')) return 'my throats killing me';
  if (q.includes('headache')) return 'head is pounding';
  if (q.includes('nose') && q.includes('runny')) return 'runny nose wont quit';
  if (q.includes('swell')) return 'something is swollen';
  if (q.includes('rash') || q.includes('hives')) return 'rash on my skin';
  if (q.includes('wheez')) return 'wheezing and cant breathe right';
  if (q.includes('nausea') || q.includes('vomit')) return 'keep throwing up';
  if (q.includes('dizz')) return 'feel dizzy and lightheaded';
  if (q.includes('tired') || q.includes('fatigue')) return 'no energy and exhausted';
  if (q.includes('palpit')) return 'heart is racing';
  if (q.includes('diarr')) return 'cant stop going to the bathroom';
  // fallback: lowercase first-person rewrite of the question
  return q.replace(/^do you /, 'i ').replace(/^are you /, 'im ').replace(/\?$/, '');
}

// ---- Parse CSV (DDXPlus rows: AGE, DIFFERENTIAL_DIAGNOSIS, SEX, PATHOLOGY, EVIDENCES, INITIAL_EVIDENCE) ----
function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseList(s) {
  // DDXPlus lists look like Python literals: ['a', 'b']  or  [['x', 0.5], ['y', 0.3]]
  // Convert Python-quoted strings to JSON-parseable
  try {
    const jsonish = s
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false');
    return JSON.parse(jsonish);
  } catch {
    return [];
  }
}

// ---- Main ----
console.log('Loading DDXPlus test patients (this takes a few seconds)...');
const raw = readFileSync(join(DATA_DIR, 'release_test_patients'), 'utf-8');
const lines = raw.split(/\r?\n/);
const header = parseCSVLine(lines[0]);
const col = (name) => header.indexOf(name);

const idx = {
  AGE: col('AGE'),
  DDX: col('DIFFERENTIAL_DIAGNOSIS'),
  SEX: col('SEX'),
  PATHOLOGY: col('PATHOLOGY'),
  EVIDENCES: col('EVIDENCES'),
  INITIAL: col('INITIAL_EVIDENCE'),
};

console.log(`Parsed header: ${header.join(', ')}`);
console.log(`Total rows: ${lines.length - 1}`);

// Bucket by pathology for stratified sampling
const byPath = new Map();
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  const pathology = cols[idx.PATHOLOGY];
  if (!pathology) continue;
  if (!byPath.has(pathology)) byPath.set(pathology, []);
  byPath.get(pathology).push(cols);
}

console.log(`Pathology buckets: ${byPath.size}`);

// Stratified sample — aim for N total, distribute across pathologies
const pathologies = Array.from(byPath.keys());
const perPath = Math.max(1, Math.floor(N / pathologies.length));
const sampled = [];
for (const p of pathologies) {
  const bucket = shuffle(byPath.get(p));
  for (let i = 0; i < Math.min(perPath, bucket.length); i++) sampled.push(bucket[i]);
}
// Top-up with random extras to hit N
const remainingPool = shuffle([].concat(...Array.from(byPath.values())));
let j = 0;
while (sampled.length < N && j < remainingPool.length) {
  const row = remainingPool[j++];
  if (!sampled.includes(row)) sampled.push(row);
}
const finalSample = shuffle(sampled).slice(0, N);

console.log(`Stratified sample: ${finalSample.length}`);

// Build cases
const cases = [];
let id = 20000;
let mappedCount = 0;
let skipped = 0;
for (const cols of finalSample) {
  const age = parseInt(cols[idx.AGE], 10) || 40;
  const sex = cols[idx.SEX];
  const pathology = cols[idx.PATHOLOGY];
  const expected = PATHOLOGY_MAP[pathology] || pathology;
  if (!PATHOLOGY_MAP[pathology]) {
    // still include but tag so harness sees it
  } else mappedCount++;

  const initial = cols[idx.INITIAL];
  const evidenceList = parseList(cols[idx.EVIDENCES] || '[]');

  const chiefComplaint = initialToCC(initial, age, sex);

  // Build associated symptoms / aggravating / etc. from EVIDENCES
  const associated = [];
  for (const code of evidenceList) {
    const phrase = evidenceToPhrase(code);
    if (phrase && phrase.length < 100) associated.push(phrase);
    if (associated.length >= 8) break;
  }

  const demo = age >= 65 ? 'geri' : age >= 18 ? 'adult' : 'peds';
  const gender = sex === 'M' ? 'male' : 'female';

  cases.push({
    id: id++,
    demo,
    setting: 'ED',
    expected,
    source: 'ddxplus',
    body: {
      chiefComplaint,
      gender,
      age,
      hpi: {
        onset: 'recent',
        location: 'varies',
        duration: 'hours to days',
        character: 'varies',
        severity: 6,
        aggravating: [],
        relieving: [],
        associated: associated.slice(0, 6),
      },
      medications: [],
    },
  });
  if (cases.length >= N) break;
}

const unmapped = cases.length - mappedCount;
console.log(`Mapped pathologies: ${mappedCount}/${cases.length} (${unmapped} using raw DDXPlus label)`);

writeFileSync(OUT, JSON.stringify({
  source: 'ddxplus',
  generatedAt: new Date().toISOString(),
  seed: SEED,
  cases,
}, null, 2));
console.log(`Wrote ${cases.length} cases → ${OUT}`);
