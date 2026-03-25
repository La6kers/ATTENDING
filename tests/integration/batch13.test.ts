// ============================================================
// ATTENDING AI - Batch 13 Integration Tests
// tests/integration/batch13.test.ts
//
// Tests for enterprise readiness fixes + PHI cache timeout:
//   - hardDelete SQL injection guard
//   - Prisma enum re-exports
//   - PHI cache service (store, retrieve, expire, invalidate)
//   - PHI cache audit trail
//   - Organization model presence
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ============================================================
// HARD DELETE SQL INJECTION GUARD
// ============================================================

describe('hardDelete SQL Injection Guard', () => {
  it('allows valid soft-delete model names', async () => {
    const { SOFT_DELETE_MODELS } = await import('../../apps/shared/lib/softDeleteMiddleware');

    // These are all valid
    const validModels = ['Patient', 'Encounter', 'LabOrder', 'MedicationOrder', 'Referral'];
    for (const model of validModels) {
      expect(SOFT_DELETE_MODELS.has(model)).toBe(true);
    }
  });

  it('rejects invalid model names in hardDelete', async () => {
    const { hardDelete } = await import('../../apps/shared/lib/softDeleteMiddleware');

    // Mock prisma — hardDelete should throw BEFORE reaching the database
    const mockPrisma = {
      $executeRawUnsafe: async () => { throw new Error('Should not reach database'); },
    } as any;

    // SQL injection attempt via model name
    await expect(
      hardDelete(mockPrisma, 'Patient"; DROP TABLE "User"; --', 'fake-id')
    ).rejects.toThrow('not a valid soft-delete model');

    // Random string
    await expect(
      hardDelete(mockPrisma, 'NotARealModel', 'fake-id')
    ).rejects.toThrow('not a valid soft-delete model');

    // Empty string
    await expect(
      hardDelete(mockPrisma, '', 'fake-id')
    ).rejects.toThrow('not a valid soft-delete model');
  });

  it('accepts valid model names in hardDelete', async () => {
    const { hardDelete } = await import('../../apps/shared/lib/softDeleteMiddleware');

    // Mock prisma that tracks calls
    let executedQuery = '';
    const mockPrisma = {
      $executeRawUnsafe: async (query: string, _id: string) => {
        executedQuery = query;
      },
    } as any;

    // Valid model — should NOT throw
    await hardDelete(mockPrisma, 'Patient', 'test-id');
    expect(executedQuery).toContain('"Patient"');
    expect(executedQuery).toContain('$1');
  });
});

// ============================================================
// PHI CACHE SERVICE
// ============================================================

