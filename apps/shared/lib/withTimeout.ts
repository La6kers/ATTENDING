// ============================================================
// ATTENDING AI - Request Timeout Middleware
// apps/shared/lib/withTimeout.ts
//
// Prevents hung requests from consuming server resources.
// Different timeout tiers for different operation types:
//   - Fast reads: 5s
//   - Standard writes: 15s
//   - AI inference: 30s
//   - FHIR/external: 45s
//
// Clinical safety: Emergency routes get extended timeouts
// to ensure critical data is never lost due to timeouts.
//
// Usage:
//   import { withTimeout } from '@attending/shared/lib/withTimeout';
//   export default withTimeout(30_000, handler);
//   export default withTimeout('ai', handler); // Named tier
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// ============================================================
// TIMEOUT TIERS
// ============================================================

export const TIMEOUT_TIERS = {
  /** Fast reads: patient list, vitals, etc. */
  fast: 5_000,
  /** Standard CRUD operations */
  standard: 15_000,
  /** AI inference: differential, risk scoring */
  ai: 30_000,
  /** External service calls: FHIR, drug interaction APIs */
  external: 45_000,
  /** Emergency routes: never time out prematurely */
  emergency: 120_000,
  /** File uploads, batch operations */
  long: 60_000,
} as const;

export type TimeoutTier = keyof typeof TIMEOUT_TIERS;

// ============================================================
// AUTO-DETECTION
// ============================================================

const TIER_PATTERNS: [RegExp, TimeoutTier][] = [
  [/^\/api\/ai\//, 'ai'],
  [/^\/api\/scribe\//, 'ai'],
  [/^\/api\/ambient\//, 'ai'],
  [/^\/api\/clinical\/differential/, 'ai'],
  [/^\/api\/predictive\//, 'ai'],
  [/^\/api\/fhir\//, 'external'],
  [/^\/api\/clinical\/drug-check/, 'external'],
  [/^\/api\/alerts\//, 'emergency'],
  [/^\/api\/emergency\//, 'emergency'],
  [/^\/api\/clinical\/red-flags/, 'emergency'],
  [/^\/api\/upload/, 'long'],
  [/^\/api\/export/, 'long'],
];

function detectTimeoutTier(pathname: string): TimeoutTier {
  for (const [pattern, tier] of TIER_PATTERNS) {
    if (pattern.test(pathname)) return tier;
  }
  return 'standard';
}

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Wrap an API handler with a timeout.
 *
 * @param timeoutOrTier - Timeout in ms, a named tier, or 'auto'
 * @param handler - The API route handler
 *
 * @example
 * export default withTimeout('ai', handler);
 * export default withTimeout(30_000, handler);
 * export default withTimeout('auto', handler);
 */
export function withTimeout(
  timeoutOrTier: number | TimeoutTier | 'auto',
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let timeoutMs: number;

    if (typeof timeoutOrTier === 'number') {
      timeoutMs = timeoutOrTier;
    } else if (timeoutOrTier === 'auto') {
      timeoutMs = TIMEOUT_TIERS[detectTimeoutTier(req.url || '')];
    } else {
      timeoutMs = TIMEOUT_TIERS[timeoutOrTier];
    }

    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out. Please try again.',
            timeoutMs,
          },
          meta: {
            timestamp: new Date().toISOString(),
            apiVersion: '1.0.0',
          },
        });
      }
    }, timeoutMs);

    try {
      await handler(req, res);
    } catch (error) {
      if (!timedOut && !res.headersSent) {
        throw error; // Let outer error handler deal with it
      }
    } finally {
      clearTimeout(timer);
    }
  };
}

export default { withTimeout, TIMEOUT_TIERS, detectTimeoutTier };
