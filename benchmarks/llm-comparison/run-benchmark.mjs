#!/usr/bin/env node
// ============================================================
// COMPASS vs Medical LLM Benchmark Harness
//
// Runs the same 600-case stress test against any supported provider
// (COMPASS Bayesian engine, or Ollama-served LLMs) and produces
// directly comparable markdown + JSON reports.
//
// Usage:
//   node run-benchmark.mjs --provider compass
//   node run-benchmark.mjs --provider biomistral
//   node run-benchmark.mjs --provider meditron --limit 100
//   node run-benchmark.mjs --provider llama3
//   node run-benchmark.mjs --compare compass,biomistral,meditron,llama3
//
// Flags:
//   --provider <name>     compass | biomistral | meditron | llama3
//   --limit <n>           First N cases only (default: all 600)
//   --compare <list>      Comma-separated. Reads existing result JSONs
//                         and produces a side-by-side comparison.
//   --compass-url <url>   Default http://localhost:3005
//   --ollama-url <url>    Default http://localhost:11434
//   --output-dir <path>   Default ./results
//   --label <string>      Optional label appended to output filenames
// ============================================================

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runCompass, COMPASS_INFO } from './providers/compass.mjs';
import { runOllama, MODEL_TAGS, OLLAMA_INFO } from './providers/ollama.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- CLI parsing ----
function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  const eqArg = process.argv.find(a => a.startsWith(`--${name}=`));
  if (eqArg) return eqArg.split('=').slice(1).join('=');
  return def;
}

const PROVIDER = getArg('provider', null);
const COMPARE = getArg('compare', null);
const LIMIT = parseInt(getArg('limit', '0'), 10) || null;
const COMPASS_URL = getArg('compass-url', 'http://localhost:3005');
const OLLAMA_URL = getArg('ollama-url', 'http://localhost:11434');
const OUTPUT_DIR = getArg('output-dir', join(__dirname, 'results'));
const LABEL = getArg('label', '');

// ---- Load cases + aliases ----
const CASES_PATH = join(__dirname, 'cases.json');
if (!existsSync(CASES_PATH)) {
  console.error(`Cases file not found: ${CASES_PATH}`);
  console.error(`Run: node extract-cases.mjs`);
  process.exit(1);
}
const { cases: ALL_CASES, seed, generatedAt } = JSON.parse(readFileSync(CASES_PATH, 'utf-8'));
const MATCH_ALIASES = JSON.parse(readFileSync(join(__dirname, 'match-aliases.json'), 'utf-8'));

// ---- Grading ----
function matchesN(expected, differentials, n) {
  const expLow = expected.toLowerCase();
  const expFirst = expLow.split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  const aliases = MATCH_ALIASES[expLow] || [];
  const topN = differentials.slice(0, n).map(d => String(d.diagnosis || '').toLowerCase());
  for (const d of topN) {
    if (!d) continue;
    if (d.includes(expFirst) || d.includes(expLow) || expLow.includes(d)) return true;
    for (const a of aliases) {
      if (d.includes(a) || a.includes(d)) return true;
    }
  }
  return false;
}

// ---- Provider dispatcher ----
async function dispatch(kase, provider) {
  if (provider === 'compass') return runCompass(kase, { compassUrl: COMPASS_URL });
  const tag = MODEL_TAGS[provider];
  if (!tag) throw new Error(`Unknown provider: ${provider}. Supported: compass, biomistral, meditron, llama3`);
  return runOllama(kase, { ollamaUrl: OLLAMA_URL, model: tag });
}

function getDelayMs(provider) {
  if (provider === 'compass') return COMPASS_INFO.defaultDelayMs;
  return OLLAMA_INFO.defaultDelayMs;
}

