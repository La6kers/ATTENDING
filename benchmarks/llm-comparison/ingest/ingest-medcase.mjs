#!/usr/bin/env node
// ============================================================
// MedCaseReasoning → COMPASS case schema ingester
//
// Uses Hugging Face datasets-server API to pull zou-lab/MedCaseReasoning
// test split (897 real PMC case reports), converts case_prompt narrative
// into a short chief complaint, and outputs cases in the COMPASS harness
// schema.
//
// Usage:
//   node ingest-medcase.mjs --n 100 --seed 42 --out cases-medcase-100.json
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'datasets', 'medcasereasoning');

const getArg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};
const N = parseInt(getArg('n', '100'), 10);
const SEED = parseInt(getArg('seed', '42'), 10);
const OUT = getArg('out', join(__dirname, '..', 'cases-medcase.json'));

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

// ---- Load data: prefer cached file, else fetch from HF API ----
async function loadRows(n) {
  const cacheFile = join(DATA_DIR, `mcr-${n}-test.json`);
  if (existsSync(cacheFile)) {
    const d = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    console.log(`Loaded ${d.rows.length} rows from cache (total available: ${d.num_rows_total})`);
    return d.rows.map(r => r.row);
  }
  // Need more — fetch in pages of 100
  const chunks = [];
  let offset = 0;
  const pageSize = 100;
  while (chunks.length < n) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=zou-lab%2FMedCaseReasoning&config=default&split=test&offset=${offset}&length=${pageSize}`;
    console.log(`Fetching rows ${offset}–${offset + pageSize}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HF API error: ${res.status}`);
    const d = await res.json();
    for (const r of d.rows) chunks.push(r.row);
    offset += pageSize;
    if (offset >= d.num_rows_total) break;
  }
  return chunks;
}

// Extract a short chief complaint from a multi-sentence case prompt
function extractCC(prompt) {
  if (!prompt) return 'not feeling well';
  // Remove newlines / normalize
  const clean = prompt.replace(/\s+/g, ' ').trim();
  // First sentence, up to 250 chars
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return firstSentence.slice(0, 250);
}

// Extract age/gender from the prompt text
function extractAgeGender(prompt) {
  let age = 45;
  let gender = 'unspecified';
  const ageMatch = prompt.match(/(\d{1,3})[\s-]*year[s-]*old/i) || prompt.match(/age[d]?\s+(\d{1,3})/i);
  if (ageMatch) age = Math.min(110, parseInt(ageMatch[1], 10));
  const lower = prompt.slice(0, 200).toLowerCase();
  if (/\b(man|male|gentleman|boy|father|he\b|his\b)/.test(lower)) gender = 'male';
  else if (/\b(woman|female|lady|girl|mother|she\b|her\b)/.test(lower)) gender = 'female';
  return { age, gender };
}

// Associated symptoms — pull keywords from remaining text
const SYMPTOM_KEYWORDS = [
  'fever', 'cough', 'dyspnea', 'shortness of breath', 'chest pain', 'headache',
  'nausea', 'vomiting', 'diarrhea', 'abdominal pain', 'rash', 'swelling',
  'weight loss', 'fatigue', 'dizziness', 'palpitations', 'syncope',
  'hemoptysis', 'hematemesis', 'melena', 'jaundice', 'confusion',
  'weakness', 'numbness', 'tingling', 'seizure', 'tremor',
  'itching', 'bleeding', 'discharge', 'edema', 'chills',
];

function extractAssociated(prompt) {
  const lower = prompt.toLowerCase();
  return SYMPTOM_KEYWORDS.filter(k => lower.includes(k)).slice(0, 6);
}

// ---- Main ----
(async () => {
  console.log('Loading MedCaseReasoning test split...');
  const rows = await loadRows(Math.max(N, 100));
  console.log(`Got ${rows.length} rows`);

  const sampled = shuffle(rows).slice(0, N);
  const cases = [];
  let id = 21000;
  for (const r of sampled) {
    const prompt = r.case_prompt || r.text || '';
    const diagnosis = (r.final_diagnosis || '').trim();
    if (!diagnosis) continue;
    const ccRaw = extractCC(prompt);
    const { age, gender } = extractAgeGender(prompt);
    const associated = extractAssociated(prompt);
    // Bundle extracted symptom keywords into the CC so LR rules see them
    const cc = associated.length > 0
      ? `${ccRaw}. Symptoms include ${associated.join(', ')}`
      : ccRaw;
    const demo = age >= 65 ? 'geri' : age >= 18 ? 'adult' : 'peds';

    cases.push({
      id: id++,
      demo,
      setting: 'outpatient',
      expected: diagnosis,
      source: 'medcasereasoning',
      pmcid: r.pmcid,
      body: {
        chiefComplaint: cc,
        gender,
        age,
        hpi: {
          onset: 'subacute',
          location: 'varies',
          duration: 'days to weeks',
          character: 'varies',
          severity: 6,
          aggravating: [],
          relieving: [],
          associated,
        },
        medications: [],
      },
    });
  }

  writeFileSync(OUT, JSON.stringify({
    source: 'medcasereasoning',
    generatedAt: new Date().toISOString(),
    seed: SEED,
    cases,
  }, null, 2));
  console.log(`Wrote ${cases.length} cases → ${OUT}`);
})();