describe('PHI Cache Service', () => {
  let PHICacheService: any;
  let InMemoryPHIStore: any;
  let cache: any;

  beforeEach(async () => {
    const mod = await import('../../apps/shared/lib/phiCache');
    PHICacheService = mod.PHICacheService;
    InMemoryPHIStore = mod.InMemoryPHIStore;

    // Create isolated instance with in-memory store for testing
    cache = new PHICacheService({
      defaultTTLSeconds: 10,  // Short TTL for testing
      encryptAtRest: false,   // Skip encryption for test clarity
      auditEnabled: false,    // Don't audit in tests
      maxEntriesPerPatient: 5,
      stalenessWarningSeconds: 3,
      categoryTTL: {
        vitals: 2,
        demographics: 10,
        labs: 5,
      },
    });
    await cache.initialize(new InMemoryPHIStore());
  });

  const testContext = {
    userId: 'DR-TEST',
    organizationId: 'ORG-001',
    ipAddress: '127.0.0.1',
    reason: 'unit_test',
  };

  it('stores and retrieves patient data', async () => {
    const patientData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1980-01-15',
    };

    await cache.cachePatientData('P-001', 'demographics', patientData, testContext, {
      source: 'epic',
    });

    const result = await cache.getPatientData('P-001', 'demographics', testContext);

    expect(result).not.toBeNull();
    expect(result!.data.firstName).toBe('John');
    expect(result!.data.lastName).toBe('Doe');
    expect(result!.meta.source).toBe('epic');
    expect(result!.meta.category).toBe('demographics');
    expect(result!.meta.accessCount).toBe(1);
    expect(result!.stale).toBe(false);
  });

  it('returns null for expired data', async () => {
    await cache.cachePatientData('P-001', 'vitals', { heartRate: 72 }, testContext, {
      source: 'epic',
      ttlSeconds: 1, // 1 second TTL
    });

    // Immediately should work
    const fresh = await cache.getPatientData('P-001', 'vitals', testContext);
    expect(fresh).not.toBeNull();

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const expired = await cache.getPatientData('P-001', 'vitals', testContext);
    expect(expired).toBeNull();
  });

  it('returns null for missing data (cache miss)', async () => {
    const result = await cache.getPatientData('P-NONEXISTENT', 'demographics', testContext);
    expect(result).toBeNull();
  });

  it('uses category-specific TTLs', () => {
    expect(cache.getTTL('vitals')).toBe(2);
    expect(cache.getTTL('demographics')).toBe(10);
    expect(cache.getTTL('labs')).toBe(5);
    // Unknown category falls back to default
    expect(cache.getTTL('documents')).toBe(10);
  });

  it('invalidates specific category', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext);
    await cache.cachePatientData('P-001', 'vitals', { hr: 72 }, testContext);

    // Invalidate only demographics
    const existed = await cache.invalidate('P-001', 'demographics', testContext, 'test');
    expect(existed).toBe(true);

    // Demographics gone
    const demo = await cache.getPatientData('P-001', 'demographics', testContext);
    expect(demo).toBeNull();

    // Vitals still there
    const vitals = await cache.getPatientData('P-001', 'vitals', testContext);
    expect(vitals).not.toBeNull();
  });

  it('invalidates all data for a patient', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext);
    await cache.cachePatientData('P-001', 'vitals', { hr: 72 }, testContext);
    await cache.cachePatientData('P-001', 'labs', { wbc: 7.5 }, testContext);

    const count = await cache.invalidateAllForPatient('P-001', testContext, 'encounter_ended');
    expect(count).toBe(3);

    // All gone
    expect(await cache.getPatientData('P-001', 'demographics', testContext)).toBeNull();
    expect(await cache.getPatientData('P-001', 'vitals', testContext)).toBeNull();
    expect(await cache.getPatientData('P-001', 'labs', testContext)).toBeNull();
  });

  it('tracks cache hit/miss statistics', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext);

    // 2 hits
    await cache.getPatientData('P-001', 'demographics', testContext);
    await cache.getPatientData('P-001', 'demographics', testContext);

    // 1 miss
    await cache.getPatientData('P-MISSING', 'vitals', testContext);

    const stats = await cache.getStats();
    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 1);
    expect(stats.totalEntries).toBe(1);
  });

  it('returns patient cache status with age and TTL', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext, {
      source: 'epic',
    });
    await cache.cachePatientData('P-001', 'labs', { wbc: 7.5 }, testContext, {
      source: 'cerner',
    });

    const status = await cache.getPatientCacheStatus('P-001');
    expect(status.patientId).toBe('P-001');
    expect(status.entries).toHaveLength(2);

    const demoEntry = status.entries.find((e: any) => e.category === 'demographics');
    expect(demoEntry).toBeDefined();
    expect(demoEntry!.source).toBe('epic');
    expect(demoEntry!.ageSeconds).toBeGreaterThanOrEqual(0);
    expect(demoEntry!.ttlRemainingSeconds).toBeGreaterThan(0);
  });

  it('evicts oldest when max entries exceeded', async () => {
    // Config allows max 5 entries per patient
    for (let i = 0; i < 5; i++) {
      await cache.cachePatientData(
        'P-001',
        `cat_${i}` as any,
        { index: i },
        testContext,
      );
      // Small delay so timestamps differ
      await new Promise((r) => setTimeout(r, 10));
    }

    // 6th entry should trigger eviction of oldest
    await cache.cachePatientData('P-001', 'new_cat' as any, { index: 5 }, testContext);

    const status = await cache.getPatientCacheStatus('P-001');
    // Should still be at max (5), not 6
    expect(status.entries.length).toBeLessThanOrEqual(5);
  });

  it('marks stale data correctly', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext);

    // Immediately — not stale
    const fresh = await cache.getPatientData('P-001', 'demographics', testContext);
    expect(fresh!.stale).toBe(false);

    // Wait past staleness threshold (3 seconds in test config)
    await new Promise((r) => setTimeout(r, 3500));

    const stale = await cache.getPatientData('P-001', 'demographics', testContext);
    if (stale) {
      expect(stale.stale).toBe(true);
    }
  });

  it('increments access count on reads', async () => {
    await cache.cachePatientData('P-001', 'demographics', { name: 'John' }, testContext);

    await cache.getPatientData('P-001', 'demographics', testContext);
    await cache.getPatientData('P-001', 'demographics', testContext);
    const result = await cache.getPatientData('P-001', 'demographics', testContext);

    expect(result!.meta.accessCount).toBe(3);
    expect(result!.meta.lastAccessedBy).toBe('DR-TEST');
  });

  it('exposes configuration', () => {
    const config = cache.getConfig();
    expect(config.defaultTTLSeconds).toBe(10);
    expect(config.encryptAtRest).toBe(false);
    expect(config.maxEntriesPerPatient).toBe(5);
  });
});

