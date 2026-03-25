/**
 * ATTENDING AI — Spike / Chaos Load Test
 * tests/load/spike.js
 *
 * Sudden 10x traffic burst then back to baseline.
 * Simulates: morning clinic open (everyone arrives at 8am),
 * shift change, or emergency surge.
 *
 * Run:
 *   k6 run tests/load/spike.js
 *   k6 run -e BASE_URL=https://attending-staging-api.azurewebsites.net tests/load/spike.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate  = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const critLatency = new Trend('critical_lab_latency', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080';

export const options = {
  stages: [
    { duration: '1m',  target: 10  },  // Baseline
    { duration: '30s', target: 150 },  // Spike — 10x in 30 seconds
    { duration: '1m',  target: 150 },  // Hold spike
    { duration: '30s', target: 10  },  // Drop back
    { duration: '2m',  target: 10  },  // Recovery — watch latency come back down
  ],
  thresholds: {
    // Slightly relaxed during spike — but must recover fully after
    'critical_lab_latency': ['p(95)<300'],  // Allow 2x slack during burst
    'api_latency':          ['p(95)<1000'],
    'errors':               ['rate<0.05'],  // Allow 5% errors during spike peak
    'http_req_failed':      ['rate<0.05'],
  },
};

function apiParams() {
  return {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { type: 'api' },
  };
}

export default function () {
  group('Critical labs', () => {
    const r = http.get(`${BASE_URL}/api/v1/laborders/critical`, apiParams());
    errorRate.add(!check(r, { 'critical labs 200': x => x.status === 200 || x.status === 503 }));
    critLatency.add(r.timings.duration);
  });
  sleep(0.2);

  group('Red flags', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/red-flags`, apiParams());
    errorRate.add(!check(r, { 'red-flags 200/503': x => x.status === 200 || x.status === 503 }));
    apiLatency.add(r.timings.duration);
  });
  sleep(0.2);

  group('Pending review', () => {
    const r = http.get(`${BASE_URL}/api/v1/assessments/pending-review`, apiParams());
    errorRate.add(!check(r, { 'pending 200/503': x => x.status === 200 || x.status === 503 }));
    apiLatency.add(r.timings.duration);
  });

  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  const api  = data.metrics?.api_latency?.values || {};
  const crit = data.metrics?.critical_lab_latency?.values || {};
  const err  = data.metrics?.errors?.values || {};
  const fmt  = v => v != null ? `${Math.round(v)}ms` : 'n/a';
  return {
    stdout: [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║   ATTENDING AI — Spike Test Results                      ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║  Total Requests:  ${String(data.metrics?.http_reqs?.values?.count || 0).padEnd(41)}║`,
      `║  Peak Error Rate: ${String(((err.rate || 0) * 100).toFixed(2) + '%').padEnd(41)}║`,
      '╠══════════════════════════════════════════════════════════╣',
      `║  Critical Labs P95: ${fmt(crit['p(95)'])}  (target during spike: <300ms) ║`,
      `║  All APIs P95:      ${fmt(api['p(95)'])}  (target during spike: <1000ms) ║`,
      '║                                                          ║',
      '║  Key question: Does latency RECOVER after the spike?    ║',
      '║  If not — resources are not being released properly.     ║',
      '╚══════════════════════════════════════════════════════════╝',
      '',
    ].join('\n'),
  };
}
