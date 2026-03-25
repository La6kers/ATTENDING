// =============================================================================
// COMPASS Admin - Webhook CRUD API
// apps/compass-admin/pages/api/webhooks/index.ts
//
// Same functionality as patient-portal webhook API.
// Shares Prisma client and WebhookConfig/WebhookDelivery models.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    try {
      const webhooks = await prisma.webhookConfig.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { deliveries: true } } },
      });
      const sanitized = webhooks.map((wh) => ({
        ...wh,
        secret: '••••••••' + wh.secret.slice(-4),
        deliveryCount: (wh as any)._count?.deliveries || 0,
      }));
      return res.status(200).json({ webhooks: sanitized });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to list webhooks' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, url, format = 'json', events = ['assessment.completed'], headers } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
      if (!url?.trim()) return res.status(400).json({ error: 'URL is required' });
      if (!url.startsWith('https://')) return res.status(400).json({ error: 'URL must use HTTPS' });

      const secret = crypto.randomBytes(32).toString('hex');
      const webhook = await prisma.webhookConfig.create({
        data: {
          name: name.trim(),
          url: url.trim(),
          secret,
          format,
          events: JSON.stringify(events),
          headers: headers ? JSON.stringify(headers) : null,
          isActive: true,
        },
      });

      return res.status(201).json({
        webhook: { ...webhook, events },
        signingSecret: secret,
        message: 'Save the signing secret — it will not be shown again.',
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create webhook' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
