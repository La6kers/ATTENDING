# COMPASS ML Feedback Loop

**Status:** Engine implemented 2026-04-18. Pending: Prisma migration + pilot data.

This document describes the end-to-end pipeline that turns live clinical use into measurable, iterable accuracy improvements.

---

## 1. The data flow

```
Patient / chat     Physician                Lab orders         Imaging             Encounter close
   (CC + HPI)      (initial dx)             (results)          (results)           (final confirmed dx)
       │                │                        │                  │                      │
       ▼                ▼                        ▼                  ▼                      ▼
POST /api/diagnose  POST /api/outcomes     POST /api/outcomes  POST /api/outcomes   POST /api/outcomes
                    action=physician-      action=lab-results  action=imaging-      action=finalize
                    diagnosis                                  results
       │                │                        │                  │                      │
       └────────────────┴────────────────────────┴──────────────────┴──────────────────────┘
                                                │
                                                ▼
                        DiagnosticOutcome row (keyed by requestId)
                                                │
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
           Weekly miss-analysis         Training-data export      Dashboard metrics
           (cron → pilot-miss-          (JSONL → offline ML)      (GET /api/outcomes/metrics)
            reports/YYYY-MM-DD.md)
```

Every `/api/diagnose` call creates a row immediately. Each downstream event (physician writes their impression, labs come back, imaging comes back, encounter closes) updates the same row via its `requestId`.

When the row is finalized, the service computes:
- `aiAccuracyAssessment`: `CONFIRMED` (AI rank-1 matched) / `PARTIAL` (in top-3 or top-5) / `REFUTED` (miss)
- `aiTopKWasRight`: 1, 3, 5, or 0

Those two fields are the ML training signal.

---

## 2. The 5 API endpoints

All POSTs to `/api/outcomes` use the same dispatcher with an `action` field.

### 2.1 `POST /api/diagnose`
*(already the engine endpoint — now also creates the outcome row)*

Request body additions (all optional):
```json
{
  "organizationId": "...",   // triggers DiagnosticOutcome persistence
  "assessmentId": "...",     // link to PatientAssessment if known
  "encounterId": "...",      // link to Encounter when present
  "patientId": "..."
}
```

Response additions:
```json
{
  "requestId": "uuid-v4",    // use this key for all downstream /api/outcomes calls
  "matchProvenance": { ... } // R2 trace
}
```

### 2.2 `POST /api/outcomes` — `action: "physician-diagnosis"`
```json
{
  "action": "physician-diagnosis",
  "requestId": "<from /api/diagnose>",
  "diagnosis": "Acute Myocardial Infarction",
  "icd10": "I21.9",
  "confidence": 4,            // 1-5
  "physicianId": "user-cuid"
}
```

### 2.3 `POST /api/outcomes` — `action: "lab-results"`
```json
{
  "action": "lab-results",
  "requestId": "...",
  "labOrders": [ { "name": "Troponin I", "loinc": "10839-9" } ],
  "labResults": [
    {
      "name": "Troponin I",
      "value": "0.45 ng/mL",
      "interpretation": "ABNORMAL",
      "supportsDiagnosis": "Acute MI"
    }
  ],
  "supportsAIDiagnosis": true,       // physician-adjudicated
  "supportsPhysicianDiagnosis": true
}
```

### 2.4 `POST /api/outcomes` — `action: "imaging-results"`
```json
{
  "action": "imaging-results",
  "requestId": "...",
  "imagingOrders": [ { "modality": "CT", "region": "chest w/ contrast", "cptCode": "71260" } ],
  "imagingResults": [
    {
      "modality": "CT",
      "region": "chest",
      "findings": "No acute pulmonary embolism, coronary calcification noted",
      "impression": "Coronary artery disease, no PE",
      "supportsDiagnosis": "CAD / ACS"
    }
  ],
  "supportsAIDiagnosis": true,
  "supportsPhysicianDiagnosis": true
}
```

### 2.5 `POST /api/outcomes` — `action: "finalize"`
The only action that sets `aiAccuracyAssessment` and `aiTopKWasRight`.
```json
{
  "action": "finalize",
  "requestId": "...",
  "finalDiagnosis": "Non-ST-elevation myocardial infarction",
  "icd10": "I21.4",
  "confirmedById": "user-cuid"
}
```
Response includes the computed verdict:
```json
{
  "success": true,
  "aiAccuracyAssessment": "CONFIRMED",
  "aiTopKWasRight": 1,
  "outcome": { ... }
}
```

