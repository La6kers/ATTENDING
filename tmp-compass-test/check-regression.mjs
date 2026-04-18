#!/usr/bin/env node
// ============================================================
// COMPASS Regression CI Check (R4)
//
// Compares a fresh stress-test results file against the locked-in
// regression-budget.json. Exits non-zero if any condition regresses
// beyond its tolerance, or if global accuracy drops more than
// globalTolerancePp.
//
// Usage:
//   node tmp-compass-test/check-regression.mjs <new-results.json> [budget.json]
//
// Budget defaults to tmp-compass-test/regression-budget.json.
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const newResultsPath = process.argv[2];
const budgetPath = process.argv[3] || 'tmp-compass-test/regression-budget.json';

if (!newResultsPath) {
  console.error('Usage: node check-regression.mjs <new-results.json> [budget.json]');
  process.exit(2);
}

const budget = JSON.parse(readFileSync(resolve(budgetPath), 'utf-8'));
const raw = JSON.parse(readFileSync(resolve(newResultsPath), 'utf-8'));
const results = Array.isArray(raw) ? raw : (raw.results || []);

const total = results.length;
const hits = results.filter(r => r.hit).length;
const accuracy = (hits / total) * 100;

// Per-condition hit counts for the new run
const newByCondition = {};
for (const r of results) {
  const c = newByCondition[r.expected] || { total: 0, hits: 0 };
  c.total++;
  if (r.hit) c.hits++;
  newByCondition[r.expected] = c;
}

const failures = [];

// Global accuracy check
const globalDelta = budget.baseline.accuracy - accuracy;
if (globalDelta > budget.globalTolerancePp) {
  failures.push(
    `GLOBAL: accuracy regressed by ${globalDelta.toFixed(1)}pp ` +
    `(baseline ${budget.baseline.accuracy}% → now ${accuracy.toFixed(1)}%) ` +
    `> tolerance ${budget.globalTolerancePp}pp`
  );
}

// Per-condition checks
const tolerance = budget.defaultTolerance;
const conditionRegressions = [];
for (const [cond, base] of Object.entries(budget.perCondition)) {
  const current = newByCondition[cond] || { total: 0, hits: 0 };
  const lostHits = base.minHits - current.hits;
  if (lostHits > tolerance) {
    conditionRegressions.push({
      condition: cond,
      baseline: base.minHits,
      current: current.hits,
      lost: lostHits,
    });
  }
}
conditionRegressions.sort((a, b) => b.lost - a.lost);
for (const r of conditionRegressions) {
  failures.push(
    `CONDITION: "${r.condition}" lost ${r.lost} hits ` +
    `(baseline ${r.baseline} → now ${r.current}) > tolerance ${tolerance}`
  );
}

// Report
console.log(`\nRegression check: ${newResultsPath} vs ${budgetPath}`);
console.log(`  Baseline: ${budget.baseline.accuracy}% (${budget.baseline.hits}/${budget.baseline.total})`);
console.log(`  Current:  ${accuracy.toFixed(1)}% (${hits}/${total})`);
console.log(`  Delta:    ${(accuracy - budget.baseline.accuracy).toFixed(2)}pp`);

if (failures.length === 0) {
  console.log(`\nPASS — no regressions beyond tolerance`);
  process.exit(0);
}

console.error(`\nFAIL — ${failures.length} regression(s):`);
for (const f of failures) console.error('  - ' + f);
process.exit(1);
