# EHR Integration Testing Strategy

## ATTENDING AI - Comprehensive FHIR/EHR Testing Framework

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Author:** ATTENDING AI Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Architecture Overview](#testing-architecture-overview)
3. [Test Levels & Types](#test-levels--types)
4. [FHIR-Specific Testing](#fhir-specific-testing)
5. [EHR Vendor Testing](#ehr-vendor-testing)
6. [Security & Compliance Testing](#security--compliance-testing)
7. [Performance & Reliability Testing](#performance--reliability-testing)
8. [Test Data Management](#test-data-management)
9. [CI/CD Integration](#cicd-integration)
10. [Certification Requirements](#certification-requirements)

---

## Executive Summary

This document outlines the comprehensive testing strategy for ATTENDING AI's EHR integration layer, focusing on FHIR R4 interoperability with Epic, Oracle Health (Cerner), and other major EHR systems. The strategy ensures clinical data integrity, security compliance, and reliable operation in production healthcare environments.

### Key Testing Objectives

- **Data Integrity**: Ensure accurate bidirectional data mapping between ATTENDING and EHR systems
- **FHIR Compliance**: Validate adherence to FHIR R4 and US Core Implementation Guide
- **Security**: Verify HIPAA-compliant data handling and OAuth 2.0/SMART authorization
- **Reliability**: Confirm fault tolerance and graceful degradation
- **Performance**: Meet healthcare SLAs for response times and throughput
- **Certification**: Prepare for ONC Health IT certification and EHR vendor app marketplace approval

---

## Testing Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EHR INTEGRATION TEST PYRAMID                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                            ┌───────────┐                                 │
│                            │   E2E     │  ← Sandbox & Production Tests   │
│                            │  Tests    │                                 │
│                         ┌──┴───────────┴──┐                              │
│                         │  Integration    │  ← Mock FHIR Servers         │
│                         │    Tests        │                              │
│                      ┌──┴─────────────────┴──┐                           │
│                      │   Contract Tests      │  ← FHIR Validation        │
│                      │   (FHIR/CDS Hooks)    │                           │
│                   ┌──┴───────────────────────┴──┐                        │
│                   │        Unit Tests            │  ← Mappers, Services  │
│                   │   (Mappers, Types, Logic)    │                       │
│                   └──────────────────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Test Environment Strategy

| Environment | Purpose | EHR Connection | Data |
|-------------|---------|----------------|------|
| Local | Developer testing | Mock FHIR Server | Synthetic |
| CI/CD | Automated testing | Mock + Contract Tests | Synthetic |
| Sandbox | Pre-production | Epic/Oracle Sandbox | Synthetic |
| Stage | UAT | Production mirror | PHI (limited) |
| Production | Live | Real EHR systems | PHI |

---

## Test Levels & Types

### 1. Unit Tests

Unit tests validate individual components in isolation.

**Coverage Areas:**
- FHIR resource mappers (Patient, Observation, Condition, etc.)
- Type guards and validation functions
- Utility functions (date formatting, ID extraction)
- Error handling logic

**Example Test Structure:**

```typescript
// packages/fhir/src/__tests__/mappers/patient.mapper.test.ts

describe('Patient Mapper', () => {
  describe('mapPrismaPatientToFHIR', () => {
    it('should convert all required fields correctly');
    it('should handle null optional fields');
    it('should generate valid FHIR identifiers');
    it('should map gender codes correctly');
    it('should format birth dates in FHIR format');
  });

  describe('mapFHIRPatientToPrisma', () => {
    it('should extract primary name from multiple names');
    it('should prefer mobile phone over home phone');
    it('should handle missing identifiers gracefully');
  });

  describe('validateFHIRPatient', () => {
    it('should fail for missing required fields');
    it('should warn for missing recommended fields');
    it('should validate date format');
  });

  describe('round-trip conversion', () => {
    it('should preserve data through Prisma → FHIR → Prisma');
    it('should preserve data through FHIR → Prisma → FHIR');
  });
});
```

**Required Unit Test Files:**

```
packages/fhir/src/__tests__/
├── mappers/
│   ├── patient.mapper.test.ts       ✓ Exists
│   ├── observation.mapper.test.ts   ⬜ To Create
│   ├── condition.mapper.test.ts     ⬜ To Create
│   ├── encounter.mapper.test.ts     ⬜ To Create
│   ├── medication.mapper.test.ts    ⬜ To Create
│   └── document.mapper.test.ts      ⬜ To Create
├── services/
│   ├── fhir-client.test.ts          ⬜ To Create
│   └── fhir-client.mock.test.ts     ⬜ To Create
├── connectors/
│   ├── base.connector.test.ts       ⬜ To Create
│   ├── epic.connector.test.ts       ⬜ To Create
│   └── oracle.connector.test.ts     ⬜ To Create
├── types/
│   └── type-guards.test.ts          ⬜ To Create
└── utils/
    └── fhir-utils.test.ts           ⬜ To Create
```

### 2. Contract Tests

Contract tests verify FHIR resource structure compliance.

**Purpose:**
- Validate FHIR R4 resource structure
- Ensure US Core Implementation Guide compliance
- Verify CDS Hooks request/response format
- Test SMART on FHIR authorization flows

**FHIR Validation Strategy:**

```typescript
// packages/fhir/src/__tests__/contracts/fhir-validation.test.ts

import { validateResource } from '@attending/fhir-validator';

describe('FHIR R4 Contract Tests', () => {
  describe('Patient Resource', () => {
    it('should produce valid US Core Patient', async () => {
      const fhirPatient = mapPrismaPatientToFHIR(testPatient);
      
      const result = await validateResource(fhirPatient, {
        profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('DocumentReference Resource', () => {
    it('should produce valid COMPASS assessment document', async () => {
      const document = createCOMPASSDocument(assessment);
      
      const result = await validateResource(document, {
        profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('CDS Hooks Contract', () => {
    it('should produce valid CDS response cards', () => {
      const response = generateCDSResponse(assessment);
      
      expect(response.cards).toBeValidCDSCards();
      expect(response).toMatchCDSHooksSchema('1.1');
    });
  });
});
```

### 3. Integration Tests

Integration tests verify component interaction with mock EHR systems.

**Mock FHIR Server Setup:**

```typescript
// packages/fhir/src/__tests__/integration/setup.ts

import { createMockFHIRServer } from '@attending/fhir-test-utils';

export const mockFHIRServer = createMockFHIRServer({
  port: 9999,
  fhirVersion: 'R4',
  capabilities: {
    resources: ['Patient', 'Encounter', 'Condition', 'Observation', 
                'MedicationRequest', 'AllergyIntolerance', 'DocumentReference'],
    operations: ['read', 'search', 'create', 'update'],
    searchParams: ['_id', 'identifier', 'name', 'birthdate', 'patient'],
  },
  fixtures: {
    patients: loadFixtures('patients'),
    encounters: loadFixtures('encounters'),
  },
  latency: { min: 50, max: 200 }, // Simulate network latency
  errorRate: 0.01, // 1% random errors for resilience testing
});
```

**Integration Test Categories:**

```typescript
// packages/fhir/src/__tests__/integration/fhir-client.integration.test.ts

describe('FHIRClientService Integration', () => {
  beforeAll(async () => {
    await mockFHIRServer.start();
  });

  afterAll(async () => {
    await mockFHIRServer.stop();
  });

  describe('Patient Operations', () => {
    it('should read a patient by ID');
    it('should search patients by name');
    it('should search patients by MRN');
    it('should handle patient not found');
  });

  describe('Patient Summary', () => {
    it('should retrieve comprehensive patient summary');
    it('should handle partial data availability');
    it('should respect timeout limits');
  });

  describe('Document Writeback', () => {
    it('should create COMPASS DocumentReference');
    it('should handle duplicate prevention');
    it('should retry on transient failures');
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized');
    it('should handle 403 forbidden');
    it('should handle 404 not found');
    it('should handle 429 rate limiting');
    it('should handle 500 server errors');
    it('should handle network timeouts');
  });
});
```

### 4. End-to-End Tests

E2E tests verify complete workflows against real sandbox environments.

**Test Scenarios:**

```typescript
// tests/e2e/ehr-integration/epic-sandbox.e2e.test.ts

describe('Epic Sandbox E2E Tests', () => {
  const epicConnector = createEHRConnector({
    ehrSystem: 'epic',
    environment: 'sandbox',
    clientId: process.env.EPIC_SANDBOX_CLIENT_ID,
    redirectUri: process.env.EPIC_REDIRECT_URI,
  });

  describe('SMART Launch Flow', () => {
    it('should complete EHR launch authorization');
    it('should receive patient context');
    it('should receive encounter context');
    it('should refresh expired tokens');
  });

  describe('Clinical Data Retrieval', () => {
    it('should retrieve patient demographics');
    it('should retrieve active conditions');
    it('should retrieve current medications');
    it('should retrieve recent vitals');
    it('should retrieve allergies');
  });

  describe('COMPASS Assessment Writeback', () => {
    it('should write DocumentReference to EHR');
    it('should verify document appears in patient chart');
    it('should handle Epic-specific formatting requirements');
  });
});
```

---

## FHIR-Specific Testing

### FHIR Validator Integration

```typescript
// packages/fhir/src/testing/fhir-validator.ts

import { Validator } from '@ahryman40k/ts-fhir-types/R4';

export interface FHIRValidationResult {
  valid: boolean;
  errors: FHIRValidationError[];
  warnings: FHIRValidationWarning[];
  profile?: string;
}

export class FHIRValidator {
  private validator: Validator;

  async validate(resource: Resource, options?: ValidationOptions): Promise<FHIRValidationResult> {
    // Structural validation
    const structuralErrors = this.validateStructure(resource);
    
    // Profile validation (US Core, etc.)
    const profileErrors = options?.profile 
      ? await this.validateProfile(resource, options.profile)
      : [];
    
    // Terminology validation
    const terminologyErrors = await this.validateTerminology(resource);
    
    // Business rules
    const businessRuleErrors = this.validateBusinessRules(resource);

    return {
      valid: [...structuralErrors, ...profileErrors, ...terminologyErrors, ...businessRuleErrors]
        .filter(e => e.severity === 'error').length === 0,
      errors: [...structuralErrors, ...profileErrors, ...terminologyErrors, ...businessRuleErrors]
        .filter(e => e.severity === 'error'),
      warnings: [...structuralErrors, ...profileErrors, ...terminologyErrors, ...businessRuleErrors]
        .filter(e => e.severity === 'warning'),
      profile: options?.profile,
    };
  }
}
```

### US Core Compliance Matrix

| Resource | US Core Profile | Required Elements | Test Coverage |
|----------|-----------------|-------------------|---------------|
| Patient | us-core-patient | name, gender, birthDate, identifier | ⬜ |
| Condition | us-core-condition | code, subject, clinicalStatus | ⬜ |
| Observation | us-core-vital-signs | code, value, subject, effectiveDateTime | ⬜ |
| MedicationRequest | us-core-medicationrequest | medication, subject, intent, status | ⬜ |
| AllergyIntolerance | us-core-allergyintolerance | code, patient, clinicalStatus | ⬜ |
| DocumentReference | us-core-documentreference | type, category, subject, content | ⬜ |
| Encounter | us-core-encounter | status, class, type, subject | ⬜ |

### FHIR Search Parameter Tests

```typescript
describe('FHIR Search Parameters', () => {
  describe('Patient Search', () => {
    it('should search by _id', async () => {
      const results = await fhirClient.search('Patient', { _id: 'test-patient-1' });
      expect(results).toHaveLength(1);
    });

    it('should search by identifier (MRN)', async () => {
      const results = await fhirClient.search('Patient', {
        identifier: 'urn:oid:2.16.840.1.113883.3.attending-ai/mrn|MRN-001',
      });
      expect(results).toHaveLength(1);
    });

    it('should search by name with partial match', async () => {
      const results = await fhirClient.search('Patient', { name: 'Joh' });
      expect(results.some(p => p.name?.[0]?.given?.includes('John'))).toBe(true);
    });

    it('should search by birthdate range', async () => {
      const results = await fhirClient.search('Patient', {
        birthdate: 'ge1980-01-01',
        birthdate: 'lt1990-01-01',
      });
      // Verify all results are in range
    });

    it('should support _include for related resources', async () => {
      const results = await fhirClient.search('Patient', {
        _id: 'test-patient-1',
        _include: 'Patient:general-practitioner',
      });
      // Verify Practitioner is included
    });
  });
});
```

---

## EHR Vendor Testing

### Epic Systems

**Sandbox Configuration:**

```typescript
// config/ehr/epic-sandbox.config.ts

export const epicSandboxConfig: EpicConnectorConfig = {
  environment: 'sandbox',
  fhirBaseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
  authorizeUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
  clientId: process.env.EPIC_SANDBOX_CLIENT_ID!,
  redirectUri: process.env.EPIC_REDIRECT_URI!,
  scopes: [
    'launch',
    'openid',
    'fhirUser',
    'patient/Patient.read',
    'patient/Encounter.read',
    'patient/Condition.read',
    'patient/Observation.read',
    'patient/MedicationRequest.read',
    'patient/AllergyIntolerance.read',
    'patient/DocumentReference.write',
  ],
};
```

**Epic-Specific Test Cases:**

```typescript
describe('Epic-Specific Tests', () => {
  describe('Epic Document Types', () => {
    it('should use correct LOINC code for consultation note (11488-4)');
    it('should include Epic-compatible category coding');
    it('should format content as text/html');
  });

  describe('Epic MRN Search', () => {
    it('should use Epic MRN OID for identifier search');
    it('should handle Epic-specific identifier format');
  });

  describe('Epic MyChart Integration', () => {
    it('should support patient-facing launch');
    it('should handle MyChart-specific context parameters');
  });
});
```

### Oracle Health (Cerner)

**Sandbox Configuration:**

```typescript
// config/ehr/oracle-sandbox.config.ts

export const oracleSandboxConfig: OracleHealthConnectorConfig = {
  environment: 'sandbox',
  fhirBaseUrl: 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
  tenantId: 'ec2458f2-1e24-41c8-b71b-0e701af7583d',
  clientId: process.env.ORACLE_SANDBOX_CLIENT_ID!,
  redirectUri: process.env.ORACLE_REDIRECT_URI!,
  scopes: [
    'launch',
    'openid',
    'fhirUser',
    'patient/Patient.read',
    'patient/Condition.read',
    'patient/Observation.read',
    'patient/MedicationRequest.read',
    'patient/DocumentReference.write',
  ],
};
```

**Oracle-Specific Test Cases:**

```typescript
describe('Oracle Health-Specific Tests', () => {
  describe('Oracle Document Types', () => {
    it('should use Oracle-compatible document category');
    it('should include Cerner-specific extensions');
  });

  describe('Oracle Millennium Integration', () => {
    it('should handle Millennium-specific patient identifiers');
    it('should support Oracle encounter workflows');
  });
});
```

### Multi-EHR Test Matrix

| Test Case | Epic | Oracle | MEDITECH | athena |
|-----------|------|--------|----------|--------|
| SMART Launch | ⬜ | ⬜ | ⬜ | ⬜ |
| Patient Read | ⬜ | ⬜ | ⬜ | ⬜ |
| Patient Search | ⬜ | ⬜ | ⬜ | ⬜ |
| Conditions | ⬜ | ⬜ | ⬜ | ⬜ |
| Medications | ⬜ | ⬜ | ⬜ | ⬜ |
| Allergies | ⬜ | ⬜ | ⬜ | ⬜ |
| Vitals | ⬜ | ⬜ | ⬜ | ⬜ |
| Doc Writeback | ⬜ | ⬜ | ⬜ | ⬜ |
| Token Refresh | ⬜ | ⬜ | ⬜ | ⬜ |
| Error Handling | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Security & Compliance Testing

### OAuth 2.0 / SMART on FHIR Security Tests

```typescript
describe('SMART on FHIR Security', () => {
  describe('Authorization Flow', () => {
    it('should validate state parameter for CSRF protection');
    it('should implement PKCE for public clients');
    it('should validate redirect_uri against registered URIs');
    it('should request minimum necessary scopes');
  });

  describe('Token Management', () => {
    it('should securely store access tokens');
    it('should refresh tokens before expiration');
    it('should handle refresh token rotation');
    it('should clear tokens on logout');
    it('should not expose tokens in URLs or logs');
  });

  describe('Scope Validation', () => {
    it('should respect granted scope limitations');
    it('should fail gracefully when scope is insufficient');
    it('should not request excessive permissions');
  });
});
```

### HIPAA Compliance Tests

```typescript
describe('HIPAA Compliance', () => {
  describe('Audit Logging', () => {
    it('should log all PHI access events');
    it('should include user, timestamp, action, and resource');
    it('should log failed access attempts');
    it('should not log PHI content in logs');
  });

  describe('Data Minimization', () => {
    it('should only retrieve requested data elements');
    it('should use _elements parameter to limit response');
    it('should not cache PHI unnecessarily');
  });

  describe('Encryption', () => {
    it('should use TLS 1.2+ for all API calls');
    it('should validate server certificates');
    it('should encrypt PHI at rest');
  });

  describe('Access Control', () => {
    it('should enforce role-based access');
    it('should verify patient consent where applicable');
    it('should timeout inactive sessions');
  });
});
```

### Penetration Testing Scenarios

| Scenario | Test Type | Priority |
|----------|-----------|----------|
| Token injection | Security | Critical |
| Patient ID manipulation | Security | Critical |
| Scope escalation | Security | Critical |
| IDOR (Insecure Direct Object Reference) | Security | High |
| Rate limit bypass | Security | High |
| Injection in search parameters | Security | High |
| Token leakage in errors | Security | Medium |
| Verbose error messages | Security | Medium |

---

## Performance & Reliability Testing

### Performance Benchmarks

```typescript
describe('Performance Tests', () => {
  describe('Response Time', () => {
    it('should retrieve patient in < 500ms', async () => {
      const start = performance.now();
      await fhirClient.getPatient('test-patient');
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should retrieve patient summary in < 2000ms', async () => {
      const start = performance.now();
      await fhirClient.getPatientSummary('test-patient');
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('should write document in < 1000ms', async () => {
      const start = performance.now();
      await fhirClient.writeDocument(testDocument);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Throughput', () => {
    it('should handle 100 concurrent patient reads', async () => {
      const requests = Array(100).fill(null).map(() => 
        fhirClient.getPatient('test-patient')
      );
      const results = await Promise.all(requests);
      expect(results.filter(r => r !== null)).toHaveLength(100);
    });
  });
});
```

### Reliability Tests

```typescript
describe('Reliability Tests', () => {
  describe('Retry Logic', () => {
    it('should retry on 500 errors with exponential backoff');
    it('should retry on network timeouts');
    it('should not retry on 4xx client errors');
    it('should respect max retry limit');
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after consecutive failures');
    it('should allow test request after cooldown');
    it('should close circuit on successful recovery');
  });

  describe('Failover', () => {
    it('should fallback to cached data when EHR unavailable');
    it('should queue writes during EHR outage');
    it('should sync queued writes on recovery');
  });

  describe('Graceful Degradation', () => {
    it('should continue with partial data on timeout');
    it('should display meaningful error to user');
    it('should not expose system details in errors');
  });
});
```

### Load Testing Configuration

```yaml
# k6/ehr-load-test.yaml

scenarios:
  patient_read:
    executor: ramping-vus
    startVUs: 0
    stages:
      - duration: 2m
        target: 50
      - duration: 5m
        target: 50
      - duration: 2m
        target: 100
      - duration: 5m
        target: 100
      - duration: 2m
        target: 0

  patient_summary:
    executor: constant-arrival-rate
    rate: 10
    timeUnit: 1s
    duration: 10m
    preAllocatedVUs: 20

thresholds:
  http_req_duration: ['p(95)<500', 'p(99)<1000']
  http_req_failed: ['rate<0.01']
  errors: ['count<10']
```

---

## Test Data Management

### Synthetic Patient Generation

```typescript
// packages/fhir/src/testing/fixtures/patient-generator.ts

import { faker } from '@faker-js/faker';

export function generateSyntheticPatient(overrides?: Partial<PrismaPatient>): PrismaPatient {
  return {
    id: faker.string.uuid(),
    mrn: `MRN-${faker.string.numeric(6)}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    middleName: faker.helpers.maybe(() => faker.person.middleName()),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
    gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
    email: faker.internet.email(),
    phone: faker.phone.number('###-###-####'),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode('#####'),
    emergencyContact: faker.person.fullName(),
    emergencyPhone: faker.phone.number('###-###-####'),
    insuranceId: `INS-${faker.string.alphanumeric(8)}`,
    insuranceName: faker.helpers.arrayElement([
      'Blue Cross', 'Aetna', 'United Healthcare', 'Cigna', 'Medicare'
    ]),
    primaryProviderId: faker.string.uuid(),
    preferredLanguage: faker.helpers.arrayElement(['en', 'es', 'zh', 'vi']),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function generatePatientCohort(count: number, profile?: CohortProfile): PrismaPatient[] {
  const patients: PrismaPatient[] = [];
  
  for (let i = 0; i < count; i++) {
    const patient = generateSyntheticPatient();
    
    // Apply cohort profile (e.g., diabetes patients, geriatric)
    if (profile) {
      applyProfile(patient, profile);
    }
    
    patients.push(patient);
  }
  
  return patients;
}
```

### Clinical Test Scenarios

```typescript
// packages/fhir/src/testing/fixtures/clinical-scenarios.ts

export const clinicalScenarios = {
  // Emergency scenarios for red flag testing
  chestPainEmergency: {
    patient: generateSyntheticPatient({ gender: 'Male', dateOfBirth: new Date('1960-05-15') }),
    symptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
    vitals: { systolicBP: 180, heartRate: 110, oxygenSat: 92 },
    expectedRedFlags: ['ACS', 'Hypertensive Emergency'],
    expectedTriageLevel: 'emergent',
  },

  // Chronic disease management
  diabetesFollowUp: {
    patient: generateSyntheticPatient(),
    conditions: [{ code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' }],
    medications: [{ code: 'metformin', display: 'Metformin 500mg' }],
    recentLabs: [{ code: '4548-4', display: 'HbA1c', value: 7.2 }],
  },

  // Pediatric scenarios
  pediatricWellVisit: {
    patient: generateSyntheticPatient({ dateOfBirth: new Date('2022-03-20') }),
    expectedScreenings: ['developmental', 'immunization', 'growth'],
  },

  // Mental health
  depressionScreening: {
    patient: generateSyntheticPatient(),
    phq9Score: 15,
    expectedReferral: 'behavioral_health',
  },
};
```

### Test Data Fixtures

```
packages/fhir/src/testing/fixtures/
├── patients/
│   ├── basic-patient.json
│   ├── patient-with-conditions.json
│   ├── patient-with-medications.json
│   ├── patient-full-history.json
│   └── patient-minimal.json
├── encounters/
│   ├── office-visit.json
│   ├── telehealth.json
│   └── emergency.json
├── conditions/
│   ├── diabetes.json
│   ├── hypertension.json
│   ├── asthma.json
│   └── depression.json
├── observations/
│   ├── vital-signs-panel.json
│   ├── laboratory-results.json
│   └── social-history.json
├── documents/
│   ├── compass-assessment.json
│   └── clinical-note.json
└── bundles/
    ├── patient-summary-bundle.json
    └── search-results-bundle.json
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ehr-integration-tests.yml

name: EHR Integration Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'packages/fhir/**'
      - 'apps/*/lib/fhir/**'
  pull_request:
    branches: [main]
    paths:
      - 'packages/fhir/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:fhir:unit
        working-directory: packages/fhir
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: packages/fhir/coverage/lcov.info
          flags: fhir-unit

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:fhir:contract
        working-directory: packages/fhir

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mock-fhir:
        image: smartonfhir/test-ehr:latest
        ports:
          - 9999:9999
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:fhir:integration
        env:
          FHIR_BASE_URL: http://localhost:9999/fhir

  sandbox-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [unit-tests, contract-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:fhir:sandbox
        env:
          EPIC_SANDBOX_CLIENT_ID: ${{ secrets.EPIC_SANDBOX_CLIENT_ID }}
          ORACLE_SANDBOX_CLIENT_ID: ${{ secrets.ORACLE_SANDBOX_CLIENT_ID }}
```

### Test Reporting

```typescript
// vitest.config.ts (FHIR package)

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './reports/junit.xml',
    },
  },
});
```

---

## Certification Requirements

### ONC Health IT Certification

ATTENDING AI must meet ONC certification criteria for Health IT Modules.

**Relevant Certification Criteria:**

| Criterion | Description | Test Coverage |
|-----------|-------------|---------------|
| §170.315(g)(7) | Application access – patient selection | ⬜ |
| §170.315(g)(9) | Application access – all data request | ⬜ |
| §170.315(g)(10) | Standardized API for patient and population services | ⬜ |

### Epic App Orchard Requirements

**Epic Integration Testing Checklist:**

- [ ] Complete Epic App Orchard registration
- [ ] Pass App Orchard security review
- [ ] Complete Epic's SMART on FHIR testing
- [ ] Validate against Epic's test patients
- [ ] Submit production deployment request
- [ ] Complete Epic's Production Validation

**Epic Test Patient IDs:**

| Test Patient | MRN | Use Case |
|--------------|-----|----------|
| Camila Lopez | E1234 | General adult female |
| Derrick Lin | E5678 | Adult male with conditions |
| Emily Williams | E9012 | Pediatric patient |
| Theodore Barnes | E3456 | Geriatric patient |

### Oracle Health Code Console Requirements

**Oracle Integration Testing Checklist:**

- [ ] Register in Oracle Code Console
- [ ] Configure sandbox application
- [ ] Complete FHIR capability testing
- [ ] Validate against Cerner test patients
- [ ] Pass security assessment
- [ ] Request production tenant access

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Set up mock FHIR server infrastructure
- [ ] Complete unit tests for all mappers
- [ ] Implement FHIR validator integration
- [ ] Create synthetic test data generators

### Phase 2: Integration (Weeks 3-4)

- [ ] Implement FHIRClientService integration tests
- [ ] Create connector integration tests
- [ ] Set up CI/CD pipeline for FHIR tests
- [ ] Document test data fixtures

### Phase 3: Sandbox (Weeks 5-6)

- [ ] Configure Epic sandbox testing
- [ ] Configure Oracle Health sandbox testing
- [ ] Implement E2E test suites
- [ ] Complete security testing

### Phase 4: Certification Prep (Weeks 7-8)

- [ ] Complete ONC certification test cases
- [ ] Submit Epic App Orchard application
- [ ] Submit Oracle Code Console application
- [ ] Performance and load testing

---

## Appendix

### A. FHIR Resource Test Data Templates

See `packages/fhir/src/testing/fixtures/` for complete templates.

### B. EHR Sandbox Credentials

Stored securely in environment variables and GitHub Secrets.

### C. Related Documentation

- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [US Core Implementation Guide](https://www.hl7.org/fhir/us/core/)
- [SMART on FHIR](https://docs.smarthealthit.org/)
- [CDS Hooks](https://cds-hooks.org/)
- [Epic FHIR Documentation](https://fhir.epic.com/)
- [Oracle Health FHIR Documentation](https://fhir.cerner.com/)

---

**Document Status:** Living Document - Updated as testing evolves  
**Review Frequency:** Monthly  
**Owner:** ATTENDING AI Engineering Team
