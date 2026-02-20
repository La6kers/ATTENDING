// ============================================================
// ATTENDING AI - Integration Test Suite
// tests/integration/integrations.test.ts
//
// End-to-end tests for Batch 8-9 integration features:
//   - HL7v2 message parsing & building
//   - Event bus & webhook delivery
//   - API key generation & validation
//   - Idempotency middleware
//   - Integration registry
//   - Tenant onboarding
//
// Run: npx jest tests/integration/integrations.test.ts
// ============================================================

import { describe, it, expect, beforeEach } from '@jest/globals';

// ============================================================
// HL7v2 PARSER TESTS
// ============================================================

describe('HL7v2 Parser', () => {
  // Dynamic import to avoid build issues in CI
  let HL7v2Parser: any;
  let HL7v2Builder: any;
  let attendingPatientToHL7: any;
  let hl7PatientToAttending: any;
  let hl7ObservationsToLabResults: any;

  beforeEach(async () => {
    const mod = await import('../../apps/shared/lib/integrations/hl7v2');
    HL7v2Parser = mod.HL7v2Parser;
    HL7v2Builder = mod.HL7v2Builder;
    attendingPatientToHL7 = mod.attendingPatientToHL7;
    hl7PatientToAttending = mod.hl7PatientToAttending;
    hl7ObservationsToLabResults = mod.hl7ObservationsToLabResults;
  });

  const SAMPLE_ADT = [
    'MSH|^~\\&|EPIC|HOSPITAL|ATTENDING_AI|ATTENDING|20260215120000||ADT^A04|MSG001|P|2.5.1',
    'PID|1||MRN12345^^^HOSPITAL^MR||DOE^JOHN^M||19800115|M|||123 Main St^^Denver^CO^80202^US||3035551234',
    'PV1|1|O|||||||12345^SMITH^JANE|||||||||||||||||||||||||||||||||||20260215120000',
  ].join('\r');

  const SAMPLE_ORU = [
    'MSH|^~\\&|LAB|HOSPITAL|ATTENDING_AI|ATTENDING|20260215130000||ORU^R01|MSG002|P|2.5.1',
    'PID|1||MRN12345^^^HOSPITAL^MR||DOE^JOHN||19800115|M',
    'OBR|1|ORD001||CBC^Complete Blood Count|||20260215120000||||||||||||||||F',
    'OBX|1|NM|6690-2^WBC^LN||7.5|10*3/uL|4.5-11.0|N|||F|||20260215125000',
    'OBX|2|NM|718-7^Hemoglobin^LN||14.2|g/dL|13.5-17.5|N|||F|||20260215125000',
    'OBX|3|NM|2160-0^Creatinine^LN||2.8|mg/dL|0.7-1.3|HH|||F|||20260215125000',
  ].join('\r');

  it('validates HL7v2 message format', () => {
    expect(HL7v2Parser.isValid(SAMPLE_ADT)).toBe(true);
    expect(HL7v2Parser.isValid('not an hl7 message')).toBe(false);
    expect(HL7v2Parser.isValid('')).toBe(false);
  });

  it('parses ADT message correctly', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ADT);

    expect(msg.getMessageType()).toContain('ADT');
    expect(msg.getSendingFacility()).toBeTruthy();
    expect(msg.getControlId()).toBe('MSG001');

    const patient = msg.getPatient();
    expect(patient).not.toBeNull();
    expect(patient!.lastName).toBe('DOE');
    expect(patient!.firstName).toBe('JOHN');
    expect(patient!.middleName).toBe('M');
    expect(patient!.gender).toBe('M');
    expect(patient!.dateOfBirth).toBe('19800115');
    expect(patient!.mrn).toBe('MRN12345');
  });

  it('parses ORU message with lab observations', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ORU);

    expect(msg.getMessageType()).toContain('ORU');

    const observations = msg.getObservations();
    expect(observations).toHaveLength(3);

    // WBC
    expect(observations[0].code).toBe('6690-2');
    expect(observations[0].value).toBe('7.5');
    expect(observations[0].abnormalFlag).toBe('N');
    expect(observations[0].status).toBe('F');

    // Creatinine (critical high)
    expect(observations[2].code).toBe('2160-0');
    expect(observations[2].value).toBe('2.8');
    expect(observations[2].abnormalFlag).toBe('HH');
  });

  it('extracts patient address from PID', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ADT);
    const patient = msg.getPatient()!;

    expect(patient.address).toBeDefined();
    expect(patient.address?.street).toBe('123 Main St');
    expect(patient.address?.city).toBe('Denver');
    expect(patient.address?.state).toBe('CO');
    expect(patient.address?.zip).toBe('80202');
  });

  it('builds HL7v2 message with correct structure', () => {
    const builder = new HL7v2Builder('ORU', 'R01');
    builder.setPatient({
      id: 'P-001',
      mrn: 'MRN001',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '19900101',
      gender: 'F',
    });
    builder.addObservation({
      code: '2160-0',
      codeName: 'Creatinine',
      codeSystem: 'LN',
      value: '1.2',
      unit: 'mg/dL',
      referenceRange: '0.7-1.3',
      abnormalFlag: 'N',
      status: 'F',
    });

    const message = builder.build();

    expect(message).toContain('MSH|');
    expect(message).toContain('ORU^R01');
    expect(message).toContain('PID|1||MRN001');
    expect(message).toContain('Smith^Jane');
    expect(message).toContain('OBX|1|NM|2160-0^Creatinine^LN||1.2|mg/dL|0.7-1.3|N');
  });

  it('generates valid ACK response', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ADT);
    const ack = HL7v2Parser.createACK(msg, 'AA');

    expect(ack).toContain('MSH|');
    expect(ack).toContain('ACK|');
    expect(ack).toContain('MSA|AA|MSG001');
  });

  it('generates NACK with error message', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ADT);
    const nack = HL7v2Parser.createACK(msg, 'AE', 'Patient not found');

    expect(nack).toContain('MSA|AE|MSG001|Patient not found');
  });

  // Bidirectional mapper tests
  it('converts ATTENDING patient to HL7 format', () => {
    const attending = {
      id: 'P-001',
      mrn: 'MRN001',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1980-01-15',
      gender: 'male',
      phone: '3035551234',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
    };

    const hl7 = attendingPatientToHL7(attending);

    expect(hl7.mrn).toBe('MRN001');
    expect(hl7.firstName).toBe('John');
    expect(hl7.lastName).toBe('Doe');
    expect(hl7.gender).toBe('M');
    expect(hl7.dateOfBirth).toBe('19800115');
  });

  it('converts HL7 patient to ATTENDING format', () => {
    const hl7 = {
      id: 'PID-001',
      mrn: 'MRN001',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '19900315',
      gender: 'F',
    };

    const attending = hl7PatientToAttending(hl7);

    expect(attending.mrn).toBe('MRN001');
    expect(attending.firstName).toBe('Jane');
    expect(attending.dateOfBirth).toBe('1990-03-15');
    expect(attending.gender).toBe('female');
  });

  it('converts HL7 observations to lab results', () => {
    const msg = HL7v2Parser.parse(SAMPLE_ORU);
    const observations = msg.getObservations();
    const results = hl7ObservationsToLabResults(observations, 'P-001');

    expect(results).toHaveLength(3);
    expect(results[0].testCode).toBe('6690-2');
    expect(results[0].interpretation).toBe('NORMAL');
    expect(results[2].interpretation).toBe('CRITICAL_HIGH');
    expect(results[2].patientId).toBe('P-001');
  });
});

