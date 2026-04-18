#!/usr/bin/env node
// ============================================================
// ML Miss-Analysis Report Generator
// scripts/ml-miss-analysis.mjs
//
// Reads the last N days of DiagnosticOutcome rows for a given
// organization, groups REFUTED rows by (CC category, confirmed dx),
// and writes a miss report to docs/pilot-miss-reports/YYYY-MM-DD.md.
//
// Run from a weekly cron. Output feeds the v15→v21-style iteration
// loop but against real-world pilot data.
//
// Usage:
//   ORG_ID=<cuid> node scripts/ml-miss-analysis.mjs [--days=7]
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// Lazy-load the service — avoids loading Prisma at import parse time when
// the script is run in environments without DATABASE_URL configured.
const { getMissAnalysis } = await import('../apps/shared/services/diagnosticOutcome.service.js')
  .catch(() => import('../apps/shared/services/diagnosticOutcome.service.ts'));

const orgId = process.env.ORG_ID;
if (!orgId) {
  console.error('ORG_ID env var required');
  process.exit(1);
}

const daysArg = process.argv.find(a => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;

const until = new Date();
const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

console.log(`\nMiss analysis: ${since.toISOString()} → ${until.toISOString()}`);
console.log(`Organization: ${orgId}\n`);

const rows = await getMissAnalysis(orgId, since, until);

const dateStr = until.toISOString().slice(0, 10);
const outPath = resolve(`docs/pilot-miss-reports/${dateStr}.md`);
mkdirSync(dirname(outPath), { recursive: true });

let md = `# Pilot Miss Report — ${dateStr}\n\n`;
md += `**Window:** ${since.toISOString()} → ${until.toISOString()} (${days} days)\n`;
md += `**Organization:** ${orgId}\n\n`;

if (rows.length === 0) {
  md += `## No confirmed misses in this window\n\n`;
  md += `Either no DiagnosticOutcome rows were finalized with REFUTED status, or the engine nailed every confirmed diagnosis. Check back next week.\n`;
} else {
  const totalMisses = rows.reduce((s, r) => s + r.missCount, 0);
  md += `## Summary\n\n`;
  md += `- **Total confirmed misses:** ${totalMisses}\n`;
  md += `- **Distinct (CC, dx) pairs:** ${rows.length}\n`;
  md += `- **Top miss:** ${rows[0].chiefComplaintCategory} → ${rows[0].confirmedDiagnosis} (${rows[0].missCount}×)\n\n`;

  md += `## Miss breakdown\n\n`;
  md += `| CC category | Confirmed diagnosis | Misses | CC-category total | Sample requestId |\n`;
  md += `|---|---|---:|---:|---|\n`;
  for (const r of rows.slice(0, 50)) {
    md += `| ${r.chiefComplaintCategory} | ${r.confirmedDiagnosis} | ${r.missCount} | ${r.totalForCategory} | \`${r.exampleRequestIds[0]}\` |\n`;
  }

  md += `\n## Next actions\n\n`;
  md += `1. For each (CC, dx) pair with ≥3 misses, pull the example requestIds via \`GET /api/outcomes?requestId=...\` and inspect the matchProvenance.\n`;
  md += `2. If the routing category is wrong → add an antiPattern to the misrouting prevalence category.\n`;
  md += `3. If the routing is right but the diagnosis isn't in the top-5 → add/boost a CC-keyword LR rule for that (CC, dx) pair.\n`;
  md += `4. Re-run the regression check: \`node tmp-compass-test/run-tests-v21-600api.mjs && node tmp-compass-test/check-regression.mjs tmp-compass-test/results-v21.json\`.\n`;
}

writeFileSync(outPath, md);
console.log(`Report written to ${outPath}`);
console.log(`Misses reported: ${rows.length}`);

process.exit(0);
