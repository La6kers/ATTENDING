/**
 * ATTENDING AI — Clinical Workflow Load Test
 *
 * Simulates the complete clinical workflow a provider executes during a patient visit:
 *   1. Patient registration (or search for existing)
 *   2. Encounter creation and check-in
 *   3. Assessment start (includes AI triage)
 *   4. Lab order creation
 *   5. Imaging order creation
 *   6. Encounter completion
 *
 * This is the most representative test of real clinical usage patterns.
 *
 * Stages:
 *   0–2 min:  ramp up to 10 VUs  (shift start)
 *   2–8 min:  hold at 10 VUs     (steady clinical load)
 *   8–10 min: ramp down          (shift end)
 *
 * Run:
 *   k6 run tests/load/clinical-workflow.js
 *   k6 run -e BASE_URL=https://api-staging.attendingai.com tests/load/clinical-workflow.js
 */
import http from 'k6/http';
import { sleep, fail } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  BASE_URL, SLA, authHeaders,
  checkOk, checkCreated, parseBody,
  makePatient, makeLabOrder,
} from './shared.js';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const patientCreateDur   = new Trend('patient_create_duration',    true);
const encounterCreateDur = new Trend('encounter_create_duration',  true);
const assessmentStartDur = new Trend('assessment_start_duration',  true);
const labOrderCreateDur  = new Trend('lab_order_create_duration',  true);
const imagingCreateDur   = new Trend('imaging_create_duration',    true);
const workflowDuration   = new Trend('full_workflow_duration',     true);
const slaBreaches        = new Counter('sla_breaches');
const workflowErrors     = new Rate('workflow_error_rate');

// ─── Test config ──────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 10 },   // Ramp up
    { duration: '6m',  target: 10 },   // Steady state
    { duration: '2m',  target: 0  },   // Ramp down
  ],

  thresholds: {
    workflow_error_rate:       ['rate < 0.02'],    // < 2% workflow failures

    patient_create_duration:   [`p(95)<${SLA.patientCreate.p95}`,   `p(99)<${SLA.patientCreate.p99}`],
    encounter_create_duration: [`p(95)<${SLA.encounterCreate.p95}`, `p(99)<${SLA.encounterCreate.p99}`],
    assessment_start_duration: [`p(95)<${SLA.assessmentStart.p95}`, `p(99)<${SLA.assessmentStart.p99}`],
    lab_order_create_duration: [`p(95)<${SLA.labOrderCreate.p95}`,  `p(99)<${SLA.labOrderCreate.p99}`],
    imaging_create_duration:   [`p(95)<${SLA.imagingOrderCreate.p95}`, `p(99)<${SLA.imagingOrderCreate.p99}`],

    full_workflow_duration:    ['p(95)<5000'],   // Complete workflow in under 5 seconds

    http_req_duration:         ['p(95)<1000'],
    http_req_failed:           ['rate < 0.05'],
  },
};

