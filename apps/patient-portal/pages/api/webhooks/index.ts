// =============================================================================
// COMPASS Webhook Configuration API
// apps/patient-portal/pages/api/webhooks/index.ts
//
// GET  /api/webhooks       → List all webhook configurations
// POST /api/webhooks       → Create a new webhook endpoint
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import crypto from 'crypto';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // ── GET: List webhooks ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const webhooks = await prisma.webhookConfig.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
      });

      // Don't expose the secret in list view
      const sanitized = webhooks.map((wh) => ({
        ...wh,
        secret: '••••••••' + wh.secret.slice(-4),
        deliveryCount: (wh as any)._count?.deliveries || 0,
      }));

      return res.status(200).json({ webhooks: sanitized });
    } catch (error) {
      console.error('[WEBHOOKS API] List error:', error);
      return res.status(500).json({ error: 'Failed to list webhooks' });
    }
  }

  // ── POST: Create webhook ────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { name, url, format, events, headers } = req.body;

      // Validate
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return res.status(400).json({ error: 'HTTPS required' });
        const hostname = parsed.hostname;
        // Reject private/internal IPs
        const privatePatterns = [/^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^::1$/, /^fc00:/i, /^fe80:/i];
        if (privatePatterns.some(p => p.test(hostname))) {
          return res.status(400).json({ error: 'Internal URLs not allowed' });
        }
      } catch { return res.status(400).json({ error: 'Invalid URL' }); }

      const validFormats = ['json', 'fhir_r4', 'hl7v2'];
      const fmt = format || 'json';
      if (!validFormats.includes(fmt)) {
        return res.status(400).json({ error: `Format must be one of: ${validFormats.join(', ')}` });
      }

      const validEvents = ['assessment.completed', 'assessment.emergency', 'assessment.updated', 'assessment.claimed', '*'];
      const eventList = events || ['assessment.completed'];
      for (const evt of eventList) {
        if (!validEvents.includes(evt)) {
          return res.status(400).json({ error: `Invalid event: ${evt}. Valid: ${validEvents.join(', ')}` });
        }
      }

      // Generate HMAC signing secret
      const secret = crypto.randomBytes(32).toString('hex');

      const webhook = await prisma.webhookConfig.create({
        data: {
          name: name.trim(),
          url: url.trim(),
          secret,
          format: fmt,
          events: JSON.stringify(eventList),
          headers: headers ? JSON.stringify(headers) : null,
          isActive: true,
        },
      });

      // Return the secret ONLY on creation — this is the only time it's visible
      return res.status(201).json({
        webhook: {
          ...webhook,
          events: eventList,
        },
        message: 'Webhook created. Save the signing secret — it will not be shown again.',
        signingSecret: secret,
      });
    } catch (error) {
      console.error('[WEBHOOKS API] Create error:', error);
      return res.status(500).json({ error: 'Failed to create webhook' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
