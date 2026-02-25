/**
 * ATTENDING AI — Sustained Load Test
 *
 * Tests the API under sustained, realistic multi-provider load.
 * Models a busy clinical shift with mixed read/write traffic:
 *   - 60% read operations (patient lookups, result queries, schedule views)
 *   - 30% write operations (orders, encounters, assessments)
 *   - 10% critical-path queries (critical lab results, emergency assessments)
 *
 * Stages:
 *   0–3 min:   ramp up to 25 VUs  (morning shift arrival)
 *   3–15 min:  hold at 25 VUs     (peak clinical activity)
 *   15–18 min: ramp up to 50 VUs  (peak staffing overlap)
 *   18–25 min: hold at 50 VUs     (max load)
 *   25–30 min: ramp down to 0     (end of block)
 *
 * Run:
 *   k6 run tests/load/load.js
 *   k6 run -e BASE_URL=https://api-staging.attendingai.com tests/load/load.js
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  BASE_URL, SLA, authHeaders,
  checkOk, checkCreated, parseBody,
  makePatient, makeLabOrder,
} from './shared.js';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const readDuration   = new Trend('read_operations_duration',  true);
const writeDuration  = new Trend('write_operations_duration', true);
const criticalDuration = new Trend('critical_reads_duration', true);
const slaBreaches    = new Counter('sla_breaches');
const errorRate      = new Rate('error_rate');

// ─── Test config ──────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '3m',  target: 25 },  // Ramp up
    { duration: '12m', target: 25 },  // Steady state
    { duration: '3m',  target: 50 },  // Peak overlap
    { duration: '7m',  target: 50 },  // Max load
    { duration: '5m',  target: 0  },  // Ramp down
  ],

  thresholds: {
    error_rate:               ['rate < 0.02'],
    read_operations_duration: [`p(95)<${SLA.patientRead.p95}`,  `p(99)<${SLA.patientRead.p99}`],
    write_operations_duration:[`p(95)<${SLA.labOrderCreate.p95}`, `p(99)<${SLA.labOrderCreate.p99}`],
    critical_reads_duration:  [`p(95)<${SLA.labOrdersCritical.p95}`, `p(99)<${SLA.labOrdersCritical.p99}`],
    http_req_duration:        ['p(95)<1000', 'p(99)<2000'],
    http_req_failed:          ['rate < 0.05'],
  },
};

// Pre-created patient IDs for read operations
// In a real test these would be seeded; here we query the search endpoint.
const KNOWN_MRN_PREFIX = 'SEED';

// ─── Main scenario ────────────────────────────────────────────────────────────
export default function () {
  const headers = authHeaders();
  const rand    = Math.random();

  if (rand < 0.10) {
    // ── 10%: Critical path reads ─────────────────────────────────────────────
    const critRes = http.get(`${BASE_URL}/api/v1/laborders/critical`, { headers });
    criticalDuration.add(critRes.timings.duration);

    if (critRes.timings.duration > SLA.labOrdersCritical.p95) slaBreaches.add(1);
    if (critRes.status >= 400) errorRate.add(1); else errorRate.add(0);
    sleep(0.5);

  } else if (rand < 0.70) {
    // ── 60%: Mixed read operations ────────────────────────────────────────────
    const readRand = Math.random();

    if (readRand < 0.35) {
      // Patient search
      const searchTerms = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'TEST'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      const res  = http.get(`${BASE_URL}/api/v1/patients/search?q=${term}&pageSize=10`, { headers });
      readDuration.add(res.timings.duration);
      if (res.timings.duration > SLA.patientSearch.p95) slaBreaches.add(1);
      if (res.status >= 400) errorRate.add(1); else errorRate.add(0);

    } else if (readRand < 0.60) {
      // Pending lab orders
      const res = http.get(`${BASE_URL}/api/v1/laborders/pending?page=1&pageSize=20`, { headers });
      readDuration.add(res.timings.duration);
      if (res.timings.duration > SLA.labOrdersPending.p95) slaBreaches.add(1);
      if (res.status >= 400) errorRate.add(1); else errorRate.add(0);

    } else if (readRand < 0.80) {
      // Today's schedule
      const res = http.get(`${BASE_URL}/api/v1/encounters/schedule/today`, { headers });
      readDuration.add(res.timings.duration);
      if (res.status >= 400) errorRate.add(1); else errorRate.add(0);

    } else {
      // Pending assessment reviews
      const res = http.get(`${BASE_URL}/api/v1/assessments/pending-review?pageSize=10`, { headers });
      readDuration.add(res.timings.duration);
      if (res.status >= 400) errorRate.add(1); else errorRate.add(0);
    }

    sleep(0.3);

  } else {
    // ── 30%: Write operations (orders) ────────────────────────────────────────
    // First create a patient, then create orders
    const patRes = http.post(
      `${BASE_URL}/api/v1/patients`,
      JSON.stringify(makePatient()),
      { headers }
    );
    writeDuration.add(patRes.timings.duration);

    if (!checkCreated(patRes, 'load-patient-create')) {
      errorRate.add(1);
      return;
    }
    errorRate.add(0);

    const patient  = parseBody(patRes);
    const patientId = patient?.patientId;
    if (!patientId) return;

    sleep(0.3);

    // Create encounter
    const encRes = http.post(
      `${BASE_URL}/api/v1/encounters`,
      JSON.stringify({
        patientId,
        type:           'Outpatient',
        scheduledAt:    new Date().toISOString(),
        chiefComplaint: 'Load test visit',
      }),
      { headers }
    );

    const encounter  = parseBody(encRes);
    const encounterId = encounter?.encounterId;
    if (!encounterId) return;

    sleep(0.3);

    // Create lab order
    const labRes = http.post(
      `${BASE_URL}/api/v1/laborders`,
      JSON.stringify(makeLabOrder(patientId, encounterId)),
      { headers }
    );
    writeDuration.add(labRes.timings.duration);
    if (labRes.timings.duration > SLA.labOrderCreate.p95) slaBreaches.add(1);
    if (labRes.status >= 400) errorRate.add(1); else errorRate.add(0);

    sleep(0.5);
  }
}

export function handleSummary(data) {
  const errorRateVal = data.metrics.error_rate?.values.rate ?? 0;
  const passed       = errorRateVal < 0.02;
  const status       = passed ? '✅ PASSED' : '❌ FAILED';

  console.log(`\n=== Sustained Load Test Summary ===`);
  console.log(`${status}`);
  console.log(`Total requests:     ${data.metrics.http_reqs?.values.count}`);
  console.log(`Error rate:         ${(errorRateVal * 100).toFixed(2)}%`);
  console.log(`SLA breaches:       ${data.metrics.sla_breaches?.values.count ?? 0}`);
  console.log(`Max VUs reached:    ${data.metrics.vus_max?.values.max}`);

  const p95 = (m) => data.metrics[m]?.values['p(95)']?.toFixed(0) ?? 'N/A';

  console.log(`\nLatency (p95):`);
  console.log(`  Read operations:    ${p95('read_operations_duration')}ms`);
  console.log(`  Write operations:   ${p95('write_operations_duration')}ms`);
  console.log(`  Critical reads:     ${p95('critical_reads_duration')}ms`);
  console.log(`  Overall:            ${p95('http_req_duration')}ms`);

  return {
    'tests/load/results/load-summary.json': JSON.stringify(data, null, 2),
  };
}
