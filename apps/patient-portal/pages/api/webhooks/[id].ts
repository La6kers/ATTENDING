// =============================================================================
// COMPASS Webhook Individual Config API
// apps/patient-portal/pages/api/webhooks/[id].ts
//
// GET    /api/webhooks/:id  → Get webhook details + recent deliveries
// PUT    /api/webhooks/:id  → Update webhook config
// DELETE /api/webhooks/:id  → Delete webhook and delivery history
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid webhook ID' });
  }

  // ── GET: Webhook detail + recent deliveries ─────────────
  if (req.method === 'GET') {
    try {
      const webhook = await prisma.webhookConfig.findUnique({
        where: { id },
        include: {
          deliveries: {
            orderBy: { createdAt: 'desc' },
            take: 25,
          },
        },
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      return res.status(200).json({
        webhook: {
          ...webhook,
          secret: '••••••••' + webhook.secret.slice(-4),
          events: JSON.parse(webhook.events),
          headers: webhook.headers ? JSON.parse(webhook.headers) : null,
        },
      });
    } catch (error) {
      console.error('[WEBHOOKS API] Get error:', error);
      return res.status(500).json({ error: 'Failed to get webhook' });
    }
  }

  // ── PUT: Update webhook ─────────────────────────────────
  if (req.method === 'PUT') {
    try {
      const existing = await prisma.webhookConfig.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const { name, url, format, events, headers, isActive } = req.body;
      const updateData: any = {};

      if (name !== undefined) updateData.name = name.trim();
      if (url !== undefined) {
        if (!url.startsWith('https://')) {
          return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
        }
        updateData.url = url.trim();
      }
      if (format !== undefined) {
        const validFormats = ['json', 'fhir_r4', 'hl7v2'];
        if (!validFormats.includes(format)) {
          return res.status(400).json({ error: `Format must be one of: ${validFormats.join(', ')}` });
        }
        updateData.format = format;
      }
      if (events !== undefined) updateData.events = JSON.stringify(events);
      if (headers !== undefined) updateData.headers = headers ? JSON.stringify(headers) : null;

      // Re-enable a disabled webhook
      if (isActive === true && existing.disabledAt) {
        updateData.isActive = true;
        updateData.disabledAt = null;
        updateData.disabledReason = null;
        updateData.consecutiveFailures = 0;
      } else if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      const updated = await prisma.webhookConfig.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        webhook: {
          ...updated,
          secret: '••••••••' + updated.secret.slice(-4),
          events: JSON.parse(updated.events),
        },
      });
    } catch (error) {
      console.error('[WEBHOOKS API] Update error:', error);
      return res.status(500).json({ error: 'Failed to update webhook' });
    }
  }

  // ── DELETE: Remove webhook + delivery history ───────────
  if (req.method === 'DELETE') {
    try {
      const existing = await prisma.webhookConfig.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Delete deliveries first (FK constraint)
      await prisma.webhookDelivery.deleteMany({ where: { webhookId: id } });
      await prisma.webhookConfig.delete({ where: { id } });

      return res.status(200).json({ success: true, message: 'Webhook deleted' });
    } catch (error) {
      console.error('[WEBHOOKS API] Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
