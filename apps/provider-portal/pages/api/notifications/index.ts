// ============================================================
// ATTENDING AI - Notifications API Route
// apps/provider-portal/pages/api/notifications/index.ts
//
// Get and manage provider notifications
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'PUT':
        return handleMarkRead(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/notifications - List notifications for current user
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { unreadOnly, limit = '20' } = req.query;

  // In production, get userId from session
  // For now, get the first provider
  const provider = await prisma.user.findFirst({
    where: { role: 'PROVIDER', isActive: true },
  });

  if (!provider) {
    return res.status(200).json({ notifications: [], unreadCount: 0 });
  }

  const where: any = {
    userId: provider.id,
  };

  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
    }),
    prisma.notification.count({
      where: {
        userId: provider.id,
        isRead: false,
      },
    }),
  ]);

  const transformed = notifications.map(n => ({
    id: n.id,
    type: n.type.toLowerCase(),
    title: n.title,
    message: n.message,
    priority: n.priority.toLowerCase(),
    isRead: n.isRead,
    readAt: n.readAt?.toISOString(),
    relatedType: n.relatedType,
    relatedId: n.relatedId,
    actionUrl: n.actionUrl,
    createdAt: n.createdAt.toISOString(),
  }));

  return res.status(200).json({
    notifications: transformed,
    unreadCount,
  });
}

// PUT /api/notifications - Mark notifications as read
async function handleMarkRead(req: NextApiRequest, res: NextApiResponse) {
  const { notificationIds, markAll } = req.body;

  // In production, get userId from session
  const provider = await prisma.user.findFirst({
    where: { role: 'PROVIDER', isActive: true },
  });

  if (!provider) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (markAll) {
    // Mark all unread as read
    await prisma.notification.updateMany({
      where: {
        userId: provider.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } else if (notificationIds && Array.isArray(notificationIds)) {
    // Mark specific notifications as read
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: provider.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: provider.id,
      isRead: false,
    },
  });

  return res.status(200).json({
    success: true,
    unreadCount,
  });
}
