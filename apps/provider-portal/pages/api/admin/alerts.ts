// ============================================================
// ATTENDING AI - Alerting Admin Endpoint
// apps/provider-portal/pages/api/admin/alerts.ts
//
// GET  /api/admin/alerts           → Active alerts + history
// POST /api/admin/alerts?action=evaluate → Force evaluation
// POST /api/admin/alerts?action=ack     → Acknowledge alert
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { alertEngine } from '@attending/shared/lib/alerting';

export default createHandler({
  methods: ['GET', 'POST'],
  auth: 'admin',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        const activeAlerts = alertEngine.getActiveAlerts();
        const history = alertEngine.getHistory(parseInt(req.query.limit as string) || 50);
        const rules = alertEngine.getRules();

        ctx.success({
          active: activeAlerts,
          activeCount: activeAlerts.length,
          criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
          history,
          rules: rules.map(r => ({
            id: r.id,
            name: r.name,
            severity: r.severity,
            enabled: r.enabled,
            isActive: r.isActive,
            channels: r.channels,
            tags: r.tags,
          })),
        });
        break;
      }

      case 'POST': {
        const action = req.query.action as string;

        switch (action) {
          case 'evaluate': {
            const result = await alertEngine.evaluate();
            ctx.success({ evaluated: true, ...result });
            break;
          }
          case 'ack':
          case 'acknowledge': {
            const { ruleId } = req.body;
            if (!ruleId) { ctx.error(400, 'VALIDATION_ERROR' as any, 'ruleId required'); return; }
            const success = alertEngine.acknowledge(ruleId, ctx.user?.id || 'unknown');
            ctx.success({ acknowledged: success, ruleId });
            break;
          }
          default:
            ctx.error(400, 'VALIDATION_ERROR' as any, 'action must be: evaluate or ack');
        }
        break;
      }
    }
  },
});
