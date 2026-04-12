// =============================================================================
// ATTENDING AI - Red Flag Rule Cache
// apps/shared/lib/clinical-ai/redFlagCache.ts
//
// Manages offline caching of red flag detection rules.
// Safety invariant: NEVER returns empty. Falls back to hardcoded RED_FLAGS.
//
// Tier hierarchy:
//   Tier 0: Hardcoded RED_FLAGS (always available, zero dependency)
//   Tier 1: Cached rules (offline-capable, may be stale)
//   Tier 2: Server rules (online-only, always fresh)
// =============================================================================

import { RED_FLAGS, RED_FLAG_RULES_VERSION, type RedFlag } from './redFlagDetection';

// =============================================================================
// Types
// =============================================================================

export interface CachedRedFlagRules {
  version: string;
  rules: RedFlag[];
  cachedAt: string;
  source: 'hardcoded' | 'server' | 'cache';
  isStale: boolean;
}

/**
 * Platform-agnostic storage adapter.
 * Implemented by IndexedDB (web) or SQLite (mobile).
 */
export interface RedFlagStorageAdapter {
  get(key: string): Promise<{ data: unknown; cachedAt: string; version: string } | null>;
  set(key: string, data: unknown, version: string): Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const CACHE_KEY = 'red-flag-rules';
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// =============================================================================
// Cache Operations
// =============================================================================

/**
 * Get red flag rules with staleness metadata.
 * SAFETY: NEVER returns empty. Falls back to hardcoded RED_FLAGS.
 */
export async function getRedFlagRules(
  adapter?: RedFlagStorageAdapter
): Promise<CachedRedFlagRules> {
  // If no adapter, return hardcoded rules (Tier 0)
  if (!adapter) {
    return {
      version: RED_FLAG_RULES_VERSION,
      rules: RED_FLAGS,
      cachedAt: new Date().toISOString(),
      source: 'hardcoded',
      isStale: false,
    };
  }

  try {
    const cached = await adapter.get(CACHE_KEY);
    if (cached && cached.data) {
      const rules = cached.data as RedFlag[];
      const cachedTime = new Date(cached.cachedAt).getTime();
      const isStale = Date.now() - cachedTime > STALE_THRESHOLD_MS;

      // If cached version matches current, use cached (even if stale)
      // If version mismatch, prefer hardcoded (newer)
      if (cached.version === RED_FLAG_RULES_VERSION) {
        return {
          version: cached.version,
          rules,
          cachedAt: cached.cachedAt,
          source: 'cache',
          isStale,
        };
      }

      // Version mismatch: hardcoded rules are newer
      // Cache the new version for next time
      await cacheRedFlagRules(adapter).catch(() => {});
      return {
        version: RED_FLAG_RULES_VERSION,
        rules: RED_FLAGS,
        cachedAt: new Date().toISOString(),
        source: 'hardcoded',
        isStale: false,
      };
    }
  } catch {
    // Cache read failed — fall through to hardcoded
  }

  // No cache available — return hardcoded (Tier 0)
  return {
    version: RED_FLAG_RULES_VERSION,
    rules: RED_FLAGS,
    cachedAt: new Date().toISOString(),
    source: 'hardcoded',
    isStale: false,
  };
}

/**
 * Persist current RED_FLAGS to offline storage.
 * Call on app load when online.
 */
export async function cacheRedFlagRules(adapter: RedFlagStorageAdapter): Promise<void> {
  await adapter.set(CACHE_KEY, RED_FLAGS, RED_FLAG_RULES_VERSION);
}

/**
 * Check if cached rules are stale (>7 days old).
 */
export async function areRulesStale(adapter?: RedFlagStorageAdapter): Promise<boolean> {
  if (!adapter) return false; // Hardcoded rules are never stale

  try {
    const cached = await adapter.get(CACHE_KEY);
    if (!cached) return false; // No cache = using hardcoded, not stale

    const cachedTime = new Date(cached.cachedAt).getTime();
    return Date.now() - cachedTime > STALE_THRESHOLD_MS;
  } catch {
    return false; // Error reading cache = using hardcoded, not stale
  }
}