// ============================================================
// EVENT BUS TESTS
// ============================================================

describe('Event Bus', () => {
  let EventBusModule: any;

  beforeEach(async () => {
    EventBusModule = await import('../../apps/shared/lib/integrations/events');
  });

  it('emits events to type-specific listeners', async () => {
    const { events } = EventBusModule;
    events.removeAll(); // Clean state

    const received: any[] = [];
    const unsub = events.on('lab.result.created', async (event: any) => {
      received.push(event);
    });

    await events.emit('lab.result.created', { patientId: 'P-001' });
    await events.emit('patient.created', { patientId: 'P-002' }); // Should NOT trigger

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('lab.result.created');
    expect(received[0].data.patientId).toBe('P-001');
    expect(received[0].id).toBeDefined();
    expect(received[0].timestamp).toBeDefined();
    expect(received[0].version).toBe('1.0');

    unsub();
    events.removeAll();
  });

  it('supports wildcard listeners', async () => {
    const { events } = EventBusModule;
    events.removeAll();

    const received: any[] = [];
    const unsub = events.on('*', async (event: any) => {
      received.push(event.type);
    });

    await events.emit('lab.result.created', {});
    await events.emit('patient.created', {});
    await events.emit('emergency.triggered', {});

    expect(received).toHaveLength(3);
    expect(received).toContain('lab.result.created');
    expect(received).toContain('patient.created');
    expect(received).toContain('emergency.triggered');

    unsub();
    events.removeAll();
  });

  it('includes organization context in events', async () => {
    const { events } = EventBusModule;
    events.removeAll();

    let capturedEvent: any;
    events.on('patient.updated', async (e: any) => { capturedEvent = e; });

    await events.emit('patient.updated', { patientId: 'P-001' }, {
      organizationId: 'org_123',
      userId: 'user_456',
    });

    expect(capturedEvent.organizationId).toBe('org_123');
    expect(capturedEvent.userId).toBe('user_456');

    events.removeAll();
  });

  it('handles listener errors gracefully', async () => {
    const { events } = EventBusModule;
    events.removeAll();

    let secondCalled = false;

    events.on('lab.result.created', async () => {
      throw new Error('Listener failed');
    });
    events.on('lab.result.created', async () => {
      secondCalled = true;
    });

    // Should not throw
    await events.emit('lab.result.created', {});

    // Second listener should still execute
    expect(secondCalled).toBe(true);

    events.removeAll();
  });
});

