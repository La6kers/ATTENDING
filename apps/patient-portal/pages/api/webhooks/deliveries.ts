// =============================================================================
// COMPASS Webhook Delivery Log API
// apps/patient-portal/pages/api/webhooks/deliveries.ts
//
// GET /api/webhooks/deliveries?webhookId=X&status=Y&limit=50
//
// Filterable delivery history for the admin UI.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { webhookId, status, assessmentId, limit = '50' } = req.query;

    const where: any = {};
    if (webhookId && typeof webhookId === 'string') where.webhookId = webhookId;
    if (status && typeof status === 'string') where.status = status;
    if (assessmentId && typeof assessmentId === 'string') where.assessmentId = assessmentId;

    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10) || 50, 200),
      include: {
        webhook: {
          select: { id: true, name: true, url: true, format: true },
        },
      },
    });

    // Summary stats
    const stats = await prisma.webhookDelivery.groupBy({
      by: ['status'],
      where: webhookId ? { webhookId: webhookId as string } : undefined,
      _count: true,
    });

    return res.status(200).json({
      deliveries,
      stats: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {} as Record<string, number>),
      total: deliveries.length,
    });
  } catch (error) {
    console.error('[WEBHOOK DELIVERIES] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
}
