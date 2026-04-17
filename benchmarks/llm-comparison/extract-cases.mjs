// ============================================================
// Extract COMPASS v20 test cases to a deterministic JSON file.
// Run once — commit result (cases.json) to git.
//
// Usage: node extract-cases.mjs [--seed <n>]
//   --seed <n>  deterministic shuffle seed (default: 42)
//
// Output: cases.json (600 cases with fixed IDs starting at 8000)
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const V20_PATH = join(__dirname, '..', '..', 'tmp-compass-test', 'run-tests-v20-600api.mjs');

// ---- Parse CLI args ----
const args = process.argv.slice(2);
const seedArg = args.find(a => a.startsWith('--seed='))?.split('=')[1] ??
  (args.includes('--seed') ? args[args.indexOf('--seed') + 1] : '42');
const SEED = parseInt(seedArg, 10);

// ---- Deterministic PRNG (mulberry32) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
function randomInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randomFrom(arr) { return arr[Math.floor(rand() * arr.length)]; }
function makeAge(demo) {
  if (demo === 'peds') return randomInt(1, 17);
  if (demo === 'adult') return randomInt(18, 64);
  return randomInt(65, 95);
}
function makeGender() { return rand() > 0.5 ? 'male' : 'female'; }

// ---- Load v20 case definitions by reading and evaluating the module ----
// We do this by:
//   1. Read v20 .mjs as text
//   2. Regex-extract COMMON_CONDITIONS + RARE_CONDITIONS array blocks
//   3. Evaluate in isolated context (safe: our own file, no user input)

const v20Text = readFileSync(V20_PATH, 'utf-8');

// Extract from "const COMMON_CONDITIONS = [" to matching "];"
function extractArray(text, name) {
  const startMarker = `const ${name} = [`;
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`Cannot find ${name} in v20 source`);
  // Walk bracket depth
  let depth = 0;
  let i = startIdx + startMarker.length - 1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  return text.substring(startIdx + `const ${name} = `.length, i + 1);
}

const commonSrc = extractArray(v20Text, 'COMMON_CONDITIONS');
const rareSrc = extractArray(v20Text, 'RARE_CONDITIONS');

// eval in controlled scope (we need randomFrom/randomInt inside hpi() fns)
const COMMON_CONDITIONS = eval(commonSrc); // eslint-disable-line no-eval
const RARE_CONDITIONS = eval(rareSrc); // eslint-disable-line no-eval

const SETTINGS = ['ED', 'UC', 'PC'];

// ---- Build deterministic 600-case set ----
function buildCases() {
  const cases = [];
  let id = 8000;
  const demoSlots = [
    ...Array(150).fill('peds'),
    ...Array(250).fill('adult'),
    ...Array(200).fill('geri'),
  ];
  // Deterministic shuffle (Fisher-Yates with seeded RNG)
  for (let i = demoSlots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [demoSlots[i], demoSlots[j]] = [demoSlots[j], demoSlots[i]];
  }
  const allConditions = [...COMMON_CONDITIONS, ...RARE_CONDITIONS];
  for (let i = 0; i < 600; i++) {
    const cond = allConditions[i % allConditions.length];
    const demo = demoSlots[i];
    const setting = SETTINGS[i % 3];
    let age;
    if (cond.ageRange) {
      const lo = Math.max(cond.ageRange[0], demo === 'peds' ? 1 : demo === 'adult' ? 18 : 65);
      const hi = Math.min(cond.ageRange[1], demo === 'peds' ? 17 : demo === 'adult' ? 64 : 95);
      age = lo <= hi ? randomInt(lo, hi) : makeAge(demo);
    } else {
      age = makeAge(demo);
    }
    const gender = cond.gender || makeGender();
    const hpi = cond.hpi();
    const phrasing = cond.phrasings[i % cond.phrasings.length];
    cases.push({
      id: id++,
      demo,
      setting,
      expected: cond.expected,
      body: {
        chiefComplaint: phrasing,
        gender,
        age,
        hpi: {
          onset: hpi.onset,
          location: hpi.location,
          duration: hpi.duration,
          character: hpi.character,
          severity: hpi.severity,
          timing: hpi.timing,
          aggravating: hpi.aggravating,
          relieving: hpi.relieving,
          associated: hpi.associated || [],
        },
        vitals: undefined,
        medications: [],
      },
    });
  }
  return cases;
}

const cases = buildCases();
const outPath = join(__dirname, 'cases.json');
writeFileSync(outPath, JSON.stringify({ seed: SEED, generatedAt: new Date().toISOString(), count: cases.length, cases }, null, 2));
console.log(`Extracted ${cases.length} cases (seed=${SEED}) -> ${outPath}`);
