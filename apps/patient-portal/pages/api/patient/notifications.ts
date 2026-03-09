// =============================================================================
// ATTENDING AI - Patient Notifications API
// apps/patient-portal/pages/api/patient/notifications.ts
//
// Handles patient notification listing and management.
// Requires authenticated PATIENT session.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';

// Types
interface Notification {
  id: string;
  type: 'assessment_update' | 'message' | 'reminder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  assessmentId?: string;
  actionUrl?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const userId = (session.user as { id?: string }).id;

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, userId);
    case 'PUT':
      return handleMarkRead(req, res, userId);
    case 'DELETE':
      return handleDelete(req, res, userId);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/notifications - List notifications
async function handleGet(req: NextApiRequest, res: NextApiResponse<NotificationsResponse>, userId?: string) {
  try {
    const { unreadOnly } = req.query;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return res.status(200).json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: (n.type as Notification['type']) || 'system',
        title: n.title,
        message: n.message || '',
        timestamp: n.createdAt.toISOString(),
        read: n.read,
        actionUrl: n.actionUrl || undefined,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications] Error fetching notifications:', error);
    return res.status(500).json({ notifications: [], unreadCount: 0 });
  }
}

// PUT /api/patient/notifications - Mark notifications as read
async function handleMarkRead(req: NextApiRequest, res: NextApiResponse, userId?: string) {
  const { notificationIds, markAllRead } = req.body;

  try {
    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId },
        data: { read: true },
      });
    } else {
      return res.status(400).json({ error: 'notificationIds or markAllRead is required' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notifications updated',
    });
  } catch (error) {
    console.error('[Notifications] Error updating notifications:', error);
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
}

// DELETE /api/patient/notifications - Delete notifications
async function handleDelete(req: NextApiRequest, res: NextApiResponse, userId?: string) {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return res.status(400).json({ error: 'notificationIds is required' });
  }

  try {
    await prisma.notification.deleteMany({
      where: { id: { in: notificationIds }, userId },
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications deleted',
    });
  } catch (error) {
    console.error('[Notifications] Error deleting notifications:', error);
    return res.status(500).json({ error: 'Failed to delete notifications' });
  }
}
