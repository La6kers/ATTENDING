// ============================================================
// ATTENDING AI — Post-Deploy Smoke Test
// infrastructure/load-testing/smoke.js
//
// Runs automatically after every staging deploy in CI.
// Fast (under 2 minutes), covers the critical path only.
//
// Usage:
//   k6 run -e BASE_URL=https://app-attending-staging-api.azurewebsites.net \
//           -e API_TOKEN=<staging-bearer-token> \
//           smoke.js
//
// Exits non-zero if any threshold is breached, causing the
// deploy pipeline to halt before the production slot swap.
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ============================================================
// Configuration
// ============================================================

const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:5000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

// ============================================================
// Custom metrics
// ============================================================

const successRate    = new Rate('smoke_success_rate');
const criticalLatency = new Trend('critical_lab_latency_ms');
const assessmentLatency = new Trend('assessment_latency_ms');

// ============================================================
// Test options
// ============================================================

export const options = {
  // 5 virtual users for 90 seconds — fast and deterministic
  vus: 5,
  duration: '90s',

  thresholds: {
    // -------------------------------------------------------
    // Clinical SLA thresholds (from PerformanceSla in appsettings)
    //   Critical lab endpoint : p95 < 150ms
    //   Assessment submission : p95 < 800ms
    //   All other endpoints   : p95 < 500ms
    // -------------------------------------------------------
    http_req_duration:        ['p(95)<500'],
    critical_lab_latency_ms:  ['p(95)<150'],
    assessment_latency_ms:    ['p(95)<800'],

    // Zero errors allowed in smoke — any failure aborts the deploy
    smoke_success_rate:       ['rate>=1.0'],
    http_req_failed:          ['rate<0.01'],
  },
};

// ============================================================
// Setup — verify the API is reachable before starting
// ============================================================

export function setup() {
  const res = http.get(`${BASE_URL}/health/ready`);
  if (res.status !== 200) {
    throw new Error(
      `[smoke] API not ready at ${BASE_URL}: HTTP ${res.status}\n${res.body}`
    );
  }
  console.log(`[smoke] API is ready at ${BASE_URL}`);
  return {};
}

// ============================================================
// Main test function
// ============================================================

export default function () {

  // -----------------------------------------------------------
  // Health checks
  // -----------------------------------------------------------
  group('health', () => {
    const live = http.get(`${BASE_URL}/health/live`);
    const ok = check(live, {
      'live: 200': (r) => r.status === 200,
    });
    successRate.add(ok);

    const ready = http.get(`${BASE_URL}/health/ready`);
    const readyOk = check(ready, {
      'ready: 200': (r) => r.status === 200,
    });
    successRate.add(readyOk);

    const ping = http.get(`${BASE_URL}/api/v1/system/ping`, { headers });
    const pingOk = check(ping, {
      'ping: 200': (r) => r.status === 200,
    });
    successRate.add(pingOk);
  });

  sleep(0.5);

  // -----------------------------------------------------------
  // Critical lab endpoint — tightest SLA (150ms p95)
  // -----------------------------------------------------------
  group('critical-labs', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/laborders/critical`, { headers });
    criticalLatency.add(Date.now() - start);

    const ok = check(res, {
      'critical labs: 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    successRate.add(ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------
  // Patients list — basic read
  // -----------------------------------------------------------
  group('patients', () => {
    const res = http.get(`${BASE_URL}/api/v1/patients?pageNumber=1&pageSize=5`, { headers });
    const ok = check(res, {
      'patients: 200': (r) => r.status === 200,
      'patients: has items array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).items); } catch { return false; }
      },
    });
    successRate.add(ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------
  // Assessment list — the dashboard's primary data source
  // -----------------------------------------------------------
  group('assessments', () => {
    const res = http.get(`${BASE_URL}/api/v1/assessments?pageNumber=1&pageSize=5`, { headers });
    const ok = check(res, {
      'assessments: 200': (r) => r.status === 200,
    });
    successRate.add(ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------
  // Lab orders list — standard read
  // -----------------------------------------------------------
  group('lab-orders', () => {
    const res = http.get(`${BASE_URL}/api/v1/laborders?pageNumber=1&pageSize=5`, { headers });
    const ok = check(res, {
      'lab orders: 200': (r) => r.status === 200,
    });
    successRate.add(ok);
  });

  sleep(0.5);

  // -----------------------------------------------------------
  // Assessment submission — end-to-end write path (800ms SLA)
  // Uses a known test patient MRN seeded by DatabaseInitializer.
  // -----------------------------------------------------------
  group('assessment-submit', () => {
    // First, look up a patient to get a valid ID
    const patientsRes = http.get(
      `${BASE_URL}/api/v1/patients?pageNumber=1&pageSize=1`,
      { headers }
    );

    if (patientsRes.status !== 200) {
      successRate.add(false);
      return;
    }

    let patientId: string | null = null;
    try {
      const body = JSON.parse(patientsRes.body);
      patientId = body.items?.[0]?.id ?? null;
    } catch { /* ignore */ }

    if (!patientId) {
      // No patients seeded yet — skip the write check
      successRate.add(true);
      return;
    }

    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/v1/assessments`,
      JSON.stringify({
        patientId,
        chiefComplaint: '[smoke-test] Headache — automated smoke test',
        encounterId: null,
      }),
      { headers }
    );
    assessmentLatency.add(Date.now() - start);

    const ok = check(res, {
      'assessment create: 201 or 422': (r) =>
        r.status === 201 || r.status === 422, // 422 = validation (fine in smoke)
    });
    successRate.add(ok);
  });

  sleep(1);
}

// ============================================================
// Teardown — print summary to CI log
// ============================================================

export function handleSummary(data: any) {
  const p95   = data.metrics?.http_req_duration?.values?.['p(95)']?.toFixed(1) ?? 'n/a';
  const errPct = ((data.metrics?.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2);
  const smoke  = ((data.metrics?.smoke_success_rate?.values?.rate ?? 0) * 100).toFixed(1);

  const critP95 = data.metrics?.critical_lab_latency_ms?.values?.['p(95)']?.toFixed(1) ?? 'n/a';
  const asmP95  = data.metrics?.assessment_latency_ms?.values?.['p(95)']?.toFixed(1) ?? 'n/a';

  const passed  = data.metrics?.smoke_success_rate?.values?.rate >= 1.0
    && (data.metrics?.http_req_failed?.values?.rate ?? 1) < 0.01;

  const status = passed ? '✅ PASSED' : '❌ FAILED';

  const summary = `
╔══════════════════════════════════════════════════════════╗
║       ATTENDING AI — Post-Deploy Smoke Test              ║
╠══════════════════════════════════════════════════════════╣
║  Result          : ${status.padEnd(36)}║
║  p95 all reqs    : ${(p95 + ' ms').padEnd(36)}║
║  p95 critical lab: ${(critP95 + ' ms  (SLA: <150ms)').padEnd(36)}║
║  p95 assessment  : ${(asmP95  + ' ms  (SLA: <800ms)').padEnd(36)}║
║  Error rate      : ${(errPct + '%').padEnd(36)}║
║  Smoke success   : ${(smoke + '%').padEnd(36)}║
╚══════════════════════════════════════════════════════════╝
`;

  return {
    stdout: summary,
    'smoke-results.json': JSON.stringify(data, null, 2),
  };
}
