// ============================================================
// ATTENDING AI - Data Retention Admin Endpoint
// apps/provider-portal/pages/api/admin/retention.ts
//
// GET  /api/admin/retention          → View policies + last report
// POST /api/admin/retention          → Run retention policies (dry-run supported)
//
// Admin-only endpoint.
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { retentionEngine } from '@attending/shared/lib/retention';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

export default createHandler({
  methods: ['GET', 'POST'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        const policies = retentionEngine.getPolicies().map(p => ({
          tier: p.tier,
          retentionDays: p.retentionDays,
          models: p.models,
          action: p.action,
          description: p.description,
        }));

        ctx.success({ policies });
        break;
      }

      case 'POST': {
        const prisma = await getPrisma();
        const dryRun = req.body?.dryRun !== false; // Default to dry-run for safety

        ctx.log.info('Retention policies executing', { dryRun, by: ctx.user?.id });

        const report = await retentionEngine.runPolicies(prisma, {
          dryRun,
          verbose: true,
        });

        ctx.success({
          ...report,
          dryRun,
          message: dryRun
            ? 'Dry run complete — no records were modified'
            : `Retention executed: ${report.totalRecordsProcessed} records processed`,
        });
        break;
      }
    }
  },
});
