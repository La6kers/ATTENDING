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
// SEMANTIC DEDUPLICATION - Synonym Normalization
// ============================================================
// Maps common clinical synonyms to canonical terms so that
// semantically identical queries ("bad headache" vs "severe
// cephalgia") produce the same cache key and share results.
// ============================================================

const CLINICAL_SYNONYMS: Map<string, string> = new Map([
  // Severity
  ['severe', 'severe'],
  ['bad', 'severe'],
  ['intense', 'severe'],
  ['terrible', 'severe'],
  ['worst', 'severe'],

  // Abdominal
  ['stomach', 'abdominal'],
  ['abdominal', 'abdominal'],
  ['belly', 'abdominal'],
  ['tummy', 'abdominal'],
  ['epigastric', 'abdominal'],

  // Headache
  ['headache', 'headache'],
  ['head pain', 'headache'],
  ['cephalgia', 'headache'],
  ['migraine', 'headache'],

  // Chest pain
  ['chest pain', 'chest_pain'],
  ['chest pressure', 'chest_pain'],
  ['chest tightness', 'chest_pain'],
  ['substernal', 'chest_pain'],

  // Nausea
  ['nausea', 'nausea'],
  ['queasy', 'nausea'],
  ['sick to stomach', 'nausea'],
  ['nauseated', 'nausea'],

  // Dizziness
  ['dizzy', 'dizziness'],
  ['dizziness', 'dizziness'],
  ['lightheaded', 'dizziness'],
  ['vertigo', 'dizziness'],
  ['room spinning', 'dizziness'],

  // Dyspnea
  ['short of breath', 'dyspnea'],
  ['shortness of breath', 'dyspnea'],
  ['dyspnea', 'dyspnea'],
  ["can't breathe", 'dyspnea'],
  ['breathless', 'dyspnea'],

  // Fatigue
  ['fatigue', 'fatigue'],
  ['tired', 'fatigue'],
  ['exhausted', 'fatigue'],
  ['no energy', 'fatigue'],
  ['lethargy', 'fatigue'],

  // Back pain
  ['back pain', 'back_pain'],
  ['lower back', 'back_pain'],
  ['lumbar', 'back_pain'],
  ['lumbago', 'back_pain'],

  // Sore throat
  ['sore throat', 'sore_throat'],
  ['throat pain', 'sore_throat'],
  ['pharyngitis', 'sore_throat'],
  ['painful swallowing', 'sore_throat'],

  // Cough
  ['cough', 'cough'],
  ['coughing', 'cough'],
  ['productive cough', 'cough'],
  ['dry cough', 'cough'],

  // Fever
  ['fever', 'fever'],
  ['febrile', 'fever'],
  ['chills', 'fever'],
  ['temperature', 'fever'],
  ['hot', 'fever'],

  // Swelling
  ['swelling', 'swelling'],
  ['swollen', 'swelling'],
  ['edema', 'swelling'],
  ['puffy', 'swelling'],

  // Rash
  ['rash', 'rash'],
  ['skin rash', 'rash'],
  ['hives', 'rash'],
  ['urticaria', 'rash'],
  ['skin lesion', 'rash'],

  // Anxiety
  ['anxiety', 'anxiety'],
  ['anxious', 'anxiety'],
  ['nervous', 'anxiety'],
  ['panic', 'anxiety'],
  ['worry', 'anxiety'],

  // Depression
  ['depression', 'depression'],
  ['depressed', 'depression'],
  ['sad', 'depression'],
  ['hopeless', 'depression'],
  ['low mood', 'depression'],
]);

/**
 * Multi-word synonym keys sorted by descending length so that
 * longer phrases are matched before their substrings
 * (e.g. "sick to stomach" before "stomach").
 */
const MULTI_WORD_SYNONYMS: string[] = Array.from(CLINICAL_SYNONYMS.keys())
  .filter(k => k.includes(' '))
  .sort((a, b) => b.length - a.length);

/**
 * Tracks how often synonym normalization changes the input,
 * giving visibility into cache dedup effectiveness.
 */
export const normalizationStats = {
  totalTermsProcessed: 0,
  termsNormalized: 0,
  get normalizationRate(): number {
    return this.totalTermsProcessed > 0
      ? (this.termsNormalized / this.totalTermsProcessed) * 100
      : 0;
  },
};

/**
 * Normalize an array of clinical terms using the synonym map.
 *
 * 1. Lowercases every term.
 * 2. Attempts multi-word synonym matches first (longest match wins),
 *    then falls back to single-word lookup for each remaining token.
 * 3. Returns a sorted, deduplicated array of canonical terms.
 */
function normalizeTerms(terms: string[]): string[] {
  const normalized = new Set<string>();

  for (const raw of terms) {
    let term = raw.toLowerCase().trim();
    if (term.length === 0) continue;

    normalizationStats.totalTermsProcessed++;
    const original = term;

    // --- try multi-word synonym match first ---
    let matched = false;
    for (const phrase of MULTI_WORD_SYNONYMS) {
      if (term.includes(phrase)) {
        normalized.add(CLINICAL_SYNONYMS.get(phrase)!);
        // Remove matched phrase and process remainder tokens
        term = term.replace(phrase, '').trim();
        matched = true;
        break;
      }
    }

    // --- process remaining (or entire) term word-by-word ---
    if (term.length > 0) {
      const words = term.split(/\s+/);
      for (const word of words) {
        const canon = CLINICAL_SYNONYMS.get(word);
        if (canon) {
          normalized.add(canon);
          matched = true;
        } else {
          // Keep unrecognised tokens as-is
          normalized.add(word);
        }
      }
    }

    // Track whether normalization changed anything
    const resultContainsOriginal = normalized.has(original);
    if (matched && !resultContainsOriginal) {
      normalizationStats.termsNormalized++;
    }
  }

  return Array.from(normalized).sort();
}

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
    // Normalize symptoms through synonym map, then deduplicate & sort
    const normalizedSymptoms = normalizeTerms(symptoms).join('|');

    // Normalize the chief complaint through synonym map as well
    const complaintTerms = normalizeTerms([chiefComplaint]);
    const normalizedComplaint = complaintTerms.join('_');

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
    // Normalize diagnosis through synonym map
    const normalizedDiagnosis = normalizeTerms([diagnosis]).join('_');
    // Normalize symptoms through synonym map
    const normalizedSymptoms = normalizeTerms(symptoms).join('|');
    const normalized = `${normalizedDiagnosis}:${normalizedSymptoms}`;
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

export { normalizeTerms, CLINICAL_SYNONYMS };
export default clinicalCache;
