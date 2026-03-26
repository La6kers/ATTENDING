// ============================================================
// ATTENDING AI — Mobile Session Manager
// apps/mobile/lib/auth/mobileSessionManager.ts
//
// Adapted from apps/shared/lib/auth/sessionManager.ts
// Replaces window event listeners with AppState + touch handler.
// Same 8hr max, 15min idle, 5min warning.
// ============================================================

import { AppState, AppStateStatus } from 'react-native';
import { SESSION_CONFIG } from '../constants';

export type SessionStatus = 'active' | 'idle' | 'expiring' | 'expired' | 'locked';

export type SessionEvent =
  | { type: 'status_change'; status: SessionStatus }
  | { type: 'expiration_warning'; remainingMs: number }
  | { type: 'expired' }
  | { type: 'extended'; extensionCount: number };

type SessionListener = (event: SessionEvent) => void;

export class MobileSessionManager {
  private startedAt: number = 0;
  private lastActivityAt: number = 0;
  private extensionCount: number = 0;
  private status: SessionStatus = 'active';
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<SessionListener> = new Set();
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private backgroundedAt: number = 0;

  start(): void {
    const now = Date.now();
    this.startedAt = now;
    this.lastActivityAt = now;
    this.extensionCount = 0;
    this.status = 'active';

    this.startTimers();
    this.startAppStateListener();
  }

  stop(): void {
    this.clearTimers();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.listeners.clear();
  }

  recordActivity(): void {
    if (this.status === 'expired' || this.status === 'locked') return;
    this.lastActivityAt = Date.now();
    if (this.status !== 'active') {
      this.setStatus('active');
    }
    this.resetIdleTimer();
  }

  extend(): boolean {
    if (this.extensionCount >= SESSION_CONFIG.MAX_EXTENSIONS) return false;
    this.extensionCount++;
    this.startedAt = Date.now();
    this.lastActivityAt = Date.now();
    this.startTimers();
    this.emit({ type: 'extended', extensionCount: this.extensionCount });
    return true;
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  onEvent(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: SessionEvent): void {
    this.listeners.forEach((fn) => fn(event));
  }

  private setStatus(status: SessionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit({ type: 'status_change', status });
  }

  private clearTimers(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.idleTimer = null;
    this.warningTimer = null;
    this.maxTimer = null;
  }

  private startTimers(): void {
    this.clearTimers();
    this.resetIdleTimer();

    // Max session duration
    const elapsed = Date.now() - this.startedAt;
    const remaining = SESSION_CONFIG.MAX_DURATION - elapsed;
    if (remaining <= 0) {
      this.expire();
      return;
    }

    this.maxTimer = setTimeout(() => this.expire(), remaining);

    // Warning before max expiry
    const warningAt = remaining - SESSION_CONFIG.EXPIRATION_WARNING;
    if (warningAt > 0) {
      this.warningTimer = setTimeout(() => {
        this.setStatus('expiring');
        this.emit({ type: 'expiration_warning', remainingMs: SESSION_CONFIG.EXPIRATION_WARNING });
      }, warningAt);
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.setStatus('idle');
      // Give 1 more minute after idle before expiring
      this.idleTimer = setTimeout(() => this.expire(), 60_000);
    }, SESSION_CONFIG.IDLE_TIMEOUT);
  }

  private expire(): void {
    this.clearTimers();
    this.setStatus('expired');
    this.emit({ type: 'expired' });
  }

  private startAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        this.backgroundedAt = Date.now();
      } else if (state === 'active') {
        if (this.backgroundedAt > 0) {
          const elapsed = Date.now() - this.backgroundedAt;
          if (elapsed > SESSION_CONFIG.IDLE_TIMEOUT) {
            this.expire();
          } else {
            this.recordActivity();
          }
          this.backgroundedAt = 0;
        }
      }
    });
  }
}

export const sessionManager = new MobileSessionManager();
