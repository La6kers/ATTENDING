/**
 * ATTENDING AI — Smoke Test
 *
 * Quick sanity check: 3 VUs for 30 seconds hitting all critical endpoints.
 * Validates that the API is up, authenticated, and meeting basic SLA targets.
 *
 * Run:
 *   k6 run tests/load/smoke.js
 *   k6 run -e BASE_URL=https://api-staging.attendingai.com tests/load/smoke.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, SLA, authHeaders, checkOk } from './shared.js';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const healthDuration      = new Trend('health_duration',       true);
const labCriticalDuration = new Trend('lab_critical_duration', true);
const patientSearchDuration = new Trend('patient_search_duration', true);
const slaBreaches         = new Counter('sla_breaches');
const errorRate           = new Rate('error_rate');

// ─── Test config ──────────────────────────────────────────────────────────────
export const options = {
  vus: 3,
  duration: '30s',

  thresholds: {
    // Overall error rate < 1%
    error_rate: ['rate < 0.01'],

    // SLA thresholds (p95 / p99 in ms)
    health_duration:         [`p(95)<${SLA.health.p95}`,         `p(99)<${SLA.health.p99}`],
    lab_critical_duration:   [`p(95)<${SLA.labOrdersCritical.p95}`, `p(99)<${SLA.labOrdersCritical.p99}`],
    patient_search_duration: [`p(95)<${SLA.patientSearch.p95}`,  `p(99)<${SLA.patientSearch.p99}`],

    // HTTP request duration — should meet default SLA
    http_req_duration: ['p(95)<1000'],
  },
};

// ─── Test scenarios ───────────────────────────────────────────────────────────
export default function () {
  const headers = authHeaders();

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health/live`);
  healthDuration.add(healthRes.timings.duration);
  if (!checkOk(healthRes, 'health')) {
    slaBreaches.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  sleep(0.2);

  // 2. Critical lab results (patient safety — most important read path)
  const criticalRes = http.get(`${BASE_URL}/api/v1/laborders/critical`, { headers });
  labCriticalDuration.add(criticalRes.timings.duration);
  if (!checkOk(criticalRes, 'lab-critical')) {
    slaBreaches.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  sleep(0.2);

  // 3. Patient search
  const searchRes = http.get(`${BASE_URL}/api/v1/patients/search?q=Smith&pageSize=10`, { headers });
  patientSearchDuration.add(searchRes.timings.duration);
  if (!checkOk(searchRes, 'patient-search')) {
    slaBreaches.add(1);
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  sleep(0.3);

  // 4. Pending lab orders
  const pendingRes = http.get(`${BASE_URL}/api/v1/laborders/pending`, { headers });
  checkOk(pendingRes, 'lab-pending');
  sleep(0.3);
}

export function handleSummary(data) {
  const passed  = data.metrics.error_rate.values.rate < 0.01;
  const status  = passed ? '✅ PASSED' : '❌ FAILED';

  console.log(`\n=== Smoke Test Summary ===`);
  console.log(`${status}`);
  console.log(`Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Errors:   ${(data.metrics.error_rate.values.rate * 100).toFixed(2)}%`);
  console.log(`SLA Breaches: ${data.metrics.sla_breaches?.values.count ?? 0}`);
  console.log(`Health p95:   ${data.metrics.health_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms`);
  console.log(`Lab Critical p95: ${data.metrics.lab_critical_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms`);
  console.log(`Patient Search p95: ${data.metrics.patient_search_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms`);

  return {
    'tests/load/results/smoke-summary.json': JSON.stringify(data, null, 2),
  };
}
