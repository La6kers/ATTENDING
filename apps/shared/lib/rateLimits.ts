// ============================================================
// ATTENDING AI - Per-Route Rate Limiting Configuration
// apps/shared/lib/rateLimits.ts
//
// Defines tiered rate limits for different API route categories.
// Clinical safety routes (emergency, red flags) get high limits;
// auth and write routes get strict limits to prevent abuse.
//
// Uses the rateLimit() function from security.ts which auto-selects
// Redis (production) or memory (development) backing store.
//
// Usage in API routes:
//
//   import { withRateLimit } from '@attending/shared/lib/rateLimits';
//
//   export default withRateLimit('auth',
//     requireAuth(async (req, res, session) => { ... })
//   );
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit, getClientIdentifier, type RateLimitConfig } from './security/security';

// ============================================================
// ROUTE TIER DEFINITIONS
// ============================================================

/**
 * Rate limit tiers mapped to route categories.
 *
 * Tier philosophy:
 * - Clinical safety routes: never rate-limited so aggressively that
 *   a provider can't access critical patient info
 * - Auth routes: strict to prevent brute-force attacks
 * - Write routes: moderate to prevent data flooding
 * - Read routes: generous for clinical workflow efficiency
 */
export const RATE_LIMIT_TIERS = {
  /** Authentication endpoints: login, MFA, password reset */
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // 10 attempts per 15min
    keyPrefix: 'rl:auth',
  },

  /** Read-only data retrieval: patients, labs, encounters */
  read: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 120,           // 120 reads/min (2/sec)
    keyPrefix: 'rl:read',
  },

  /** Data creation/mutation: orders, prescriptions, notes */
  write: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,            // 30 writes/min
    keyPrefix: 'rl:write',
  },

  /** AI/ML inference: differential diagnosis, recommendations */
  ai: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 20,            // 20 AI calls/min
    keyPrefix: 'rl:ai',
  },

  /** Emergency & red flag routes: high limit, must not block */
  emergency: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 300,           // 300/min — effectively unthrottled
    keyPrefix: 'rl:emergency',
  },

  /** FHIR integration: external service calls */
  fhir: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,            // 30 FHIR calls/min
    keyPrefix: 'rl:fhir',
  },

  /** Admin endpoints: settings, user management */
  admin: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,            // 60/min
    keyPrefix: 'rl:admin',
  },

  /** WebSocket/real-time: high throughput */
  realtime: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 300,           // 300/min
    keyPrefix: 'rl:rt',
  },

  /** Default: moderate catch-all */
  default: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 60,            // 60/min
    keyPrefix: 'rl:default',
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

// ============================================================
// AUTO-DETECTION: Map path patterns → tiers
// ============================================================

const ROUTE_TIER_PATTERNS: [RegExp, RateLimitTier][] = [
  // Auth
  [/^\/api\/auth/, 'auth'],
  [/^\/api\/security/, 'auth'],
  [/^\/api\/csrf/, 'auth'],

  // Emergency (must be before general /api/ catch)
  [/^\/api\/alerts/, 'emergency'],
  [/^\/api\/emergency/, 'emergency'],

  // AI/ML
  [/^\/api\/ai\//, 'ai'],
  [/^\/api\/clinical\/differential/, 'ai'],
  [/^\/api\/clinical\/red-flags/, 'emergency'],
  [/^\/api\/predictive/, 'ai'],
  [/^\/api\/scribe/, 'ai'],
  [/^\/api\/ambient/, 'ai'],

  // FHIR
  [/^\/api\/fhir\//, 'fhir'],

  // Admin
  [/^\/api\/admin\//, 'admin'],
  [/^\/api\/quality\//, 'admin'],

  // Writes (POST-heavy routes)
  [/^\/api\/prescriptions/, 'write'],
  [/^\/api\/labs/, 'write'],
  [/^\/api\/imaging/, 'write'],
  [/^\/api\/referrals/, 'write'],
  [/^\/api\/treatment-plans/, 'write'],
  [/^\/api\/interventions/, 'write'],

  // Reads
  [/^\/api\/patients/, 'read'],
  [/^\/api\/appointments/, 'read'],
  [/^\/api\/notifications/, 'read'],
  [/^\/api\/metrics/, 'read'],
];

/**
 * Auto-detect rate limit tier from request path.
 */
export function detectTier(pathname: string): RateLimitTier {
  for (const [pattern, tier] of ROUTE_TIER_PATTERNS) {
    if (pattern.test(pathname)) return tier;
  }
  return 'default';
}

// ============================================================
// MIDDLEWARE WRAPPER
// ============================================================

/**
 * Wrap an API handler with per-route rate limiting.
 *
 * @param tier - Rate limit tier name, or 'auto' to detect from path
 * @param handler - The API handler to wrap
 *
 * @example
 * // Explicit tier
 * export default withRateLimit('auth', handler);
 *
 * // Auto-detect from path
 * export default withRateLimit('auto', handler);
 */
export function withRateLimit(
  tier: RateLimitTier | 'auto',
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const effectiveTier = tier === 'auto'
      ? detectTier(req.url || '')
      : tier;

    const config = RATE_LIMIT_TIERS[effectiveTier];
    const key = getClientIdentifier(req);
    const result = await rateLimit(key, config);

    // Always set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    res.setHeader('X-RateLimit-Tier', effectiveTier);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 60);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
          tier: effectiveTier,
        },
        meta: {
          timestamp: new Date().toISOString(),
          apiVersion: '1.0.0',
        },
      });
    }

    return handler(req, res);
  };
}

export default { RATE_LIMIT_TIERS, detectTier, withRateLimit };
