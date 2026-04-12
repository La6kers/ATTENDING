// ============================================================
// ATTENDING AI - PHI Cache Admin API
// apps/provider-portal/pages/api/admin/phi-cache.ts
//
// Admin endpoints for managing the PHI cache timeout system.
// Allows viewing cache status, invalidating entries, and
// configuring TTL settings.
//
// Endpoints:
//   GET  /api/admin/phi-cache                → Global stats
//   GET  /api/admin/phi-cache?patientId=X    → Patient cache status
//   POST /api/admin/phi-cache/invalidate     → Invalidate entries
//   GET  /api/admin/phi-cache/config         → View TTL config
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHandler } from '@attending/shared/lib/api/handler';
import { phiCache } from '@attending/shared/lib/phiCache';
import type { PHIDataCategory } from '@attending/shared/lib/phiCache';

export default createHandler({
  methods: ['GET', 'POST', 'DELETE'],
  auth: 'admin',
  rateLimit: 'read',
  audit: 'ADMIN_PHI_CACHE_ACCESS' as any,

  handler: async (req, ctx) => {
    const { method } = req;

    // ---- GET: Stats or patient-specific status ----
    if (method === 'GET') {
      const { patientId, view } = req.query;

      // GET /api/admin/phi-cache?view=config — show TTL configuration
      if (view === 'config') {
        const config = phiCache.getConfig();
        return ctx.success({
          defaultTTLSeconds: config.defaultTTLSeconds,
          categoryTTL: config.categoryTTL,
          encryptAtRest: config.encryptAtRest,
          maxEntriesPerPatient: config.maxEntriesPerPatient,
          stalenessWarningSeconds: config.stalenessWarningSeconds,
          defaultTTLFormatted: formatDuration(config.defaultTTLSeconds),
          categoryTTLFormatted: Object.fromEntries(
            Object.entries(config.categoryTTL).map(([k, v]) => [k, formatDuration(v as number)])
          ),
        });
      }

      // GET /api/admin/phi-cache?patientId=X — patient-specific status
      if (typeof patientId === 'string' && patientId) {
        const status = await phiCache.getPatientCacheStatus(patientId);
        return ctx.success({
          ...status,
          entries: status.entries.map((e) => ({
            ...e,
            ageFormatted: formatDuration(e.ageSeconds),
            ttlRemainingFormatted: formatDuration(e.ttlRemainingSeconds),
          })),
        });
      }

      // GET /api/admin/phi-cache — global stats
      const stats = await phiCache.getStats();
      return ctx.success({
        ...stats,
        hitRateFormatted: `${(stats.hitRate * 100).toFixed(1)}%`,
        missRateFormatted: `${(stats.missRate * 100).toFixed(1)}%`,
        averageTTLRemainingFormatted: formatDuration(stats.averageTTLRemainingSeconds),
      });
    }

    // ---- POST: Invalidate cache entries ----
    if (method === 'POST') {
      const { action, patientId, category, organizationId, reason } = req.body || {};

      const accessContext = {
        userId: ctx.user?.id || 'admin',
        organizationId: ctx.user?.organizationId,
        ipAddress: ctx.ip,
        reason: reason || 'admin_action',
      };

      if (action === 'invalidate_patient' && patientId) {
        if (category) {
          // Invalidate specific category
          const existed = await phiCache.invalidate(
            patientId,
            category as PHIDataCategory,
            accessContext,
            reason || 'admin_invalidation',
          );
          return ctx.success({
            action: 'invalidated',
            patientId,
            category,
            existed,
          });
        } else {
          // Invalidate ALL data for patient
          const count = await phiCache.invalidateAllForPatient(
            patientId,
            accessContext,
            reason || 'admin_purge',
          );
          return ctx.success({
            action: 'purged',
            patientId,
            entriesEvicted: count,
          });
        }
      }

      if (action === 'invalidate_organization' && organizationId) {
        const count = await phiCache.invalidateAllForOrganization(
          organizationId,
          accessContext,
          reason || 'admin_org_purge',
        );
        return ctx.success({
          action: 'purged_organization',
          organizationId,
          entriesEvicted: count,
        });
      }

      return ctx.error(400, 'VALIDATION_ERROR' as any, 'Invalid action. Use: invalidate_patient, invalidate_organization');
    }

    // ---- DELETE: Shortcut for patient invalidation ----
    if (method === 'DELETE') {
      const patientId = req.query.patientId as string;
      if (!patientId) {
        return ctx.error(400, 'VALIDATION_ERROR' as any, 'patientId query parameter required');
      }

      const count = await phiCache.invalidateAllForPatient(
        patientId,
        {
          userId: ctx.user?.id || 'admin',
          organizationId: ctx.user?.organizationId,
          ipAddress: ctx.ip,
          reason: 'admin_delete',
        },
        'admin_delete',
      );

      return ctx.success({ action: 'purged', patientId, entriesEvicted: count });
    }
  },
});

// ============================================================
// HELPERS
// ============================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}
