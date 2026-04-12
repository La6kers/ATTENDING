// ============================================================
// ATTENDING AI - PHI Cache Timeout Service
// apps/shared/lib/phiCache.ts
//
// HIPAA-compliant caching layer for patient data fetched from
// external EHR systems (Epic, Cerner, etc.). Data auto-expires
// after a configurable TTL (default: 4 hours) and must be
// re-fetched from the authoritative source.
//
// Security Principle:
//   ATTENDING AI is a clinical decision-support overlay, NOT a
//   system of record. Patient data should not persist longer
//   than the active clinical encounter requires. When the cache
//   expires, the provider must re-pull from Epic/Cerner/etc.
//
// HIPAA Requirements Addressed:
// - 164.312(a)(1)    - Access control (time-limited data access)
// - 164.312(c)(1)    - Integrity (source-of-truth is always EHR)
// - 164.312(e)(1)    - Transmission security (encrypted at rest)
// - 164.530(j)       - Retention policies (auto-purge)
// - 164.308(a)(3)(ii) - Workforce clearance (audit every access)
//
// Usage:
//   import { phiCache } from '@attending/shared/lib/phiCache';
//
//   // Store patient data with auto-expiry
//   await phiCache.cachePatientData('P-001', 'demographics', patientData, { userId: 'DR-123' });
//
//   // Retrieve (returns null if expired — trigger re-fetch)
//   const data = await phiCache.getPatientData('P-001', 'demographics', { userId: 'DR-123' });
//   if (!data) {
//     const fresh = await epicClient.fetchPatient(mrn);
//     await phiCache.cachePatientData('P-001', 'demographics', fresh, { userId: 'DR-123' });
//   }
// ============================================================

import { logger } from './logging';
import { encryptPHI, decryptPHI, isEncrypted } from './encryption';
// Dynamic import to avoid circular dependencies at startup
async function auditLog(entry: {
  action: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const auditModule = await import('./audit');
    await auditModule.default.auditLog({
      action: entry.action as any,
      userId: entry.userId,
      resourceType: entry.resourceType as any,
      resourceId: entry.resourceId,
      details: entry.details as any,
      ipAddress: entry.ipAddress,
    });
  } catch {
    // Audit module not available — log to console as fallback
    logger.warn('[PHICache] Audit module unavailable, logging to console', {
      action: entry.action,
      resourceId: entry.resourceId,
    });
  }
}

// ============================================================
// TYPES
// ============================================================

/** Categories of PHI data with independent TTLs */
export type PHIDataCategory =
  | 'demographics'     // Name, DOB, address, contact info
  | 'encounters'       // Visit history
  | 'vitals'           // Vital signs (may refresh more frequently)
  | 'labs'             // Lab orders and results
  | 'medications'      // Active medication list
  | 'allergies'        // Allergy list
  | 'conditions'       // Problem/diagnosis list
  | 'imaging'          // Imaging orders and results
  | 'notes'            // Clinical notes
  | 'assessments'      // Patient assessments (COMPASS)
  | 'insurance'        // Insurance/coverage info
  | 'documents'        // Scanned documents, PDFs
  | 'full_chart';      // Complete patient chart bundle

export interface PHICacheConfig {
  /** Default TTL in seconds (default: 14400 = 4 hours) */
  defaultTTLSeconds: number;
  /** Per-category TTL overrides */
  categoryTTL: Partial<Record<PHIDataCategory, number>>;
  /** Encrypt cached data at rest (default: true) */
  encryptAtRest: boolean;
  /** Enable audit logging for cache operations (default: true) */
  auditEnabled: boolean;
  /** Maximum cache entries per patient (prevents unbounded growth) */
  maxEntriesPerPatient: number;
  /** Warn when data is older than this (seconds) — for UI staleness indicators */
  stalenessWarningSeconds: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: string;         // ISO timestamp
  expiresAt: string;        // ISO timestamp
  source: string;           // 'epic', 'cerner', 'fhir', 'hl7v2', 'manual'
  sourceRequestId?: string; // Trace back to the original EHR request
  accessCount: number;      // Times accessed since caching
  lastAccessedAt: string;   // ISO timestamp
  lastAccessedBy: string;   // User ID
  organizationId?: string;
  category: PHIDataCategory;
  version: number;          // Increment on re-cache to detect stale reads
}

