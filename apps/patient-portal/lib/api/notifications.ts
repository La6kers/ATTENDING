// ============================================================
// ATTENDING AI — Notifications API Service
// apps/patient-portal/lib/api/notifications.ts
//
// Push notifications, in-app notifications, and
// SignalR real-time connection for the patient portal.
// ============================================================

import api from './client';

// ============================================================
// Types
// ============================================================

export type NotificationType =
  | 'lab-result'
  | 'message'
  | 'appointment'
  | 'prescription'
  | 'assessment'
  | 'emergency'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  labResults: boolean;
  messages: boolean;
  appointments: boolean;
  prescriptions: boolean;
  medicationReminders: boolean;
  emergencyAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

// ============================================================
// API Functions
// ============================================================

export const notificationsApi = {
  /** Get notifications list */
  getNotifications: (params?: { limit?: number; unreadOnly?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.unreadOnly) sp.set('unread', 'true');
    const qs = sp.toString();
    return api.get<Notification[]>(`/patient/notifications${qs ? `?${qs}` : ''}`);
  },

  /** Mark notification as read */
  markRead: (id: string) =>
    api.post(`/patient/notifications/${id}/read`),

  /** Mark all as read */
  markAllRead: () =>
    api.post('/patient/notifications/read-all'),

  /** Get unread count */
  getUnreadCount: () =>
    api.get<{ count: number }>('/patient/notifications/unread'),

  /** Get notification preferences */
  getPreferences: () =>
    api.get<NotificationPreferences>('/patient/notifications/preferences'),

  /** Save notification preferences */
  savePreferences: (prefs: NotificationPreferences) =>
    api.put('/patient/notifications/preferences', prefs),

  /** Register push token (FCM/APNs) */
  registerPushToken: (token: string, platform: 'web' | 'ios' | 'android') =>
    api.post('/emergency/register-push-token', { token, platform }),
};

export default notificationsApi;
