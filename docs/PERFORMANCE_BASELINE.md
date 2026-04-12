# ATTENDING AI — Performance Baseline
# docs/PERFORMANCE_BASELINE.md
#
# Fill this in after running k6 tests against staging for the first time.
# These numbers become the acceptance gate for every future deployment.
# Any P95 regression > 20% over baseline fails the deploy pipeline.
#
# Last run: [DATE NOT YET RUN]
# Environment: [LOCAL / STAGING]
# Build SHA: [GIT SHA]

## Clinical SLA Thresholds (Hard Gates)

| Endpoint | SLA Target | Baseline P95 | Status |
|---|---|---|---|
| POST /api/v1/assessments/submit | < 300ms | ___ ms | ⬜ Not measured |
| GET /api/v1/assessments/red-flags | < 150ms | ___ ms | ⬜ Not measured |
| GET /api/v1/assessments/pending-review | < 200ms | ___ ms | ⬜ Not measured |
| GET /api/v1/laborders/critical | < 150ms | ___ ms | ⬜ Not measured |
| POST /api/v1/lab-orders | < 300ms | ___ ms | ⬜ Not measured |
| GET /api/v1/clinical-ai/recommend | < 800ms | ___ ms | ⬜ Not measured |

## Overall Numbers (fill after first k6 run)

| Metric | Smoke (5 VU) | Clinical (50 VU) | Sustained (100 VU) |
|---|---|---|---|
| Total requests | | | |
| Error rate | | | |
| P50 latency | | | |
| P95 latency | | | |
| P99 latency | | | |
| Max throughput (RPS) | | | |

## How to Populate This File

```powershell
# Run from repo root — outputs results to console
cd C:\Users\Scott\ATTENDING

# Step 1: Smoke test (5 VUs, 1 min)
k6 run tests/load/smoke-backend.js

# Step 2: Clinical workflow (50 VUs, 5 min)
k6 run tests/load/clinical-backend.js

# Step 3: Sustained endurance (100 VUs, 30 min)
k6 run tests/load/sustained.js

# Copy the P95 numbers from each run into the table above.
# Commit with: git commit -m "docs: record first performance baseline"
```

## Regression Policy

After baseline is established:
- Any P95 > 120% of baseline = **warning** in CI log
- Any P95 > 150% of baseline = **build failure**
- Any error rate > 1% = **build failure**
- Critical lab P95 > 150ms at any load = **immediate rollback**

## DR Test Log (quarterly)

| Date | Restore Time | Result | Notes |
|---|---|---|---|
| | | | |
