/**
 * ATTENDING AI — Sustained Endurance Load Test
 * tests/load/sustained.js
 *
 * 100 VUs for 30 minutes. Looks for memory leaks, connection pool
 * exhaustion, and latency degradation over time.
 *
 * Run:
 *   k6 run tests/load/sustained.js
 *   k6 run -e BASE_URL=https://attending-staging-api.azurewebsites.net tests/load/sustained.js
 *
 * Watch Seq (localhost:5341) while this runs — look for GC pressure warnings.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate   = new Rate('errors');
const apiLatency  = new Trend('api_latency', true);
const critLatency = new Trend('critical_lab_latency', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080';

export const options = {
  stages: [
    { duration: '2m',  target: 50  },  // Ramp up
    { duration: '26m', target: 100 },  // Sustained load
    { duration: '2m',  target: 0   },  // Ramp down
  ],
  thresholds: {
    // Clinical SLA — must hold for entire 30 minutes, not just at start
    'critical_lab_latency': ['p(95)<150'],
    'api_latency':          ['p(95)<500'],
    'errors':               ['rate<0.01'],
    'http_req_failed':      ['rate<0.005'],
  },
};

function apiParams() {
  return {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { type: 'api' },
  };
}

export default function () {
  // Clinical read loop — simulates providers monitoring the queue
  group('Critical labs sweep', () => {
    const r = http.get(`${BASE_URL}/api/v1/laborders/critical`, apiParams());
    const ok = check(r, { 'critical labs 200': x => x.status === 200 });
    errorRate.add(!ok);
    critLatency.add(r.timings.duration);
  });
  sleep(0.5);

  group('Pending assessments', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/pending-review`, apiParams());
    const ok = check(r, { 'pending-review 200': x => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.5);

  group('Red flag sweep', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/red-flags`, apiParams());
    const ok = check(r, { 'red-flags 200': x => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.5);

  group('Patient search', () => {
    const r = http.get(`${BASE_URL}/api/v1/patients/search?query=test`, apiParams());
    const ok = check(r, { 'patient search 200': x => x.status === 200 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });

  // Realistic think time — providers don't hammer APIs constantly
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  const api  = data.metrics?.api_latency?.values || {};
  const crit = data.metrics?.critical_lab_latency?.values || {};
  const err  = data.metrics?.errors?.values || {};
  const fmt  = v => v != null ? `${Math.round(v)}ms` : 'n/a';
  const pass = (v, t) => v != null && v <= t ? '✓' : (v == null ? '-' : '✗ FAIL');
  return {
    stdout: [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║   ATTENDING AI — Sustained Endurance Test Results        ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║  Requests:      ${String(data.metrics?.http_reqs?.values?.count || 0).padEnd(43)}║`,
      `║  Error Rate:    ${String(((err.rate || 0) * 100).toFixed(2) + '%').padEnd(43)}║`,
      '╠══════════════════════════════════════════════════════════╣',
      `║  Critical Labs P95: ${fmt(crit['p(95)'])}   ${pass(crit['p(95)'], 150)} (target: <150ms) ║`,
      `║  All APIs P95:      ${fmt(api['p(95)'])}   ${pass(api['p(95)'], 500)} (target: <500ms)  ║`,
      `║  All APIs P99:      ${fmt(api['p(99)'])}                              ║`,
      '║                                                          ║',
      '║  If P95 climbed over time: check for memory leaks or    ║',
      '║  connection pool exhaustion in Seq (localhost:5341).     ║',
      '╚══════════════════════════════════════════════════════════╝',
      '',
    ].join('\n'),
  };
}