export interface CacheStats {
  totalEntries: number;
  entriesByCategory: Record<string, number>;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageTTLRemainingSeconds: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface CacheAccessContext {
  userId: string;
  organizationId?: string;
  ipAddress?: string;
  reason?: string;          // Clinical justification for access
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: PHICacheConfig = {
  defaultTTLSeconds: parseInt(process.env.PHI_CACHE_TTL_SECONDS || '14400', 10), // 4 hours
  categoryTTL: {
    // More volatile data expires faster
    vitals:        3600,    // 1 hour — vitals change frequently during encounters
    medications:   7200,    // 2 hours — medication reconciliation is critical
    labs:          7200,    // 2 hours — pending results may update
    allergies:     14400,   // 4 hours — relatively stable
    demographics:  14400,   // 4 hours — stable
    conditions:    14400,   // 4 hours — stable
    encounters:    7200,    // 2 hours — active encounters update
    imaging:       7200,    // 2 hours — results may come back
    notes:         3600,    // 1 hour — notes are being edited
    assessments:   3600,    // 1 hour — active assessments change
    insurance:     28800,   // 8 hours — rarely changes mid-day
    documents:     14400,   // 4 hours
    full_chart:    3600,    // 1 hour — bundle stales quickly
  },
  encryptAtRest: true,
  auditEnabled: true,
  maxEntriesPerPatient: 50,
  stalenessWarningSeconds: 1800, // 30 minutes
};

// ============================================================
// PHI CACHE SERVICE
// ============================================================

class PHICacheService {
  private config: PHICacheConfig;
  private redis: any = null;
  private stats = { hits: 0, misses: 0 };

  // Key prefix for Redis — all PHI cache keys start with this
  private readonly KEY_PREFIX = 'phi:cache';

  constructor(config?: Partial<PHICacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ----------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------

  /**
   * Initialize with Redis client. Must be called before use.
   * Falls back to in-memory Map if Redis unavailable (dev only).
   */
  async initialize(redisClient?: any): Promise<void> {
    if (redisClient) {
      this.redis = redisClient;
      logger.info('[PHICache] Initialized with Redis backend');
    } else {
      try {
        const { redis } = await import('./redis/client');
        await redis.initialize();
        this.redis = redis;
        logger.info('[PHICache] Initialized with default Redis client');
      } catch {
        logger.warn('[PHICache] Redis unavailable — using in-memory fallback (NOT SUITABLE FOR PRODUCTION)');
        this.redis = new InMemoryPHIStore();
      }
    }
  }

  // ----------------------------------------------------------
  // CACHE OPERATIONS
  // ----------------------------------------------------------

  /**
   * Cache patient data with auto-expiry.
   *
   * @param patientId - ATTENDING patient ID
   * @param category - Type of data (demographics, labs, etc.)
   * @param data - The patient data to cache
   * @param context - Who is caching and why
   * @param options - Override defaults for this entry
   */
  async cachePatientData<T>(
    patientId: string,
    category: PHIDataCategory,
    data: T,
    context: CacheAccessContext,
    options?: {
      source?: string;
      sourceRequestId?: string;
      ttlSeconds?: number;
    }
  ): Promise<void> {
    await this.ensureInitialized();

    const ttl = options?.ttlSeconds
      || this.config.categoryTTL[category]
      || this.config.defaultTTLSeconds;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    const entry: CacheEntry<T> = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: options?.source || 'unknown',
      sourceRequestId: options?.sourceRequestId,
      accessCount: 0,
      lastAccessedAt: now.toISOString(),
      lastAccessedBy: context.userId,
      organizationId: context.organizationId,
      category,
      version: 1,
    };

    // Check entry limit per patient
    const existingKeys = await this.redis.keys(`${this.KEY_PREFIX}:${patientId}:*`);
    if (existingKeys.length >= this.config.maxEntriesPerPatient) {
      logger.warn('[PHICache] Max entries per patient reached, evicting oldest', {
        patientId,
        count: existingKeys.length,
      });
      // Evict oldest entry
      await this.evictOldest(patientId);
    }

    // Serialize and optionally encrypt
    let serialized = JSON.stringify(entry);
    if (this.config.encryptAtRest) {
      serialized = encryptPHI(serialized, 'phi_cache');
    }

    const key = this.buildKey(patientId, category);
    await this.redis.set(key, serialized, ttl);

    // Audit log
    if (this.config.auditEnabled) {
      this.logAudit('PHI_CACHE_STORE', patientId, category, context, {
        source: options?.source,
        ttlSeconds: ttl,
        expiresAt: expiresAt.toISOString(),
      });
    }

    logger.debug('[PHICache] Cached', {
      patientId,
      category,
      ttl,
      source: options?.source,
    });
  }

  /**
   * Retrieve patient data from cache.
   * Returns null if expired or not found — caller must re-fetch from EHR.
   *
   * @param patientId - ATTENDING patient ID
   * @param category - Type of data to retrieve
   * @param context - Who is accessing and why
   * @returns Cached data or null if expired/missing
   */
  async getPatientData<T>(
    patientId: string,
    category: PHIDataCategory,
    context: CacheAccessContext,
  ): Promise<{ data: T; meta: Omit<CacheEntry, 'data'>; stale: boolean } | null> {
    await this.ensureInitialized();

    const key = this.buildKey(patientId, category);
    let raw = await this.redis.get(key);

    if (!raw) {
      this.stats.misses++;

      if (this.config.auditEnabled) {
        this.logAudit('PHI_CACHE_MISS', patientId, category, context);
      }

      return null;
    }

    // Decrypt if needed
    if (this.config.encryptAtRest && isEncrypted(raw)) {
      try {
        raw = decryptPHI(raw, 'phi_cache');
      } catch (err) {
        logger.error('[PHICache] Decryption failed, evicting corrupt entry', { patientId, category });
        await this.redis.del(key);
        this.stats.misses++;
        return null;
      }
    }

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Double-check expiry (Redis TTL should handle this, but defense-in-depth)
    if (new Date(entry.expiresAt) <= new Date()) {
      await this.redis.del(key);
      this.stats.misses++;

      if (this.config.auditEnabled) {
        this.logAudit('PHI_CACHE_EXPIRED', patientId, category, context, {
          cachedAt: entry.cachedAt,
          expiredAt: entry.expiresAt,
        });
      }

      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessedAt = new Date().toISOString();
    entry.lastAccessedBy = context.userId;

    // Re-store with updated access info (preserve remaining TTL)
    const remainingTTL = await this.redis.ttl(key);
    if (remainingTTL > 0) {
      let updated = JSON.stringify(entry);
      if (this.config.encryptAtRest) {
        updated = encryptPHI(updated, 'phi_cache');
      }
      await this.redis.set(key, updated, remainingTTL);
    }

    this.stats.hits++;

    if (this.config.auditEnabled) {
      this.logAudit('PHI_CACHE_HIT', patientId, category, context);
    }

    // Calculate staleness
    const age = (Date.now() - new Date(entry.cachedAt).getTime()) / 1000;
    const stale = age > this.config.stalenessWarningSeconds;

    const { data, ...meta } = entry;
    return { data, meta, stale };
  }

  /**
   * Invalidate (evict) a specific category for a patient.
   * Used when: provider explicitly refreshes, data known to be updated,
   * or patient encounter ends.
   */
  async invalidate(
    patientId: string,
    category: PHIDataCategory,
    context: CacheAccessContext,
    reason?: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    const key = this.buildKey(patientId, category);
    const existed = await this.redis.exists(key);
    await this.redis.del(key);

    if (this.config.auditEnabled) {
      this.logAudit('PHI_CACHE_INVALIDATE', patientId, category, context, {
        reason: reason || 'manual',
        existed,
      });
    }

    logger.info('[PHICache] Invalidated', { patientId, category, reason });
    return existed;
  }

  /**
   * Invalidate ALL cached data for a patient.
   * Used when: encounter ends, patient discharged, or security event.
   */
  async invalidateAllForPatient(
    patientId: string,
    context: CacheAccessContext,
    reason?: string,
  ): Promise<number> {
    await this.ensureInitialized();

    const pattern = `${this.KEY_PREFIX}:${patientId}:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      await this.redis.del(key);
    }

    if (this.config.auditEnabled) {
      this.logAudit('PHI_CACHE_PURGE_PATIENT', patientId, 'full_chart', context, {
        reason: reason || 'manual',
        entriesEvicted: keys.length,
      });
    }

    logger.info('[PHICache] Purged all data for patient', {
      patientId,
      entriesEvicted: keys.length,
      reason,
    });

    return keys.length;
  }

  /**
   * Invalidate ALL cached data for an organization.
   * Used when: security incident, org offboarding, bulk refresh.
   */
  async invalidateAllForOrganization(
    organizationId: string,
    context: CacheAccessContext,
    reason?: string,
  ): Promise<number> {
    await this.ensureInitialized();

    // Scan all PHI cache keys and check org match
    const allKeys = await this.redis.keys(`${this.KEY_PREFIX}:*`);
    let evicted = 0;

    for (const key of allKeys) {
      try {
        let raw = await this.redis.get(key);
        if (!raw) continue;

        if (this.config.encryptAtRest && isEncrypted(raw)) {
          raw = decryptPHI(raw, 'phi_cache');
        }

        const entry: CacheEntry = JSON.parse(raw);
        if (entry.organizationId === organizationId) {
          await this.redis.del(key);
          evicted++;
        }
      } catch {
        // Skip corrupt entries
      }
    }

    if (this.config.auditEnabled) {
      this.logAudit('PHI_CACHE_PURGE_ORG', 'system', 'full_chart', context, {
        organizationId,
        reason: reason || 'manual',
        entriesEvicted: evicted,
      });
    }

    logger.info('[PHICache] Purged all data for organization', {
      organizationId,
      entriesEvicted: evicted,
      reason,
    });

    return evicted;
  }

  // ----------------------------------------------------------
  // STATUS & MONITORING
  // ----------------------------------------------------------

  /**
   * Get cache status for a specific patient.
   * Returns which categories are cached, their age, and TTL remaining.
   */
  async getPatientCacheStatus(patientId: string): Promise<{
    patientId: string;
    entries: Array<{
      category: PHIDataCategory;
      cachedAt: string;
      expiresAt: string;
      ageSeconds: number;
      ttlRemainingSeconds: number;
      source: string;
      accessCount: number;
      stale: boolean;
    }>;
  }> {
    await this.ensureInitialized();

    const pattern = `${this.KEY_PREFIX}:${patientId}:*`;
    const keys = await this.redis.keys(pattern);
    const entries: any[] = [];

    for (const key of keys) {
      try {
        let raw = await this.redis.get(key);
        if (!raw) continue;

        if (this.config.encryptAtRest && isEncrypted(raw)) {
          raw = decryptPHI(raw, 'phi_cache');
        }

        const entry: CacheEntry = JSON.parse(raw);
        const ttl = await this.redis.ttl(key);
        const age = (Date.now() - new Date(entry.cachedAt).getTime()) / 1000;

        entries.push({
          category: entry.category,
          cachedAt: entry.cachedAt,
          expiresAt: entry.expiresAt,
          ageSeconds: Math.round(age),
          ttlRemainingSeconds: ttl,
          source: entry.source,
          accessCount: entry.accessCount,
          stale: age > this.config.stalenessWarningSeconds,
        });
      } catch {
        // Skip corrupt entries
      }
    }

    return { patientId, entries };
  }

  /**
   * Get global cache statistics for admin dashboard / monitoring.
   */
  async getStats(): Promise<CacheStats> {
    await this.ensureInitialized();

    const allKeys = await this.redis.keys(`${this.KEY_PREFIX}:*`);
    const byCategory: Record<string, number> = {};
    let totalTTL = 0;
    let oldest: string | null = null;
    let newest: string | null = null;

    for (const key of allKeys) {
      try {
        const ttl = await this.redis.ttl(key);
        totalTTL += Math.max(ttl, 0);

        // Extract category from key: phi:cache:{patientId}:{category}
        const parts = key.split(':');
        const category = parts[parts.length - 1];
        byCategory[category] = (byCategory[category] || 0) + 1;

        // Track oldest/newest
        let raw = await this.redis.get(key);
        if (raw) {
          if (this.config.encryptAtRest && isEncrypted(raw)) {
            raw = decryptPHI(raw, 'phi_cache');
          }
          const entry: CacheEntry = JSON.parse(raw);
          if (!oldest || entry.cachedAt < oldest) oldest = entry.cachedAt;
          if (!newest || entry.cachedAt > newest) newest = entry.cachedAt;
        }
      } catch {
        // Skip
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;

    return {
      totalEntries: allKeys.length,
      entriesByCategory: byCategory,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageTTLRemainingSeconds: allKeys.length > 0
        ? Math.round(totalTTL / allKeys.length)
        : 0,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * Get the configured TTL for a data category.
   */
  getTTL(category: PHIDataCategory): number {
    return this.config.categoryTTL[category] || this.config.defaultTTLSeconds;
  }

  /**
   * Get the full configuration (for admin dashboard).
   */
  getConfig(): PHICacheConfig {
    return { ...this.config };
  }

  // ----------------------------------------------------------
  // INTERNAL HELPERS
  // ----------------------------------------------------------

  private buildKey(patientId: string, category: PHIDataCategory): string {
    return `${this.KEY_PREFIX}:${patientId}:${category}`;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.redis) {
      await this.initialize();
    }
  }

  private async evictOldest(patientId: string): Promise<void> {
    const keys = await this.redis.keys(`${this.KEY_PREFIX}:${patientId}:*`);
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const key of keys) {
      try {
        let raw = await this.redis.get(key);
        if (!raw) continue;
        if (this.config.encryptAtRest && isEncrypted(raw)) {
          raw = decryptPHI(raw, 'phi_cache');
        }
        const entry: CacheEntry = JSON.parse(raw);
        const time = new Date(entry.cachedAt).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      } catch {
        // Corrupt entry — evict it
        oldestKey = key;
        break;
      }
    }

    if (oldestKey) {
      await this.redis.del(oldestKey);
    }
  }

  private logAudit(
    action: string,
    patientId: string,
    category: string,
    context: CacheAccessContext,
    details?: Record<string, unknown>,
  ): void {
    // Fire-and-forget — audit logging should never block cache ops
    auditLog({
      action: action as any,
      userId: context.userId,
      resourceType: 'PHI',
      resourceId: patientId,
      details: {
        category,
        ...details,
        ipAddress: context.ipAddress,
        reason: context.reason,
      },
      ipAddress: context.ipAddress,
    }).catch((err) => {
      logger.error('[PHICache] Audit log failed', err instanceof Error ? err : new Error(String(err)));
    });
  }
}

// ============================================================
// IN-MEMORY FALLBACK (Development Only)
// ============================================================

class InMemoryPHIStore {
  private store = new Map<string, { value: string; expireAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 86400000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    // Also clean expired while scanning
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expireAt) this.store.delete(k);
    }
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    const remaining = Math.ceil((entry.expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}

// ============================================================
// SINGLETON + SCHEDULER JOB
// ============================================================

export const phiCache = new PHICacheService();

/**
 * Scheduler job: log stats and clean up expired entries.
 * Register with scheduler at startup.
 */
export async function phiCacheMaintenanceJob(): Promise<void> {
  try {
    const stats = await phiCache.getStats();
    logger.info('[PHICache:maintenance] Stats', {
      totalEntries: stats.totalEntries,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      avgTTLRemaining: `${Math.round(stats.averageTTLRemainingSeconds / 60)}min`,
    });
  } catch (err) {
    logger.error('[PHICache:maintenance] Failed', err instanceof Error ? err : new Error(String(err)));
  }
}

// ============================================================
// EXPORTS
// ============================================================

export {
  PHICacheService,
  InMemoryPHIStore,
  DEFAULT_CONFIG as PHI_CACHE_DEFAULT_CONFIG,
};

export default phiCache;
