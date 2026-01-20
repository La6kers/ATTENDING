// =============================================================================
// ATTENDING AI - Session Management
// apps/shared/lib/auth/sessionManager.ts
//
// Healthcare-specific session management with 8-hour shifts and idle tracking
// =============================================================================

import { Session, SessionConfig, SessionStatus, DEFAULT_SESSION_CONFIG } from './types';

// =============================================================================
// Session Manager Class
// =============================================================================

export type SessionEventType =
  | 'session_started' | 'session_activity' | 'session_idle' | 'session_expiring'
  | 'session_expired' | 'session_extended' | 'session_locked' | 'session_ended';

export interface SessionEvent {
  type: SessionEventType;
  session: Session | null;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export type SessionEventListener = (event: SessionEvent) => void;

export class SessionManager {
  private session: Session | null = null;
  private config: SessionConfig;
  private status: SessionStatus = 'expired';
  private listeners: Set<SessionEventListener> = new Set();
  private idleTimer: NodeJS.Timeout | null = null;
  private expirationTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
  }

  startSession(session: Session): void {
    this.session = {
      ...session,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
      lastActivityAt: new Date(),
      extensionCount: 0,
    };
    this.status = 'active';
    this.startTimers();
    this.attachActivityListeners();
    this.emit({ type: 'session_started', session: this.session, timestamp: new Date() });
  }

  endSession(reason = 'user_logout'): void {
    if (!this.session) return;
    this.stopTimers();
    this.detachActivityListeners();
    const endedSession = this.session;
    this.session = null;
    this.status = 'expired';
    this.emit({ type: 'session_ended', session: endedSession, timestamp: new Date(), details: { reason } });
  }

  async extendSession(): Promise<boolean> {
    if (!this.session) return false;
    if (!this.config.allowExtension) return false;
    if (this.session.extensionCount >= this.config.maxExtensions) return false;

    const now = new Date();
    const originalDuration = this.session.expiresAt.getTime() - this.session.createdAt.getTime();
    const newExpiresAt = new Date(now.getTime() + originalDuration);

    this.session = {
      ...this.session,
      expiresAt: newExpiresAt,
      extensionCount: this.session.extensionCount + 1,
      lastActivityAt: now,
    };
    this.status = 'active';
    this.restartTimers();
    this.emit({
      type: 'session_extended',
      session: this.session,
      timestamp: now,
      details: { extensionCount: this.session.extensionCount },
    });
    return true;
  }

  lockSession(): void {
    if (!this.session) return;
    this.status = 'locked';
    this.stopTimers();
    this.emit({ type: 'session_locked', session: this.session, timestamp: new Date() });
  }

  unlockSession(): void {
    if (!this.session || this.status !== 'locked') return;
    this.session.lastActivityAt = new Date();
    this.status = 'active';
    this.restartTimers();
  }

  recordActivity(): void {
    if (!this.session || this.status === 'locked') return;
    const now = new Date();
    this.session.lastActivityAt = now;
    if (this.status === 'idle') {
      this.status = 'active';
      this.emit({ type: 'session_activity', session: this.session, timestamp: now });
    }
    this.resetIdleTimer();
  }

