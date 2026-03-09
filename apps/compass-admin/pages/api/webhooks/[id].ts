// =============================================================================
// COMPASS Admin - Individual Webhook API
// apps/compass-admin/pages/api/webhooks/[id].ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req });
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid ID' });

  if (req.method === 'GET') {
    try {
      const webhook = await prisma.webhookConfig.findUnique({
        where: { id },
        include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 25 } },
      });
      if (!webhook) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({
        webhook: {
          ...webhook,
          secret: '••••••••' + webhook.secret.slice(-4),
          events: JSON.parse(webhook.events),
          headers: webhook.headers ? JSON.parse(webhook.headers) : null,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get webhook' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const existing = await prisma.webhookConfig.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const { name, url, format, events, headers, isActive } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name.trim();
      if (url !== undefined) {
        if (!url.startsWith('https://')) return res.status(400).json({ error: 'URL must use HTTPS' });
        data.url = url.trim();
      }
      if (format !== undefined) data.format = format;
      if (events !== undefined) data.events = JSON.stringify(events);
      if (headers !== undefined) data.headers = headers ? JSON.stringify(headers) : null;
      if (isActive === true && existing.disabledAt) {
        data.isActive = true; data.disabledAt = null; data.disabledReason = null; data.consecutiveFailures = 0;
      } else if (isActive !== undefined) {
        data.isActive = isActive;
      }

      const updated = await prisma.webhookConfig.update({ where: { id }, data });
      return res.status(200).json({
        webhook: { ...updated, secret: '••••••••' + updated.secret.slice(-4), events: JSON.parse(updated.events) },
      });
    } catch (error) {
      return res.status(500).json({ error: 'Update failed' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.webhookDelivery.deleteMany({ where: { webhookId: id } });
      await prisma.webhookConfig.delete({ where: { id } });
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Delete failed' });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
