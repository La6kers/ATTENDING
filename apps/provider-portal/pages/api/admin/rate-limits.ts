// ============================================================
// ATTENDING AI - Rate Limit & Quota Dashboard
// apps/provider-portal/pages/api/admin/rate-limits.ts
//
// GET /api/admin/rate-limits → Usage stats per key/user/endpoint
// POST /api/admin/rate-limits → Override limits for specific keys
//
// Admin-only endpoint.
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { RATE_LIMIT_TIERS } from '@attending/shared/lib/rateLimits';

export default createHandler({
  methods: ['GET', 'POST'],
  auth: 'admin',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        // Return rate limit tier configuration + usage stats
        const tiers = Object.entries(RATE_LIMIT_TIERS).map(([name, config]) => ({
          name,
          windowMs: config.windowMs,
          maxRequests: config.maxRequests,
          windowHuman: formatWindow(config.windowMs),
        }));

        // Try to get live usage from Redis
        let liveUsage: any[] = [];
        try {
          const { redis } = await import('@attending/shared/lib/redis');
          if (redis) {
            const keys = await redis.keys('rl:*');
            const usage: any[] = [];

            for (const key of keys.slice(0, 100)) { // Cap at 100 entries
              const remaining = await redis.get(key);
              const ttl = await redis.ttl(key);
              const parts = key.replace('rl:', '').split(':');
              usage.push({
                key: key.replace('rl:', ''),
                tier: parts[0] || 'unknown',
                identifier: parts.slice(1).join(':'),
                requestsUsed: remaining ? parseInt(remaining) : 0,
                ttlSeconds: ttl,
                resetAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null,
              });
            }

            liveUsage = usage.sort((a, b) => b.requestsUsed - a.requestsUsed);
          }
        } catch { /* Redis not available */ }

        ctx.success({
          tiers,
          liveUsage,
          totalTrackedKeys: liveUsage.length,
          topConsumers: liveUsage.slice(0, 10),
        });
        break;
      }

      case 'POST': {
        // Override rate limit for a specific API key
        const { apiKeyId, maxRequests, windowMs, reason } = req.body;

        if (!apiKeyId || !maxRequests) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Required: apiKeyId, maxRequests');
          return;
        }

        try {
          const { prisma } = await import('@attending/shared/lib/prisma');
          await prisma.apiKey.update({
            where: { id: apiKeyId },
            data: { rateLimit: maxRequests },
          });

          ctx.log.info('Rate limit override', { apiKeyId, maxRequests, reason });
          ctx.success({ apiKeyId, maxRequests, updated: true });
        } catch (err) {
          ctx.error(500, 'INTERNAL_ERROR' as any, 'Failed to update rate limit');
        }
        break;
      }
    }
  },
});

function formatWindow(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  if (ms < 3_600_000) return `${ms / 60_000}min`;
  return `${ms / 3_600_000}h`;
}
