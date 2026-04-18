#!/usr/bin/env node
// ============================================================
// COMPASS Regression Budget Generator (R4)
//
// Reads a results-vXX.json stress-test file and produces a
// regression-budget.json that locks in per-condition accuracy.
// Any future test run checked against this budget must not regress
// by more than the per-condition tolerance (default 2 misses allowed).
//
// Usage:
//   node tmp-compass-test/generate-regression-budget.mjs [results-file]
//
// Defaults to tmp-compass-test/results-v21.json.
// Writes tmp-compass-test/regression-budget.json.
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputPath = process.argv[2] || 'tmp-compass-test/results-v21.json';
const outputPath = 'tmp-compass-test/regression-budget.json';

const raw = JSON.parse(readFileSync(resolve(inputPath), 'utf-8'));
const results = Array.isArray(raw) ? raw : (raw.results || []);
if (results.length === 0) {
  console.error(`No results found in ${inputPath}`);
  process.exit(1);
}

const total = results.length;
const hits = results.filter(r => r.hit).length;
const globalAccuracy = (hits / total) * 100;

// Per-condition hit rates
const byCondition = {};
for (const r of results) {
  const c = byCondition[r.expected] || { total: 0, hits: 0 };
  c.total++;
  if (r.hit) c.hits++;
  byCondition[r.expected] = c;
}

const perCondition = {};
for (const [cond, s] of Object.entries(byCondition)) {
  perCondition[cond] = {
    total: s.total,
    minHits: s.hits,
    accuracy: parseFloat(((s.hits / s.total) * 100).toFixed(1)),
  };
}

const budget = {
  generatedFrom: inputPath,
  generatedAt: new Date().toISOString(),
  // Allowed tolerance: how many hits a condition may lose before failing.
  // 2 hits ≈ 1 variant regressing out of 5. Adjust globally here.
  defaultTolerance: 2,
  // Global floor: overall accuracy must stay within this many percentage
  // points of baseline.
  globalTolerancePp: 2,
  baseline: {
    total,
    hits,
    accuracy: parseFloat(globalAccuracy.toFixed(1)),
  },
  perCondition,
};

writeFileSync(resolve(outputPath), JSON.stringify(budget, null, 2));
console.log(`Regression budget written to ${outputPath}`);
console.log(`Baseline: ${globalAccuracy.toFixed(1)}% (${hits}/${total})`);
console.log(`Conditions tracked: ${Object.keys(perCondition).length}`);