// ============================================================
// WEBHOOK SIGNING TESTS
// ============================================================

describe('Webhook Signing', () => {
  it('signs payload with HMAC-SHA256', async () => {
    const { signWebhookPayload } = await import('../../apps/shared/lib/integrations/events');

    const payload = JSON.stringify({ type: 'test', data: { id: '123' } });
    const secret = 'test-secret-key';

    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);

    // Deterministic
    expect(sig1).toBe(sig2);

    // Different payload → different signature
    const sig3 = signWebhookPayload(payload + 'x', secret);
    expect(sig3).not.toBe(sig1);

    // Different secret → different signature
    const sig4 = signWebhookPayload(payload, 'other-secret');
    expect(sig4).not.toBe(sig1);
  });
});

// ============================================================
// API KEY TESTS
// ============================================================

describe('API Key Management', () => {
  let apiKeys: any;

  beforeEach(async () => {
    apiKeys = await import('../../apps/shared/lib/auth/apiKeys');
  });

  it('generates keys with correct format', () => {
    const { key, hash, prefix } = apiKeys.generateApiKey();

    expect(key).toMatch(/^atnd_/);
    expect(key.length).toBeGreaterThan(40);
    expect(hash).toHaveLength(64); // SHA-256 hex
    expect(prefix).toBe(key.slice(0, 12));
  });

  it('produces deterministic hashes', () => {
    const testKey = 'atnd_test123';
    const hash1 = apiKeys.hashApiKey(testKey);
    const hash2 = apiKeys.hashApiKey(testKey);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates unique keys', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(apiKeys.generateApiKey().key);
    }
    expect(keys.size).toBe(100);
  });

  it('checks scopes correctly', () => {
    const { hasScope } = apiKeys;

    // Direct match
    expect(hasScope(['read:patients'], 'read:patients')).toBe(true);

    // Parent scope covers child
    expect(hasScope(['read'], 'read:patients')).toBe(true);
    expect(hasScope(['write'], 'write:labs')).toBe(true);

    // Unrelated scope
    expect(hasScope(['read:patients'], 'write:labs')).toBe(false);

    // Multiple scopes
    expect(hasScope(['read', 'write:labs'], 'write:labs')).toBe(true);
    expect(hasScope(['read', 'write:labs'], 'admin')).toBe(false);
  });
});

// ============================================================
// IDEMPOTENCY TESTS
// ============================================================

describe('Idempotency', () => {
  it('generates unique idempotency keys', async () => {
    const { generateIdempotencyKey } = await import('../../apps/shared/lib/idempotency');

    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(generateIdempotencyKey());
    }
    expect(keys.size).toBe(100);
  });
});

// ============================================================
// INTEGRATION REGISTRY TESTS
// ============================================================

describe('Integration Registry', () => {
  it('exports expected types and classes', async () => {
    const mod = await import('../../apps/shared/lib/integrations');

    expect(mod.IntegrationRegistry).toBeDefined();
    expect(mod.events).toBeDefined();
    expect(mod.HL7v2Parser).toBeDefined();
    expect(mod.HL7v2Builder).toBeDefined();
    expect(mod.CLINICAL_EVENTS).toBeDefined();
    expect(mod.signWebhookPayload).toBeDefined();

    // Clinical events should have 30+ event types
    expect(Object.keys(mod.CLINICAL_EVENTS).length).toBeGreaterThanOrEqual(30);
  });
});

