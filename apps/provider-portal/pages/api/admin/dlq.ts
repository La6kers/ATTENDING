// ============================================================
// ATTENDING AI - Dead Letter Queue Admin Endpoint
// GET    /api/admin/dlq               → List entries + stats
// POST   /api/admin/dlq?action=replay → Replay a message
// POST   /api/admin/dlq?action=discard → Discard a message
// DELETE /api/admin/dlq               → Purge old entries
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { dlq } from '@attending/shared/lib/integrations/deadLetterQueue';

export default createHandler({
  methods: ['GET', 'POST', 'DELETE'],
  auth: 'admin',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        const type = req.query.type as string;
        const status = req.query.status as string;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const [entries, stats] = await Promise.all([
          dlq.list({ type: type as any, status: status as any, organizationId: ctx.user?.organizationId, limit, offset }),
          dlq.getStats(ctx.user?.organizationId),
        ]);
        ctx.success({ ...entries, stats });
        break;
      }

      case 'POST': {
        const action = req.query.action as string;
        const { entryId, reason, type } = req.body || {};

        switch (action) {
          case 'replay': {
            if (!entryId) { ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing entryId'); return; }
            const result = await dlq.replay(entryId);
            ctx.success(result);
            break;
          }
          case 'discard': {
            if (!entryId) { ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing entryId'); return; }
            await dlq.discard(entryId, reason);
            ctx.success({ discarded: true });
            break;
          }
          case 'replayAll': {
            const result = await dlq.replayAll(type as any);
            ctx.success(result);
            break;
          }
          default:
            ctx.error(400, 'VALIDATION_ERROR' as any, 'action must be: replay, discard, or replayAll');
        }
        break;
      }

      case 'DELETE': {
        const days = parseInt(req.query.days as string) || 30;
        const purged = await dlq.purge(days);
        ctx.success({ purged, olderThanDays: days });
        break;
      }
    }
  },
});
