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
  type PendingRequest,
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
// SYNC MANAGER CLASS
// ============================================================

class SyncManager {
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncEventCallback> = new Set();
  private syncInProgress: boolean = false;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
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
      
      this.emit({
        type: 'sync-complete',
        data: result,
      });

    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      result.success = false;
      this.status = 'failed';
      
      this.emit({
        type: 'sync-error',
        data: { error: (error as Error).message },
      });

      // Schedule retry
      this.scheduleRetry();
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
          result.synced++;
          
          this.emit({
            type: 'item-synced',
            data: { type: 'assessment', id: assessment.id, serverId: data.id },
          });
        } else {
          throw new Error(`Server returned ${response.status}`);
        }
      } catch (error) {
        console.error(`[SyncManager] Failed to sync assessment ${assessment.id}:`, error);
        
        await markAssessmentFailed(assessment.id, (error as Error).message);
        result.failed++;
        
        result.errors.push({
          type: 'assessment',
          id: assessment.id,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });

        this.emit({
          type: 'item-failed',
          data: { type: 'assessment', id: assessment.id, error: (error as Error).message },
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

  private scheduleRetry(delayMs: number = 30000): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine) {
        this.startSync();
      }
    }, delayMs);
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