### 2.6 `POST /api/outcomes` — `action: "provider-feedback"`
Thumbs-up/down + comments:
```json
{
  "action": "provider-feedback",
  "requestId": "...",
  "wasHelpful": true,
  "accuracyRating": 5,
  "comments": "Surfaced NSTEMI even though the CC was atypical"
}
```

### 2.7 `GET /api/outcomes?requestId=...`
Returns the full outcome row — used by the UI "why" drawer.

### 2.8 `GET /api/outcomes/metrics?organizationId=...&since=YYYY-MM-DD`
Returns aggregate hit rates for the dashboard:
```json
{
  "totalConfirmed": 412,
  "top1Hits": 256,
  "top3Hits": 352,
  "top5Hits": 378,
  "misses": 34,
  "top1Rate": 62.1,
  "top3Rate": 85.4,
  "top5Rate": 91.7
}
```

---

## 3. Operational scripts

### 3.1 Weekly miss-analysis
```bash
ORG_ID=<cuid> node scripts/ml-miss-analysis.mjs --days=7
```
Writes `docs/pilot-miss-reports/YYYY-MM-DD.md`. Aggregates `REFUTED` rows over the window, groups by (CC category, confirmed dx), and provides example `requestId`s for drill-down.

Run from a weekly cron (GitHub Actions scheduled workflow, or Azure Function timer trigger).

### 3.2 Training-data export
```bash
ORG_ID=<cuid> node scripts/export-training-data.mjs --since=2026-01-01
# Or dry-run:
ORG_ID=<cuid> node scripts/export-training-data.mjs --since=2026-01-01 --dry
```
Writes `tmp-ml-exports/batch_<timestamp>_<rand>.jsonl` and a sidecar `.meta.json`. Directory is auto-gitignored (PHI-adjacent — never commit).

Each row is an ML example with features + label + provenance:
```
{ "requestId": "...", "chiefComplaint": "...", "age": 65, "gender": "male",
  "hpi": {...}, "redFlags": [...], "aiDifferentials": [...],
  "matchProvenance": {...}, "physicianDiagnosis": "...",
  "labSupportsAIDiagnosis": true, "imagingSupportsAIDiagnosis": true,
  "finalConfirmedDiagnosis": "...", "finalConfirmedIcd10": "...",
  "aiAccuracyAssessment": "CONFIRMED", "aiTopKWasRight": 1, "confirmedAt": "..." }
```

Exported rows are stamped with `mlBatchId` and `mlExportedAt` so subsequent exports only capture new rows.

---

## 4. Regression CI (R4)

Every PR touching the diagnostic engine or its tests triggers `.github/workflows/compass-regression.yml`:

1. Installs deps
2. Boots the COMPASS dev server
3. Runs the seeded v21 600-case stress test (Mulberry32 PRNG, fixed SEED)
4. Checks the result against `tmp-compass-test/regression-budget.json`
5. Fails the PR if global accuracy regresses >2pp or any condition loses >2 hits

Uploads the report markdown + JSON as a build artifact even on failure so the diff is visible in the PR.

---

## 5. Prisma migration — required before first real use

The `DiagnosticOutcome` model has been added to `prisma/schema.prisma` but **is not yet materialized in the database**. Before running the feedback loop against real data:

```bash
npx prisma migrate dev --name add_diagnostic_outcome
# then in production:
npx prisma migrate deploy
```

Until that runs, `/api/diagnose` will log the persistence error but continue returning the clinical response (fail-soft is intentional — a missing table must never take down the diagnostic path).

---

## 6. What this closes

- **R1 (weighted routing):** shipped. First-match misroutes are now handled via `antiPatterns`.
- **R2 (match provenance):** shipped. `matchProvenance` attached to every response, persisted in every DiagnosticOutcome row.
- **R4 (regression firewall):** shipped. Seeded stress test + per-condition budget + CI workflow.
- **N1 (DB model + persistence):** shipped. `DiagnosticOutcome` model + service + endpoints + /api/diagnose integration.
- **N2 (miss-analysis cron):** shipped. `scripts/ml-miss-analysis.mjs`.
- **N3 (training-data export):** shipped. `scripts/export-training-data.mjs`.
- **N5 (CI regression):** shipped. `.github/workflows/compass-regression.yml`.

## 7. What's next (still open)

- **R7 (UI "why" drawer):** now unblocked — consume `matchProvenance` in `compass-admin` and `provider-portal`.
- **Cross-EMR wiring:** make `POST /api/outcomes` actions call-able from the EMR integration layer so lab/imaging results auto-attach on arrival.
- **Replay harness:** take last month's `DiagnosticOutcome` rows and rescore them against a new engine version for deterministic A/B comparison.
- **MIMIC-IV-ED credentialing:** adds a 4th real-data source once pilot is running.
