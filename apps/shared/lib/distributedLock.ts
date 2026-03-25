// ============================================================
// ATTENDING AI - Distributed Lock Service
// apps/shared/lib/distributedLock.ts
//
// Redis-based distributed locking for multi-pod deployments.
// Prevents duplicate job execution when N replicas are running.
//
// Pattern: Redis SET with NX (not-exists) + EX (expiry)
//   SET scheduler:lock:{jobName} {instanceId} NX EX 30
//
// Usage:
//   const lock = await distributedLock.acquire('webhook-retry', 30);
//   if (lock) {
//     try { await doWork(); }
//     finally { await distributedLock.release('webhook-retry'); }
//   }
//
// HIPAA Note: No PHI is stored in lock keys. Only job names
// and instance IDs are used.
// ============================================================

import { randomUUID } from 'crypto';
import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export interface LockOptions {
  /** Lock TTL in seconds (auto-releases if holder crashes) */
  ttlSeconds: number;
  /** Retry acquiring the lock this many times */
  retryCount?: number;
  /** Delay between retries in ms */
  retryDelayMs?: number;
}

export interface LockInfo {
  key: string;
  instanceId: string;
  acquiredAt: number;
  ttlSeconds: number;
}

// ============================================================
// DISTRIBUTED LOCK SERVICE
// ============================================================

class DistributedLockService {
  private instanceId = `inst-${randomUUID().slice(0, 8)}-${process.pid}`;
  private redis: any = null;
  private heldLocks = new Map<string, { timer: ReturnType<typeof setInterval>; acquiredAt: number }>();
  private readonly KEY_PREFIX = 'lock';

  /**
   * Initialize with Redis client.
   */
  async initialize(redisClient?: any): Promise<void> {
    if (redisClient) {
      this.redis = redisClient;
    } else {
      try {
        const { redis } = await import('./redis/client');
        await redis.initialize();
        this.redis = redis;
      } catch {
        logger.warn('[DistributedLock] Redis unavailable — locks disabled (single-instance mode)');
      }
    }
    logger.info('[DistributedLock] Initialized', { instanceId: this.instanceId });
  }

  /**
   * Acquire a distributed lock.
   * Returns true if lock was acquired, false if another instance holds it.
   */
  async acquire(name: string, options: LockOptions | number = 30): Promise<boolean> {
    const opts: LockOptions = typeof options === 'number'
      ? { ttlSeconds: options }
      : options;

    const { ttlSeconds, retryCount = 0, retryDelayMs = 200 } = opts;
    const key = `${this.KEY_PREFIX}:${name}`;

    // No Redis = always acquire (single-instance mode)
    if (!this.redis) {
      this.heldLocks.set(name, { timer: null as any, acquiredAt: Date.now() });
      return true;
    }

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // SET key instanceId NX EX ttl
        // NX = only set if not exists
        // EX = expire after ttl seconds
        const result = await this.redis.set(key, this.instanceId, ttlSeconds);

        if (result) {
          // Lock acquired — start renewal timer at 2/3 TTL
          const renewInterval = Math.floor(ttlSeconds * 1000 * 0.66);
          const timer = setInterval(async () => {
            await this.renew(name, ttlSeconds);
          }, renewInterval);

          this.heldLocks.set(name, { timer, acquiredAt: Date.now() });

          logger.debug('[DistributedLock] Acquired', { name, instanceId: this.instanceId, ttlSeconds });
          return true;
        }

        // Lock held by another instance
        if (attempt < retryCount) {
          await new Promise(r => setTimeout(r, retryDelayMs));
        }
      } catch (err) {
        logger.error('[DistributedLock] Acquire error', err instanceof Error ? err : new Error(String(err)));
        // On Redis error, allow execution (fail-open for availability)
        return true;
      }
    }

    logger.debug('[DistributedLock] Not acquired (held by another instance)', { name });
    return false;
  }

  /**
   * Release a distributed lock.
   * Only releases if this instance holds it (compare-and-delete).
   */
  async release(name: string): Promise<boolean> {
    const key = `${this.KEY_PREFIX}:${name}`;
    const held = this.heldLocks.get(name);

    if (held?.timer) {
      clearInterval(held.timer);
    }
    this.heldLocks.delete(name);

    if (!this.redis) return true;

    try {
      // Only delete if we hold it (Lua script for atomicity)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      // Try eval first, fall back to simple get+del
      try {
        const result = await this.redis.eval(script, [key], [this.instanceId]);
        return result === 1;
      } catch {
        // Fallback: non-atomic but safe enough
        const holder = await this.redis.get(key);
        if (holder === this.instanceId) {
          await this.redis.del(key);
          return true;
        }
        return false;
      }
    } catch (err) {
      logger.error('[DistributedLock] Release error', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  /**
   * Renew lock TTL (extend expiry).
   * Called automatically by the renewal timer.
   */
  private async renew(name: string, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;

    const key = `${this.KEY_PREFIX}:${name}`;

    try {
      const holder = await this.redis.get(key);
      if (holder === this.instanceId) {
        await this.redis.expire(key, ttlSeconds);
        logger.debug('[DistributedLock] Renewed', { name, ttlSeconds });
      } else {
        // We lost the lock — stop renewing
        const held = this.heldLocks.get(name);
        if (held?.timer) {
          clearInterval(held.timer);
        }
        this.heldLocks.delete(name);
        logger.warn('[DistributedLock] Lost lock during renewal', { name });
      }
    } catch (err) {
      logger.error('[DistributedLock] Renew error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Execute a function while holding a lock.
   * Acquires, runs, releases — even on error.
   */
  async withLock<T>(
    name: string,
    fn: () => Promise<T>,
    options: LockOptions | number = 30
  ): Promise<T | null> {
    const acquired = await this.acquire(name, options);
    if (!acquired) return null;

    try {
      return await fn();
    } finally {
      await this.release(name);
    }
  }

  /**
   * Release all locks held by this instance (shutdown cleanup).
   */
  async releaseAll(): Promise<void> {
    const names = Array.from(this.heldLocks.keys());
    for (const name of names) {
      await this.release(name);
    }
    logger.info('[DistributedLock] Released all locks', { count: names.length });
  }

  /**
   * Get info about all locks held by this instance.
   */
  getHeldLocks(): LockInfo[] {
    return Array.from(this.heldLocks.entries()).map(([name, info]) => ({
      key: `${this.KEY_PREFIX}:${name}`,
      instanceId: this.instanceId,
      acquiredAt: info.acquiredAt,
      ttlSeconds: 0, // Would need Redis query
    }));
  }

  getInstanceId(): string {
    return this.instanceId;
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const distributedLock = new DistributedLockService();

export default distributedLock;