// ─── Main scenario ────────────────────────────────────────────────────────────
export default function () {
  const headers   = authHeaders();
  const startTime = Date.now();

  // ── Step 1: Create patient ─────────────────────────────────────────────────
  const patientPayload = JSON.stringify(makePatient());
  const patientRes = http.post(`${BASE_URL}/api/v1/patients`, patientPayload, { headers });
  patientCreateDur.add(patientRes.timings.duration);

  if (!checkCreated(patientRes, 'patient-create')) {
    workflowErrors.add(1);
    slaBreaches.add(1);
    return; // Can't continue without a patient
  }
  workflowErrors.add(0);

  const patient = parseBody(patientRes);
  const patientId = patient?.patientId;
  if (!patientId) {
    workflowErrors.add(1);
    return;
  }

  sleep(0.5);

  // ── Step 2: Create encounter ───────────────────────────────────────────────
  const encounterPayload = JSON.stringify({
    patientId,
    type:            'Outpatient',
    scheduledAt:     new Date().toISOString(),
    chiefComplaint:  'Load test - chest pain evaluation',
  });
  const encounterRes = http.post(`${BASE_URL}/api/v1/encounters`, encounterPayload, { headers });
  encounterCreateDur.add(encounterRes.timings.duration);

  if (!checkCreated(encounterRes, 'encounter-create')) {
    workflowErrors.add(1);
    return;
  }

  const encounter = parseBody(encounterRes);
  const encounterId = encounter?.encounterId;
  if (!encounterId) { workflowErrors.add(1); return; }

  sleep(0.3);

  // ── Step 3: Check in ──────────────────────────────────────────────────────
  const checkInRes = http.post(
    `${BASE_URL}/api/v1/encounters/${encounterId}/check-in`,
    null,
    { headers }
  );
  checkOk(checkInRes, 'encounter-checkin');
  sleep(0.3);

  // ── Step 4: Start assessment ──────────────────────────────────────────────
  const assessmentPayload = JSON.stringify({
    patientId,
    chiefComplaint: 'Load test - chest pain, onset 2 hours ago',
  });
  const assessmentRes = http.post(`${BASE_URL}/api/v1/assessments`, assessmentPayload, { headers });
  assessmentStartDur.add(assessmentRes.timings.duration);

  if (!checkCreated(assessmentRes, 'assessment-start')) {
    workflowErrors.add(1);
    // Don't return — continue with orders even without assessment
  }
  sleep(0.5);

  // ── Step 5: Lab order ─────────────────────────────────────────────────────
  const labPayload = JSON.stringify(makeLabOrder(patientId, encounterId));
  const labRes = http.post(`${BASE_URL}/api/v1/laborders`, labPayload, { headers });
  labOrderCreateDur.add(labRes.timings.duration);
  checkCreated(labRes, 'lab-order-create');
  sleep(0.4);

  // ── Step 6: Imaging order ─────────────────────────────────────────────────
  const imagingPayload = JSON.stringify({
    patientId,
    encounterId,
    studyCode:           'CXR-PA-LAT',
    studyName:           'Chest X-Ray PA and Lateral',
    modality:            'XR',
    bodyPart:            'Chest',
    cptCode:             '71046',
    priority:            'Routine',
    clinicalIndication:  'Load test - evaluate for pneumonia',
    diagnosisCode:       'J18.9',
    withContrast:        false,
    estimatedRadiationDose: 0.1,
  });
  const imagingRes = http.post(`${BASE_URL}/api/v1/imagingorders`, imagingPayload, { headers });
  imagingCreateDur.add(imagingRes.timings.duration);
  checkCreated(imagingRes, 'imaging-create');
  sleep(0.3);

  // ── Step 7: Complete encounter ────────────────────────────────────────────
  const completeRes = http.post(
    `${BASE_URL}/api/v1/encounters/${encounterId}/complete`,
    null,
    { headers }
  );
  checkOk(completeRes, 'encounter-complete');

  // Record full workflow duration
  workflowDuration.add(Date.now() - startTime);

  sleep(1);
}

export function handleSummary(data) {
  const errorRate = data.metrics.workflow_error_rate?.values.rate ?? 0;
  const passed    = errorRate < 0.02;
  const status    = passed ? '✅ PASSED' : '❌ FAILED';

  console.log(`\n=== Clinical Workflow Load Test Summary ===`);
  console.log(`${status}`);
  console.log(`Workflow error rate: ${(errorRate * 100).toFixed(2)}%`);

  const fmt = (metric, label) => {
    const p95 = data.metrics[metric]?.values['p(95)'];
    return p95 ? `  ${label}: p95=${p95.toFixed(0)}ms` : `  ${label}: N/A`;
  };

  console.log(fmt('patient_create_duration',   'Patient create'));
  console.log(fmt('encounter_create_duration', 'Encounter create'));
  console.log(fmt('assessment_start_duration', 'Assessment start'));
  console.log(fmt('lab_order_create_duration', 'Lab order create'));
  console.log(fmt('imaging_create_duration',   'Imaging order create'));
  console.log(fmt('full_workflow_duration',     'Full workflow'));

  return {
    'tests/load/results/clinical-workflow-summary.json': JSON.stringify(data, null, 2),
  };
}
