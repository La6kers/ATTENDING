#!/usr/bin/env node
// Merge DDXPlus + MedCaseReasoning + NHAMCS into a single cases-1000-external.json
// for the run-benchmark harness.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const files = [
  { path: 'cases-ddxplus-600.json', label: 'ddxplus' },
  { path: 'cases-nhamcs-300.json', label: 'nhamcs' },
  { path: 'cases-medcase-100.json', label: 'medcase' },
];

const all = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(join(ROOT, f.path), 'utf-8'));
  console.log(`${f.label}: ${d.cases.length} cases`);
  for (const c of d.cases) all.push({ ...c, source: f.label });
}

// Deterministic shuffle (seed 42)
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
for (let i = all.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}

const out = {
  seed: 42,
  generatedAt: new Date().toISOString(),
  sources: files.map(f => f.label),
  totalCases: all.length,
  cases: all,
};
const outPath = join(ROOT, 'cases-1000-external.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nTotal: ${all.length} cases → ${outPath}`);

// Per-source breakdown
const bySource = new Map();
for (const c of all) bySource.set(c.source, (bySource.get(c.source) || 0) + 1);
console.log('\nBy source:');
for (const [s, n] of bySource.entries()) console.log(`  ${s}: ${n}`);
