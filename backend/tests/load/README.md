# ATTENDING AI — Load Tests

Performance baseline and load tests for the ATTENDING Orders API using [k6](https://k6.io).

---

## Prerequisites

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

---

## Running Against Local Development

Start the API first:

```bash
cd backend
docker-compose up -d          # Start SQL Server, Redis, Seq
dotnet run --project src/ATTENDING.Orders.Api
```

Run smoke test (quick sanity check, ~30 seconds):

```bash
k6 run tests/load/smoke.js
```

Run clinical workflow test (10 VUs, ~10 minutes):

```bash
k6 run tests/load/clinical-workflow.js
```

Run sustained load test (up to 50 VUs, ~30 minutes):

```bash
k6 run tests/load/load.js
```

Run spike test (100 VU surge, ~7 minutes):

```bash
k6 run tests/load/spike.js
```

---

## Running Against Staging

Pass the target URL and a valid JWT:

```bash
k6 run \
  -e BASE_URL=https://api-staging.attendingai.com \
  -e BASE_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9... \
  tests/load/clinical-workflow.js
```

---

## Test Scripts

| Script | VUs | Duration | Purpose |
|--------|-----|----------|---------|
| `smoke.js` | 3 | 30s | Sanity check — is the API up and within SLA? |
| `clinical-workflow.js` | 10 | ~10 min | End-to-end clinical workflow validation |
| `load.js` | 25–50 | ~30 min | Sustained clinical shift load |
| `spike.js` | 100 | ~7 min | Mass casualty surge + rate limiter validation |

---

## SLA Thresholds

All thresholds are defined in `shared.js` and must match `appsettings.json PerformanceSla`.

| Endpoint | p95 | p99 | Rationale |
|----------|-----|-----|-----------|
| `GET /health` | 100ms | 200ms | Load balancer liveness probe |
| `GET /laborders/critical` | 150ms | 300ms | Patient safety — must always be fast |
| `GET /laborders/pending` | 200ms | 400ms | Nurse workflow dashboard |
| `GET /patients/search` | 250ms | 500ms | Clinician lookup |
| `GET /patients/{id}` | 200ms | 400ms | Patient detail read |
| `POST /patients` | 500ms | 1000ms | Registration |
| `POST /encounters` | 500ms | 1000ms | Encounter creation |
| `POST /laborders` | 600ms | 1200ms | Includes red-flag evaluation |
| `POST /medications` | 600ms | 1200ms | Includes drug interaction check |
| `POST /assessments` | 800ms | 2000ms | Includes AI triage evaluation |

---

## Results

Test results are written to `tests/load/results/` (created on first run):

- `smoke-summary.json`
- `clinical-workflow-summary.json`
- `load-summary.json`
- `spike-summary.json`

---

## CI Integration

The smoke test runs automatically in CI on every PR:

```yaml
# .github/workflows/backend.yml (excerpt)
- name: Load test (smoke)
  run: |
    k6 run \
      -e BASE_URL=http://localhost:5000 \
      tests/load/smoke.js
```

Full load and spike tests are run on a schedule (nightly against staging) to avoid slowing down PR pipelines.

---

## Interpreting Results

**`✅ PASSED`** — All thresholds met. No SLA breaches above p95.

**`❌ FAILED`** — One or more thresholds breached. Check:
1. Which metric failed (`p(95)` or `p(99)`?)
2. Is it a consistent breach or a spike? (Check trend charts in Grafana)
3. Was it a 5xx error or a slow successful response?
4. Check Seq for `SLA_BREACH` or `SLA_CRITICAL_BREACH` log events during the test window

**Expected 429s during spike test** — The rate limiter returning `429 Too Many Requests` during the spike test is correct behavior. The spike test threshold allows up to 50% rate-limited requests.

---

## Updating SLA Thresholds

When you change thresholds, update **both**:
1. `appsettings.json` → `PerformanceSla:Routes` (runtime enforcement by `PerformanceMonitoringMiddleware`)
2. `tests/load/shared.js` → `SLA` object (build-time enforcement by k6)

These two must stay in sync. A discrepancy means k6 is testing against different values than the API is monitoring against.
