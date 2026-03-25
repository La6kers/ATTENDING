// ============================================================
// ATTENDING AI - PreVisit Prefetcher
// apps/provider-portal/lib/previsitPrefetcher.ts
//
// Prefetches clinical data for the next 2-3 patients on the
// provider's schedule when viewing the current patient. This
// eliminates load-time delays when navigating between patients
// and pre-warms the AI differential cache.
//
// Strategy:
//   1. When provider opens a patient, prefetch next N patients
//   2. Cache EHR data, COMPASS results, and AI differentials
//   3. Use requestIdleCallback to avoid blocking the main thread
//   4. Evict stale prefetch data after 15 minutes
//
// Cost impact: $0 extra — prefetching uses the same cache layer,
// so AI calls only happen once regardless of prefetch timing.
// ============================================================

// ============================================================
// Types
// ============================================================

export interface PrefetchedPatient {
  patientId: string;
  ehrData: Record<string, unknown> | null;
  compassData: Record<string, unknown> | null;
  differentials: Record<string, unknown> | null;
  prefetchedAt: number;
  status: 'pending' | 'complete' | 'error';
}

export interface ScheduleEntry {
  patientId: string;
  appointmentTime: string;
  chiefComplaint?: string;
  appointmentType?: string;
}

interface PrefetchOptions {
  /** Number of upcoming patients to prefetch (default: 2) */
  lookahead: number;
  /** TTL in ms before prefetched data is considered stale (default: 15 min) */
  ttlMs: number;
  /** Base URL for API calls */
  apiBase: string;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_OPTIONS: PrefetchOptions = {
  lookahead: 2,
  ttlMs: 15 * 60 * 1000, // 15 minutes
  apiBase: '/api',
};

const PREFETCH_CACHE_KEY = 'attending-prefetch-cache';

// ============================================================
// Prefetch Cache (in-memory + sessionStorage backup)
// ============================================================

class PreVisitPrefetcher {
  private cache = new Map<string, PrefetchedPatient>();
  private options: PrefetchOptions;
  private activeRequests = new Set<string>();

  constructor(options?: Partial<PrefetchOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.restoreFromStorage();
  }

  /**
   * Trigger prefetching for the next N patients after the current one.
   * Call this when the provider opens a patient's previsit page.
   */
  prefetchUpcoming(
    schedule: ScheduleEntry[],
    currentPatientId: string
  ): void {
    const currentIndex = schedule.findIndex(
      (s) => s.patientId === currentPatientId
    );
    if (currentIndex === -1) return;

    const upcoming = schedule.slice(
      currentIndex + 1,
      currentIndex + 1 + this.options.lookahead
    );

    for (const entry of upcoming) {
      if (this.isCached(entry.patientId)) continue;
      this.prefetchPatient(entry);
    }
  }

  /**
   * Get prefetched data for a patient (returns null on miss).
   */
  get(patientId: string): PrefetchedPatient | null {
    const cached = this.cache.get(patientId);
    if (!cached) return null;

    // Check staleness
    if (Date.now() - cached.prefetchedAt > this.options.ttlMs) {
      this.cache.delete(patientId);
      this.persistToStorage();
      return null;
    }

    return cached;
  }

  /**
   * Check if a patient's data is already cached and fresh.
   */
  isCached(patientId: string): boolean {
    return this.get(patientId) !== null;
  }

  /**
   * Manually warm the cache for a specific patient.
   */
  async warmCache(entry: ScheduleEntry): Promise<void> {
    await this.prefetchPatient(entry);
  }

  /**
   * Clear all prefetched data.
   */
  clear(): void {
    this.cache.clear();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PREFETCH_CACHE_KEY);
    }
  }

  /**
   * Evict stale entries.
   */
  evictStale(): number {
    let evicted = 0;
    const now = Date.now();

    for (const [id, data] of this.cache) {
      if (now - data.prefetchedAt > this.options.ttlMs) {
        this.cache.delete(id);
        evicted++;
      }
    }

    if (evicted > 0) this.persistToStorage();
    return evicted;
  }

  /**
   * Get cache stats for debugging/dashboard.
   */
  getStats(): {
    cached: number;
    stale: number;
    pending: number;
    patientIds: string[];
  } {
    const now = Date.now();
    let stale = 0;
    let pending = 0;

    for (const [, data] of this.cache) {
      if (now - data.prefetchedAt > this.options.ttlMs) stale++;
      if (data.status === 'pending') pending++;
    }

    return {
      cached: this.cache.size,
      stale,
      pending,
      patientIds: Array.from(this.cache.keys()),
    };
  }

  // ----------------------------------------------------------
  // Internal
  // ----------------------------------------------------------

  private async prefetchPatient(entry: ScheduleEntry): Promise<void> {
    if (this.activeRequests.has(entry.patientId)) return;
    this.activeRequests.add(entry.patientId);

    // Create placeholder
    const record: PrefetchedPatient = {
      patientId: entry.patientId,
      ehrData: null,
      compassData: null,
      differentials: null,
      prefetchedAt: Date.now(),
      status: 'pending',
    };
    this.cache.set(entry.patientId, record);

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleWork =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 50);

    scheduleWork(async () => {
      try {
        // Fetch EHR data, COMPASS data, and differentials in parallel
        const [ehrResult, compassResult, diffResult] = await Promise.allSettled([
          this.fetchEHR(entry.patientId),
          this.fetchCompass(entry.patientId),
          entry.chiefComplaint
            ? this.fetchDifferentials(entry.patientId, entry.chiefComplaint)
            : Promise.resolve(null),
        ]);

        record.ehrData =
          ehrResult.status === 'fulfilled' ? ehrResult.value : null;
        record.compassData =
          compassResult.status === 'fulfilled' ? compassResult.value : null;
        record.differentials =
          diffResult.status === 'fulfilled' ? diffResult.value : null;
        record.status = 'complete';
        record.prefetchedAt = Date.now();

        console.log(
          `[PREFETCH] Patient ${entry.patientId} data cached (EHR: ${!!record.ehrData}, COMPASS: ${!!record.compassData}, Dx: ${!!record.differentials})`
        );
      } catch {
        record.status = 'error';
        console.warn(`[PREFETCH] Failed to prefetch patient ${entry.patientId}`);
      } finally {
        this.activeRequests.delete(entry.patientId);
        this.persistToStorage();
      }
    });
  }

  private async fetchEHR(
    patientId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(
        `${this.options.apiBase}/ehr/patient/${patientId}/summary`,
        { credentials: 'include' }
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private async fetchCompass(
    patientId: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(
        `${this.options.apiBase}/compass/assessment/${patientId}/latest`,
        { credentials: 'include' }
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private async fetchDifferentials(
    patientId: string,
    chiefComplaint: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch(`${this.options.apiBase}/ai/clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'differential',
          chiefComplaint,
          symptoms: [],
          patientId,
          prefetch: true,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private persistToStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const data: Record<string, PrefetchedPatient> = {};
      for (const [id, record] of this.cache) {
        if (record.status === 'complete') {
          data[id] = record;
        }
      }
      sessionStorage.setItem(PREFETCH_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }

  private restoreFromStorage(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(PREFETCH_CACHE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, PrefetchedPatient>;
      const now = Date.now();
      for (const [id, record] of Object.entries(data)) {
        if (now - record.prefetchedAt < this.options.ttlMs) {
          this.cache.set(id, record);
        }
      }
    } catch {
      // Corrupted storage
    }
  }
}

// ============================================================
// Singleton
// ============================================================

export const prefetcher = new PreVisitPrefetcher();

export default prefetcher;
