// ============================================================
// COMPASS - Offline Sync Manager
// apps/patient-portal/lib/offline/syncManager.ts
//
// Handles synchronization of offline data when back online
// Implements retry logic and conflict resolution
// ============================================================

import {
  getPendingAssessments,
  getPendingRequests,
  removePendingRequest,
  incrementRetryCount,
  markAssessmentSynced,
  markAssessmentFailed,
  type OfflineAssessment,
} from './indexedDB';

// ============================================================
// TYPES
// ============================================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: SyncError[];
}

export interface SyncError {
  type: 'assessment' | 'request';
  id: string;
  error: string;
  timestamp: string;
  isTransient: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

export type SyncEventType =
  | 'sync-start'
  | 'sync-progress'
  | 'sync-complete'
  | 'sync-error'
  | 'item-synced'
  | 'item-failed';

export interface SyncEvent {
  type: SyncEventType;
  data?: unknown;
}

type SyncEventCallback = (event: SyncEvent) => void;

// ============================================================
// RETRY CONFIGURATION
// ============================================================

const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
} as const;

// Transient errors that should be retried with backoff
const TRANSIENT_ERROR_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

function isTransientError(error: Error | Response | number): boolean {
  // Network errors are transient
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check HTTP status codes
  let status: number | undefined;
  if (typeof error === 'number') {
    status = error;
  } else if (error instanceof Response) {
    status = error.status;
  } else if (error instanceof Error) {
    // Extract status from error message like "Server returned 503"
    const match = error.message.match(/(\d{3})/);
    status = match ? parseInt(match[1], 10) : undefined;
  }

  return status !== undefined && TRANSIENT_ERROR_CODES.includes(status);
}

function calculateBackoffDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() - 0.5);
  return Math.min(delay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
}

// ============================================================
// SYNC MANAGER CLASS
// ============================================================

class SyncManager {
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncEventCallback> = new Set();
  private syncInProgress: boolean = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures: number = 0;
  private itemRetryCount: Map<string, number> = new Map();

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  private getRetryCount(itemId: string): number {
    return this.itemRetryCount.get(itemId) || 0;
  }

  private incrementRetryCount(itemId: string): number {
    const count = this.getRetryCount(itemId) + 1;
    this.itemRetryCount.set(itemId, count);
    return count;
  }

  private clearRetryCount(itemId: string): void {
    this.itemRetryCount.delete(itemId);
  }

