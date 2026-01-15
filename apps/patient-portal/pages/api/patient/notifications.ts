// =============================================================================
// ATTENDING AI - Patient Notifications API
// apps/patient-portal/pages/api/patient/notifications.ts
//
// Handles patient notification listing and management
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

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

// Mock notifications (replace with database in production)
const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'assessment_update',
    title: 'Assessment Reviewed',
    message: 'Dr. Smith has reviewed your headache assessment and provided recommendations.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    assessmentId: 'assess-001',
    actionUrl: '/results/assess-001',
  },
  {
    id: 'notif-002',
    type: 'reminder',
    title: 'Follow-up Reminder',
    message: 'Your 2-week follow-up for headache assessment is coming up.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
  {
    id: 'notif-003',
    type: 'message',
    title: 'New Message',
    message: 'You have a new message from your care team.',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    read: true,
  },
  {
    id: 'notif-004',
    type: 'system',
    title: 'Profile Update',
    message: 'Please review and update your emergency contact information.',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    read: true,
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication check

  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'PUT':
      return handleMarkRead(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// GET /api/patient/notifications - List notifications
async function handleGet(req: NextApiRequest, res: NextApiResponse<NotificationsResponse>) {
  const { unreadOnly } = req.query;

  let filteredNotifications = [...mockNotifications];

  if (unreadOnly === 'true') {
    filteredNotifications = filteredNotifications.filter((n) => !n.read);
  }

  // Sort by timestamp (newest first)
  filteredNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return res.status(200).json({
    notifications: filteredNotifications,
    unreadCount,
  });
}

// PUT /api/patient/notifications - Mark notifications as read
async function handleMarkRead(req: NextApiRequest, res: NextApiResponse) {
  const { notificationIds, markAllRead } = req.body;

  if (markAllRead) {
    // Mark all as read
    mockNotifications.forEach((n) => {
      n.read = true;
    });
  } else if (notificationIds && Array.isArray(notificationIds)) {
    // Mark specific notifications as read
    notificationIds.forEach((id: string) => {
      const notification = mockNotifications.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
      }
    });
  } else {
    return res.status(400).json({ error: 'notificationIds or markAllRead is required' });
  }

  return res.status(200).json({
    success: true,
    message: 'Notifications updated',
  });
}

// DELETE /api/patient/notifications - Delete notifications
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return res.status(400).json({ error: 'notificationIds is required' });
  }

  // In production, delete from database
  // For mock, we just acknowledge the request

  return res.status(200).json({
    success: true,
    message: 'Notifications deleted',
  });
}
