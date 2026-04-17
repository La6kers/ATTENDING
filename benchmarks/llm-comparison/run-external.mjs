#!/usr/bin/env node
// ============================================================
// COMPASS external 1000-case benchmark runner
//
// Runs COMPASS against the DDXPlus + NHAMCS + MedCaseReasoning
// merged set (cases-1000-external.json). Separate from run-benchmark.mjs
// so the original 600-case seed 42 synthetic harness is unchanged.
//
// Usage:
//   node run-external.mjs --limit 1000 --delay 3500
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getArg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : d;
};
const LIMIT = parseInt(getArg('limit', '1000'), 10);
const DELAY = parseInt(getArg('delay', '3500'), 10);
const COMPASS_URL = getArg('compass-url', 'http://localhost:3005');
const CASES_FILE = getArg('cases', 'cases-1000-external.json');
const LABEL = getArg('label', 'external-1000');

const { cases } = JSON.parse(readFileSync(join(__dirname, CASES_FILE), 'utf-8'));
const ALIASES = JSON.parse(readFileSync(join(__dirname, 'match-aliases.json'), 'utf-8'));

// ---- Extended aliases for external datasets ----
const EXTRA_ALIASES = {
  // DDXPlus-specific labels
  'acute myocardial infarction': ['mi', 'myocardial infarction', 'acs', 'acute coronary', 'nstemi', 'stemi', 'possible nstemi / stemi'],
  'atrial fibrillation': ['afib', 'af', 'atrial fib'],
  'asthma exacerbation': ['asthma', 'bronchospasm', 'acute asthma'],
  'copd exacerbation': ['copd', 'acute copd', 'chronic obstructive'],
  'congestive heart failure': ['chf', 'heart failure', 'pulmonary edema', 'acute pulmonary edema'],
  'pulmonary embolism': ['pe', 'pulmonary embol'],
  'pharyngitis': ['strep throat', 'sore throat', 'viral pharyngitis'],
  'iron deficiency anemia': ['anemia', 'iron deficiency'],
  'anaphylaxis': ['severe allergic', 'anaphylactic'],
  'migraine': ['migraine headache'],
  'pneumonia': ['community acquired pneumonia', 'cap', 'lobar pneumonia'],
  'urinary tract infection': ['uti', 'cystitis', 'bladder infection'],
  'kidney stone': ['renal calculi', 'ureterolithiasis', 'nephrolithiasis'],
  'appendicitis': ['acute appendicitis'],
  'cholecystitis': ['acute cholecystitis', 'gallbladder'],
  'diverticulitis': ['acute diverticulitis'],
  'gastroenteritis': ['viral gastroenteritis', 'bacterial gastroenteritis', 'stomach flu'],
  'gerd': ['reflux', 'gastroesophageal reflux'],
  'sepsis': ['septic', 'septicemia', 'bacteremia'],
  'pulmonary embolism': ['pe', 'pulmonary embol'],
  'upper respiratory infection': ['uri', 'urti', 'common cold', 'cold'],
  'influenza': ['flu', 'viral syndrome'],
  'acute sinusitis': ['sinusitis', 'rhinosinusitis', 'sinus infection'],
  'tension headache': ['tension-type headache'],
  'cluster headache': ['cluster'],
  'guillain-barré syndrome': ['guillain-barre', 'gbs'],
  'myasthenia gravis': ['mg'],
  'lung cancer': ['pulmonary neoplasm', 'bronchogenic carcinoma'],
  'pancreatic cancer': ['pancreatic neoplasm'],
  'panic attack': ['panic disorder', 'anxiety attack'],
  'ischemic stroke': ['cva', 'stroke', 'cerebrovascular'],
  'subarachnoid hemorrhage': ['sah'],
  'diabetic ketoacidosis': ['dka'],
  'tia': ['transient ischemic attack'],
  'back pain': ['low back pain', 'lbp', 'lumbago'],
  'ankle sprain': ['sprained ankle'],
};

