# COMPASS Stress Test — 500 API + 500 UI Cases

## Instructions

Give this prompt to Claude Code on the test machine after pulling the `dev` branch.

---

## Prompt (copy everything below this line)

I need to stress-test the COMPASS standalone application. The app is at `apps/compass-standalone` and runs on port 3005. First, start the dev server:

```bash
cd ATTENDING && npm run dev --prefix apps/compass-standalone
```

Wait for it to be ready on http://localhost:3005.

### PART 1: 500 API Cases

Create and run a test file `tmp-compass-test/run-tests-v9-500api.mjs` that sends 500 patient cases through the `/api/diagnose` endpoint using layman language (misspellings, slang, colloquial phrasing).

**Requirements:**
- IDs 700-1199
- Distribution: 125 peds (0-17), 200 adult (18-64), 175 geri (65+)
- Settings: mix of ED, UC, PC
- Each case: `{ id, demo, setting, expected, body: { chiefComplaint, gender, age, hpi: { onset, location, duration, character, severity, timing, aggravating, relieving, associated }, vitals, medications } }`
- POST each to `http://localhost:3005/api/diagnose`
- 3.5-second delay between cases (OIDC rate limit)
- Output: `results-v9.md` (per-case markdown), `results-v9.json` (raw data)

**Disease mix — include ALL of these at minimum (spread across demographics):**

Common (60% of cases): Acute MI (include 10 variants — atypical female MI with jaw pain/fatigue/nausea, atypical elderly MI with confusion, classic crushing chest pain, etc.), Stroke (5 variants), PE (5 variants), Pneumonia (5 variants), UTI (5 variants), Appendicitis (5 variants including retrocecal), Asthma (3 variants), Gastroenteritis (5 variants), Migraine (3 variants), Kidney Stone (3 variants), CHF (5 variants), DVT (3 variants), COPD exacerbation (3 variants), Pyelonephritis (3 variants), Meningitis (3 variants), DKA (3 variants), Sepsis (5 variants), Gout (3 variants), Pharyngitis/Strep (3 variants), Cellulitis (3 variants), Bronchitis (3 variants), Viral URI (3 variants), Pneumothorax (2 variants), Aortic Dissection (2 variants), SAH (2 variants), Ectopic Pregnancy (2 variants), Testicular Torsion (2 variants), Bell Palsy (2 variants), Diverticulitis (3 variants), Pancreatitis (3 variants), Cholecystitis (3 variants), Croup (2 variants), Otitis Media (3 variants), Febrile Seizure (2 variants), Hip Fracture (3 variants), GI Bleed (3 variants), Constipation (2 variants), BPPV (2 variants), Anaphylaxis (2 variants), Preeclampsia (2 variants), SLE (2 variants), Cauda Equina (2 variants)

Rare/exotic (40% of cases): Peritonsillar abscess, Nursemaid's elbow, Pyloric stenosis, Epiglottitis, HSP, SCFE, Acute rheumatic fever, Kawasaki, Intussusception, Ovarian torsion, Placental abruption, Tension pneumothorax, Status epilepticus, Addison crisis, Thyroid storm, Rhabdomyolysis, HELLP syndrome, Corneal abrasion, Orbital cellulitis, Ludwig's angina, Temporal arteritis/GCA, NPH, Spinal epidural abscess, Mesenteric ischemia, Aortic stenosis, Parkinson disease, Subdural hematoma, Vertebral compression fracture, AAA, Shingles, HFM, Chickenpox, Impetigo, Pinkeye, Foreign body ingestion, NAT, Bronchiolitis, EoE, Meralgia paresthetica, Fibromyalgia, POTS, Raynaud, PMR, Hyperemesis gravidarum, Ovarian cyst rupture, Endometriosis, Carpal tunnel, Plantar fasciitis, Trigger finger, De Quervain's, Frozen shoulder, Sciatica, Spinal stenosis, Bowel obstruction, Hemorrhoids, Pilonidal cyst, Basal cell carcinoma, Atrial fibrillation, Hypothyroidism, Depression, Panic attack, Delirium, Dementia, CKD, Urinary retention, Peripheral neuropathy

