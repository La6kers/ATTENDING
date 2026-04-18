# COMPASS Architecture — Design Review & Recommendations

**Date:** 2026-04-17
**Branch:** mockup-2 (up to date with origin/dev)
**Latest commit:** 1b54602 (merge of ccPreprocessor + external 1000-case validation)
**Scope:** Diagnostic engine, preprocessing pipeline, benchmark harness, validation strategy

---

## 1. Where the architecture stands today

### 1.1 The engine pipeline (as of v21)

```
HTTP POST /api/diagnose
  │
  ├── Zod validation + rate limit + origin check
  │
  ├── Tier-1  ccPreprocessor        (regex, deterministic, 390 LOC)
  │           ↳ abbreviation expansion, narrative extraction, question flattening
  │
  ├── Tier-2  symptomSynonyms       (regex, 960 LOC)
  │           ↳ layman-to-canonical substring matching (`.includes`)
  │
  ├── Tier-3  ccNormalizer          (LLM, 213 LOC, optional)
  │           ↳ fires only when tiers 1–2 produce no known-symptom match
  │
  ├── Image-finding merge           (red flags + per-region answers)
  │
  └── DifferentialDiagnosisService  (2,585 LOC)
              ↳ Bayesian engine: prevalence → LR → posterior
              │   • PREVALENCE_DATA.find()  → first-match-wins (4,620 LOC)
              │   • ccLRRules               → keyword likelihood-ratio overlay
              │   • symptomDiagnosisBoosts  → secondary symptom bumps (377 LOC)
              │   • medicationDiagnosisRules→ drug-induced diagnosis path (126 LOC)
              │   • SYMPTOM_DIAGNOSIS_MAP  → string-match fallback
              │
              └── "Needs in-person evaluation"  → refusal-to-guess floor
```

Total diagnostic module surface: **11,310 LOC** across 13 files in `apps/shared/lib/ai/`.

### 1.2 Two accuracy regimes, two meanings

| Harness | N | Top-3 | What it measures |
|---|---:|---:|---|
| Synthetic (v21 layman-CC) | 600 | ~93% | Route coverage for designed-for complaint shapes |
| External (DDXPlus + NHAMCS + MedCase) | 1000 | 10.5% | Generalization to heterogeneous public data |

The synthetic number is the engineering signal. The external number is the distribution-shift signal. Both matter for different reasons.

---

## 2. What's working well

1. **Tiered preprocessing with fail-open fallback** — the ccPreprocessor → symptomSynonyms → LLM chain is correctly ordered (fast/cheap first, slow/expensive last) and each tier is independently testable.

2. **Bayesian engine with calibrated LR overlays** — the core math is sound and the LR rule system allows incremental, auditable calibration per miss.

3. **Refusal-to-guess as a first-class output** — "Needs in-person evaluation" is a feature, not a bug. It preserves clinical safety when inputs are underspecified.

4. **External benchmark harness is portable** — the `run-external.mjs` + `providers/ollama.mjs` split lets us reuse the same 1000 cases against COMPASS and any Ollama-served LLM. This is the right shape for investor/RHTP comparison charts.

5. **Monorepo structure holds up** — 8 apps + shared workspace, with the diagnostic engine cleanly co-located in `apps/shared/lib/ai/`. No cross-app leakage.

---

## 3. Design risks & accumulated debt

### 3.1 First-match-wins prevalence routing (highest-impact risk)

`PREVALENCE_DATA.find(p => p.triggerPatterns.some(r => r.test(cc)))` returns whichever category appears first in the array. We repeatedly hit this during the 24%→98% iteration:

- `/knee/i` catching "knees to chest" (infant intussusception)
- foot/ankle triggers catching "ankles swollen" (CHF)
- `/tingling/` catching hand tingling from hyperventilation

Each fix was a negative lookahead or narrower trigger. That's a whack-a-mole topology — every new category raises the chance of colliding with an earlier broad one.

**Risk:** adding the 101st prevalence category will cause a regression in the 7th.

### 3.2 Three overlapping match systems

The engine has (a) prevalence categories, (b) CC-keyword LR rules, and (c) the `SYMPTOM_DIAGNOSIS_MAP` fallback. These compete rather than compose:

- A ccLRRule can amplify a diagnosis that prevalence routing never selected
- The fallback map answers CCs that prevalence routing missed entirely
- There's no single place where "what matched and why" is recorded

**Risk:** a fix in one system can be silently cancelled by another. Diagnostic provenance is not traceable.

### 3.3 No regression firewall

We have a 600-case synthetic harness that grades. We do NOT have:
- A per-condition accuracy budget that fails CI if it drops
- A property-based test for "short trigger strings do not catch secondary mentions"
- A "golden cases" set that blocks merges on any failure