// Merge aliases
const ALL_ALIASES = { ...ALIASES };
for (const [k, v] of Object.entries(EXTRA_ALIASES)) {
  ALL_ALIASES[k] = [...(ALL_ALIASES[k] || []), ...v];
}

function matchesN(expected, differentials, n) {
  const expLow = String(expected).toLowerCase();
  const expFirst = expLow.split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  const aliases = ALL_ALIASES[expLow] || [];
  const topN = differentials.slice(0, n).map(d => String(d.diagnosis || '').toLowerCase());
  for (const d of topN) {
    if (!d) continue;
    if (d.includes(expFirst) || d.includes(expLow) || expLow.includes(d)) return true;
    for (const a of aliases) {
      const aLow = String(a).toLowerCase();
      if (d.includes(aLow) || aLow.includes(d)) return true;
    }
  }
  return false;
}

async function postCompass(body) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${COMPASS_URL}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const latencyMs = Date.now() - t0;
    // Response may wrap as {differentials: {differentials: [...]}} or {differentials: [...]}
    let rawList = json?.differentials;
    if (rawList && !Array.isArray(rawList) && Array.isArray(rawList.differentials)) {
      rawList = rawList.differentials;
    }
    if (!Array.isArray(rawList)) rawList = json?.diagnoses || [];
    const differentials = rawList.map(d => ({
      diagnosis: d.diagnosis || d.name || d.condition || '',
      probability: d.confidence || d.probability || d.prob || 0,
    }));
    return { ok: res.ok && differentials.length > 0, latencyMs, differentials, raw: json };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, differentials: [], raw: { error: String(e) } };
  }
}

