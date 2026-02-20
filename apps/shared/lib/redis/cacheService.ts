// ============================================================
// ATTENDING AI - Clinical Response Cache Service
// apps/shared/lib/redis/cacheService.ts
//
// Redis-backed caching for BioMistral AI inference responses.
// 60-70% of clinical queries repeat common symptom patterns.
// Cache TTL: 24 hours for differential diagnoses.
// Impact: Save $200-300/mo on GPU inference costs.
//
// HIPAA Note: Cached responses contain NO PHI. Only clinical
// pattern → differential mappings are cached. Patient-specific
// data is never stored in the cache layer.
// ============================================================

import redis from './client';
import type { AttendingRedisClient } from './client';

// ============================================================
// TYPES
// ============================================================

export interface CacheConfig {
  /** Default TTL in seconds (24 hours for clinical patterns) */
  defaultTTL: number;
  /** TTL for differential diagnosis cache */
  differentialTTL: number;
  /** TTL for drug interaction cache */
  drugInteractionTTL: number;
  /** TTL for protocol recommendations cache */
  protocolTTL: number;
  /** TTL for lab recommendation cache */
  labRecommendationTTL: number;
  /** Maximum cache key length */
  maxKeyLength: number;
  /** Namespace prefix for all cache keys */
  namespace: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalQueries: number;
  estimatedSavingsUSD: number;
}

export interface CachedDifferential {
  differentials: Array<{
    name: string;
    probability: number;
    icdCodes: string[];
    supportingEvidence: string[];
  }>;
  confidence: number;
  cachedAt: string;
  modelVersion: string;
}

export interface CachedDrugInteraction {
  interactions: Array<{
    drug1: string;
    drug2: string;
    severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
    description: string;
    recommendation: string;
  }>;
  checkedAt: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 86400,           // 24 hours
  differentialTTL: 86400,      // 24 hours - clinical patterns are stable
  drugInteractionTTL: 604800,  // 7 days - drug interactions change rarely
  protocolTTL: 604800,         // 7 days - protocols updated infrequently
  labRecommendationTTL: 86400, // 24 hours
  maxKeyLength: 256,
  namespace: 'attending:cache',
};

// Cost estimation: Average BioMistral inference cost per query
const ESTIMATED_COST_PER_INFERENCE_USD = 0.008;

// ============================================================
// CACHE SERVICE
// ============================================================

