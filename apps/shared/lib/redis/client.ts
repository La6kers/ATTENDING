// ============================================================
// ATTENDING AI - Redis Client Configuration
// apps/shared/lib/redis/client.ts
//
// Distributed caching and rate limiting for production deployments
// Supports both standalone Redis and Redis Cluster
//
// Used for:
// - Distributed rate limiting (HIPAA: prevent brute force)
// - Session storage
// - Real-time notifications
// - Cache layer for FHIR responses
// ============================================================

import { setRedisClient, type RedisClient as SecurityRedisClient } from '../security';
import { initializeSessionStore } from '../auth/sessionStoreAdapter';

// ============================================================
// TYPES
// ============================================================

/**
 * Full Redis client interface for both cache and rate-limiting.
 * Extends SecurityRedisClient (incr/expire/ttl) with cache operations
 * (get/set/del/keys) needed by ClinicalCacheService.
 */
export interface AttendingRedisClient extends SecurityRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  ping(): Promise<string>;
}

export interface RedisConfig {
  url: string;
  tls: boolean;
  maxRetries: number;
  retryDelayMs: number;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
}

export interface RedisHealthCheck {
  healthy: boolean;
  latencyMs: number;
  error?: string;
  mode?: string; // standalone, cluster, sentinel
}

// ============================================================
// MOCK REDIS CLIENT (Development / Fallback)
// ============================================================

/**
 * In-memory mock Redis client for development
 * WARNING: Not suitable for production - no persistence, single instance only
 */
class MockRedisClient implements AttendingRedisClient {
  private store = new Map<string, { value: string; expireAt?: number }>();
  private isConnected = false;

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log('[REDIS] Mock client connected (development mode)');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.store.clear();
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expireAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    
    // Preserve TTL if exists
    const entry = this.store.get(key);
    this.store.set(key, {
      value: newValue,
      expireAt: entry?.expireAt,
    });
    
    return parseInt(newValue, 10);
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expireAt = Date.now() + (seconds * 1000);
    }
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expireAt) return -1;
    
    const remaining = Math.ceil((entry.expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  // Cleanup expired keys periodically
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expireAt && now > entry.expireAt) {
          this.store.delete(key);
        }
      }
    }, 60000); // Every minute
  }
}

// ============================================================
// REDIS CLIENT WRAPPER
// ============================================================

/**
 * Redis client wrapper that supports both real Redis and mock
 */
class RedisClientWrapper implements AttendingRedisClient {
  private client: AttendingRedisClient;
  private config: RedisConfig;
  private isInitialized = false;

  constructor() {
    this.config = this.getConfig();
    this.client = new MockRedisClient(); // Default to mock
  }

  private getConfig(): RedisConfig {
    return {
      url: process.env.REDIS_URL || '',
      tls: process.env.REDIS_TLS_ENABLED === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS || '1000', 10),
      connectTimeoutMs: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10),
      commandTimeoutMs: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '5000', 10),
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.config.url) {
      console.warn('[REDIS] No REDIS_URL configured, using in-memory mock');
      console.warn('[REDIS] WARNING: Mock Redis is not suitable for production!');
      
      const mockClient = new MockRedisClient();
      await mockClient.connect();
      mockClient.startCleanup();
      this.client = mockClient;
      this.isInitialized = true;
      
      // Register with security module for rate limiting
      setRedisClient(this);
      // Register with session store for distributed sessions
      initializeSessionStore(this);
      return;
    }

    try {
      // Dynamic import to avoid bundling ioredis when not needed
      const { default: Redis } = await import('ioredis');
      
      const redisOptions: Record<string, unknown> = {
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > this.config.maxRetries) {
            console.error('[REDIS] Max retries exceeded, giving up');
            return null;
          }
          return Math.min(times * this.config.retryDelayMs, 5000);
        },
        connectTimeout: this.config.connectTimeoutMs,
        commandTimeout: this.config.commandTimeoutMs,
      };

      if (this.config.tls) {
        redisOptions.tls = {};
      }

      const redis = new Redis(this.config.url, redisOptions);

      // Wrap ioredis client to match full AttendingRedisClient interface
      this.client = {
        get: async (key: string) => {
          const val = await redis.get(key);
          return val ?? null;
        },
        set: async (key: string, value: string, ttlSeconds?: number) => {
          if (ttlSeconds) {
            await redis.set(key, value, 'EX', ttlSeconds);
          } else {
            await redis.set(key, value);
          }
        },
        del: async (key: string) => {
          await redis.del(key);
        },
        keys: async (pattern: string) => redis.keys(pattern),
        exists: async (key: string) => {
          const count = await redis.exists(key);
          return count > 0;
        },
        ping: async () => redis.ping(),
        incr: async (key: string) => redis.incr(key),
        expire: async (key: string, seconds: number) => {
          await redis.expire(key, seconds);
        },
        ttl: async (key: string) => redis.ttl(key),
      };

      // Test connection
      await redis.ping();
      console.log('[REDIS] Connected successfully');
      
      // Handle connection events
      redis.on('error', (err) => {
        console.error('[REDIS] Connection error:', err.message);
      });

      redis.on('reconnecting', () => {
        console.log('[REDIS] Reconnecting...');
      });

      this.isInitialized = true;
      
      // Register with security module for rate limiting
      setRedisClient(this);
      // Register with session store for distributed sessions
      initializeSessionStore(this);
      
    } catch (error) {
      console.error('[REDIS] Failed to connect:', error);
      console.warn('[REDIS] Falling back to in-memory mock');
      
      const mockClient = new MockRedisClient();
      await mockClient.connect();
      mockClient.startCleanup();
      this.client = mockClient;
      this.isInitialized = true;
      
      // Still register for rate limiting (memory fallback)
      setRedisClient(this);
      // Session store falls back to memory automatically
    }
  }

  // ----------------------------------------------------------
  // Delegate all operations to underlying client
  // ----------------------------------------------------------

  async get(key: string): Promise<string | null> {
    if (!this.isInitialized) await this.initialize();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    return this.client.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    return this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isInitialized) await this.initialize();
    return this.client.keys(pattern);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    return this.client.exists(key);
  }

  async ping(): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    return this.client.ping();
  }

  async incr(key: string): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    return this.client.ttl(key);
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

const globalForRedis = globalThis as unknown as {
  redis: RedisClientWrapper | undefined;
};

export const redis = globalForRedis.redis ?? new RedisClientWrapper();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function checkRedisHealth(): Promise<RedisHealthCheck> {
  const start = Date.now();
  
  try {
    // Initialize if needed
    await redis.incr('health:check');
    await redis.expire('health:check', 60);
    
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      mode: process.env.REDIS_URL ? 'redis' : 'mock',
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize Redis connection
 * Call this at application startup
 */
export async function initializeRedis(): Promise<void> {
  await redis.initialize();
}

// ============================================================
// EXPORTS
// ============================================================

export default redis;