// ---- Main ----
(async () => {
  const selected = cases.slice(0, LIMIT);
  const estMin = ((selected.length * DELAY) / 60000).toFixed(1);
  console.log(`External 1000-case run`);
  console.log(`Cases: ${selected.length} (delay ${DELAY}ms, est ~${estMin} min)`);
  console.log(`URL: ${COMPASS_URL}\n`);

  const results = [];
  let hits1 = 0, hits3 = 0, hits5 = 0, errors = 0;
  const bySource = new Map();
  for (let i = 0; i < selected.length; i++) {
    const kase = selected[i];
    const out = await postCompass(kase.body);
    const t1 = matchesN(kase.expected, out.differentials, 1);
    const t3 = matchesN(kase.expected, out.differentials, 3);
    const t5 = matchesN(kase.expected, out.differentials, 5);
    if (t1) hits1++;
    if (t3) hits3++;
    if (t5) hits5++;
    if (!out.ok) errors++;

    // Track per-source
    const s = bySource.get(kase.source) || { tot: 0, t1: 0, t3: 0, t5: 0 };
    s.tot++;
    if (t1) s.t1++;
    if (t3) s.t3++;
    if (t5) s.t5++;
    bySource.set(kase.source, s);

    const primary = out.differentials[0]?.diagnosis || '(none)';
    const mark = !out.ok ? 'ERR' : t1 ? 'HIT1' : t3 ? 'HIT3' : t5 ? 'HIT5' : 'MISS';
    const pct1 = ((hits1 / (i + 1)) * 100).toFixed(1);
    const pct3 = ((hits3 / (i + 1)) * 100).toFixed(1);
    const pct5 = ((hits5 / (i + 1)) * 100).toFixed(1);
    process.stdout.write(
      `\r[${i + 1}/${selected.length}] ${mark} | T1=${pct1}% T3=${pct3}% T5=${pct5}% | ${String(kase.expected).slice(0, 25)} → ${String(primary).slice(0, 25)} (${out.latencyMs}ms)              `
    );

    results.push({
      id: kase.id,
      source: kase.source,
      demo: kase.demo,
      setting: kase.setting,
      expected: kase.expected,
      cc: kase.body.chiefComplaint,
      ok: out.ok,
      latencyMs: out.latencyMs,
      differentials: out.differentials.slice(0, 10),
      t1, t3, t5,
    });
    if (i < selected.length - 1 && DELAY > 0) await new Promise(r => setTimeout(r, DELAY));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outDir = join(__dirname, 'results');
  const baseName = `compass-${LABEL}-${timestamp}`;
  const jsonPath = join(outDir, `${baseName}.json`);
  const mdPath = join(outDir, `${baseName}.md`);

  writeFileSync(jsonPath, JSON.stringify({
    provider: 'compass',
    label: LABEL,
    total: selected.length,
    hits1, hits3, hits5, errors,
    bySource: Object.fromEntries(bySource),
    results,
  }, null, 2));

  // Markdown report
  const latencies = results.filter(r => r.ok).map(r => r.latencyMs).sort((a, b) => a - b);
  const p = (q) => latencies[Math.floor(latencies.length * q)] || 0;
  let md = `# COMPASS External Benchmark — ${LABEL}\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Total:** ${selected.length} (DDXPlus + NHAMCS + MedCaseReasoning)\n\n`;
  md += `## Accuracy\n\n| Metric | Hits | % |\n|---|---|---|\n`;
  md += `| Top-1 | ${hits1} | ${((hits1 / selected.length) * 100).toFixed(1)}% |\n`;
  md += `| Top-3 | ${hits3} | ${((hits3 / selected.length) * 100).toFixed(1)}% |\n`;
  md += `| Top-5 | ${hits5} | ${((hits5 / selected.length) * 100).toFixed(1)}% |\n`;
  md += `| Errors | ${errors} | ${((errors / selected.length) * 100).toFixed(1)}% |\n\n`;
  md += `## By Source\n\n| Source | N | Top-1 | Top-3 | Top-5 |\n|---|---|---|---|---|\n`;
  for (const [s, v] of bySource.entries()) {
    md += `| ${s} | ${v.tot} | ${((v.t1 / v.tot) * 100).toFixed(1)}% | ${((v.t3 / v.tot) * 100).toFixed(1)}% | ${((v.t5 / v.tot) * 100).toFixed(1)}% |\n`;
  }
  md += `\n## Latency\n\n| p50 | p95 | p99 |\n|---|---|---|\n| ${p(0.5)}ms | ${p(0.95)}ms | ${p(0.99)}ms |\n\n`;
  md += `## Per-Condition Top-3 Accuracy (sorted, worst first)\n\n`;
  const byCond = new Map();
  for (const r of results) {
    const c = byCond.get(r.expected) || { tot: 0, t1: 0, t3: 0, t5: 0 };
    c.tot++; if (r.t1) c.t1++; if (r.t3) c.t3++; if (r.t5) c.t5++;
    byCond.set(r.expected, c);
  }
  const condSorted = Array.from(byCond.entries())
    .map(([cond, v]) => ({ cond, ...v, t3Rate: v.t3 / v.tot }))
    .sort((a, b) => a.t3Rate - b.t3Rate);
  md += `| Condition | n | Top-1 | Top-3 | Top-5 |\n|---|---|---|---|---|\n`;
  for (const c of condSorted) {
    md += `| ${c.cond} | ${c.tot} | ${c.t1}/${c.tot} | ${c.t3}/${c.tot} | ${c.t5}/${c.tot} |\n`;
  }
  writeFileSync(mdPath, md);

  console.log(`\n\n=== DONE ===`);
  console.log(`Top-1: ${hits1}/${selected.length} (${((hits1 / selected.length) * 100).toFixed(1)}%)`);
  console.log(`Top-3: ${hits3}/${selected.length} (${((hits3 / selected.length) * 100).toFixed(1)}%)`);
  console.log(`Top-5: ${hits5}/${selected.length} (${((hits5 / selected.length) * 100).toFixed(1)}%)`);
  console.log(`Errors: ${errors}`);
  console.log(`\nBy source:`);
  for (const [s, v] of bySource.entries()) {
    console.log(`  ${s}: T3=${((v.t3 / v.tot) * 100).toFixed(1)}% (${v.t3}/${v.tot})`);
  }
  console.log(`\nReports:\n  ${mdPath}\n  ${jsonPath}`);
})();