  private shouldRetryItem(itemId: string): boolean {
    return this.getRetryCount(itemId) < RETRY_CONFIG.MAX_RETRIES;
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  subscribe(callback: SyncEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach((callback) => callback(event));
  }

  // ============================================================
  // CONNECTIVITY HANDLERS
  // ============================================================

  private handleOnline(): void {
    console.log('[SyncManager] Back online, starting sync...');
    this.startSync();
  }

  private handleOffline(): void {
    console.log('[SyncManager] Gone offline');
    this.status = 'idle';
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // ============================================================
  // SYNC OPERATIONS
  // ============================================================

  async startSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[SyncManager] Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    if (!navigator.onLine) {
      console.log('[SyncManager] Offline, skipping sync');
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    this.status = 'syncing';
    this.emit({ type: 'sync-start' });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Sync pending assessments
      const assessmentResult = await this.syncAssessments();
      result.synced += assessmentResult.synced;
      result.failed += assessmentResult.failed;
      result.errors.push(...assessmentResult.errors);

      // Sync pending requests
      const requestResult = await this.syncPendingRequests();
      result.synced += requestResult.synced;
      result.failed += requestResult.failed;
      result.errors.push(...requestResult.errors);

      result.success = result.failed === 0;
      this.status = 'completed';

      // Reset backoff on successful sync
      if (result.success) {
        this.resetBackoff();
      }

      this.emit({
        type: 'sync-complete',
        data: result,
      });

    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      result.success = false;
      this.status = 'failed';

      // Check if this is a transient error
      const transient = isTransientError(error as Error);
      this.incrementBackoff();

      this.emit({
        type: 'sync-error',
        data: {
          error: (error as Error).message,
          isTransient: transient,
          consecutiveFailures: this.consecutiveFailures,
        },
      });

      // Schedule retry with exponential backoff for transient errors
      if (transient && this.consecutiveFailures < RETRY_CONFIG.MAX_RETRIES) {
        this.scheduleRetry();
      }
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  private async syncAssessments(): Promise<{
    synced: number;
    failed: number;
    errors: SyncError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as SyncError[] };
    
    const pendingAssessments = await getPendingAssessments();
    console.log(`[SyncManager] Syncing ${pendingAssessments.length} assessments`);

    for (const assessment of pendingAssessments) {
      try {
        this.emit({
          type: 'sync-progress',
          data: { type: 'assessment', id: assessment.id },
        });

        const response = await this.submitAssessment(assessment);

        if (response.ok) {
          const data = await response.json();
          await markAssessmentSynced(assessment.id, data.id);
          this.clearRetryCount(assessment.id);
          result.synced++;

          this.emit({
            type: 'item-synced',
            data: { type: 'assessment', id: assessment.id, serverId: data.id },
          });
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        const errorObj = error as Error;
        const transient = isTransientError(errorObj);
        const retryCount = this.incrementRetryCount(assessment.id);
        const willRetry = transient && retryCount < RETRY_CONFIG.MAX_RETRIES;

        console.error(
          `[SyncManager] Failed to sync assessment ${assessment.id} (attempt ${retryCount}/${RETRY_CONFIG.MAX_RETRIES}, transient=${transient}):`,
          error
        );

        if (!willRetry) {
          // Permanent failure or max retries exceeded
          await markAssessmentFailed(assessment.id, errorObj.message);
          this.clearRetryCount(assessment.id);
          result.failed++;

          result.errors.push({
            type: 'assessment',
            id: assessment.id,
            error: errorObj.message,
            timestamp: new Date().toISOString(),
            isTransient: transient,
          });
        }

        this.emit({
          type: 'item-failed',
          data: {
            type: 'assessment',
            id: assessment.id,
            error: errorObj.message,
            willRetry,
            retryCount,
            isTransient: transient,
          },
        });
      }
    }

    return result;
  }

  private async submitAssessment(assessment: OfflineAssessment): Promise<Response> {
    return fetch('/api/assessments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Sync': 'true',
        'X-Offline-Id': assessment.id,
      },
      body: JSON.stringify({
        ...assessment.data,
        offlineId: assessment.id,
        sessionId: assessment.sessionId,
        createdAt: assessment.createdAt,
        triageLevel: assessment.triageLevel,
        redFlags: assessment.redFlags,
      }),
    });
  }

  private async syncPendingRequests(): Promise<{
    synced: number;
    failed: number;
    errors: SyncError[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as SyncError[] };
    
    const pendingRequests = await getPendingRequests();
    console.log(`[SyncManager] Syncing ${pendingRequests.length} pending requests`);

    for (const request of pendingRequests) {
      try {
        this.emit({
          type: 'sync-progress',
          data: { type: 'request', id: request.timestamp.toString() },
        });

        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            ...request.headers,
            'X-Offline-Sync': 'true',
          },
          body: request.body,
        });

        if (response.ok) {
          await removePendingRequest(request.timestamp);
          result.synced++;
          
          this.emit({
            type: 'item-synced',
            data: { type: 'request', id: request.timestamp.toString() },
          });
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        console.error(`[SyncManager] Failed to sync request ${request.timestamp}:`, error);
        
        const shouldRetry = await incrementRetryCount(request.timestamp);
        
        if (!shouldRetry) {
          result.failed++;
          result.errors.push({
            type: 'request',
            id: request.timestamp.toString(),
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
        }

        this.emit({
          type: 'item-failed',
          data: {
            type: 'request',
            id: request.timestamp.toString(),
            error: (error as Error).message,
            willRetry: shouldRetry,
          },
        });
      }
    }

    return result;
  }

  private scheduleRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Use exponential backoff based on consecutive failures
    const delayMs = calculateBackoffDelay(this.consecutiveFailures);
    console.log(`[SyncManager] Scheduling retry in ${Math.round(delayMs / 1000)}s (attempt ${this.consecutiveFailures + 1})`);

    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine) {
        this.startSync();
      }
    }, delayMs);
  }

  private resetBackoff(): void {
    this.consecutiveFailures = 0;
  }

  private incrementBackoff(): void {
    this.consecutiveFailures = Math.min(this.consecutiveFailures + 1, RETRY_CONFIG.MAX_RETRIES);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  getStatus(): SyncStatus {
    return this.status;
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  async forcSync(): Promise<SyncResult> {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    return this.startSync();
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const syncManager = new SyncManager();

// ============================================================
// BACKGROUND SYNC REGISTRATION
// ============================================================

export async function registerBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-assessments');
      console.log('[SyncManager] Background sync registered');
      return true;
    } catch (error) {
      console.error('[SyncManager] Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

// ============================================================
// SERVICE WORKER MESSAGE HANDLING
// ============================================================

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      console.log('[SyncManager] Service worker sync complete:', event.data);
      // Notify the app that sync is complete
      syncManager.startSync();
    }
  });
}
