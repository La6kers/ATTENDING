// ============================================================
// ATTENDING AI - Webhook Subscription Management
// apps/provider-portal/pages/api/admin/webhooks.ts
//
// POST   /api/admin/webhooks          → Create subscription
// GET    /api/admin/webhooks          → List subscriptions
// DELETE /api/admin/webhooks?id=xxx   → Delete subscription
// PATCH  /api/admin/webhooks?id=xxx   → Enable/disable
//
// Admin-only endpoint.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createHandler } from '@attending/shared/lib/api/handler';
import { CLINICAL_EVENTS } from '@attending/shared/lib/integrations/events';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().refine(
    (url) => process.env.NODE_ENV !== 'production' || url.startsWith('https://'),
    { message: 'Webhook URL must use HTTPS in production' }
  ),
  events: z.array(z.string()).min(1),
});

const PatchWebhookSchema = z.object({
  isActive: z.boolean().optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
});

export default createHandler({
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();
    const orgId = ctx.user!.organizationId || 'default';

    switch (req.method) {
      case 'GET': {
        const subscriptions = await prisma.webhookSubscription.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            url: true,
            events: true,
            isActive: true,
            failureCount: true,
            disabledAt: true,
            disabledReason: true,
            lastDeliveryAt: true,
            lastStatusCode: true,
            createdAt: true,
            _count: { select: { deliveries: true } },
          },
        });

        ctx.success(subscriptions.map((s: any) => ({
          ...s,
          events: typeof s.events === 'string' ? JSON.parse(s.events) : s.events,
          totalDeliveries: s._count.deliveries,
        })));
        break;
      }

      case 'POST': {
        const body = CreateWebhookSchema.parse(req.body);

        // Generate signing secret
        const secret = randomBytes(32).toString('hex');

        const subscription = await prisma.webhookSubscription.create({
          data: {
            name: body.name,
            url: body.url,
            secret,
            organizationId: orgId,
            events: JSON.stringify(body.events),
            createdBy: ctx.user!.id,
          },
        });

        ctx.log.info('Webhook subscription created', { subId: subscription.id, name: body.name });

        ctx.success(201, {
          id: subscription.id,
          name: body.name,
          url: body.url,
          events: body.events,
          secret, // ⚠️ Only returned at creation time
          message: 'Store the signing secret securely — it cannot be retrieved again.',
          availableEvents: Object.keys(CLINICAL_EVENTS),
        });
        break;
      }

      case 'PATCH': {
        const subId = req.query.id as string;
        if (!subId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing subscription ID');
          return;
        }

        const body = PatchWebhookSchema.parse(req.body);
        const updateData: any = {};
        if (body.isActive !== undefined) {
          updateData.isActive = body.isActive;
          if (body.isActive) {
            updateData.disabledAt = null;
            updateData.disabledReason = null;
            updateData.failureCount = 0;
          }
        }
        if (body.url) updateData.url = body.url;
        if (body.events) updateData.events = JSON.stringify(body.events);

        await prisma.webhookSubscription.update({
          where: { id: subId },
          data: updateData,
        });

        ctx.success({ id: subId, updated: true });
        break;
      }

      case 'DELETE': {
        const subId = req.query.id as string;
        if (!subId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing subscription ID');
          return;
        }

        await prisma.webhookSubscription.delete({ where: { id: subId } });
        ctx.log.info('Webhook subscription deleted', { subId });
        ctx.success({ id: subId, deleted: true });
        break;
      }
    }
  },
});
