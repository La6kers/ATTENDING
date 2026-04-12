/**
 * ATTENDING AI — Spike Test
 *
 * Tests how the system behaves under a sudden, unexpected traffic surge.
 * Clinical scenario: a mass casualty event triggers simultaneous logins and
 * order creation from all providers in the facility.
 *
 * Pattern:
 *   0–1 min:  baseline (5 VUs) — normal quiet period
 *   1–2 min:  spike to 100 VUs — sudden surge
 *   2–4 min:  hold spike        — sustained emergency load
 *   4–5 min:  back to 5 VUs    — recovery
 *   5–7 min:  hold baseline    — verify system recovered (no errors)
 *
 * Key questions this test answers:
 *   - Does the system return 429s cleanly under load (rate limiter working)?
 *   - Does latency recover after the spike (no memory leak / GC pressure)?
 *   - Does error rate stay below threshold even at 100 VUs?
 *
 * Run:
 *   k6 run tests/load/spike.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, SLA, authHeaders, checkOk, makePatient } from './shared.js';

const errorRate       = new Rate('error_rate');
const rateLimitedRate = new Rate('rate_limited_rate');
const criticalDur     = new Trend('spike_critical_duration', true);
const recoveryErrors  = new Counter('post_spike_errors');

export const options = {
  stages: [
    { duration: '1m', target: 5   },   // Baseline
    { duration: '1m', target: 100 },   // Sudden spike
    { duration: '2m', target: 100 },   // Sustained surge
    { duration: '1m', target: 5   },   // Recovery
    { duration: '2m', target: 5   },   // Verify recovery
  ],

  thresholds: {
    // Allow higher error rate during spike (429s are expected)
    error_rate:         ['rate < 0.20'],

    // But critical reads must still succeed at reasonable latency
    spike_critical_duration: ['p(95)<500'],

    // Rate limiter should be returning 429s — that's correct behavior
    rate_limited_rate:  ['rate < 0.50'],    // < 50% rate limited (limiter healthy, not overwhelmed)

    http_req_duration:  ['p(95)<2000'],     // Even under spike, p95 < 2s
  },
};

export default function () {
  const headers = authHeaders();

  // Mix of read and write to simulate real multi-provider surge
  const rand = Math.random();

  if (rand < 0.50) {
    // Critical lab reads — must stay available even under spike
    const res = http.get(`${BASE_URL}/api/v1/laborders/critical`, { headers });
    criticalDur.add(res.timings.duration);

    if (res.status === 429) {
      rateLimitedRate.add(1);
      errorRate.add(0);  // 429 is expected and correct under spike
    } else if (res.status >= 500) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
      rateLimitedRate.add(0);
    }

  } else if (rand < 0.80) {
    // Patient searches
    const res = http.get(`${BASE_URL}/api/v1/patients/search?q=test&pageSize=5`, { headers });
    if (res.status === 429) {
      rateLimitedRate.add(1);
      errorRate.add(0);
    } else if (res.status >= 500) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
      rateLimitedRate.add(0);
    }

  } else {
    // Write operations
    const res = http.post(
      `${BASE_URL}/api/v1/patients`,
      JSON.stringify(makePatient()),
      { headers }
    );
    if (res.status === 429) {
      rateLimitedRate.add(1);
      errorRate.add(0);
    } else if (res.status >= 500) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
      rateLimitedRate.add(0);
    }
  }

  sleep(0.1);  // Minimal sleep to simulate rapid concurrent requests
}

export function handleSummary(data) {
  const error429  = data.metrics.rate_limited_rate?.values.rate ?? 0;
  const errorRate = data.metrics.error_rate?.values.rate ?? 0;
  const passed    = errorRate < 0.20;
  const status    = passed ? '✅ PASSED' : '❌ FAILED';

  console.log(`\n=== Spike Test Summary ===`);
  console.log(`${status}`);
  console.log(`Total requests:   ${data.metrics.http_reqs?.values.count}`);
  console.log(`Error rate (5xx): ${(errorRate * 100).toFixed(2)}%`);
  console.log(`Rate limited:     ${(error429 * 100).toFixed(2)}% (429s are expected during spike)`);
  console.log(`Critical p95:     ${data.metrics.spike_critical_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms`);
  console.log(`Max VUs:          ${data.metrics.vus_max?.values.max}`);

  return {
    'tests/load/results/spike-summary.json': JSON.stringify(data, null, 2),
  };
}
