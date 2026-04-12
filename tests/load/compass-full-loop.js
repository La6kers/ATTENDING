/**
 * ATTENDING AI — Full COMPASS Clinical Loop Load Test
 * tests/load/compass-full-loop.js
 *
 * Simulates the complete patient → provider clinical loop with
 * realistic symptom profiles including emergency scenarios.
 * Uses hard SLA gates — build fails if thresholds are breached.
 *
 * Run:
 *   k6 run tests/load/compass-full-loop.js
 *   k6 run -e BASE_URL=http://localhost:5080 -e ORG_SLUG=dev-clinic tests/load/compass-full-loop.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Clinical SLA metrics
const assessmentSubmitMs = new Trend('assessment_submit_duration', true);
const redFlagCheckMs     = new Trend('red_flag_check_duration', true);
const clinicalErrors     = new Rate('clinical_errors');

const BASE_URL = __ENV.BASE_URL   || 'http://localhost:5080';
const ORG_SLUG = __ENV.ORG_SLUG  || 'dev-clinic';

export const options = {
  stages: [
    { duration: '1m', target: 20  },  // Ramp up
    { duration: '5m', target: 50  },  // Full clinic load
    { duration: '1m', target: 0   },  // Ramp down
  ],
  thresholds: {
    // HARD gates — test fails if these are breached
    'assessment_submit_duration': ['p(95)<300'],  // Clinical SLA
    'red_flag_check_duration':    ['p(95)<150'],  // Critical path SLA
    'clinical_errors':            ['rate<0.01'],  // < 1% error rate
    'http_req_failed':            ['rate<0.005'], // < 0.5% HTTP failures
  },
};

// Realistic clinical scenarios — mix of emergencies and routine presentations
const PATIENT_SCENARIOS = [
  { complaint: 'crushing chest pain radiating to left arm', severity: 9, isEmergency: true },
  { complaint: 'sudden severe headache worst of my life',   severity: 9, isEmergency: true },
  { complaint: 'persistent cough for 2 weeks',             severity: 3, isEmergency: false },
  { complaint: 'right knee pain after fall yesterday',     severity: 4, isEmergency: false },
  { complaint: 'sudden vision loss in left eye',           severity: 9, isEmergency: true },
  { complaint: 'mild headache since yesterday morning',    severity: 2, isEmergency: false },
  { complaint: 'fever and sore throat 3 days',             severity: 4, isEmergency: false },
  { complaint: 'shortness of breath at rest and confused', severity: 8, isEmergency: true },
  { complaint: 'right side weakness and slurred speech',   severity: 9, isEmergency: true },
  { complaint: 'dental pain lower right molar 2 days',     severity: 5, isEmergency: false },
  { complaint: 'fatigue and poor sleep past week',         severity: 2, isEmergency: false },
  { complaint: 'back pain after lifting at work',          severity: 5, isEmergency: false },
];

export default function () {
  const scenario = PATIENT_SCENARIOS[Math.floor(Math.random() * PATIENT_SCENARIOS.length)];

  // ── Step 1: Patient submits COMPASS assessment ─────────────────────────
  const submitStart = Date.now();
  const submitRes = http.post(
    `${BASE_URL}/api/v1/assessments/submit`,
    JSON.stringify({
      patientName:      `Load Test Patient ${__VU}-${__ITER}`,
      chiefComplaint:   scenario.complaint,
      organization_slug: ORG_SLUG,
      dateOfBirth:      '1975-06-15',
      gender:           'unknown',
      hpi: { severity: scenario.severity },
    }),
    {
      headers: {
        'Content-Type':        'application/json',
        'X-Organization-Slug': ORG_SLUG,
      },
    }
  );
  assessmentSubmitMs.add(Date.now() - submitStart);

  const submitOk = check(submitRes, {
    'assessment submitted (201)': r => r.status === 201,
    'assessment has ID':          r => {
      try { return JSON.parse(r.body).assessmentId !== undefined; }
      catch { return false; }
    },
    'emergency flagged correctly': r => {
      if (!scenario.isEmergency) return true; // Only check emergency cases
      try { return JSON.parse(r.body).urgentAlert === true; }
      catch { return false; }
    },
  });
  clinicalErrors.add(!submitOk);

  sleep(1);

  // ── Step 2: Provider checks red flags ──────────────────────────────────
  const rfStart = Date.now();
  const rfRes = http.get(
    `${BASE_URL}/api/v1/assessments/red-flags`,
    { headers: { Accept: 'application/json' }, tags: { type: 'api' } }
  );
  redFlagCheckMs.add(Date.now() - rfStart);

  check(rfRes, { 'red flags endpoint healthy': r => r.status === 200 });

  // ── Step 3: Provider checks pending queue ──────────────────────────────
  const queueRes = http.get(
    `${BASE_URL}/api/v1/assessments/pending-review`,
    { headers: { Accept: 'application/json' }, tags: { type: 'api' } }
  );
  check(queueRes, { 'pending-review accessible': r => r.status === 200 });

  // Realistic provider think time (1–4 seconds between actions)
  sleep(Math.random() * 3 + 1);
}

export function handleSummary(data) {
  const submit = data.metrics?.assessment_submit_duration?.values || {};
  const rf     = data.metrics?.red_flag_check_duration?.values || {};
  const errors = data.metrics?.clinical_errors?.values || {};
  const fmt    = v => v != null ? `${Math.round(v)}ms` : 'n/a';
  const gate   = (v, t) => v != null && v <= t ? '✓ PASS' : (v == null ? '  n/a' : '✗ FAIL');
  return {
    stdout: [
      '',
      '╔══════════════════════════════════════════════════════════╗',
      '║   ATTENDING AI — COMPASS Full Loop Results               ║',
      '╠══════════════════════════════════════════════════════════╣',
      `║  Total Requests:  ${String(data.metrics?.http_reqs?.values?.count || 0).padEnd(41)}║`,
      `║  Error Rate:      ${String(((errors.rate || 0) * 100).toFixed(2) + '%').padEnd(41)}║`,
      '╠══════════════════════════════════════════════════════════╣',
      '║  Clinical SLA Gates (HARD — failure = build fail)        ║',
      `║  Assessment Submit P95:  ${fmt(submit['p(95)']).padEnd(8)} ${gate(submit['p(95)'], 300)} (target: <300ms)  ║`,
      `║  Red Flag Check  P95:  ${fmt(rf['p(95)']).padEnd(8)}   ${gate(rf['p(95)'], 150)} (target: <150ms)  ║`,
      '╚══════════════════════════════════════════════════════════╝',
      '',
    ].join('\n'),
  };
}
