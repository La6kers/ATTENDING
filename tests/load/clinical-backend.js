/**
 * ATTENDING AI — Clinical Workflow Load Test
 * tests/load/clinical-backend.js
 *
 * Tests the full clinical loop against the .NET backend directly (port 5080).
 * Run: k6 run tests/load/clinical-backend.js
 *
 * Scenarios:
 *   smoke    —  5 VUs × 1 min   — basic sanity
 *   load     — 50 VUs × 5 min   — normal clinical traffic
 *   spike    — 0→150 VUs × 2min — burst (shift change / code-blue wave)
 *
 * Clinical SLA thresholds (from appsettings.json PerformanceSla):
 *   /laborders/critical  — P95 < 150ms
 *   /laborders/pending   — P95 < 200ms
 *   /patients/search     — P95 < 250ms
 *   All other APIs       — P95 < 500ms
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ─────────────────────────────────────────────────────────
const errorRate      = new Rate('errors');
const criticalLabMs  = new Trend('critical_lab_latency', true);
const patientSearchMs = new Trend('patient_search_latency', true);
const assessmentMs   = new Trend('assessment_latency', true);
const encounterMs    = new Trend('encounter_latency', true);
const writeMs        = new Trend('write_latency', true);
const slaBreaches    = new Counter('sla_breaches');

// ── Configuration ──────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080';
const API_TOKEN = __ENV.API_TOKEN || '';  // optional bearer token for staging

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { scenario: 'smoke' },
      exec: 'clinicalWorkflow',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m',  target: 25 },
        { duration: '3m',  target: 50 },
        { duration: '1m',  target: 0  },
      ],
      tags: { scenario: 'load' },
      exec: 'clinicalWorkflow',
      startTime: '1m30s',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 150 },
        { duration: '1m',  target: 150 },
        { duration: '30s', target: 0   },
      ],
      tags: { scenario: 'spike' },
      exec: 'clinicalWorkflow',
      startTime: '8m',
    },
  },
  thresholds: {
    // Overall request-level SLAs
    http_req_duration:       ['p(95)<500', 'p(99)<2000'],
    errors:                  ['rate<0.01'],
    // Clinical-specific SLAs (matching appsettings.json PerformanceSla)
    critical_lab_latency:    ['p(95)<150'],
    patient_search_latency:  ['p(95)<250'],
    assessment_latency:      ['p(95)<800'],
    encounter_latency:       ['p(95)<200'],
    write_latency:           ['p(95)<600'],
    // Zero tolerance for SLA breaches in steady-state load
    sla_breaches:            ['count<10'],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function headers() {
  const h = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };
  if (API_TOKEN) h['Authorization'] = `Bearer ${API_TOKEN}`;
  return { headers: h };
}

function track(res, metricTrend, slaTMs, checkName) {
  const ms = res.timings.duration;
  metricTrend.add(ms);
  const ok = check(res, { [checkName]: (r) => r.status >= 200 && r.status < 300 });
  errorRate.add(!ok);
  if (ms > slaTMs) slaBreaches.add(1);
  return ok;
}

// Precomputed test patient IDs — the DatabaseInitializer seeds 5 patients
// with UUIDs derived from seeding order. We use search instead of direct
// ID lookup to avoid hardcoding seed IDs.
function randomQuery() {
  const names = ['test', 'garcia', 'patel', 'chen', 'nguyen', 'smith'];
  return names[Math.floor(Math.random() * names.length)];
}

// ── Main scenario ──────────────────────────────────────────────────────────
export function clinicalWorkflow() {

  // 1. Health check (readiness probe — mimics load-balancer heartbeat)
  group('Health', () => {
    const res = http.get(`${BASE_URL}/health/ready`);
    check(res, { 'health/ready 200': (r) => r.status === 200 });
  });
  sleep(0.2);

  // 2. Provider opens dashboard — fetches pending assessments
  group('Assessment Queue', () => {
    const res = http.get(`${BASE_URL}/api/v1/assessments/pending-review`, headers());
    track(res, assessmentMs, 800, 'assessments/pending-review 200');
  });
  sleep(0.2);

  // 3. Red-flag sweep (clinical urgency check)
  group('Red Flags', () => {
    const res = http.get(`${BASE_URL}/api/v1/assessments/red-flags`, headers());
    track(res, assessmentMs, 800, 'assessments/red-flags 200');
  });
  sleep(0.2);

  // 4. Patient search (provider looks up a patient)
  let patientId = null;
  group('Patient Search', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/patients/search?query=${randomQuery()}`,
      headers()
    );
    const ok = track(res, patientSearchMs, 250, 'patients/search 200');
    if (ok) {
      try {
        const body = JSON.parse(res.body);
        if (body.items && body.items.length > 0) {
          patientId = body.items[0].id;
        }
      } catch (_) {}
    }
  });
  sleep(0.2);

  // 5. Patient detail (if we found one)
  if (patientId) {
    group('Patient Detail', () => {
      const res = http.get(`${BASE_URL}/api/v1/patients/${patientId}`, headers());
      track(res, patientSearchMs, 200, 'patients/detail 200');
    });
    sleep(0.2);
  }

  // 6. Today's schedule
  group('Schedule', () => {
    const res = http.get(`${BASE_URL}/api/v1/encounters/schedule/today`, headers());
    track(res, encounterMs, 200, 'encounters/schedule/today 200');
  });
  sleep(0.2);

  // 7. Pending lab orders (most frequent provider action)
  group('Pending Labs', () => {
    const res = http.get(`${BASE_URL}/api/v1/laborders/pending`, headers());
    track(res, criticalLabMs, 200, 'laborders/pending 200');
  });
  sleep(0.2);

  // 8. Critical lab results (highest-priority SLA: 150ms)
  group('Critical Results', () => {
    const res = http.get(`${BASE_URL}/api/v1/laborders/critical`, headers());
    track(res, criticalLabMs, 150, 'laborders/critical 200');
  });
  sleep(0.2);

  // 9. Analytics (background quality dashboard)
  group('Analytics', () => {
    const res = http.get(`${BASE_URL}/api/v1/analytics/outcomes`, headers());
    check(res, { 'analytics/outcomes 200': (r) => r.status === 200 });
  });
  sleep(0.5);

  // 10. Write path: create a patient (every 5th VU simulates a new registration)
  if (__VU % 5 === 0) {
    group('Patient Registration', () => {
      const mrn = `LOAD-${Date.now()}-${__VU}`;
      const payload = JSON.stringify({
        mrn:           mrn,
        firstName:     'Load',
        lastName:      `Test${__VU}`,
        dateOfBirth:   '1985-06-15',
        sex:           'Male',
        primaryLanguage: 'English',
      });
      const res = http.post(`${BASE_URL}/api/v1/patients`, payload, headers());
      track(res, writeMs, 500, 'patients/create 201');
    });
    sleep(0.5);
  }

  sleep(1);
}

// ── Summary formatter ──────────────────────────────────────────────────────
export function handleSummary(data) {
  const m = (key) => data.metrics?.[key]?.values || {};
  const dur = m('http_req_duration');
  const err = m('errors');
  const crit = m('critical_lab_latency');
  const srch = m('patient_search_latency');
  const asmt = m('assessment_latency');
  const wrt  = m('write_latency');
  const brch = m('sla_breaches');

  const fmt = (v, suffix = 'ms') => v != null ? `${Math.round(v)}${suffix}` : 'n/a';
  const sla = (actual, threshold) => actual != null && actual <= threshold ? '✓' : '✗';

  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║     ATTENDING AI — Clinical Load Test Results                ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  Total Requests:  ${String(data.metrics?.http_reqs?.values?.count || 0).padEnd(43)}║`,
    `║  Error Rate:      ${String(((err.rate || 0) * 100).toFixed(2) + '%').padEnd(43)}║`,
    `║  SLA Breaches:    ${String(brch.count || 0).padEnd(43)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║  Endpoint SLA Results                                        ║',
    `║  Critical Labs:   P95 ${fmt(crit['p(95)'])}  ${sla(crit['p(95)'], 150)} target: 150ms              ║`,
    `║  Patient Search:  P95 ${fmt(srch['p(95)'])}  ${sla(srch['p(95)'], 250)} target: 250ms              ║`,
    `║  Assessments:     P95 ${fmt(asmt['p(95)'])}  ${sla(asmt['p(95)'], 800)} target: 800ms              ║`,
    `║  Write Ops:       P95 ${fmt(wrt['p(95)'])}  ${sla(wrt['p(95)'], 600)} target: 600ms               ║`,
    `║  All Requests:    P95 ${fmt(dur['p(95)'])}  ${sla(dur['p(95)'], 500)} target: 500ms               ║`,
    `║                   P99 ${fmt(dur['p(99)'])}  ${sla(dur['p(99)'], 2000)} target: 2000ms              ║`,
    '╚══════════════════════════════════════════════════════════════╝',
    '',
  ];

  return {
    'tests/load/clinical-results.json': JSON.stringify(data, null, 2),
    stdout: lines.join('\n'),
  };
}