  private attachActivityListeners(): void {
    if (typeof window === 'undefined') return;
    this.activityEvents.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  private detachActivityListeners(): void {
    if (typeof window === 'undefined') return;
    this.activityEvents.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });
  }

  private handleActivity = (): void => { this.recordActivity(); };

  private startTimers(): void {
    this.startIdleTimer();
    this.startExpirationTimer();
    this.startWarningTimer();
  }

  private stopTimers(): void {
    this.clearIdleTimer();
    this.clearExpirationTimer();
    this.clearWarningTimer();
  }

  private restartTimers(): void {
    this.stopTimers();
    this.startTimers();
  }

  private startIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => this.handleIdle(), this.config.idleTimeout);
  }

  private resetIdleTimer(): void { this.startIdleTimer(); }

  private clearIdleTimer(): void {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  }

  private handleIdle(): void {
    if (!this.session) return;
    this.status = 'idle';
    this.emit({ type: 'session_idle', session: this.session, timestamp: new Date() });
  }

  private startExpirationTimer(): void {
    if (!this.session) return;
    this.clearExpirationTimer();
    const timeUntilExpiration = this.session.expiresAt.getTime() - Date.now();
    if (timeUntilExpiration <= 0) { this.handleExpiration(); return; }
    this.expirationTimer = setTimeout(() => this.handleExpiration(), timeUntilExpiration);
  }

  private clearExpirationTimer(): void {
    if (this.expirationTimer) { clearTimeout(this.expirationTimer); this.expirationTimer = null; }
  }

  private handleExpiration(): void {
    if (!this.session) return;
    this.status = 'expired';
    this.stopTimers();
    this.detachActivityListeners();
    this.emit({ type: 'session_expired', session: this.session, timestamp: new Date() });
  }

  private startWarningTimer(): void {
    if (!this.session) return;
    this.clearWarningTimer();
    const timeUntilWarning = this.session.expiresAt.getTime() - Date.now() - this.config.expirationWarning;
    if (timeUntilWarning <= 0) { this.handleExpirationWarning(); return; }
    this.warningTimer = setTimeout(() => this.handleExpirationWarning(), timeUntilWarning);
  }

  private clearWarningTimer(): void {
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
  }

  private handleExpirationWarning(): void {
    if (!this.session || this.status === 'expired') return;
    this.status = 'expiring';
    this.emit({
      type: 'session_expiring',
      session: this.session,
      timestamp: new Date(),
      details: {
        expiresAt: this.session.expiresAt,
        remainingMs: this.session.expiresAt.getTime() - Date.now(),
        canExtend: this.canExtendSession(),
      },
    });
  }

  getSession(): Session | null { return this.session ? { ...this.session } : null; }
  getStatus(): SessionStatus { return this.status; }
  isActive(): boolean { return this.session !== null && this.status === 'active'; }
  isExpired(): boolean { return this.status === 'expired'; }
  isLocked(): boolean { return this.status === 'locked'; }
  canExtendSession(): boolean {
    if (!this.session) return false;
    if (!this.config.allowExtension) return false;
    return this.session.extensionCount < this.config.maxExtensions;
  }
  getRemainingTime(): number {
    if (!this.session) return 0;
    return Math.max(0, this.session.expiresAt.getTime() - Date.now());
  }
  getIdleTime(): number {
    if (!this.session) return 0;
    return Date.now() - this.session.lastActivityAt.getTime();
  }
  getExtensionsRemaining(): number {
    if (!this.session) return 0;
    return Math.max(0, this.config.maxExtensions - this.session.extensionCount);
  }

  addEventListener(listener: SessionEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  removeEventListener(listener: SessionEventListener): void { this.listeners.delete(listener); }

  private emit(event: SessionEvent): void {
    this.listeners.forEach((listener) => {
      try { listener(event); } catch (error) { console.error('[SessionManager] Listener error:', error); }
    });
  }

  formatRemainingTime(): string {
    const ms = this.getRemainingTime();
    if (ms <= 0) return 'Expired';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let managerInstance: SessionManager | null = null;

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!managerInstance) managerInstance = new SessionManager(config);
  return managerInstance;
}

export function resetSessionManager(): void {
  if (managerInstance) { managerInstance.endSession('reset'); managerInstance = null; }
}

// =============================================================================
// Session Storage Utilities
// =============================================================================

const SESSION_STORAGE_KEY = 'attending_session';

export function persistSession(session: Session): void {
  if (typeof window === 'undefined') return;
  try {
    const sessionData = {
      id: session.id,
      userId: session.userId,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt.toISOString(),
      extensionCount: session.extensionCount,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('[SessionManager] Failed to persist session:', error);
  }
}

export function retrieveSession(): Partial<Session> | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (new Date(parsed.expiresAt) <= new Date()) { clearSession(); return null; }
    return { ...parsed, expiresAt: new Date(parsed.expiresAt) };
  } catch (error) {
    console.error('[SessionManager] Failed to retrieve session:', error);
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch (error) {
    console.error('[SessionManager] Failed to clear session:', error);
  }
}

export function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  const now = new Date();
  const expiresAt = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
  return expiresAt > now;
}

export function sessionNeedsRefresh(session: Session | null): boolean {
  if (!session) return false;
  const now = new Date();
  const expiresAt = session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt);
  const fiveMinutes = 5 * 60 * 1000;
  return expiresAt.getTime() - now.getTime() < fiveMinutes;
}
