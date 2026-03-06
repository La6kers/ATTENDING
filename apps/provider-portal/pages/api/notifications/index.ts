// ============================================================
// ATTENDING AI - Notifications API Route
// apps/provider-portal/pages/api/notifications/index.ts
//
// Get and manage provider notifications.
// Reads from the Notification table populated by:
//   1. .NET domain events (when backend is running)
//   2. Patient portal Prisma fallback (assessment submit)
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@attending/shared/lib/prisma';

// Resolve the current provider from session, falling back to first active
// provider in development mode when no session is available.
async function resolveProviderId(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  // Try to get the authenticated user from session
  const session = await getServerSession(req, res, {});
  if (session?.user?.id) {
    return session.user.id;
  }

  // Dev/demo fallback: use first active provider
  // TODO: Remove this fallback when real auth is enforced
  if (process.env.NODE_ENV === 'development' || !process.env.NEXTAUTH_ENFORCE) {
    const provider = await prisma.user.findFirst({
      where: { role: 'PROVIDER', isActive: true },
      select: { id: true },
    });
    return provider?.id ?? null;
  }

  return null;
}

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
    console.error('[NOTIFICATIONS API ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/notifications - List notifications for current user
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { unreadOnly, limit = '20' } = req.query;

  const providerId = await resolveProviderId(req, res);
  if (!providerId) {
    return res.status(401).json({ error: 'Unauthorized — no provider session found' });
  }

  const where: any = {
    userId: providerId,
  };

  if (unreadOnly === 'true') {
    where.read = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
    }),
    prisma.notification.count({
      where: {
        userId: providerId,
        read: false,
      },
    }),
  ]);

  // Parse the JSON `data` field to extract relatedType/relatedId
  const transformed = notifications.map((n) => {
    let parsedData: any = {};
    if (n.data) {
      try { parsedData = JSON.parse(n.data); } catch { /* ignore */ }
    }

    return {
      id: n.id,
      type: n.type.toLowerCase(),
      title: n.title,
      message: n.message,
      priority: n.priority.toLowerCase(),
      isRead: n.read,
      readAt: n.readAt?.toISOString() ?? null,
      actionUrl: n.actionUrl,
      // Extract useful fields from the data payload
      assessmentId: parsedData.assessmentId ?? null,
      patientId: parsedData.patientId ?? null,
      triageLevel: parsedData.triageLevel ?? null,
      redFlagCount: parsedData.redFlagCount ?? 0,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return res.status(200).json({
    notifications: transformed,
    unreadCount,
  });
}

// PUT /api/notifications - Mark notifications as read
async function handleMarkRead(req: NextApiRequest, res: NextApiResponse) {
  const { notificationIds, markAll } = req.body;

  const providerId = await resolveProviderId(req, res);
  if (!providerId) {
    return res.status(401).json({ error: 'Unauthorized — no provider session found' });
  }

  if (markAll) {
    await prisma.notification.updateMany({
      where: {
        userId: providerId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  } else if (notificationIds && Array.isArray(notificationIds)) {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: providerId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: providerId,
      read: false,
    },
  });

  return res.status(200).json({
    success: true,
    unreadCount,
  });
}