**Risk:** each future iteration can trade old wins for new ones without visibility.

### 3.4 Synthetic harness coevolution

The v21 synthetic test cases were authored in parallel with the engine. Passing 98% on that harness is evidence of good *coverage of the cases we imagined*, not of generalization. The 10.5% on external data confirms this.

**Risk:** investor decks that lead with "98% accuracy" will be challenged the first time a pilot clinician feeds the engine real ED handoff shorthand.

### 3.5 `clinicalPrevalence.ts` is 4,620 lines

One file holding the entire pretest-probability knowledge base is fine at 500 LOC. At 4,600 it's editable but diff-noisy, hard to review, and ordering-sensitive (see §3.1).

### 3.6 Preprocessor investment ahead of validation data

The ccPreprocessor is excellent work but v2 external analysis showed it moved results by +0.1pp because the public datasets don't contain the input shapes it targets (ED shorthand, narrative). This is fine — but it means **the validation signal for the preprocessor is waiting on pilot data**, not public data. Worth naming explicitly so we don't keep tuning it against the wrong distribution.

---

## 4. Recommended design changes — ranked by ROI

### R1. Replace first-match prevalence routing with weighted scoring  [CRITICAL]

Instead of `find()`, score every category that triggers and pick the highest score. Scoring signal per category:

- Length of matched pattern (longer = more specific)
- Number of matched patterns within that category
- Presence of context words the CC also contains (age band, gender, key symptoms)
- Optional anti-pattern penalty (explicit disqualifiers)

Keep the current `triggerPatterns` array, add an optional `specificity: number` and `antiPatterns: RegExp[]`. Default specificity = pattern source length. Backward-compatible.

**Effort:** medium (one file, new scoring function, unit tests)
**Payoff:** eliminates an entire class of routing bugs + frees us to add more categories without ordering anxiety

### R2. Unified match-log in the response  [HIGH]

Attach a `matchProvenance` field to every diagnosis in the result:

```ts
matchProvenance: {
  prevalenceCategory: 'foot/toe pain',
  triggeredBy: ['ankle.*swell'],
  lrRulesApplied: [{ rule: 'chf_ankle_edema', lr: 3.5 }],
  boostersApplied: ['orthopnea'],
  fallbackUsed: false,
}
```

Gives us trace-level debuggability and lets the UI (and physician) see *why* a diagnosis was suggested. Also makes miss-analysis during the pilot feedback loop 10× faster.

**Effort:** small–medium (plumbing across three match systems)
**Payoff:** every future iteration gets faster

### R3. Split `clinicalPrevalence.ts` into per-system files  [MEDIUM]

```
apps/shared/lib/ai/prevalence/
  ├── cardiovascular.ts       (MI, CHF, AFib, PE, aortic dissection…)
  ├── respiratory.ts          (asthma, COPD, pneumonia, bronchitis…)
  ├── abdominal.ts
  ├── musculoskeletal.ts
  ├── neurologic.ts
  ├── dermatologic.ts
  ├── ob-gyn.ts
  ├── pediatric-only.ts
  ├── geriatric-only.ts
  ├── environmental.ts
  ├── substance.ts
  └── index.ts               (flat export for the engine)
```

Makes review diffs narrower, reduces merge conflicts between feature branches, and creates natural module-level code-review ownership.

**Effort:** medium (file-moves + import updates; purely mechanical)
**Payoff:** permanent reduction in maintenance friction

### R4. Regression firewall with per-condition accuracy budgets  [HIGH]

Add `tmp-compass-test/regression-budget.json`:
```json
{
  "generatedFrom": "v21",
  "global": { "top1": 65, "top3": 88, "top5": 92 },
  "perCondition": {
    "Acute Myocardial Infarction": { "top3": 100 },
    "Stroke": { "top3": 100 },
    "Pulmonary Embolism": { "top3": 100 }
    // …96 more
  }
}
```

Then a CI step that runs the v21 harness and fails the build if any budget regresses by more than N percentage points. Creates a one-way ratchet — accuracy can only go up.

**Effort:** small (the harness already tracks per-condition hit rates)
**Payoff:** eliminates silent regressions; investor-credible claim becomes "never below X% on condition Y, tested on every commit"

### R5. Pilot-data capture loop  [HIGHEST STRATEGIC VALUE]

The external benchmark gap (93% → 10%) is a distribution-shift problem. It cannot be closed by iterating against DDXPlus. It can only be closed by iterating against the actual distribution of inputs rural primary-care clinicians produce.

Design a minimal, HIPAA-safe capture pipeline:

- At request time: hash `(CC, age-band, gender, redFlags)` → store the tuple plus returned top-5 and physician's confirmed-in-chart diagnosis (captured 24–72h later from the EMR)
- Aggregate weekly into a "pilot-miss" analysis report
- Feed those misses back into the same miss-driven iteration loop that took v15 to v21

**Effort:** large (schema, consent, audit log, EMR reconciliation)
**Payoff:** the only thing that will actually raise the real-world accuracy number; unblocks everything else in the long run

### R6. Benchmark harness unification  [SMALL]

There are now three test runners:
- `tmp-compass-test/run-tests-v21-600api.mjs` (synthetic)
- `benchmarks/llm-comparison/run-benchmark.mjs` (portable LLM vs COMPASS)
- `benchmarks/llm-comparison/run-external.mjs` (1000-case external)

All three implement the same grader (`matchesN` with alias support) independently. Extract a shared `grader.mjs` in `benchmarks/lib/` and have each runner import it. Prevents the graders from drifting and producing incomparable numbers.

**Effort:** small
**Payoff:** all three scoreboards stay comparable forever

### R7. Type the match provenance and surface it in the admin UI  [LOW]

Once R2 ships, expose it in `compass-admin` as a "why" drawer next to each diagnosis. Two consumers win:
- Dr. Isbell during miss review gets instant cause-of-failure
- Pilot clinicians get transparency ("the engine ranked PE highly because of sudden-onset + leg swelling + immobility"), which is an adoption accelerator

**Effort:** medium (UI work, not engine work)
**Payoff:** physician trust; reviewer credibility

---

## 5. Proposed next architecture (after R1 + R2)

```
/api/diagnose
  │
  ├── Tier-1 ccPreprocessor      (unchanged)
  ├── Tier-2 symptomSynonyms     (unchanged)
  ├── Tier-3 ccNormalizer (LLM)  (unchanged)
  │
  ├── PrevalenceRouter.score(cc) → [{category, score, matchedPatterns}, …]
  │       (replaces .find(); weighted scoring with anti-patterns)
  │
  ├── BayesianCombiner
  │       inputs:
  │         - top-k categories from router  (currently forced to 1)
  │         - CC-keyword LR overlay
  │         - symptom booster overlay
  │         - medication overlay
  │         - image finding overlay
  │       output: ranked differentials with provenance
  │
  └── Response
        {
          differentials: [...],
          matchProvenance: { category, triggeredBy, lrRulesApplied, ... },
          refusalReason?: "underspecified input — requires in-person evaluation"
        }
```

Two structural changes from today:

1. The router returns **top-k categories**, not first match. The Bayesian combiner blends them with category scores as prior weights.
2. Every diagnosis carries its audit trail. No silent matches.

---

## 6. Validation strategy going forward

| Signal | Purpose | Target |
|---|---|---|
| v21 synthetic (600) | Engineering smoke test, never-regress budget | ≥ 98% top-5 |
| External 1000 | Generalization tripwire; LLM-vs-COMPASS comparison | Hold steady; do not chase number |
| Pilot-data loop | The number that actually matters to users | 80% top-3 on live distribution within 3 months of launch |
| Regression CI | Every PR; per-condition budgets | 0 red conditions |

Stop publishing "98%" as the headline. Lead with the **v21 synthetic number AND the external number side by side**, with the explanation that the gap is distribution-shift that only pilot data closes. This is the defensible, physician-credible framing.

---

## 7. Implementation sequence (if I were ordering the work)

1. **R2 (match-provenance)** — enables all other work; one week
2. **R4 (regression budgets)** — one afternoon; locks in v21 gains permanently
3. **R6 (grader unification)** — one afternoon
4. **R1 (weighted routing)** — one week; the highest-ROI engine change
5. **R3 (file split)** — one afternoon; do while R1 is fresh
6. **R5 (pilot capture)** — the long tail; start the design now, ship in pilot phase
7. **R7 (admin UI "why" drawer)** — after R2 ships

Total engineering time to land R1–R4: roughly **2–3 weeks of focused work**, and every change is independently shippable.

---

## 8. What NOT to do

- **Do not** keep adding categories and LR rules against the synthetic harness only. The marginal v21→v22→v23 synthetic gains are now in the noise and do not transfer to real-world use.
- **Do not** tune the preprocessor against public-dataset inputs — the v2 analysis already proved the leverage isn't there.
- **Do not** chase the external 10.5% number with engine changes. Either accept it as the generalization baseline, or close it with pilot data. Never with more LR rules.
- **Do not** let the AI-provider code path ("biomistral", "azure-openai") creep back into the hot diagnosis path. COMPASS's value proposition is deterministic + auditable + offline-capable. LLMs stay in Tier-3 fallback.

---

**End of review.**