// ============================================================
// SSO PROVIDERS TESTS
// ============================================================

// ============================================================
// DATA TRANSFORM PIPELINE TESTS
// ============================================================

describe('Transform Pipeline', () => {
  let TransformPipeline: any;
  let validateRequired: any;
  let normalizeText: any;
  let normalizeDates: any;
  let normalizeGender: any;
  let normalizePhone: any;
  let fieldMapper: any;
  let patientImportPipeline: any;

  beforeEach(async () => {
    const mod = await import('../../apps/shared/lib/integrations/transforms');
    TransformPipeline = mod.TransformPipeline;
    validateRequired = mod.validateRequired;
    normalizeText = mod.normalizeText;
    normalizeDates = mod.normalizeDates;
    normalizeGender = mod.normalizeGender;
    normalizePhone = mod.normalizePhone;
    fieldMapper = mod.fieldMapper;
    patientImportPipeline = mod.patientImportPipeline;
  });

  it('runs stages in sequence', async () => {
    const pipeline = new TransformPipeline()
      .add({ name: 'double', execute: (n: number) => n * 2 })
      .add({ name: 'add-ten', execute: (n: number) => n + 10 });

    const result = await pipeline.execute(5);
    expect(result.success).toBe(true);
    expect(result.data).toBe(20); // (5 * 2) + 10
  });

  it('aborts on stage error', async () => {
    const pipeline = new TransformPipeline()
      .add({ name: 'fail', execute: () => { throw new Error('boom'); } })
      .add({ name: 'never', execute: (n: number) => n + 1 });

    const result = await pipeline.execute(1);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stage).toBe('fail');
  });

  it('normalizes text to title case', async () => {
    const pipeline = new TransformPipeline().add(normalizeText);
    const result = await pipeline.execute({ firstName: 'john', lastName: 'doe', city: 'denver' });

    expect(result.data.firstName).toBe('John');
    expect(result.data.lastName).toBe('Doe');
    expect(result.data.city).toBe('Denver');
  });

  it('normalizes dates from various formats', async () => {
    const pipeline = new TransformPipeline().add(normalizeDates);

    // HL7 format
    const r1 = await pipeline.execute({ dateOfBirth: '19800115' });
    expect(r1.data.dateOfBirth).toBe('1980-01-15');

    // US format
    const r2 = await pipeline.execute({ dateOfBirth: '01/15/1980' });
    expect(r2.data.dateOfBirth).toBe('1980-01-15');

    // Already ISO
    const r3 = await pipeline.execute({ dateOfBirth: '1980-01-15' });
    expect(r3.data.dateOfBirth).toBe('1980-01-15');
  });

  it('normalizes gender values', async () => {
    const pipeline = new TransformPipeline().add(normalizeGender);

    expect((await pipeline.execute({ gender: 'M' })).data.gender).toBe('male');
    expect((await pipeline.execute({ gender: 'f' })).data.gender).toBe('female');
    expect((await pipeline.execute({ gender: 'non-binary' })).data.gender).toBe('other');
  });

  it('normalizes US phone numbers', async () => {
    const pipeline = new TransformPipeline().add(normalizePhone);

    const r1 = await pipeline.execute({ phone: '(303) 555-1234' });
    expect(r1.data.phone).toBe('+13035551234');

    const r2 = await pipeline.execute({ phone: '303-555-1234' });
    expect(r2.data.phone).toBe('+13035551234');
  });

  it('validates required fields', async () => {
    const pipeline = new TransformPipeline()
      .add(validateRequired(['firstName', 'lastName', 'dateOfBirth']));

    const r1 = await pipeline.execute({ firstName: 'John', lastName: 'Doe', dateOfBirth: '1980-01-15' });
    expect(r1.errors.filter((e: any) => e.severity === 'error')).toHaveLength(0);

    const r2 = await pipeline.execute({ firstName: 'John' });
    expect(r2.errors.filter((e: any) => e.severity === 'error')).toHaveLength(2);
  });

  it('maps fields between schemas', async () => {
    const pipeline = new TransformPipeline()
      .add(fieldMapper({
        fullName: (d: any) => `${d.first} ${d.last}`,
        email: 'emailAddress',
      }));

    const result = await pipeline.execute({ first: 'John', last: 'Doe', emailAddress: 'john@test.com' });
    expect(result.data.fullName).toBe('John Doe');
    expect(result.data.email).toBe('john@test.com');
  });

  it('runs full patient import pipeline', async () => {
    const pipeline = patientImportPipeline();

    const result = await pipeline.execute({
      mrn: 'MRN-001',
      firstName: 'john',
      lastName: 'doe',
      dateOfBirth: '01/15/1980',
      gender: 'M',
      phone: '(303) 555-1234',
      email: 'john@test.com',
      city: 'denver',
      state: 'co',
      zip: '80202',
    });

    expect(result.success).toBe(true);
    expect(result.data.firstName).toBe('John');
    expect(result.data.lastName).toBe('Doe');
    expect(result.data.dateOfBirth).toBe('1980-01-15');
    expect(result.data.gender).toBe('male');
    expect(result.data.phone).toBe('+13035551234');
    expect(result.data.state).toBe('CO');
    expect(result.data.zipCode).toBe('80202');
  });
});

