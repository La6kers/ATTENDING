// ============================================================
// ATTENDING AI - Billing & Usage Admin Endpoint
// apps/provider-portal/pages/api/admin/billing.ts
//
// GET  /api/admin/billing              → Usage summary for org
// GET  /api/admin/billing?view=trends  → 6-month usage trends
// GET  /api/admin/billing?view=platform → Platform-wide stats
// POST /api/admin/billing              → Record manual usage event
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { meter } from '@attending/shared/lib/billing';

export default createHandler({
  methods: ['GET', 'POST'],
  auth: 'admin',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        const view = req.query.view as string;
        const orgId = (req.query.organizationId as string) || ctx.user?.organizationId;
        const period = req.query.period as string;

        switch (view) {
          case 'trends': {
            const months = parseInt(req.query.months as string) || 6;
            const trends = await meter.getTrends(orgId || undefined, months);
            ctx.success({ organizationId: orgId, months, trends });
            break;
          }
          case 'platform': {
            const stats = await meter.getPlatformStats();
            ctx.success(stats);
            break;
          }
          default: {
            if (!orgId) { ctx.error(400, 'VALIDATION_ERROR' as any, 'organizationId required'); return; }
            const usage = await meter.getUsage(orgId, period);
            ctx.success(usage);
          }
        }
        break;
      }

      case 'POST': {
        const { organizationId, event, count } = req.body;
        const orgId = organizationId || ctx.user?.organizationId;
        if (!orgId || !event) { ctx.error(400, 'VALIDATION_ERROR' as any, 'organizationId and event required'); return; }

        for (let i = 0; i < (count || 1); i++) {
          await meter.record(orgId, event);
        }
        ctx.success({ recorded: true, organizationId: orgId, event, count: count || 1 });
        break;
      }
    }
  },
});
