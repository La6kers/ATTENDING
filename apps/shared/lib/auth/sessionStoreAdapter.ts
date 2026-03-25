// ============================================================
// ATTENDING AI - Session Store Adapter
// apps/shared/lib/auth/sessionStoreAdapter.ts
//
// Pluggable session storage backend that supports:
// - In-memory storage (development / single-instance fallback)
// - Redis storage (production / multi-instance)
//
// The adapter is initialized lazily — if REDIS_URL is configured,
// it uses Redis; otherwise it falls back to in-memory.
//
// HIPAA Requirements:
// - 164.312(a)(2)(iii) - Automatic logoff (TTL-based expiry)
// - 164.308(a)(5)(ii)(C) - Login monitoring (session tracking)
// ============================================================

import type { SecureSession, SessionActivity } from './secureSession';

// ============================================================
// INTERFACE
// ============================================================

export interface SessionStoreAdapter {
  /** Store a session with automatic TTL-based expiry */
  setSession(sessionId: string, session: SecureSession, ttlSeconds: number): Promise<void>;
  /** Retrieve a session by ID */
  getSession(sessionId: string): Promise<SecureSession | null>;
  /** Delete a session */
  deleteSession(sessionId: string): Promise<void>;
  /** Find active session by user ID (returns first match) */
  findSessionByUserId(userId: string): Promise<SecureSession | null>;
  /** Store session activity log */
  setActivity(sessionId: string, activities: SessionActivity[], ttlSeconds: number): Promise<void>;
  /** Retrieve session activity log */
  getActivity(sessionId: string): Promise<SessionActivity[]>;
  /** Delete session activity log */
  deleteActivity(sessionId: string): Promise<void>;
  /** Get all session IDs for a user (for bulk invalidation) */
  getSessionIdsByUserId(userId: string): Promise<string[]>;
  /** Health check */
  isHealthy(): Promise<boolean>;
  /** Storage backend name */
  readonly backendName: string;
}

// ============================================================
// IN-MEMORY IMPLEMENTATION (Development / Fallback)
// ============================================================

