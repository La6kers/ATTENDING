// ============================================================
// ATTENDING AI - Database Test Helpers
// tests/helpers/db.ts
//
// Test fixture factories for clinical entities.
// Uses Prisma for setup/teardown when running against a test DB,
// or returns plain objects for mock-based tests.
//
// Usage:
//   import { fixtures } from '../helpers';
//
//   const patient = fixtures.patient();
//   const encounter = fixtures.encounter({ patientId: patient.id });
//   const labOrder = fixtures.labOrder({ encounterId: encounter.id });
// ============================================================

import { randomUUID } from 'crypto';

// ============================================================
// ID GENERATOR
// ============================================================

let counter = 0;
function testId(prefix = 'test'): string {
  counter++;
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`;
}

/** Reset counter between test suites */
export function resetFixtureIds() {
  counter = 0;
}

// ============================================================
// FIXTURE FACTORIES
// ============================================================

export const fixtures = {
  /** Create a test patient */
  patient: (overrides: Record<string, any> = {}) => ({
    id: testId('patient'),
    mrn: `MRN${String(counter).padStart(6, '0')}`,
    firstName: 'Test',
    lastName: 'Patient',
    dateOfBirth: new Date('1980-06-15'),
    gender: 'male',
    email: `patient-${counter}@test.ai`,
    phone: '555-0100',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create a test encounter */
  encounter: (overrides: Record<string, any> = {}) => ({
    id: testId('encounter'),
    patientId: overrides.patientId || testId('patient'),
    providerId: overrides.providerId || 'test-provider-001',
    type: 'OFFICE_VISIT',
    status: 'IN_PROGRESS',
    startTime: new Date(),
    chiefComplaint: 'Test visit',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create a test lab order */
  labOrder: (overrides: Record<string, any> = {}) => ({
    id: testId('lab'),
    encounterId: overrides.encounterId || testId('encounter'),
    orderedById: overrides.orderedById || 'test-provider-001',
    testCode: 'CBC',
    testName: 'Complete Blood Count',
    category: 'hematology',
    priority: 'ROUTINE',
    status: 'PENDING',
    indication: 'Routine screening',
    orderedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create a test vital sign set */
  vitalSigns: (overrides: Record<string, any> = {}) => ({
    id: testId('vitals'),
    encounterId: overrides.encounterId || testId('encounter'),
    heartRate: 72,
    systolicBP: 120,
    diastolicBP: 80,
    respiratoryRate: 16,
    temperature: 98.6,
    oxygenSaturation: 98,
    painLevel: 0,
    recordedAt: new Date(),
    recordedBy: 'test-nurse-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create abnormal vitals (triggers red flags) */
  criticalVitals: (overrides: Record<string, any> = {}) =>
    fixtures.vitalSigns({
      heartRate: 135,
      systolicBP: 78,
      oxygenSaturation: 86,
      temperature: 103.2,
      painLevel: 9,
      ...overrides,
    }),

  /** Create a test medication */
  medication: (overrides: Record<string, any> = {}) => ({
    id: testId('med'),
    patientId: overrides.patientId || testId('patient'),
    name: 'Lisinopril',
    genericName: 'lisinopril',
    dosage: '10mg',
    frequency: 'once daily',
    route: 'oral',
    status: 'ACTIVE',
    prescribedBy: 'test-provider-001',
    startDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create a test allergy */
  allergy: (overrides: Record<string, any> = {}) => ({
    id: testId('allergy'),
    patientId: overrides.patientId || testId('patient'),
    allergen: 'Penicillin',
    reaction: 'Anaphylaxis',
    severity: 'severe',
    status: 'ACTIVE',
    reportedBy: 'test-provider-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }),

  /** Create a red-flag symptom set */
  cardiacSymptoms: () => ({
    chiefComplaint: 'chest pain radiating to left arm',
    symptoms: ['chest pain', 'shortness of breath', 'diaphoresis', 'nausea'],
  }),

  strokeSymptoms: () => ({
    chiefComplaint: 'sudden onset weakness and speech difficulty',
    symptoms: ['facial droop', 'arm weakness', 'slurred speech'],
  }),

  routineSymptoms: () => ({
    chiefComplaint: 'runny nose for 3 days',
    symptoms: ['congestion', 'mild cough', 'sneezing'],
  }),
};

// ============================================================
// PRISMA TEST HELPERS (for database-backed tests)
// ============================================================

/**
 * Clean up test data from the database.
 * Call in afterEach/afterAll.
 *
 * Requires: TEST_DATABASE_URL env var pointing to a test database.
 * Skips silently if no test database is configured.
 */
export async function cleanupTestData(prisma: any, testPrefix = 'test-') {
  if (!process.env.TEST_DATABASE_URL) return;

  try {
    // Delete in dependency order (children first)
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LabResult" WHERE "labOrderId" LIKE '${testPrefix}%'`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LabOrder" WHERE id LIKE '${testPrefix}%'`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "VitalSign" WHERE id LIKE '${testPrefix}%'`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Encounter" WHERE id LIKE '${testPrefix}%'`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Patient" WHERE id LIKE '${testPrefix}%'`
    );
  } catch (error) {
    console.warn('[Test Cleanup] Error cleaning test data:', error);
  }
}

export default { fixtures, resetFixtureIds, cleanupTestData };
