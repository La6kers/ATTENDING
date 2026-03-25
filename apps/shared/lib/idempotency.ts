// ============================================================
// ATTENDING AI - Idempotency Middleware
// apps/shared/lib/idempotency.ts
//
// Prevents duplicate processing when external systems retry
// requests. Critical for:
//   - HL7v2 message re-delivery
//   - Webhook retries
//   - Network timeouts causing client retries
//   - Payment/order double-submission
//
// How it works:
//   1. Client sends Idempotency-Key header (UUID)
//   2. Middleware checks Redis for a previous response
//   3. If found → return cached response (no re-execution)
//   4. If not → execute handler, cache response, return
//
// Storage: Redis with configurable TTL (default 24h)
// Scope: Per-API-key or per-user + path
//
// Usage in unified handler:
//   export default createHandler({
//     methods: ['POST'],
//     idempotent: true,       // Enable idempotency
//     idempotencyTtl: 86400,  // 24h (default)
//     handler: async (req, ctx) => { ... }
//   });
//
// Or standalone:
//   import { withIdempotency } from '@attending/shared/lib/idempotency';
//   export default withIdempotency(handler, { ttl: 3600 });
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export interface IdempotencyConfig {
  /** TTL in seconds for cached responses (default: 86400 = 24h) */
  ttl?: number;
  /** Header name for the idempotency key (default: 'Idempotency-Key') */
  headerName?: string;
  /** Whether the key is required (default: false — recommended, not enforced) */
  required?: boolean;
  /** Custom key generator (default: user/apikey + path + idempotency header) */
  keyGenerator?: (req: NextApiRequest) => string | null;
}

export interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  createdAt: string;
}

const DEFAULT_TTL = 86400; // 24 hours
const DEFAULT_HEADER = 'Idempotency-Key';
const REDIS_PREFIX = 'idempotency:';
const LOCK_SUFFIX = ':lock';
const LOCK_TTL = 30; // 30 second lock to prevent concurrent execution

// ============================================================
// REDIS OPERATIONS (with graceful fallback)
// ============================================================

let redisClient: any = null;

async function getRedis(): Promise<any> {
  if (redisClient) return redisClient;
  try {
    const { redis } = await import('./redis');
    redisClient = redis;
    return redis;
  } catch {
    return null;
  }
}

async function getCachedResponse(key: string): Promise<CachedResponse | null> {
  const redis = await getRedis();
  if (!redis) return null;

  try {
    const cached = await redis.get(`${REDIS_PREFIX}${key}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

async function setCachedResponse(
  key: string,
  response: CachedResponse,
  ttl: number
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.set(
      `${REDIS_PREFIX}${key}`,
      JSON.stringify(response),
      'EX',
      ttl
    );
  } catch (err) {
    logger.warn('[Idempotency] Failed to cache response', { key, error: String(err) });
  }
}

async function acquireLock(key: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return true; // No Redis = no locking, proceed

  try {
    const result = await redis.set(
      `${REDIS_PREFIX}${key}${LOCK_SUFFIX}`,
      '1',
      'EX',
      LOCK_TTL,
      'NX' // Only set if not exists
    );
    return result === 'OK';
  } catch {
    return true; // Fail open
  }
}

async function releaseLock(key: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(`${REDIS_PREFIX}${key}${LOCK_SUFFIX}`);
  } catch { /* non-critical */ }
}

// ============================================================
// KEY GENERATION
// ============================================================

function defaultKeyGenerator(req: NextApiRequest, headerName: string): string | null {
  const idempotencyKey = req.headers[headerName.toLowerCase()] as string;
  if (!idempotencyKey) return null;

  // Scope: API key or user session + path
  const apiKey = req.headers['x-api-key'] as string;
  const userId = req.headers['x-session-ref'] as string;
  const scope = apiKey
    ? `apikey:${apiKey.slice(0, 12)}`
    : `user:${userId || 'anonymous'}`;

  return `${scope}:${req.method}:${req.url?.split('?')[0]}:${idempotencyKey}`;
}

// ============================================================
// MIDDLEWARE WRAPPER
// ============================================================

/**
 * Wrap an API handler with idempotency protection.
 * Intercepts the response to cache it, and returns cached
 * responses on duplicate requests.
 */
export function withIdempotency(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  config: IdempotencyConfig = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const {
    ttl = DEFAULT_TTL,
    headerName = DEFAULT_HEADER,
    required = false,
    keyGenerator,
  } = config;

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    // Only applies to state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
      return handler(req, res);
    }

    // Generate idempotency key
    const key = keyGenerator
      ? keyGenerator(req)
      : defaultKeyGenerator(req, headerName);

    if (!key) {
      if (required) {
        res.status(400).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_REQUIRED',
            message: `${headerName} header is required for this endpoint`,
          },
        });
        return;
      }
      // No key provided and not required — execute normally
      return handler(req, res);
    }

    // Check for cached response
    const cached = await getCachedResponse(key);
    if (cached) {
      logger.info('[Idempotency] Returning cached response', { key: key.slice(-20) });

      // Set headers to indicate this is a cached response
      res.setHeader('X-Idempotency-Replayed', 'true');
      res.setHeader('X-Idempotency-Original-Date', cached.createdAt);

      // Replay cached headers
      for (const [name, value] of Object.entries(cached.headers)) {
        if (!['transfer-encoding', 'content-length'].includes(name.toLowerCase())) {
          res.setHeader(name, value);
        }
      }

      res.status(cached.statusCode).json(cached.body);
      return;
    }

    // Acquire lock to prevent concurrent execution
    const lockAcquired = await acquireLock(key);
    if (!lockAcquired) {
      // Another request with the same key is in progress
      res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A request with this idempotency key is already being processed',
        },
      });
      return;
    }

    try {
      // Intercept res.json to capture the response
      const originalJson = res.json.bind(res);
      let capturedBody: unknown;
      let capturedStatusCode: number;

      res.json = function (body: unknown) {
        capturedBody = body;
        capturedStatusCode = res.statusCode;

        // Cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cachedResponse: CachedResponse = {
            statusCode: res.statusCode,
            headers: {
              'content-type': res.getHeader('content-type') as string || 'application/json',
              'x-request-id': res.getHeader('x-request-id') as string || '',
            },
            body,
            createdAt: new Date().toISOString(),
          };

          // Fire-and-forget cache write
          setCachedResponse(key, cachedResponse, ttl).catch(() => {});
        }

        return originalJson(body);
      };

      await handler(req, res);

    } finally {
      await releaseLock(key);
    }
  };
}

// ============================================================
// CONVENIENCE: Idempotency key generator for clients
// ============================================================

/**
 * Generate an idempotency key.
 * Use on the client side to create unique request identifiers.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export default withIdempotency;