export class MemorySessionStore implements SessionStoreAdapter {
  readonly backendName = 'memory';
  private sessions = new Map<string, { session: SecureSession; expiresAt: number }>();
  private activities = new Map<string, { activities: SessionActivity[]; expiresAt: number }>();
  private userIndex = new Map<string, Set<string>>(); // userId -> sessionIds
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    console.log('[SessionStore] Using in-memory backend (development mode)');
    console.warn('[SessionStore] WARNING: In-memory sessions do not survive restarts or scale across instances');
  }

  async setSession(sessionId: string, session: SecureSession, ttlSeconds: number): Promise<void> {
    this.sessions.set(sessionId, {
      session,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
    // Maintain user → sessions index
    if (!this.userIndex.has(session.userId)) {
      this.userIndex.set(session.userId, new Set());
    }
    this.userIndex.get(session.userId)!.add(sessionId);
  }

  async getSession(sessionId: string): Promise<SecureSession | null> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return entry.session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      const userSessions = this.userIndex.get(entry.session.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userIndex.delete(entry.session.userId);
        }
      }
    }
    this.sessions.delete(sessionId);
  }

  async findSessionByUserId(userId: string): Promise<SecureSession | null> {
    const sessionIds = this.userIndex.get(userId);
    if (!sessionIds) return null;
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.isValid) return session;
    }
    return null;
  }

  async setActivity(sessionId: string, activities: SessionActivity[], ttlSeconds: number): Promise<void> {
    this.activities.set(sessionId, {
      activities,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  async getActivity(sessionId: string): Promise<SessionActivity[]> {
    const entry = this.activities.get(sessionId);
    if (!entry) return [];
    if (Date.now() > entry.expiresAt) {
      this.activities.delete(sessionId);
      return [];
    }
    return entry.activities;
  }

  async deleteActivity(sessionId: string): Promise<void> {
    this.activities.delete(sessionId);
  }

  async getSessionIdsByUserId(userId: string): Promise<string[]> {
    const sessionIds = this.userIndex.get(userId);
    return sessionIds ? Array.from(sessionIds) : [];
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.sessions.entries()) {
      if (now > entry.expiresAt) {
        this.deleteSession(key);
      }
    }
    for (const [key, entry] of this.activities.entries()) {
      if (now > entry.expiresAt) {
        this.activities.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.activities.clear();
    this.userIndex.clear();
  }
}

// ============================================================
// REDIS IMPLEMENTATION (Production)
// ============================================================

/**
 * Minimal Redis client interface — matches AttendingRedisClient from lib/redis/client.ts.
 * Defined here to avoid circular imports.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
}

export class RedisSessionStore implements SessionStoreAdapter {
  readonly backendName = 'redis';
  private redis: RedisLike;
  private readonly prefix = 'sess:';
  private readonly actPrefix = 'sess:act:';
  private readonly userPrefix = 'sess:user:';

  constructor(redisClient: RedisLike) {
    this.redis = redisClient;
    console.log('[SessionStore] Using Redis backend (production mode)');
  }

  async setSession(sessionId: string, session: SecureSession, ttlSeconds: number): Promise<void> {
    // Serialize session (convert Dates to ISO strings)
    const serialized = JSON.stringify({
      ...session,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
    });
    await this.redis.set(`${this.prefix}${sessionId}`, serialized, ttlSeconds);

    // Maintain user → session index (store sessionId in a user-keyed set-like key)
    const userKey = `${this.userPrefix}${session.userId}`;
    const existingIds = await this.getSessionIdsByUserId(session.userId);
    if (!existingIds.includes(sessionId)) {
      existingIds.push(sessionId);
    }
    // TTL matches max session duration (12h) + buffer
    await this.redis.set(userKey, JSON.stringify(existingIds), 43200 + 3600);
  }

  async getSession(sessionId: string): Promise<SecureSession | null> {
    const data = await this.redis.get(`${this.prefix}${sessionId}`);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        lastActivityAt: new Date(parsed.lastActivityAt),
      } as SecureSession;
    } catch (error) {
      console.error('[SessionStore] Failed to deserialize session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Remove from user index first
    const session = await this.getSession(sessionId);
    if (session) {
      const userKey = `${this.userPrefix}${session.userId}`;
      const existingIds = await this.getSessionIdsByUserId(session.userId);
      const filtered = existingIds.filter(id => id !== sessionId);
      if (filtered.length > 0) {
        await this.redis.set(userKey, JSON.stringify(filtered), 43200 + 3600);
      } else {
        await this.redis.del(userKey);
      }
    }
    await this.redis.del(`${this.prefix}${sessionId}`);
  }

  async findSessionByUserId(userId: string): Promise<SecureSession | null> {
    const sessionIds = await this.getSessionIdsByUserId(userId);
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && session.isValid) return session;
    }
    return null;
  }

  async setActivity(sessionId: string, activities: SessionActivity[], ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(activities.map(a => ({
      ...a,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp,
    })));
    await this.redis.set(`${this.actPrefix}${sessionId}`, serialized, ttlSeconds);
  }

  async getActivity(sessionId: string): Promise<SessionActivity[]> {
    const data = await this.redis.get(`${this.actPrefix}${sessionId}`);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return parsed.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
    } catch {
      return [];
    }
  }

  async deleteActivity(sessionId: string): Promise<void> {
    await this.redis.del(`${this.actPrefix}${sessionId}`);
  }

  async getSessionIdsByUserId(userId: string): Promise<string[]> {
    const data = await this.redis.get(`${this.userPrefix}${userId}`);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let storeInstance: SessionStoreAdapter | null = null;

/**
 * Get the session store instance.
 * Auto-selects Redis if available, falls back to in-memory.
 * Call initializeSessionStore() at app startup to wire Redis.
 */
export function getSessionStore(): SessionStoreAdapter {
  if (!storeInstance) {
    // Default to memory — Redis is wired in via initializeSessionStore()
    storeInstance = new MemorySessionStore();
  }
  return storeInstance;
}

/**
 * Initialize session store with Redis backend.
 * Call this at application startup after Redis is connected.
 *
 * @param redisClient - An initialized AttendingRedisClient from lib/redis/client.ts
 */
export function initializeSessionStore(redisClient: RedisLike): void {
  if (storeInstance && storeInstance.backendName === 'redis') {
    console.log('[SessionStore] Already initialized with Redis');
    return;
  }
  storeInstance = new RedisSessionStore(redisClient);
}

/**
 * Reset session store (for testing)
 */
export function resetSessionStore(): void {
  if (storeInstance && storeInstance.backendName === 'memory') {
    (storeInstance as MemorySessionStore).destroy();
  }
  storeInstance = null;
}

export default { getSessionStore, initializeSessionStore, resetSessionStore };
