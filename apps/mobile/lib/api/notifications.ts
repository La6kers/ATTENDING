// ============================================================
// ATTENDING AI — Mobile Notifications API
// apps/mobile/lib/api/notifications.ts
// ============================================================

import api from './mobileApiClient';

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
  quietHoursStart: string;
  quietHoursEnd: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export const notificationsApi = {
  getNotifications: (params?: { limit?: number; unreadOnly?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.unreadOnly) sp.set('unread', 'true');
    const qs = sp.toString();
    return api.get<Notification[]>(`/patient/notifications${qs ? `?${qs}` : ''}`);
  },

  markRead: (id: string) =>
    api.post(`/patient/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/patient/notifications/read-all'),

  getUnreadCount: () =>
    api.get<{ count: number }>('/patient/notifications/unread'),

  getPreferences: () =>
    api.get<NotificationPreferences>('/patient/notifications/preferences'),

  savePreferences: (prefs: NotificationPreferences) =>
    api.put('/patient/notifications/preferences', prefs),

  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    api.post('/emergency/register-push-token', { token, platform }),
};
