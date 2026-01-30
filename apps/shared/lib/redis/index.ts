// ============================================================
// ATTENDING AI - Redis Client Configuration
// apps/shared/lib/redis/index.ts
//
// Redis client for:
// - Distributed rate limiting
// - Session storage
// - Cache
// - Real-time pub/sub
//
// Production Requirements:
// - Redis 6.0+ with TLS
// - Azure Cache for Redis (Premium tier) recommended
// - Automatic failover with Sentinel or Cluster mode
// ============================================================

import { createClient, RedisClientType } from 'redis';
import { setRedisClient as setSecurityRedisClient } from '../security';

// ============================================================
// TYPES
// ============================================================

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  tls?: boolean;
  connectionName?: string;
  retryDelayMs?: number;
  maxRetries?: number;
}

export interface RedisHealthStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
  lastCheck: Date;
}

// ============================================================
// SINGLETON CLIENT
// ============================================================

let redisClient: RedisClientType | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClientType> | null = null;

// ============================================================
// CONFIGURATION
// ============================================================

function getRedisConfig(): RedisConfig {
  return {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
    tls: process.env.REDIS_TLS === 'true' || process.env.NODE_ENV === 'production',
    connectionName: 'attending-app',
    retryDelayMs: 1000,
    maxRetries: 10,
  };
}

// ============================================================
// CLIENT CREATION
// ============================================================

/**
 * Create and connect Redis client
 */
export async function createRedisClient(
  config?: Partial<RedisConfig>
): Promise<RedisClientType> {
  const finalConfig = { ...getRedisConfig(), ...config };

  // Build connection URL
  let url = finalConfig.url;
  if (!url) {
    const protocol = finalConfig.tls ? 'rediss' : 'redis';
    const auth = finalConfig.password ? `:${finalConfig.password}@` : '';
    url = `${protocol}://${auth}${finalConfig.host}:${finalConfig.port}/${finalConfig.database}`;
  }

  const client = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > (finalConfig.maxRetries || 10)) {
          console.error('[Redis] Max retries exceeded, giving up');
          return new Error('Max retries exceeded');
        }
        const delay = Math.min(
          (finalConfig.retryDelayMs || 1000) * Math.pow(2, retries),
          30000
        );
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
      connectTimeout: 10000,
    },
    name: finalConfig.connectionName,
  });

  // Event handlers
  client.on('error', (err) => {
    console.error('[Redis] Client error:', err.message);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    console.log('[Redis] Ready to accept commands');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  client.on('end', () => {
    console.log('[Redis] Connection closed');
  });

  await client.connect();

  return client as RedisClientType;
}

/**
 * Get or create singleton Redis client
 */
export async function getRedisClient(): Promise<RedisClientType> {
  // Return existing connected client
  if (redisClient?.isReady) {
    return redisClient;
  }

  // Wait for existing connection attempt
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = createRedisClient()
    .then((client) => {
      redisClient = client;
      isConnecting = false;

      // Register with security module for rate limiting
      setSecurityRedisClient({
        incr: async (key: string) => {
          const result = await client.incr(key);
          return result;
        },
        expire: async (key: string, seconds: number) => {
          await client.expire(key, seconds);
        },
        ttl: async (key: string) => {
          return await client.ttl(key);
        },
      });

      return client;
    })
    .catch((error) => {
      isConnecting = false;
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

/**
 * Initialize Redis client on app startup
 */
export async function initializeRedis(): Promise<void> {
  try {
    // Skip if no Redis URL configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      console.warn('[Redis] No Redis configuration found, using in-memory fallback');
      return;
    }

    await getRedisClient();
    console.log('[Redis] Initialized successfully');
  } catch (error) {
    console.error('[Redis] Initialization failed:', error);
    // Don't throw - allow app to continue with fallback
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * Check Redis health status
 */
export async function checkRedisHealth(): Promise<RedisHealthStatus> {
  const lastCheck = new Date();

  try {
    const client = await getRedisClient();
    
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      latencyMs,
      lastCheck,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck,
    };
  }
}

// ============================================================
// RATE LIMITING HELPERS
// ============================================================

/**
 * Increment and get count for rate limiting
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<{ count: number; ttl: number }> {
  const client = await getRedisClient();
  
  const multi = client.multi();
  multi.incr(key);
  multi.ttl(key);
  
  const results = await multi.exec();
  const count = results[0] as number;
  let ttl = results[1] as number;
  
  // Set expiry if new key
  if (ttl === -1) {
    await client.expire(key, windowSeconds);
    ttl = windowSeconds;
  }
  
  return { count, ttl };
}

/**
 * Check if rate limit is exceeded
 */
export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
  const { count, ttl } = await incrementRateLimit(key, windowSeconds);
  
  return {
    limited: count > maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetIn: ttl,
  };
}

// ============================================================
// CACHE HELPERS
// ============================================================

/**
 * Get cached value
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Set cached value with expiry
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('[Redis] Cache set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('[Redis] Cache delete error:', error);
  }
}

/**
 * Delete cached values by pattern
 */
export async function deleteCachedByPattern(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) return 0;
    
    return await client.del(keys);
  } catch (error) {
    console.error('[Redis] Cache delete by pattern error:', error);
    return 0;
  }
}

// ============================================================
// SESSION HELPERS
// ============================================================

const SESSION_PREFIX = 'session:';

/**
 * Store session data
 */
export async function storeSession(
  sessionId: string,
  data: Record<string, unknown>,
  ttlSeconds: number = 28800 // 8 hours (clinical shift)
): Promise<void> {
  await setCached(`${SESSION_PREFIX}${sessionId}`, data, ttlSeconds);
}

/**
 * Get session data
 */
export async function getSession(
  sessionId: string
): Promise<Record<string, unknown> | null> {
  return getCached(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteCached(`${SESSION_PREFIX}${sessionId}`);
}

/**
 * Extend session TTL
 */
export async function extendSession(
  sessionId: string,
  ttlSeconds: number = 28800
): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.expire(`${SESSION_PREFIX}${sessionId}`, ttlSeconds);
  } catch (error) {
    console.error('[Redis] Session extend error:', error);
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  createRedisClient,
  getRedisClient,
  initializeRedis,
  closeRedis,
  checkRedisHealth,
  incrementRateLimit,
  isRateLimited,
  getCached,
  setCached,
  deleteCached,
  deleteCachedByPattern,
  storeSession,
  getSession,
  deleteSession,
  extendSession,
};
