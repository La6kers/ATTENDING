// =============================================================================
// ATTENDING AI - Prisma Consent Storage Adapter Tests
// packages/consent/src/__tests__/prisma-consent-storage.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PrismaConsentStorage,
  type PrismaClientLike,
  type PrismaPatientConsent,
} from '../adapters/prisma-consent-storage';
import type { ConsentAuditEntry } from '../types';

// =============================================================================
// Prisma Mock Factory
// =============================================================================

function makePrismaRow(overrides: Partial<PrismaPatientConsent> = {}): PrismaPatientConsent {
  return {
    id: 'consent-001',
    patientId: 'patient-1',
    organizationId: 'org-1',
    consentType: 'fhir-data-access',
    status: 'active',
    dataCategories: JSON.stringify(['medications', 'labs']),
    networkIds: JSON.stringify(['network-a']),
    purpose: 'CMS HTE data access',
    grantedAt: new Date('2026-01-15'),
    revokedAt: null,
    expiresAt: null,
    grantedBy: 'idme:sub-123',
    revokedBy: null,
    auditTrail: JSON.stringify([{ action: 'granted', timestamp: new Date().toISOString(), actor: 'idme:sub-123' }]),
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockPrisma(): PrismaClientLike {
  return {
    patientConsent: {
      create: vi.fn(async ({ data }) => ({ id: 'consent-new', ...data } as unknown as PrismaPatientConsent)),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async ({ where, data }) => ({ ...makePrismaRow(), ...data, id: where.id } as unknown as PrismaPatientConsent)),
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PrismaConsentStorage', () => {
  let prisma: PrismaClientLike;
  let storage: PrismaConsentStorage;

  beforeEach(() => {
    prisma = createMockPrisma();
    storage = new PrismaConsentStorage(prisma);
  });

  describe('create', () => {
    it('should serialize JSON fields and call prisma.create', async () => {
      const result = await storage.create({
        patientId: 'patient-1',
        organizationId: 'org-1',
        consentType: 'fhir-data-access',
        status: 'active',
        dataCategories: ['medications', 'labs'],
        networkIds: ['network-a'],
        purpose: 'Test',
        grantedAt: new Date(),
        grantedBy: 'actor',
        auditTrail: [{ action: 'granted', timestamp: new Date(), actor: 'actor' }],
      });

      expect(prisma.patientConsent.create).toHaveBeenCalledTimes(1);
      const createData = (prisma.patientConsent.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(createData.dataCategories).toBe('["medications","labs"]');
      expect(createData.networkIds).toBe('["network-a"]');
      expect(typeof createData.auditTrail).toBe('string');
      expect(result.id).toBeDefined();
    });
  });

  describe('findByPatient', () => {
    it('should filter by patientId, organizationId, and soft-delete', async () => {
      const rows = [makePrismaRow(), makePrismaRow({ id: 'consent-002' })];
      (prisma.patientConsent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows);

      const results = await storage.findByPatient('patient-1', 'org-1');

      expect(prisma.patientConsent.findMany).toHaveBeenCalledWith({
        where: { patientId: 'patient-1', organizationId: 'org-1', deletedAt: null },
        orderBy: { grantedAt: 'desc' },
      });
      expect(results).toHaveLength(2);
      expect(results[0].dataCategories).toEqual(['medications', 'labs']);
    });

    it('should deserialize JSON fields correctly', async () => {
      const row = makePrismaRow({
        dataCategories: JSON.stringify(['vitals', 'allergies']),
        networkIds: JSON.stringify(['net-1', 'net-2']),
        auditTrail: JSON.stringify([
          { action: 'granted', timestamp: '2026-01-15T00:00:00Z', actor: 'user-1' },
        ]),
      });
      (prisma.patientConsent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([row]);

      const [result] = await storage.findByPatient('patient-1', 'org-1');

      expect(result.dataCategories).toEqual(['vitals', 'allergies']);
      expect(result.networkIds).toEqual(['net-1', 'net-2']);
      expect(result.auditTrail).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent record', async () => {
      const result = await storage.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for soft-deleted record', async () => {
      const deleted = makePrismaRow({ deletedAt: new Date() });
      (prisma.patientConsent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(deleted);

      const result = await storage.findById('consent-001');
      expect(result).toBeNull();
    });

    it('should return domain object for valid record', async () => {
      const row = makePrismaRow();
      (prisma.patientConsent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);

      const result = await storage.findById('consent-001');
      expect(result).not.toBeNull();
      expect(result!.consentType).toBe('fhir-data-access');
      expect(result!.dataCategories).toEqual(['medications', 'labs']);
    });
  });

  describe('update', () => {
    it('should serialize updated JSON fields', async () => {
      await storage.update('consent-001', {
        status: 'revoked',
        dataCategories: ['labs', 'vitals'],
      });

      const updateData = (prisma.patientConsent.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(updateData.status).toBe('revoked');
      expect(updateData.dataCategories).toBe('["labs","vitals"]');
    });

    it('should only include provided fields', async () => {
      await storage.update('consent-001', { status: 'expired' });

      const updateData = (prisma.patientConsent.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(updateData.status).toBe('expired');
      expect(updateData.dataCategories).toBeUndefined();
    });
  });

  describe('appendAudit', () => {
    it('should append audit entry to existing trail', async () => {
      const existingTrail = [{ action: 'granted', timestamp: '2026-01-01', actor: 'user-1' }];
      const row = makePrismaRow({ auditTrail: JSON.stringify(existingTrail) });
      (prisma.patientConsent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);

      const newEntry: ConsentAuditEntry = {
        action: 'modified',
        timestamp: new Date(),
        actor: 'user-2',
        details: 'Updated categories',
      };

      await storage.appendAudit('consent-001', newEntry);

      const updateData = (prisma.patientConsent.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      const trail = JSON.parse(updateData.auditTrail as string);
      expect(trail).toHaveLength(2);
      expect(trail[1].action).toBe('modified');
    });

    it('should throw when consent not found', async () => {
      await expect(storage.appendAudit('nonexistent', {
        action: 'accessed',
        timestamp: new Date(),
        actor: 'system',
      })).rejects.toThrow('not found');
    });

    it('should handle null auditTrail gracefully', async () => {
      const row = makePrismaRow({ auditTrail: null });
      (prisma.patientConsent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);

      await storage.appendAudit('consent-001', {
        action: 'accessed',
        timestamp: new Date(),
        actor: 'system',
      });

      const updateData = (prisma.patientConsent.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      const trail = JSON.parse(updateData.auditTrail as string);
      expect(trail).toHaveLength(1);
    });
  });

  describe('domain mapping', () => {
    it('should handle null optional fields', async () => {
      const row = makePrismaRow({
        networkIds: null,
        purpose: null,
        revokedAt: null,
        expiresAt: null,
        revokedBy: null,
        auditTrail: null,
      });
      (prisma.patientConsent.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(row);

      const result = await storage.findById('consent-001');
      expect(result!.networkIds).toEqual([]);
      expect(result!.purpose).toBeUndefined();
      expect(result!.revokedAt).toBeUndefined();
      expect(result!.auditTrail).toEqual([]);
    });
  });
});
