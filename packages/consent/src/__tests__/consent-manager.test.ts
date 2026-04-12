// =============================================================================
// ATTENDING AI - Consent Manager Tests
// packages/consent/src/__tests__/consent-manager.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentManager, type ConsentStorage } from '../consent-manager';
import type { ConsentRecord, ConsentAuditEntry, ConsentGrant } from '../types';

// =============================================================================
// Mock Storage Factory
// =============================================================================

function createMockStorage(overrides: Partial<ConsentStorage> = {}): ConsentStorage {
  return {
    create: vi.fn(async (record) => ({ ...record, id: 'consent-001' } as ConsentRecord)),
    findByPatient: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    update: vi.fn(async (id, updates) => ({
      id,
      patientId: 'patient-1',
      organizationId: 'org-1',
      consentType: 'fhir-data-access' as const,
      status: 'active' as const,
      dataCategories: [],
      networkIds: [],
      grantedAt: new Date(),
      grantedBy: 'system',
      auditTrail: [],
      ...updates,
    } as ConsentRecord)),
    appendAudit: vi.fn(async () => {}),
    ...overrides,
  };
}

function makeGrant(overrides: Partial<ConsentGrant> = {}): ConsentGrant {
  return {
    patientId: 'patient-1',
    organizationId: 'org-1',
    consentType: 'fhir-data-access',
    dataCategories: ['medications', 'labs', 'conditions'],
    networkIds: ['network-a'],
    purpose: 'CMS HTE data access',
    ...overrides,
  };
}

function makeConsentRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    id: 'consent-001',
    patientId: 'patient-1',
    organizationId: 'org-1',
    consentType: 'fhir-data-access',
    status: 'active',
    dataCategories: ['medications', 'labs', 'conditions'],
    networkIds: ['network-a'],
    purpose: 'CMS HTE data access',
    grantedAt: new Date('2026-01-15'),
    grantedBy: 'idme:sub-123',
    auditTrail: [{ action: 'granted', timestamp: new Date(), actor: 'idme:sub-123' }],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ConsentManager', () => {
  let storage: ConsentStorage;
  let manager: ConsentManager;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new ConsentManager(storage);
  });

  // ---------------------------------------------------------------------------
  // grantConsent
  // ---------------------------------------------------------------------------

  describe('grantConsent', () => {
    it('should create a new consent record when none exists', async () => {
      const grant = makeGrant();
      const result = await manager.grantConsent(grant, 'idme:sub-123');

      expect(storage.create).toHaveBeenCalledTimes(1);
      const createArg = (storage.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createArg.patientId).toBe('patient-1');
      expect(createArg.organizationId).toBe('org-1');
      expect(createArg.consentType).toBe('fhir-data-access');
      expect(createArg.status).toBe('active');
      expect(createArg.dataCategories).toEqual(['medications', 'labs', 'conditions']);
      expect(createArg.networkIds).toEqual(['network-a']);
      expect(createArg.grantedBy).toBe('idme:sub-123');
      expect(createArg.auditTrail).toHaveLength(1);
      expect(createArg.auditTrail[0].action).toBe('granted');
      expect(result.id).toBe('consent-001');
    });

    it('should update existing consent when active consent of same type exists', async () => {
      const existing = makeConsentRecord();
      storage = createMockStorage({
        findByPatient: vi.fn(async () => [existing]),
      });
      manager = new ConsentManager(storage);

      const grant = makeGrant({ dataCategories: ['medications', 'labs', 'conditions', 'vitals'] });
      await manager.grantConsent(grant, 'idme:sub-123');

      expect(storage.update).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        dataCategories: ['medications', 'labs', 'conditions', 'vitals'],
        status: 'active',
      }));
      expect(storage.appendAudit).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        action: 'modified',
      }));
    });

    it('should reject invalid grant data', async () => {
      await expect(
        manager.grantConsent({ patientId: '', organizationId: 'org-1', consentType: 'fhir-data-access', dataCategories: ['labs'] }, 'actor')
      ).rejects.toThrow();
    });

    it('should set networkIds to empty array when not provided', async () => {
      const grant = makeGrant({ networkIds: undefined });
      await manager.grantConsent(grant, 'idme:sub-123');

      const createArg = (storage.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(createArg.networkIds).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // revokeConsent
  // ---------------------------------------------------------------------------

  describe('revokeConsent', () => {
    it('should revoke an active consent', async () => {
      const existing = makeConsentRecord();
      storage = createMockStorage({
        findById: vi.fn(async () => existing),
      });
      manager = new ConsentManager(storage);

      await manager.revokeConsent('consent-001', 'idme:sub-123', 'Patient requested');

      expect(storage.update).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        status: 'revoked',
        revokedBy: 'idme:sub-123',
      }));
      expect(storage.appendAudit).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        action: 'revoked',
        actor: 'idme:sub-123',
        details: 'Patient requested',
      }));
    });

    it('should throw when consent not found', async () => {
      await expect(manager.revokeConsent('nonexistent', 'actor')).rejects.toThrow('not found');
    });

    it('should throw when consent already revoked', async () => {
      const revoked = makeConsentRecord({ status: 'revoked' });
      storage = createMockStorage({
        findById: vi.fn(async () => revoked),
      });
      manager = new ConsentManager(storage);

      await expect(manager.revokeConsent('consent-001', 'actor')).rejects.toThrow('already revoked');
    });

    it('should use default revocation reason when none given', async () => {
      const existing = makeConsentRecord();
      storage = createMockStorage({ findById: vi.fn(async () => existing) });
      manager = new ConsentManager(storage);

      await manager.revokeConsent('consent-001', 'actor');
      expect(storage.appendAudit).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        details: 'Patient revoked consent',
      }));
    });
  });

  // ---------------------------------------------------------------------------
  // checkConsent
  // ---------------------------------------------------------------------------

  describe('checkConsent', () => {
    it('should return hasConsent: false when no active consent', async () => {
      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        requestedCategories: ['labs', 'medications'],
      });

      expect(result.hasConsent).toBe(false);
      expect(result.allowedCategories).toEqual([]);
      expect(result.deniedCategories).toEqual(['labs', 'medications']);
    });

    it('should return allowed categories matching consented categories', async () => {
      const existing = makeConsentRecord({ dataCategories: ['labs', 'conditions'] });
      storage = createMockStorage({
        findByPatient: vi.fn(async () => [existing]),
      });
      manager = new ConsentManager(storage);

      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        requestedCategories: ['labs', 'medications', 'conditions'],
      });

      expect(result.hasConsent).toBe(true);
      expect(result.allowedCategories).toEqual(['labs', 'conditions']);
      expect(result.deniedCategories).toEqual(['medications']);
    });

    it('should check network access when networkId provided', async () => {
      const existing = makeConsentRecord({ networkIds: ['network-a', 'network-b'] });
      storage = createMockStorage({ findByPatient: vi.fn(async () => [existing]) });
      manager = new ConsentManager(storage);

      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        networkId: 'network-a',
      });

      expect(result.allowedNetworks).toEqual(['network-a']);
    });

    it('should deny network access when networkId not consented', async () => {
      const existing = makeConsentRecord({ networkIds: ['network-a'] });
      storage = createMockStorage({ findByPatient: vi.fn(async () => [existing]) });
      manager = new ConsentManager(storage);

      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        networkId: 'network-z',
      });

      expect(result.allowedNetworks).toEqual([]);
    });

    it('should handle expired consent', async () => {
      const expired = makeConsentRecord({
        expiresAt: new Date('2025-01-01'), // Past date
      });
      storage = createMockStorage({
        findByPatient: vi.fn(async () => [expired]),
      });
      manager = new ConsentManager(storage);

      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
      });

      expect(result.hasConsent).toBe(false);
      expect(storage.update).toHaveBeenCalledWith('consent-001', { status: 'expired' });
      expect(storage.appendAudit).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        action: 'expired',
      }));
    });

    it('should log access check in audit trail', async () => {
      const existing = makeConsentRecord();
      storage = createMockStorage({ findByPatient: vi.fn(async () => [existing]) });
      manager = new ConsentManager(storage);

      await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        requestedCategories: ['labs'],
      });

      expect(storage.appendAudit).toHaveBeenCalledWith('consent-001', expect.objectContaining({
        action: 'accessed',
        actor: 'system',
      }));
    });

    it('should use ALL_DATA_CATEGORIES when no categories requested', async () => {
      const existing = makeConsentRecord({ dataCategories: ['labs'] });
      storage = createMockStorage({ findByPatient: vi.fn(async () => [existing]) });
      manager = new ConsentManager(storage);

      const result = await manager.checkConsent({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
      });

      // Should check against all 12 categories
      expect(result.allowedCategories).toEqual(['labs']);
      expect(result.deniedCategories.length).toBe(11);
    });
  });

  // ---------------------------------------------------------------------------
  // getPatientConsents / getActiveConsent
  // ---------------------------------------------------------------------------

  describe('getPatientConsents', () => {
    it('should return all consents for patient', async () => {
      const records = [makeConsentRecord(), makeConsentRecord({ id: 'consent-002', consentType: 'ai-analysis' })];
      storage = createMockStorage({ findByPatient: vi.fn(async () => records) });
      manager = new ConsentManager(storage);

      const result = await manager.getPatientConsents('patient-1', 'org-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getActiveConsent', () => {
    it('should return null when no active consent of given type', async () => {
      const result = await manager.getActiveConsent('patient-1', 'org-1', 'fhir-data-access');
      expect(result).toBeNull();
    });

    it('should return active consent matching type', async () => {
      const active = makeConsentRecord();
      const revoked = makeConsentRecord({ id: 'consent-002', status: 'revoked' });
      storage = createMockStorage({ findByPatient: vi.fn(async () => [active, revoked]) });
      manager = new ConsentManager(storage);

      const result = await manager.getActiveConsent('patient-1', 'org-1', 'fhir-data-access');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('consent-001');
    });
  });
});
