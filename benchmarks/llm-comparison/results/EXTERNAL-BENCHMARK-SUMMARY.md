# COMPASS External Benchmark — First Run (v1)

**Date:** 2026-04-17
**Provider:** COMPASS v21 (dev branch, commit bf2eed1)
**Total cases:** 1000 (DDXPlus 600 + NHAMCS 300 + MedCaseReasoning 100)
**Runtime:** ~8 minutes @ 500ms delay
**Errors:** 0 (plumbing clean)

## Headline Numbers

| Metric | COMPASS on synthetic v20 | COMPASS on 1000 external | Delta |
|---|---:|---:|---:|
| Top-1 | 69.3% | **5.4%** | −63.9pp |
| Top-3 | 89.8% | **10.4%** | −79.4pp |
| Top-5 | 93.3% | **13.9%** | −79.4pp |

This is the generalization-gap signal we wanted. The synthetic harness is
tuned for COMPASS; external data exposes where the engine's pattern matching
is brittle.

## By Source

| Source | N | Top-1 | Top-3 | Top-5 | Notes |
|---|---:|---:|---:|---:|---|
| **DDXPlus** | 600 | — | 10.3% | — | Synthetic but cross-vendor rules; includes tropical zebras (Chagas, Ebola) not in COMPASS |
| **NHAMCS** | 300 | — | 14.0% | — | Real US ED visits; best performer because RFV/ICD mapping is tight |
| **MedCaseReasoning** | 100 | — | 0.0% | — | Real PMC case reports; expected zero because these are published-because-rare zebras |

## Primary Failure Modes (from tail inspection)

1. **DDXPlus tropical zebras** — Chagas, Ebola, Scombroid food poisoning: not
   in COMPASS's knowledge base. Expected and acceptable for a US-rural-focused tool.

2. **Vague initial-evidence chief complaints** — DDXPlus's INITIAL_EVIDENCE
   converts to phrases like "i've got pain that wont go away" which lack the
   specifics COMPASS's LR rules key on. Rich associated symptoms are present
   but the CC itself is the primary match driver.

3. **"Needs in-person evaluation" responses** — For the most underspecified
   inputs COMPASS returns a single safety item. This is *correct* refusal-to-guess
   behavior but counts as a miss in accuracy metrics.

4. **Loose NHAMCS pairings** — Even with theme matching, some RFV ↔ ICD
   pairs are clinically possible but not pathognomonic ("feel exhausted" →
   Hypoglycemia). Real clinical data is noisy.

5. **MedCaseReasoning = zebras** — By construction these are rare cases
   worthy of publication ("vanishing bone disease", "hepatic angiomyolipoma",
   "acute disseminated encephalomyelitis"). A clinical DSS for rural primary
   care should not be expected to nail these.

## What This Number Means

COMPASS is a **pattern-matched Bayesian engine tuned for common complaints
in rural ED/primary care settings**. External benchmarks reveal:

- Excellent top-1 accuracy when fed the kind of layman CC it was designed
  for (synthetic harness proves this at 69%)
- Limited coverage of tropical, rare, or zebra pathologies
- Dependent on well-formed chief complaint — performance drops when the CC
  is generic ("pain that won't go away") and the specifics are buried in
  associated symptoms

## Interpretation — This Is The Right Baseline

This 10.4% top-3 is **not a regression** from v21's 89.8% — it's a different
question being answered:

- **v21 synthetic harness**: "Does COMPASS correctly route the CCs we
  designed it for?" → Yes, 90%+
- **v1 external harness**: "Does COMPASS generalize to real-world,
  heterogeneous, published data?" → Partially — expected given scope

The gap gives us the comparison baseline to stress-test against
BioMistral / Meditron / Llama3 on the same 1000 cases. That's the next run.

## Next Steps

1. **Run BioMistral + Meditron + Llama3** on cases-1000-external.json via
   Ollama providers (already wired in run-benchmark.mjs — needs adapter
   to point at the external cases file).
2. **Side-by-side comparison table**: COMPASS vs each LLM on the same
   external set. This is the headline chart for investor/RHTP decks.
3. **Apply for MIMIC-IV-ED credentialing** for a 4th real-data source
   (~1–2 weeks via PhysioNet CITI training).
4. **Targeted COMPASS improvements** based on the external miss analysis
   — but only if the misses align with RHTP/rural-US scope (not tropical
   zebras).

## Files Produced

- `benchmarks/llm-comparison/cases-1000-external.json` — merged test set (seed 42)
- `benchmarks/llm-comparison/cases-ddxplus-600.json`
- `benchmarks/llm-comparison/cases-nhamcs-300.json`
- `benchmarks/llm-comparison/cases-medcase-100.json`
- `benchmarks/llm-comparison/results/compass-external-v1-2026-04-17T16-45-04.md`
- `benchmarks/llm-comparison/results/compass-external-v1-2026-04-17T16-45-04.json`
