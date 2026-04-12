// ============================================================
// ATTENDING AI — Mobile Sync Manager
// apps/mobile/lib/offline/mobileSyncManager.ts
//
// Syncs offline-queued requests on reconnect.
// Same retry config as web: MAX_RETRIES=5, exponential backoff.
// ============================================================

import { getPendingRequests, markRequestCompleted, markRequestFailed } from './sqliteStore';
import { secureTokenStore } from '../auth/secureTokenStore';
import { API_CONFIG } from '../constants';

// ============================================================
// Config — mirrors patient-portal syncManager
// ============================================================

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 60000;
const BACKOFF_MULTIPLIER = 2;
const TRANSIENT_ERROR_CODES = new Set([408, 429, 500, 502, 503, 504]);

// ============================================================
// Events
// ============================================================

export type SyncEvent =
  | { type: 'sync-start'; count: number }
  | { type: 'sync-progress'; completed: number; total: number }
  | { type: 'sync-complete'; succeeded: number; failed: number }
  | { type: 'sync-error'; error: string }
  | { type: 'item-synced'; id: string }
  | { type: 'item-failed'; id: string; error: string };

type SyncListener = (event: SyncEvent) => void;

// ============================================================
// Manager
// ============================================================

class MobileSyncManager {
  private listeners: Set<SyncListener> = new Set();
  private syncing = false;

  onEvent(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  isSyncing(): boolean {
    return this.syncing;
  }

  async syncAll(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const pending = await getPendingRequests();
      if (pending.length === 0) {
        this.syncing = false;
        return;
      }

      this.emit({ type: 'sync-start', count: pending.length });

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < pending.length; i++) {
        const req = pending[i];
        try {
          const success = await this.executeRequest(req);
          if (success) {
            await markRequestCompleted(req.id);
            succeeded++;
            this.emit({ type: 'item-synced', id: req.id });
          } else {
            await markRequestFailed(req.id, 'Non-transient error', req.retryCount + 1);
            failed++;
            this.emit({ type: 'item-failed', id: req.id, error: 'Server rejected request' });
          }
        } catch (err: any) {
          const isTransient = err?.status && TRANSIENT_ERROR_CODES.has(err.status);
          if (isTransient && req.retryCount < MAX_RETRIES) {
            await markRequestFailed(req.id, err.message ?? 'Network error', req.retryCount + 1);
            // Exponential backoff delay
            const delay = Math.min(
              BASE_DELAY * Math.pow(BACKOFF_MULTIPLIER, req.retryCount),
              MAX_DELAY
            );
            const jitter = delay * (0.75 + Math.random() * 0.5);
            await new Promise((r) => setTimeout(r, jitter));
          } else {
            await markRequestFailed(req.id, err.message ?? 'Failed', MAX_RETRIES);
            failed++;
            this.emit({ type: 'item-failed', id: req.id, error: err.message ?? 'Failed' });
          }
        }

        this.emit({ type: 'sync-progress', completed: i + 1, total: pending.length });
      }

      this.emit({ type: 'sync-complete', succeeded, failed });
    } catch (err: any) {
      this.emit({ type: 'sync-error', error: err.message ?? 'Sync failed' });
    } finally {
      this.syncing = false;
    }
  }

  private async executeRequest(req: {
    url: string;
    method: string;
    body: string;
    headers: string;
  }): Promise<boolean> {
    const token = await secureTokenStore.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...JSON.parse(req.headers),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `${API_CONFIG.BASE_URL}${req.url}`;
    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.body,
    });

    if (response.ok) return true;

    if (TRANSIENT_ERROR_CODES.has(response.status)) {
      const err: any = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return false;
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach((fn) => fn(event));
  }
}

export const mobileSyncManager = new MobileSyncManager();