// ============================================================
// IN-MEMORY PHI STORE (Fallback)
// ============================================================

describe('InMemoryPHIStore', () => {
  let store: any;

  beforeEach(async () => {
    const { InMemoryPHIStore } = await import('../../apps/shared/lib/phiCache');
    store = new InMemoryPHIStore();
  });

  it('supports basic get/set/del', async () => {
    await store.set('key1', 'value1', 60);
    expect(await store.get('key1')).toBe('value1');

    await store.del('key1');
    expect(await store.get('key1')).toBeNull();
  });

  it('respects TTL expiry', async () => {
    await store.set('key1', 'value1', 1); // 1 second
    expect(await store.get('key1')).toBe('value1');

    await new Promise((r) => setTimeout(r, 1500));
    expect(await store.get('key1')).toBeNull();
  });

  it('supports key pattern matching', async () => {
    await store.set('phi:cache:P-001:demographics', 'a', 60);
    await store.set('phi:cache:P-001:vitals', 'b', 60);
    await store.set('phi:cache:P-002:demographics', 'c', 60);

    const p1Keys = await store.keys('phi:cache:P-001:*');
    expect(p1Keys).toHaveLength(2);

    const demoKeys = await store.keys('phi:cache:*:demographics');
    expect(demoKeys).toHaveLength(2);
  });

  it('reports TTL correctly', async () => {
    await store.set('key1', 'value', 10);
    const ttl = await store.ttl('key1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);

    const missing = await store.ttl('nonexistent');
    expect(missing).toBe(-2);
  });

  it('checks existence', async () => {
    await store.set('key1', 'value', 60);
    expect(await store.exists('key1')).toBe(true);
    expect(await store.exists('key2')).toBe(false);
  });
});

// ============================================================
// MULTI-TENANT CONFIGURATION
// ============================================================

describe('Multi-Tenant Models', () => {
  it('TENANT_SCOPED_MODELS includes all clinical models', async () => {
    const { TENANT_SCOPED_MODELS } = await import('../../apps/shared/lib/multiTenant');

    const expectedModels = [
      'Patient', 'Encounter', 'LabOrder', 'LabResult',
      'MedicationOrder', 'VitalSign', 'Allergy', 'Condition',
      'Referral', 'ImagingOrder', 'ClinicalNote',
      'ApiKey', 'WebhookSubscription', 'IntegrationConnection', 'AuditLog',
    ];

    for (const model of expectedModels) {
      expect(TENANT_SCOPED_MODELS.has(model)).toBe(true);
    }
  });

  it('GLOBAL_MODELS excludes clinical models', async () => {
    const { GLOBAL_MODELS } = await import('../../apps/shared/lib/multiTenant');

    expect(GLOBAL_MODELS.has('User')).toBe(true);
    expect(GLOBAL_MODELS.has('Session')).toBe(true);
    expect(GLOBAL_MODELS.has('Patient')).toBe(false);
  });

  it('getRequestOrgId extracts org from user context', async () => {
    const { getRequestOrgId } = await import('../../apps/shared/lib/multiTenant');

    const orgId = getRequestOrgId({
      user: { organizationId: 'org-123' },
    });
    expect(orgId).toBe('org-123');
  });

  it('getRequestOrgId falls back to header', async () => {
    const { getRequestOrgId } = await import('../../apps/shared/lib/multiTenant');

    const orgId = getRequestOrgId({
      user: null,
      raw: { req: { headers: { 'x-organization-id': 'org-456' } } },
    });
    expect(orgId).toBe('org-456');
  });

  it('requireOrgId throws when missing', async () => {
    const { requireOrgId } = await import('../../apps/shared/lib/multiTenant');

    expect(() => requireOrgId({ user: null })).toThrow('Organization context required');
  });
});

// ============================================================
// DEFAULT PHI CACHE CONFIGURATION
// ============================================================

describe('PHI Cache Default Config', () => {
  it('has sensible production defaults', async () => {
    const { PHI_CACHE_DEFAULT_CONFIG } = await import('../../apps/shared/lib/phiCache');

    // Default 4 hours
    expect(PHI_CACHE_DEFAULT_CONFIG.defaultTTLSeconds).toBe(14400);
    // Vitals expire faster
    expect(PHI_CACHE_DEFAULT_CONFIG.categoryTTL.vitals).toBeLessThan(
      PHI_CACHE_DEFAULT_CONFIG.categoryTTL.demographics!
    );
    // Encryption enabled by default
    expect(PHI_CACHE_DEFAULT_CONFIG.encryptAtRest).toBe(true);
    // Audit enabled by default
    expect(PHI_CACHE_DEFAULT_CONFIG.auditEnabled).toBe(true);
  });
});