class ClinicalCacheService {
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalQueries: 0,
      estimatedSavingsUSD: 0,
    };
  }

  // ----------------------------------------------------------
  // Differential Diagnosis Cache
  // ----------------------------------------------------------

  /**
   * Generate a cache key for differential diagnosis based on symptoms.
   * Normalizes and sorts symptom tokens to ensure consistent hashing
   * regardless of input order.
   * 
   * IMPORTANT: NO PHI is included in cache keys.
   */
  private buildDifferentialKey(symptoms: string[], chiefComplaint: string): string {
    // Normalize: lowercase, trim, sort alphabetically
    const normalizedSymptoms = symptoms
      .map(s => s.toLowerCase().trim())
      .filter(s => s.length > 0)
      .sort()
      .join('|');

    const normalizedComplaint = chiefComplaint
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    const key = `${this.config.namespace}:diff:${normalizedComplaint}:${this.hashString(normalizedSymptoms)}`;
    
    return key.substring(0, this.config.maxKeyLength);
  }

  /**
   * Get cached differential diagnosis for a symptom pattern.
   * Returns null on cache miss.
   */
  async getCachedDifferential(
    symptoms: string[],
    chiefComplaint: string
  ): Promise<CachedDifferential | null> {
    this.stats.totalQueries++;

    try {
      const key = this.buildDifferentialKey(symptoms, chiefComplaint);
      const cached = await this.get<CachedDifferential>(key);

      if (cached) {
        this.stats.hits++;
        this.stats.estimatedSavingsUSD += ESTIMATED_COST_PER_INFERENCE_USD;
        this.updateHitRate();
        console.log(`[CACHE:HIT] Differential for "${chiefComplaint}" (${symptoms.length} symptoms)`);
        return cached;
      }

      this.stats.misses++;
      this.updateHitRate();
      console.log(`[CACHE:MISS] Differential for "${chiefComplaint}" (${symptoms.length} symptoms)`);
      return null;
    } catch (error) {
      console.error('[CACHE:ERROR] getCachedDifferential:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Cache a differential diagnosis result.
   * Only stores the clinical pattern mapping, never PHI.
   */
  async cacheDifferential(
    symptoms: string[],
    chiefComplaint: string,
    result: CachedDifferential
  ): Promise<void> {
    try {
      const key = this.buildDifferentialKey(symptoms, chiefComplaint);
      await this.set(key, {
        ...result,
        cachedAt: new Date().toISOString(),
      }, this.config.differentialTTL);

      console.log(`[CACHE:SET] Differential for "${chiefComplaint}" cached (TTL: ${this.config.differentialTTL}s)`);
    } catch (error) {
      console.error('[CACHE:ERROR] cacheDifferential:', error);
      // Cache failures should never break the application
    }
  }

  // ----------------------------------------------------------
  // Drug Interaction Cache
  // ----------------------------------------------------------

  private buildDrugInteractionKey(drugs: string[]): string {
    const normalized = drugs
      .map(d => d.toLowerCase().trim())
      .sort()
      .join('|');

    return `${this.config.namespace}:drug:${this.hashString(normalized)}`;
  }

  async getCachedDrugInteraction(
    drugs: string[]
  ): Promise<CachedDrugInteraction | null> {
    this.stats.totalQueries++;

    try {
      const key = this.buildDrugInteractionKey(drugs);
      const cached = await this.get<CachedDrugInteraction>(key);

      if (cached) {
        this.stats.hits++;
        this.stats.estimatedSavingsUSD += ESTIMATED_COST_PER_INFERENCE_USD;
        this.updateHitRate();
        return cached;
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async cacheDrugInteraction(
    drugs: string[],
    result: CachedDrugInteraction
  ): Promise<void> {
    try {
      const key = this.buildDrugInteractionKey(drugs);
      await this.set(key, {
        ...result,
        checkedAt: new Date().toISOString(),
      }, this.config.drugInteractionTTL);
    } catch (error) {
      console.error('[CACHE:ERROR] cacheDrugInteraction:', error);
    }
  }

  // ----------------------------------------------------------
  // Lab Recommendation Cache
  // ----------------------------------------------------------

  private buildLabRecommendationKey(diagnosis: string, symptoms: string[]): string {
    const normalized = `${diagnosis.toLowerCase().trim()}:${symptoms.sort().join('|')}`;
    return `${this.config.namespace}:labs:${this.hashString(normalized)}`;
  }

  async getCachedLabRecommendation<T>(
    diagnosis: string,
    symptoms: string[]
  ): Promise<T | null> {
    this.stats.totalQueries++;

    try {
      const key = this.buildLabRecommendationKey(diagnosis, symptoms);
      const cached = await this.get<T>(key);

      if (cached) {
        this.stats.hits++;
        this.stats.estimatedSavingsUSD += ESTIMATED_COST_PER_INFERENCE_USD;
        this.updateHitRate();
        return cached;
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async cacheLabRecommendation<T>(
    diagnosis: string,
    symptoms: string[],
    result: T
  ): Promise<void> {
    try {
      const key = this.buildLabRecommendationKey(diagnosis, symptoms);
      await this.set(key, result, this.config.labRecommendationTTL);
    } catch (error) {
      console.error('[CACHE:ERROR] cacheLabRecommendation:', error);
    }
  }

  // ----------------------------------------------------------
  // Clinical Protocol Cache
  // ----------------------------------------------------------

  private buildProtocolKey(protocolName: string, context: string): string {
    const normalized = `${protocolName.toLowerCase()}:${context.toLowerCase()}`;
    return `${this.config.namespace}:protocol:${this.hashString(normalized)}`;
  }

  async getCachedProtocol<T>(
    protocolName: string,
    context: string
  ): Promise<T | null> {
    this.stats.totalQueries++;

    try {
      const key = this.buildProtocolKey(protocolName, context);
      const cached = await this.get<T>(key);

      if (cached) {
        this.stats.hits++;
        this.updateHitRate();
        return cached;
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async cacheProtocol<T>(
    protocolName: string,
    context: string,
    result: T
  ): Promise<void> {
    try {
      const key = this.buildProtocolKey(protocolName, context);
      await this.set(key, result, this.config.protocolTTL);
    } catch (error) {
      console.error('[CACHE:ERROR] cacheProtocol:', error);
    }
  }

  // ----------------------------------------------------------
  // Generic Cache Operations
  // ----------------------------------------------------------

  /** Type-safe reference to the full Redis client */
  private get redis(): AttendingRedisClient {
    return redis;
  }

  private async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      console.error('[CACHE:ERROR] set:', error);
    }
  }

  // ----------------------------------------------------------
  // Cache Stats & Management
  // ----------------------------------------------------------

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalQueries > 0
      ? (this.stats.hits / this.stats.totalQueries) * 100
      : 0;
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalQueries: 0,
      estimatedSavingsUSD: 0,
    };
  }

  /**
   * Invalidate all cache entries for a specific namespace prefix.
   * Use when clinical protocols are updated.
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    try {
      const fullPrefix = `${this.config.namespace}:${prefix}`;
      const matchingKeys = await this.redis.keys(`${fullPrefix}*`);
      
      let deleted = 0;
      for (const key of matchingKeys) {
        await this.redis.del(key);
        deleted++;
      }

      console.log(`[CACHE:INVALIDATE] Removed ${deleted} entries matching "${fullPrefix}*"`);
      return deleted;
    } catch (error) {
      console.error('[CACHE:ERROR] invalidateByPrefix:', error);
      return 0;
    }
  }

  /**
   * Invalidate all differential diagnosis cache entries.
   * Call when differential diagnosis models are updated.
   */
  async invalidateDifferentials(): Promise<number> {
    return this.invalidateByPrefix('diff');
  }

  /**
   * Invalidate all drug interaction cache entries.
   * Call when drug databases are updated.
   */
  async invalidateDrugInteractions(): Promise<number> {
    return this.invalidateByPrefix('drug');
  }

  // ----------------------------------------------------------
  // Utility
  // ----------------------------------------------------------

  /**
   * Simple string hash for cache key generation.
   * Produces consistent, short keys for symptom patterns.
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// ============================================================
// SINGLETON
// ============================================================

const globalForCache = globalThis as unknown as {
  clinicalCache: ClinicalCacheService | undefined;
};

export const clinicalCache = globalForCache.clinicalCache ?? new ClinicalCacheService();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.clinicalCache = clinicalCache;
}

export default clinicalCache;
