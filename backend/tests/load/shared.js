/**
 * ATTENDING AI — k6 Shared Configuration
 *
 * Shared utilities, SLA thresholds, and test data generators used across
 * all load test scripts.
 *
 * Usage:
 *   import { BASE_URL, SLA, authHeaders, randomMrn } from './shared.js';
 */

// ─── Target configuration ─────────────────────────────────────────────────────
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Dev token — for local k6 runs against Development environment (DevBypass=true).
// For staging/prod, pass a real JWT via BASE_TOKEN env var.
export const AUTH_TOKEN = __ENV.BASE_TOKEN || 'dev-bypass-token';

// ─── SLA thresholds (must match appsettings.json PerformanceSla) ──────────────
// These are the source-of-truth values k6 enforces at the test level.
// If a threshold is breached here, the k6 run exits with a non-zero code
// and CI fails the build.
export const SLA = {
  // Health check — must be the fastest path in the system
  health:               { p95: 100,  p99: 200  },

  // Critical lab results — patient safety path, must be sub-second
  labOrdersCritical:    { p95: 150,  p99: 300  },
  labOrdersPending:     { p95: 200,  p99: 400  },

  // General reads
  patientSearch:        { p95: 250,  p99: 500  },
  patientRead:          { p95: 200,  p99: 400  },
  encounterRead:        { p95: 200,  p99: 400  },
  labOrderRead:         { p95: 200,  p99: 400  },
  assessmentRead:       { p95: 200,  p99: 400  },

  // Clinical writes
  patientCreate:        { p95: 500,  p99: 1000 },
  encounterCreate:      { p95: 500,  p99: 1000 },
  labOrderCreate:       { p95: 600,  p99: 1200 },
  imagingOrderCreate:   { p95: 500,  p99: 1000 },
  medicationCreate:     { p95: 600,  p99: 1200 },
  referralCreate:       { p95: 500,  p99: 1000 },

  // Assessment (includes AI triage evaluation)
  assessmentStart:      { p95: 800,  p99: 2000 },
  assessmentResponse:   { p95: 500,  p99: 1000 },
};

// ─── Auth headers ─────────────────────────────────────────────────────────────
export function authHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    ...extraHeaders,
  };
}

// ─── Test data generators ─────────────────────────────────────────────────────
let _counter = 0;
function counter() { return ++_counter; }

export function randomMrn() {
  return `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function makePatient(overrides = {}) {
  const n = counter();
  return {
    mrn:           overrides.mrn          ?? randomMrn(),
    firstName:     overrides.firstName    ?? `LoadTest`,
    lastName:      overrides.lastName     ?? `Patient${n}`,
    dateOfBirth:   overrides.dateOfBirth  ?? '1980-06-15',
    sex:           overrides.sex          ?? 'Male',
    phone:         overrides.phone        ?? '555-0100',
    email:         overrides.email        ?? `load${n}@test.invalid`,
    addressLine1:  overrides.addressLine1 ?? '1 Test Street',
    city:          overrides.city         ?? 'Testville',
    state:         overrides.state        ?? 'CA',
    zipCode:       overrides.zipCode      ?? '90000',
    primaryLanguage: 'English',
    ...overrides,
  };
}

export function makeLabOrder(patientId, encounterId, overrides = {}) {
  return {
    patientId,
    encounterId,
    testCode:            overrides.testCode        ?? 'CBC',
    testName:            overrides.testName        ?? 'Complete Blood Count',
    cptCode:             overrides.cptCode         ?? '85025',
    cptDescription:      overrides.cptDescription  ?? 'Blood count; complete (CBC)',
    cptBasePrice:        overrides.cptBasePrice     ?? 45.00,
    loincCode:           overrides.loincCode        ?? '58410-2',
    category:            overrides.category         ?? 'Hematology',
    priority:            overrides.priority         ?? 'Routine',
    clinicalIndication:  overrides.clinicalIndication ?? 'Load test order',
    diagnosisCode:       overrides.diagnosisCode    ?? 'Z00.00',
    diagnosisDescription: overrides.diagnosisDescription ?? 'Encounter for general adult medical exam',
    requiresFasting:     overrides.requiresFasting  ?? false,
    ...overrides,
  };
}

// ─── Common check helpers ─────────────────────────────────────────────────────
import { check } from 'k6';

export function checkOk(res, tag) {
  return check(res, {
    [`${tag}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
}

export function checkCreated(res, tag) {
  return check(res, {
    [`${tag}: status 201`]: (r) => r.status === 201,
  });
}

export function parseBody(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}