**Layman language examples to follow (vary these — never reuse exact phrasings):**
- "my chest feels like someones sittin on it" / "this pressure in my chest wont let up" / "feels like a vice grip on my chest"
- "my baby wont stop cryin and she keeps pullin at her ear" / "my kid is screamin and grabbin his ear"
- "i been pukin my guts out since last night" / "cant keep nothin down been throwin up all day"
- "cant catch my breath its like breathin through a straw" / "feel like im suffocatin"
- "everythings spinnin when i stand up" / "the rooms goin around and around"
- "burns like fire when i pee" / "feels like peein razor blades"

**Match function** (determines hit/miss):
```js
const hit = (r) => {
  if (!r.ok) return false;
  const expectedLower = (r.expected || '').toLowerCase();
  const expectedFirst = expectedLower.split(' ')[0].replace(/[^a-z]/g, '');
  const primary = (r.result?.differentials?.primaryDiagnosis?.diagnosis || '').toLowerCase();
  const topFive = (r.result?.differentials?.differentials || []).slice(0, 5).map(d => d.diagnosis.toLowerCase()).join(' | ');
  return primary.includes(expectedFirst) || topFive.includes(expectedLower) || topFive.includes(expectedFirst);
};
```

**Summary output** at the end should show:
- Overall accuracy (primary-or-top-5 match / total)
- By demographic (peds, adult, geri)
- By setting (ED, UC, PC)
- List of all misses with expected vs actual

---

### PART 2: 500 UI Cases

After the API test completes, run 500 patients through the **chat UI** using preview tools. This tests the full chat flow, not just the API.

**Setup:**
1. Start the preview server via `preview_start` (the dev server should already be running)
2. Navigate to `http://localhost:3005`

**For each case:**
1. Take a `preview_snapshot` to verify the chat is on the welcome screen
2. Click "Start Assessment" or equivalent button
3. For each chat phase, type the patient's response and send
4. Track phase transitions — log any anomalies:
   - Phase that took >10 seconds to transition
   - Phase that was skipped unexpectedly
   - `chiefComplaintClarify` phase firing (log whether it should have)
   - `generating` phase taking >5 seconds
   - Any JavaScript errors in console
5. After results appear, capture the differential via `preview_snapshot` or `preview_eval`
6. Reset the assessment via `preview_eval('window.__compassStore.getState().resetAssessment()')`
7. Wait 1500ms for reset to complete

**What to look for (anomalies):**
- Stuck phases (phase doesn't advance after message sent)
- Wrong phase order (e.g., jumping from chiefComplaint to hpiSeverity)
- Clarification phase firing on obvious medical terms ("chest pain" should NOT trigger clarification)
- Clarification phase NOT firing on gibberish ("asdfghjkl" SHOULD trigger clarification)
- Empty differential results
- "Needs in-person evaluation" at 0% confidence (this is a dead end)
- Console errors (preview_console_logs with level='error')
- Visual glitches (overlapping elements, missing text, broken layouts)

**Case distribution:** Same 125 peds / 200 adult / 175 geri split, IDs 1200-1699.

Use the same disease mix as the API test but with DIFFERENT phrasings. Include these specific edge cases:

- 10 cases with very short CCs: "hurts", "sick", "help", "not feeling good", "ow"
- 10 cases with very long CCs (200+ characters): run-on sentences describing multiple symptoms
- 5 cases with special characters: "can't", "don't", quotes, ampersands
- 5 cases with numbers: "pain is like a 12 out of 10", "been 3 days", "temperature 102.4"
- 5 cases with ALL CAPS: "MY CHEST HURTS SO BAD I CANT BREATHE"
- 5 cases with no punctuation: "my head hurts real bad and i been throwin up and the lights bother me"
- 5 cases where the patient changes their answer mid-flow (types something then corrects it)

**Output:** Create `results-v9-ui.md` with per-case results and anomaly log, and `results-v9-ui-anomalies.md` listing every anomaly found.

---

### PART 3: Comparative Report

After both suites complete, compile a report at `tmp-compass-test/results-v9-comprehensive.md`:

1. **API accuracy**: overall, by demographic, by setting, by condition category
2. **UI accuracy**: overall, by demographic, anomaly count and types
3. **API vs UI accuracy delta**: do the same cases score differently through the chat flow?
4. **Clarification phase analysis**: how often did it fire? Did it improve accuracy when it fired?
5. **"Needs in-person evaluation" rate**: how many cases dead-ended?
6. **Latency distribution**: p50, p95, p99 for API calls
7. **Top 10 most-missed conditions** with example CCs that failed
8. **Top 10 most-reliable conditions** with why they work
9. **Recommendations**: specific synonym additions or trigger changes that would fix the most misses