// ---- Full run ----
async function runFull() {
  if (!PROVIDER) {
    console.error('Missing --provider flag');
    printUsage();
    process.exit(1);
  }
  const cases = LIMIT ? ALL_CASES.slice(0, LIMIT) : ALL_CASES;
  const delayMs = getDelayMs(PROVIDER);
  const estimateMin = (cases.length * delayMs / 60000).toFixed(1);
  console.log(`\nProvider: ${PROVIDER}`);
  console.log(`Cases: ${cases.length}/${ALL_CASES.length} (seed ${seed}, generated ${generatedAt})`);
  console.log(`Delay between requests: ${delayMs}ms`);
  console.log(`Estimated runtime: ~${estimateMin} minutes\n`);

  const results = [];
  let hits1 = 0, hits3 = 0, hits5 = 0, errors = 0;

  for (let i = 0; i < cases.length; i++) {
    const kase = cases[i];
    const out = await dispatch(kase, PROVIDER);
    const t1 = matchesN(kase.expected, out.differentials, 1);
    const t3 = matchesN(kase.expected, out.differentials, 3);
    const t5 = matchesN(kase.expected, out.differentials, 5);
    if (t1) hits1++;
    if (t3) hits3++;
    if (t5) hits5++;
    if (!out.ok) errors++;
    const primary = out.differentials[0]?.diagnosis || '(none)';
    const mark = !out.ok ? 'ERR' : t1 ? 'HIT1' : t3 ? 'HIT3' : t5 ? 'HIT5' : 'MISS';
    const pct1 = ((hits1 / (i + 1)) * 100).toFixed(1);
    const pct3 = ((hits3 / (i + 1)) * 100).toFixed(1);
    const pct5 = ((hits5 / (i + 1)) * 100).toFixed(1);
    process.stdout.write(
      `\r[${i + 1}/${cases.length}] ${mark} | T1=${pct1}% T3=${pct3}% T5=${pct5}% | ${kase.expected.slice(0, 30)} → ${primary.slice(0, 30)} (${out.latencyMs}ms)        `
    );
    results.push({
      id: kase.id, demo: kase.demo, setting: kase.setting,
      expected: kase.expected, cc: kase.body.chiefComplaint,
      ok: out.ok, latencyMs: out.latencyMs,
      differentials: out.differentials,
      t1, t3, t5,
      raw: out.raw,
    });
    if (i < cases.length - 1 && delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const suffix = LABEL ? `-${LABEL}` : '';
  const baseName = `${PROVIDER}-${timestamp}${suffix}`;
  const mdPath = join(OUTPUT_DIR, `${baseName}.md`);
  const jsonPath = join(OUTPUT_DIR, `${baseName}.json`);

  writeReport(mdPath, jsonPath, PROVIDER, results, cases.length);
  console.log(`\n\n=== DONE (${PROVIDER}) ===`);
  console.log(`Top-1: ${hits1}/${cases.length} (${((hits1 / cases.length) * 100).toFixed(1)}%)`);
  console.log(`Top-3: ${hits3}/${cases.length} (${((hits3 / cases.length) * 100).toFixed(1)}%)`);
  console.log(`Top-5: ${hits5}/${cases.length} (${((hits5 / cases.length) * 100).toFixed(1)}%)`);
  console.log(`Errors: ${errors}/${cases.length}`);
  console.log(`\nReports:\n  ${mdPath}\n  ${jsonPath}`);
}

// ---- Reports ----
function writeReport(mdPath, jsonPath, provider, results, total) {
  const hits1 = results.filter(r => r.t1).length;
  const hits3 = results.filter(r => r.t3).length;
  const hits5 = results.filter(r => r.t5).length;
  const errors = results.filter(r => !r.ok).length;
  const latencies = results.filter(r => r.ok).map(r => r.latencyMs).sort((a, b) => a - b);
  const p = (pct) => latencies[Math.floor(latencies.length * pct)] || 0;

  // Per-condition table
  const byCond = new Map();
  for (const r of results) {
    const c = byCond.get(r.expected) || { tot: 0, t1: 0, t3: 0, t5: 0 };
    c.tot++;
    if (r.t1) c.t1++;
    if (r.t3) c.t3++;
    if (r.t5) c.t5++;
    byCond.set(r.expected, c);
  }
  const condSorted = Array.from(byCond.entries())
    .map(([cond, s]) => ({ cond, ...s, t3Rate: (s.t3 / s.tot) * 100 }))
    .sort((a, b) => a.t3Rate - b.t3Rate);

  let md = `# Benchmark Report — ${provider.toUpperCase()}\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Provider:** ${provider}\n`;
  md += `**Total cases:** ${total}\n\n`;
  md += `## Accuracy\n\n| Metric | Hits | % |\n|---|---|---|\n`;
  md += `| Top-1 | ${hits1} | ${((hits1 / total) * 100).toFixed(1)}% |\n`;
  md += `| Top-3 | ${hits3} | ${((hits3 / total) * 100).toFixed(1)}% |\n`;
  md += `| Top-5 | ${hits5} | ${((hits5 / total) * 100).toFixed(1)}% |\n`;
  md += `| Errors | ${errors} | ${((errors / total) * 100).toFixed(1)}% |\n\n`;
  md += `## Latency\n\n| Percentile | ms |\n|---|---|\n`;
  md += `| p50 | ${p(0.5)} |\n| p95 | ${p(0.95)} |\n| p99 | ${p(0.99)} |\n\n`;
  md += `## Per-Condition Top-3 Accuracy (sorted, worst first)\n\n`;
  md += `| Condition | n | Top-1 | Top-3 | Top-5 |\n|---|---|---|---|---|\n`;
  for (const c of condSorted) {
    md += `| ${c.cond} | ${c.tot} | ${c.t1}/${c.tot} | ${c.t3}/${c.tot} | ${c.t5}/${c.tot} |\n`;
  }
  md += `\n## Misses (not in top-3)\n\n`;
  md += `| ID | Demo | Setting | Expected | Top-3 Predicted | CC |\n|---|---|---|---|---|---|\n`;
  for (const r of results) {
    if (r.t3 || !r.ok) continue;
    const top3 = r.differentials.slice(0, 3).map(d => d.diagnosis).join(' \\| ');
    md += `| ${r.id} | ${r.demo} | ${r.setting} | ${r.expected} | ${top3} | ${r.cc.slice(0, 60)} |\n`;
  }

  writeFileSync(mdPath, md);
  writeFileSync(jsonPath, JSON.stringify({
    provider, total, hits1, hits3, hits5, errors,
    latency: { p50: p(0.5), p95: p(0.95), p99: p(0.99) },
    results,
  }, null, 2));
}

// ---- Compare mode ----
async function runCompare() {
  const providers = COMPARE.split(',').map(s => s.trim());
  const reports = {};
  for (const prov of providers) {
    // Find most recent JSON result for this provider
    const files = existsSync(OUTPUT_DIR) ? readdirSync(OUTPUT_DIR).filter(f => f.startsWith(`${prov}-`) && f.endsWith('.json')) : [];
    if (files.length === 0) {
      console.error(`No result file found for ${prov} in ${OUTPUT_DIR}. Run: --provider ${prov}`);
      process.exit(1);
    }
    files.sort();
    const latest = files[files.length - 1];
    const json = JSON.parse(readFileSync(join(OUTPUT_DIR, latest), 'utf-8'));
    reports[prov] = { filename: latest, ...json };
    console.log(`Loaded ${prov} <- ${latest}`);
  }

  // Side-by-side markdown
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const mdPath = join(OUTPUT_DIR, `comparison-${timestamp}.md`);
  let md = `# LLM Diagnostic Accuracy Comparison\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n| Metric | ${providers.join(' | ')} |\n`;
  md += `|---${providers.map(() => '|---').join('')}|\n`;
  md += `| Cases | ${providers.map(p => reports[p].total).join(' | ')} |\n`;
  md += `| Top-1 % | ${providers.map(p => ((reports[p].hits1 / reports[p].total) * 100).toFixed(1)).join(' | ')} |\n`;
  md += `| Top-3 % | ${providers.map(p => ((reports[p].hits3 / reports[p].total) * 100).toFixed(1)).join(' | ')} |\n`;
  md += `| Top-5 % | ${providers.map(p => ((reports[p].hits5 / reports[p].total) * 100).toFixed(1)).join(' | ')} |\n`;
  md += `| Errors | ${providers.map(p => reports[p].errors).join(' | ')} |\n`;
  md += `| p50 latency (ms) | ${providers.map(p => reports[p].latency.p50).join(' | ')} |\n`;
  md += `| p95 latency (ms) | ${providers.map(p => reports[p].latency.p95).join(' | ')} |\n`;
  md += `| p99 latency (ms) | ${providers.map(p => reports[p].latency.p99).join(' | ')} |\n\n`;

  // Per-condition heatmap
  const allConds = new Set();
  for (const p of providers) for (const r of reports[p].results) allConds.add(r.expected);
  md += `## Per-Condition Top-3 Accuracy (heatmap)\n\n`;
  md += `| Condition | ${providers.join(' | ')} |\n|---${providers.map(() => '|---').join('')}|\n`;
  for (const cond of [...allConds].sort()) {
    const row = [cond];
    for (const p of providers) {
      const results = reports[p].results.filter(r => r.expected === cond);
      const hits = results.filter(r => r.t3).length;
      const tot = results.length;
      row.push(tot > 0 ? `${hits}/${tot} (${((hits / tot) * 100).toFixed(0)}%)` : '-');
    }
    md += `| ${row.join(' | ')} |\n`;
  }

  md += `\n## Cases where providers disagree (any provider missed top-3)\n\n`;
  const idxById = {};
  for (const p of providers) {
    for (const r of reports[p].results) {
      if (!idxById[r.id]) idxById[r.id] = { id: r.id, expected: r.expected, cc: r.cc, demo: r.demo, setting: r.setting, results: {} };
      idxById[r.id].results[p] = { t3: r.t3, top3: r.differentials.slice(0, 3).map(d => d.diagnosis).join(' \\| ') };
    }
  }
  const disagreements = Object.values(idxById).filter(x =>
    providers.some(p => !x.results[p]?.t3)
  );
  md += `| ID | Expected | ${providers.map(p => `${p} top-3`).join(' | ')} | CC |\n`;
  md += `|---|---${providers.map(() => '|---').join('')}|---|\n`;
  for (const d of disagreements.slice(0, 200)) {
    const cells = providers.map(p => d.results[p]?.top3 || '-');
    md += `| ${d.id} | ${d.expected} | ${cells.join(' | ')} | ${d.cc.slice(0, 60)} |\n`;
  }
  writeFileSync(mdPath, md);
  console.log(`\nComparison report: ${mdPath}`);
}

// ---- Usage ----
function printUsage() {
  console.log(`
Usage:
  node run-benchmark.mjs --provider <name> [options]
  node run-benchmark.mjs --compare <list> [options]

Providers: compass, biomistral, meditron, llama3

Options:
  --limit <n>           First N cases only
  --compass-url <url>   Default http://localhost:3005
  --ollama-url <url>    Default http://localhost:11434
  --output-dir <path>   Default ./results
  --label <name>        Optional suffix for output filenames
  --compare a,b,c       Generate side-by-side comparison
`);
}

// ---- Main ----
(async () => {
  if (!existsSync(OUTPUT_DIR)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (COMPARE) return runCompare();
  if (PROVIDER) return runFull();
  printUsage();
  process.exit(1);
})();