// ============================================================
// BULK EXPORT TESTS
// ============================================================

describe('Bulk Export', () => {
  it('exports expected types and functions', async () => {
    const mod = await import('../../apps/shared/lib/integrations/bulkExport');
    expect(mod.startExportJob).toBeDefined();
    expect(mod.getExportJob).toBeDefined();
    expect(mod.cancelExportJob).toBeDefined();
    expect(mod.listExportJobs).toBeDefined();
    expect(mod.getExportFileData).toBeDefined();
  });

  it('creates export job with pending status', async () => {
    const { startExportJob, getExportJob } = await import('../../apps/shared/lib/integrations/bulkExport');

    const job = startExportJob(
      { organizationId: 'test-org', _type: ['Patient'] },
      'test-user'
    );

    expect(job.id).toBeDefined();
    expect(job.request.organizationId).toBe('test-org');
    expect(['pending', 'processing']).toContain(job.status);

    const retrieved = getExportJob(job.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(job.id);
  });

  it('cancels a job', async () => {
    const { startExportJob, cancelExportJob, getExportJob } = await import('../../apps/shared/lib/integrations/bulkExport');

    const job = startExportJob({ organizationId: 'test-org' }, 'test-user');
    const cancelled = cancelExportJob(job.id);
    expect(cancelled).toBe(true);

    const retrieved = getExportJob(job.id);
    expect(retrieved!.status).toBe('cancelled');
  });
});

describe('SSO Providers', () => {
  it('has presets for common enterprise IdPs', async () => {
    const { SSO_PRESETS } = await import('../../apps/shared/lib/auth/ssoProviders');

    expect(SSO_PRESETS.okta).toBeDefined();
    expect(SSO_PRESETS['azure-ad']).toBeDefined();
    expect(SSO_PRESETS.auth0).toBeDefined();
    expect(SSO_PRESETS.google).toBeDefined();
    expect(SSO_PRESETS.pingfederate).toBeDefined();

    // Okta should be OIDC
    expect(SSO_PRESETS.okta.protocol).toBe('oidc');

    // PingFederate should be SAML
    expect(SSO_PRESETS.pingfederate.protocol).toBe('saml');
  });

  it('builds NextAuth provider configs', async () => {
    const { buildNextAuthProviders } = await import('../../apps/shared/lib/auth/ssoProviders');

    const configs = [
      {
        id: 'test-oidc',
        name: 'Test OIDC',
        protocol: 'oidc' as const,
        organizationId: 'org-1',
        isActive: true,
        oidc: {
          issuer: 'https://test.okta.com',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      },
    ];

    const providers = buildNextAuthProviders(configs);
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe('oidc-test-oidc');
    expect(providers[0].name).toBe('Test OIDC');
    expect(providers[0].clientId).toBe('test-client');
  });

  it('skips inactive providers', async () => {
    const { buildNextAuthProviders } = await import('../../apps/shared/lib/auth/ssoProviders');

    const configs = [
      {
        id: 'inactive',
        name: 'Inactive',
        protocol: 'oidc' as const,
        organizationId: null,
        isActive: false,
        oidc: { issuer: 'https://test.com', clientId: 'x', clientSecret: 'y' },
      },
    ];

    const providers = buildNextAuthProviders(configs);
    expect(providers).toHaveLength(0);
  });
});
