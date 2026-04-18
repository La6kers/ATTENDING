#!/usr/bin/env node
// ============================================================
// ML Training Data Export
// scripts/export-training-data.mjs
//
// Exports confirmed DiagnosticOutcome rows as JSON Lines for offline
// model training. Only rows with a finalConfirmedDiagnosis are included.
//
// Output is written to tmp-ml-exports/ (gitignored — PHI-adjacent,
// must never be committed).
//
// Each row has been stripped of patient identifiers; only the ML-relevant
// features + labels remain:
//
//   (chiefComplaint, age, gender, hpi, redFlags, aiDifferentials,
//    matchProvenance, physicianDiagnosis, labSupportsAIDiagnosis,
//    imagingSupportsAIDiagnosis, finalConfirmedDiagnosis,
//    aiAccuracyAssessment, aiTopKWasRight, confirmedAt)
//
// Usage:
//   ORG_ID=<cuid> node scripts/export-training-data.mjs [--since=2026-01-01] [--dry]
//
// Flags:
//   --since=YYYY-MM-DD  Only export rows confirmed on/after this date
//   --dry               Print counts but don't write file or mark exported
// ============================================================

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

const { exportTrainingData } = await import('../apps/shared/services/diagnosticOutcome.service.js')
  .catch(() => import('../apps/shared/services/diagnosticOutcome.service.ts'));

const orgId = process.env.ORG_ID;
if (!orgId) {
  console.error('ORG_ID env var required');
  process.exit(1);
}

const sinceArg = process.argv.find(a => a.startsWith('--since='));
const since = sinceArg ? new Date(sinceArg.split('=')[1]) : undefined;
const dry = process.argv.includes('--dry');

if (since && Number.isNaN(since.getTime())) {
  console.error(`Invalid --since date: ${sinceArg}`);
  process.exit(1);
}

console.log(`\nExporting training data for org: ${orgId}`);
if (since) console.log(`Since: ${since.toISOString()}`);
if (dry) console.log('DRY RUN — no file will be written, no rows will be marked exported\n');

const { batchId, rows } = await exportTrainingData(orgId, since, !dry);

console.log(`Batch: ${batchId}`);
console.log(`Rows:  ${rows.length}`);

if (dry) {
  // Summary only
  const byAssessment = rows.reduce((acc, r) => {
    acc[r.aiAccuracyAssessment] = (acc[r.aiAccuracyAssessment] || 0) + 1;
    return acc;
  }, {});
  console.log('\nBy assessment:');
  for (const [k, v] of Object.entries(byAssessment)) console.log(`  ${k}: ${v}`);
  process.exit(0);
}

// Ensure output dir exists and .gitignore'd
const outDir = resolve('tmp-ml-exports');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const gitignorePath = resolve(outDir, '.gitignore');
if (!existsSync(gitignorePath)) {
  writeFileSync(gitignorePath, '*\n!.gitignore\n');
}

const outPath = resolve(outDir, `${batchId}.jsonl`);
const lines = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
writeFileSync(outPath, lines);

// Also write a small metadata sidecar
const meta = {
  batchId,
  organizationId: orgId,
  since: since?.toISOString() ?? null,
  exportedAt: new Date().toISOString(),
  rowCount: rows.length,
  assessmentBreakdown: rows.reduce((acc, r) => {
    acc[r.aiAccuracyAssessment] = (acc[r.aiAccuracyAssessment] || 0) + 1;
    return acc;
  }, {}),
};
writeFileSync(resolve(outDir, `${batchId}.meta.json`), JSON.stringify(meta, null, 2));

console.log(`\nWrote ${outPath}`);
console.log(`Metadata: ${resolve(outDir, `${batchId}.meta.json`)}`);
console.log(`Rows marked mlExportedAt=${new Date().toISOString()}, mlBatchId=${batchId}`);

process.exit(0);
