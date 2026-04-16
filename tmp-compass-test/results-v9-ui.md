# COMPASS UI Stress Test — 500 Cases (v9)

**Date:** 2026-04-16
**Method:** Automated chat flow via `preview_eval` + `window.__compassStore`
**Total cases:** 500 (IDs 1200-1699)
**Runtime:** ~5.6 hours (40.6s avg per case including API generating phase)

---

## Executive Summary

All 500 cases completed successfully through the full chat UI flow (welcome through results). **Zero JavaScript errors, zero stuck phases, zero crashes.** The UI itself is rock-solid.

The primary finding is that **36.2% of cases (181/500) dead-end at "Needs in-person evaluation"** — the same prevalence coverage gaps seen in the API test, but amplified because the UI test includes more conditions outside the engine's current prevalence categories (ankle sprains, ear pain, eye redness, shoulder pain, nosebleeds, allergies, anxiety).

---

## Overall Results

| Metric | Value |
|---|---|
| **Total cases** | 500 |
| **Successful completions** | 500 (100%) |
| **Clarification phase fired** | 41 (8.2%) |
| **Dead-end results** | 181 (36.2%) |
| **Red flags detected** | 33 cases (6.6%) |
| **JS errors** | 0 |
| **Stuck phases** | 0 |
| **Phase order violations** | 0 |

## Latency (full chat flow)

| Percentile | ms |
|---|---|
| p50 | 18,011 |
| p95 | 22,020 |
| p99 | 23,028 |

Note: This includes all 16+ chat interactions and the `/api/diagnose` API call during the generating phase. The API call itself is <25ms (local Bayesian engine); the rest is React state updates and rendering.

---

## 1. Phase Flow Integrity

**Result: PASS** — All 500 cases followed the correct phase order without any skips or wrong transitions:

```
welcome → demographics → age → vitals → medications → chiefComplaint
  → [chiefComplaintClarify if triggered]
  → hpiOnset → hpiLocation → hpiDuration → hpiCharacter → hpiSeverity
  → hpiTiming → hpiContext → hpiAggravating → hpiRelieving → hpiAssociated
  → [symptomSpecific if condition-specific questions exist]
  → askingMultipleComplaints → generating → results
```

No cases got stuck, no phases were skipped, no unexpected phases appeared.

---

## 2. Clarification Phase Analysis

**41 of 500 cases (8.2%) triggered the `chiefComplaintClarify` phase.**

### Short CC edge cases (10 cases)
| CC | Clarify? | After Clarification |
|---|---|---|
| "hurts" | NO | Needs in-person evaluation |
| "sick" | YES | Viral infection |
| "help" | YES | COPD exacerbation |
| "not feeling good" | YES | Gastroenteritis |
| "ow" | YES | Needs in-person evaluation |
| "bad" | YES | BPPV |
| "pain" | NO | Abdominal wall hernia |
| "bleh" | YES | Acute Gastroenteritis |
| "ugh" | YES | Spinal Stenosis |
| "idk" | YES | Viral Pharyngitis |

**Finding:** "hurts" and "pain" did NOT trigger clarification even though they're vague single words. This is because `matchesKnownSymptom()` returns `true` for these — the synonym system maps "hurt" and "pain" to known medical terms. The question is whether this is correct behavior: "pain" alone with no location or context probably should trigger clarification.

### Clarification outcome analysis
- Of 41 cases that triggered clarification: **only 1 (2.4%) still dead-ended**
- Of 41 cases that triggered clarification: **29 (70.7%) returned "Musculoskeletal pain"**
- Of 459 cases without clarification: **180 (39.2%) dead-ended**

**Conclusion:** Clarification dramatically reduces dead-ends (2.4% vs 39.2%) but over-routes to "Musculoskeletal pain" when the clarification answer describes a non-specific symptom. The clarification text replaces the original CC for engine processing, so if the clarified answer is still vague, it defaults to the most common diagnosis.

---

## 3. Edge Case Input Behavior

### ALL CAPS (5 cases)
| CC | Primary | Notes |
|---|---|---|
| MY CHEST HURTS SO BAD I CANT BREATHE | Musculoskeletal pain | Should prioritize cardiac/respiratory |
| IM HAVING THE WORST HEADACHE OF MY LIFE | Subarachnoid Hemorrhage | Correct! |
| MY KID IS BURNING UP WITH FEVER AND WONT STOP CRYING | Viral infection | Generic but reasonable |
| I CANT FEEL MY LEFT ARM AND MY FACE IS DROOPING | Stroke | Correct! |
| THERES BLOOD IN MY STOOL AND IM DIZZY | BPPV | Wrong — should consider GI bleed |

**Finding:** ALL CAPS input works fine — no parsing errors. The engine handles it via `.toLowerCase()`. 3/5 cases produced clinically reasonable results.

### Long CCs (200+ chars, 10 cases)
- **0 triggered clarification** (expected — long CCs contain enough keywords)
- **1 dead-ended** ("husband acting strange" — delirium not in prevalence data)
- **0 JS errors or truncation issues**

