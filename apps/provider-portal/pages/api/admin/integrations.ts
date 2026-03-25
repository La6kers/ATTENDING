// ============================================================
// ATTENDING AI - Integration Connections Management
// apps/provider-portal/pages/api/admin/integrations.ts
//
// POST   /api/admin/integrations          → Register connection
// GET    /api/admin/integrations          → List connections + health
// DELETE /api/admin/integrations?id=xxx   → Remove connection
// PATCH  /api/admin/integrations?id=xxx   → Update status
//
// Admin-only endpoint.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createHandler } from '@attending/shared/lib/api/handler';
import { IntegrationRegistry } from '@attending/shared/lib/integrations/registry';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['FHIR', 'HL7V2', 'WEBHOOK', 'SFTP', 'CUSTOM']),
  direction: z.enum(['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL']),
  config: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'DISABLED']),
});

export default createHandler({
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();
    const registry = new IntegrationRegistry(prisma);
    const orgId = ctx.user!.organizationId || 'default';

    switch (req.method) {
      case 'GET': {
        const connections = await registry.list(orgId);
        const health = await registry.getHealthSummary(orgId);

        ctx.success({
          connections,
          health,
        });
        break;
      }

      case 'POST': {
        const body = RegisterSchema.parse(req.body);

        const { id } = await registry.register({
          name: body.name,
          type: body.type,
          direction: body.direction,
          organizationId: orgId,
          config: body.config as any,
          metadata: body.metadata,
          createdBy: ctx.user!.id,
        });

        ctx.log.info('Integration registered', { connId: id, name: body.name, type: body.type });
        ctx.success(201, { id, name: body.name, type: body.type });
        break;
      }

      case 'PATCH': {
        const connId = req.query.id as string;
        if (!connId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing connection ID');
          return;
        }

        const body = UpdateStatusSchema.parse(req.body);
        await registry.updateStatus(connId, body.status);
        ctx.success({ id: connId, status: body.status });
        break;
      }

      case 'DELETE': {
        const connId = req.query.id as string;
        if (!connId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing connection ID');
          return;
        }

        await registry.remove(connId);
        ctx.log.info('Integration removed', { connId });
        ctx.success({ id: connId, deleted: true });
        break;
      }
    }
  },
});
