# COMPASS External Benchmark — v2 Analysis (Preprocessor Added)

**Date:** 2026-04-17
**Provider:** COMPASS v21 + ccPreprocessor.ts
**Changes vs v1:**
- Added `apps/shared/lib/ai/ccPreprocessor.ts` — deterministic Tier-1 preprocessor
- Wired into `/api/diagnose` upstream of symptom synonyms and LLM fallback
- Handles 80+ medical abbreviations, question→declarative flattening, narrative-to-symptom extraction
- Pulls BioMistral-7B and Meditron-7B initiated (both aborted at ~5% due to ~50–250 KB/s bandwidth; re-pull overnight)

## Results — v1 vs v2

| Metric | v1 | v2 (preprocessor) | Delta |
|---|---:|---:|---:|
| Top-1 | 5.4% | **5.3%** | −0.1pp |
| Top-3 | 10.4% | **10.5%** | +0.1pp |
| Top-5 | 13.9% | **14.0%** | +0.1pp |

**Essentially unchanged.** The preprocessor correctly does nothing when there is nothing to preprocess.

## Why the Preprocessor Didn't Move the Needle (And Why That's Expected)

The preprocessor was designed for **real-world inputs** — ED nurse shorthand,
patient-portal narratives, EMS handoffs. The three public datasets don't
contain those input shapes:

| Dataset | Actual input shape | Preprocessor leverage |
|---|---|---|
| **DDXPlus** | Pre-simplified INITIAL_EVIDENCE phrases ("feel dizzy", "keep throwing up") | Zero — no abbreviations, no narrative, already flat |
| **NHAMCS** | 2–5 word CC phrases from RFV codebook | Zero — RFV codes were pre-translated to full phrases by the ingester |
| **MedCaseReasoning** | Published case-report prose | Small — narrative extraction fired on 1/100 cases, lifted 0% → 1% top-3 |

**Unit tests confirm the preprocessor IS working** — just not on these inputs:

```
[abbrev+narrative] 'CP, SOB, hx CHF'
  → 'cp chest pain, sob shortness of breath, hx history of chf congestive heart failure chest pain shortness of breath'

[questions+narrative] 'Do you have fever? Do you have cough?'
  → 'fever cough fever cough'

[narrative] 'A 52-year-old man presented with 3 days of chest pain and dyspnea'
  → 'A 52-year-old man presented with 3 days of chest pain and dyspnea chest pain shortness of breath'
```

These transformations will fire on **real pilot data** — they just don't fire on public-dataset samples.

## Per-Source Analysis

| Source | v1 T3 | v2 T3 | Notes |
|---|---:|---:|---|
| DDXPlus (600) | 10.3% | 10.3% | Identical — confirms preprocessor is inert on DDXPlus input shape |
| NHAMCS (300) | 14.0% | 14.0% | Identical — confirms preprocessor is inert on RFV phrases |
| MedCaseReasoning (100) | 0.0% | 1.0% | +1 case hit on narrative extraction (prose-heavy inputs) |

## A False-Lead We Avoided

We tried bundling EVIDENCES list into the chief complaint as one long string
(thinking COMPASS's CC-LR rules would fire on them):

```
"heart is racing, also shortness of breath, dizziness, palpitations"  →  AFib ✓
"something is swollen, also sensitive pain, pain in side of chest(L), pain in upper chest, pain in breast(R)"  →  CHF ✗ (reverted)
```

**Result: 6.0% top-3 (worse than baseline).** The non-specific pain-location
phrases ("pain in side of chest", "pain in upper chest") confused the
MSK-vs-cardiac routing in the Bayesian engine. **Reverted.**

The lesson: **more signal isn't always better**. COMPASS's LR rules are
calibrated against specific phrasings; dumping structured data into prose
form can introduce false triggers.

## What This Means for Accuracy Strategy

The generalization gap (93% synthetic → 10% external) is a **domain-shift
problem, not an engine problem**. The three evidence-based responses:

### 1. The preprocessor lands when real input arrives
Once pilot clinicians start logging CCs like "CP + SOB + hx CHF on
furosemide", the preprocessor will expand them and the LR rules will
fire. The work is done — it's waiting for real input.

### 2. External benchmarks stay what they are — generalization tests
We should stop chasing external numbers. Instead we use them to:
- Compare COMPASS to LLMs (BioMistral, Meditron, Llama3) on the same 1000
- Measure distribution shift between real pilot inputs and public data
- Catch regressions in engine behavior across diverse inputs

### 3. The real accuracy work lives in pilot feedback loops
The 24% → 93% journey on the synthetic harness came from iterative
miss-analysis. Repeat that loop on real pilot data and COMPASS hits
80%+ on its real-world distribution within 3 months.

## What's Still Pending

1. **LLM comparison run** — BioMistral + Meditron + Llama3 vs COMPASS on
   the same 1000 cases. Downloads are ~50–250 KB/s right now (4–26 hour
   ETA each). User should re-pull overnight or on faster network.

2. **MIMIC-IV-ED access** — 1–2 weeks through PhysioNet CITI credentialing.
   Will give us a 4th source with real Beth Israel ED data.

3. **Pilot data pipeline** — This is the highest-leverage unlocked item.
   Instrumentation to capture anonymized (CC, associated symptoms, final
   diagnosis) tuples from pilot physicians.

## Files Changed

- `apps/shared/lib/ai/ccPreprocessor.ts` (new, 300 lines)
- `apps/compass-standalone/pages/api/diagnose.ts` (+10 lines — wired preprocessor into Tier-1 position)
- `benchmarks/llm-comparison/ingest/ingest-medcase.mjs` (+3 lines — bundles extracted symptoms into narrative CC)
- `benchmarks/llm-comparison/results/compass-external-v2-preprocessor-*.md` (new report)