**Finding:** Long inputs are handled correctly. No buffer overflows, no truncation, no parsing issues. The 500-char Zod limit on `chiefComplaint` would truncate the longest ones in production, but the UI chat flow passes the full text through the store without hitting the API validation limit.

### Special Characters (5 cases)
- Apostrophes (`can't`, `don't`, `cryin'`): Handled correctly
- Ampersands (`&`): Handled correctly
- Quotes (`"vice grip"`): Handled correctly, but this CC dead-ended — the quotes may interfere with keyword matching
- Em dash (`—`): Handled correctly

**Finding:** 2/5 dead-ended but not due to special character parsing — the underlying CCs were just too vague.

### Numbers (5 cases)
- **3/5 dead-ended** — "pain is like a 12 out of 10", "blood pressure was 180/110", "heart rate over 120" are not recognized as symptom descriptions
- "temperature 102.4" triggered clarification, then got "Musculoskeletal pain"

**Finding:** Numbers in CCs are poorly handled. The engine doesn't extract clinical meaning from numeric values in the chief complaint. "blood pressure 180/110" should trigger hypertensive emergency, "temperature 102.4" should trigger fever workup, but these are treated as unrecognized text.

### No Punctuation (5 cases)
- **4/5 produced results** (no dead-end)
- **1 dead-ended** ("diarrhea for four days with blood")

**Finding:** Lack of punctuation has minimal impact. The normalizer handles run-on text well.

---

## 4. Dead-End Analysis ("Needs in-person evaluation")

**181 cases (36.2%)** returned the dead-end fallback. The bulk (126 cases, 70%) come from the padded conditions that have no prevalence data at all:

| Condition | Dead-ends | Notes |
|---|---|---|
| Abdominal Pain (generic) | 16 | No specific prevalence trigger |
| Ankle Sprain | 15 | Not in any prevalence category |
| Sore Throat | 15 | Matches pharyngitis — engine recognizes "sore throat" but this phrasing missed |
| Ear Pain | 15 | No ear pain prevalence category |
| Eye Redness | 15 | No eye complaint prevalence category |
| Shoulder Pain | 15 | No shoulder pain prevalence category |
| Nosebleed | 15 | No epistaxis prevalence category |
| Anxiety | 15 | Not in prevalence data |
| Allergies | 15 | Not in prevalence data |
| Stroke | 4 | Specific phrasings that didn't match FAST patterns |
| Gout | 3 | "big toe" → no foot pain prevalence |
| Cellulitis | 3 | "skin redness" → no dermatologic prevalence |
| Corneal Abrasion | 3 | No ocular prevalence |

**Key insight:** The prevalence engine only covers ~15 chief complaint categories (chest pain, headache, abdominal pain, SOB, fever, dizziness, back pain, weakness, knee pain, sore throat, cough, urinary, depression, anxiety). Everything outside these categories falls to the `SYMPTOM_DIAGNOSIS_MAP` legacy path, which has very limited coverage.

---

## 5. Most Common Diagnoses Returned

| # | Diagnosis | Count | Notes |
|---|---|---|---|
| 1 | Needs in-person evaluation | 181 | Dead-end |
| 2 | Musculoskeletal pain | 45 | Over-applied catch-all |
| 3 | Contact Dermatitis | 27 | Rash cases |
| 4 | Tension headache | 19 | Headache prevalence working |
| 5 | Viral Pharyngitis | 18 | Sore throat prevalence working |
| 6 | UTI | 18 | Urinary prevalence working |
| 7 | Depression | 17 | Depression prevalence working |
| 8 | Meniscal Tear | 16 | Knee pain prevalence working |
| 9 | Viral infection | 15 | Generic catch-all |
| 10 | Cracked tooth | 15 | Toothache → dental correctly |

---

## 6. Red Flag Detection

**33 cases (6.6%) triggered at least one red flag.** This is appropriate — the test included many emergency conditions (stroke, MI, PE, DKA, meningitis, anaphylaxis, etc.) that should trigger red flags.

---

## 7. Reset Reliability

**100% success** — All 500 cases properly reset via `resetSession()` between runs. Phase returned to `welcome` with a single welcome message every time. No state leakage between cases.

---

## 8. Recommendations (UI-Specific)

### Clarification triggers
1. **"hurts" and "pain" alone should trigger clarification** — `matchesKnownSymptom()` is too permissive for single generic words without location context
2. **Numeric-only CCs should trigger clarification** — "pain is 12 out of 10" and "BP 180/110" contain no symptom keywords

### Prevalence coverage
3. **Add prevalence categories** for: ear pain, eye complaints, shoulder pain, ankle/foot pain, nosebleed, allergies, skin rash, anxiety (as distinct from depression)
4. **Numeric value extraction** — parse temperatures, BP readings, and heart rates from chief complaint text and route to vitals-based LRs

### UI hardening
5. The UI is already very solid — no crashes, no stuck phases, no rendering issues across 500 varied inputs including edge cases
6. Consider adding a **CC length warning** if the user types >500 chars (the Zod schema will truncate at 500)
