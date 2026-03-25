/**
 * ATTENDING AI — Backend Smoke Test
 * tests/load/smoke-backend.js
 *
 * Quick sanity check: 5 VUs × 60s against the .NET backend (port 5080).
 * All endpoints verified against actual controller routes.
 *
 * Tagging strategy:
 *   type:api    — clinical API endpoints (SLA enforced)
 *   type:health — health probes (excluded from API SLA; SQL Server cold-start skews P99)
 *
 * Run:
 *   k6 run tests/load/smoke-backend.js
 *   k6 run -e BASE_URL=https://attending-staging-api.azurewebsites.net tests/load/smoke-backend.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate       = new Rate('errors');
const apiLatency      = new Trend('api_latency', true);
const healthLatency   = new Trend('health_latency', true);
const criticalLatency = new Trend('critical_lab_latency', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 5, duration: '60s' },
  },
  thresholds: {
    // Clinical API SLA — tagged type:api, excludes health probes
    'http_req_duration{type:api}': ['p(95)<500', 'p(99)<2000'],
    errors:                        ['rate<0.01'],
    // Clinical-specific metrics
    critical_lab_latency: ['p(95)<150'],
    api_latency:          ['p(95)<500'],
    // Health probes: /health/ready does a live SQL Server ping; cold-start in dev is ~30s.
    // No strict SLA here — staging/production has pre-warmed connection pools.
    health_latency: ['p(99)<60000'],
  },
};

const healthParams = { tags: { type: 'health' } };

function apiParams(extraTags) {
  return {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    tags: { type: 'api', ...extraTags },
  };
}

export default function () {
  // ── 1. Liveness probe ────────────────────────────────────────────────────
  group('Health: live', () => {
    const r = http.get(`${BASE_URL}/health/live`, healthParams);
    const ok = check(r, { 'health/live 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    healthLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 2. Readiness probe ───────────────────────────────────────────────────
  group('Health: ready', () => {
    const r = http.get(`${BASE_URL}/health/ready`, healthParams);
    const ok = check(r, { 'health/ready 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    healthLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 3. System ping ───────────────────────────────────────────────────────
  group('System: ping', () => {
    const r = http.get(`${BASE_URL}/api/v1/system/ping`, apiParams());
    const ok = check(r, { 'system/ping 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 4. Patient search ────────────────────────────────────────────────────
  group('Patients: search', () => {
    const r = http.get(`${BASE_URL}/api/v1/patients/search?query=test`, apiParams());
    const ok = check(r, { 'patients/search 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 5. Today's schedule ──────────────────────────────────────────────────
  group('Encounters: schedule/today', () => {
    const r = http.get(`${BASE_URL}/api/v1/encounters/schedule/today`, apiParams());
    const ok = check(r, { 'encounters/schedule/today 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 6. Pending lab orders ────────────────────────────────────────────────
  group('Lab Orders: pending', () => {
    const r = http.get(`${BASE_URL}/api/v1/laborders/pending`, apiParams());
    const ok = check(r, { 'laborders/pending 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 7. Critical lab results — highest-priority SLA (150ms) ──────────────
  group('Lab Orders: critical', () => {
    const r = http.get(`${BASE_URL}/api/v1/laborders/critical`, apiParams({ endpoint: 'critical-labs' }));
    const ok = check(r, { 'laborders/critical 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    criticalLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 8. Pending assessments ───────────────────────────────────────────────
  group('Assessments: pending-review', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/pending-review`, apiParams());
    const ok = check(r, { 'assessments/pending-review 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 9. Red flag sweep ────────────────────────────────────────────────────
  group('Assessments: red-flags', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/red-flags`, apiParams());
    const ok = check(r, { 'assessments/red-flags 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.3);

  // ── 10. Analytics ────────────────────────────────────────────────────────
  group('Analytics: outcomes', () => {
    const r = http.get(`${BASE_URL}/api/v1/analytics/outcomes`, apiParams());
    const ok = check(r, { 'analytics/outcomes 200': (x) => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });

  sleep(1);
}

export function handleSummary(data) {
  const err   = data.metrics?.errors?.values || {};
  const crit  = data.metrics?.critical_lab_latency?.values || {};
  const api   = data.metrics?.api_latency?.values || {};
  const hlth  = data.metrics?.health_latency?.values || {};
  // k6 stores tagged threshold metrics under the full threshold key string
  const apiDurKey = Object.keys(data.metrics || {}).find(k => k.includes('http_req_duration') && k.includes('type:api'));
  const apiDur = (apiDurKey ? data.metrics[apiDurKey]?.values : null) || api;

  const fmt  = (v) => v != null ? `${Math.round(v)}ms` : 'n/a';
  const pass = (v, t) => v != null && v <= t ? '✓' : (v == null ? '-' : '✗');

  return {
    stdout: [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║   ATTENDING AI — Smoke Test Results                      ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║  Requests:    ${String(data.metrics?.http_reqs?.values?.count || 0).padEnd(45)}║`,
      `║  Error Rate:  ${String(((err.rate || 0) * 100).toFixed(2) + '%').padEnd(45)}║`,
      '╠══════════════════════════════════════════════════════════╣',
      '║  Clinical API SLA (type:api tagged requests)             ║',
      `║  Critical Labs: P95 ${fmt(crit['p(95)'])}   ${pass(crit['p(95)'], 150)} target: 150ms           ║`,
      `║  All APIs:      P95 ${fmt(api['p(95)'])}   ${pass(api['p(95)'], 500)} target: 500ms            ║`,
      `║  API P99:       ${fmt(apiDur['p(99)'])}   ${pass(apiDur['p(99)'], 2000)} target: 2000ms          ║`,
      `║  Health P95:    ${fmt(hlth['p(95)'])} (cold-start dev noise, no SLA)    ║`,
      '╚══════════════════════════════════════════════════════════╝',
      '',
    ].join('\n'),
  };
}
