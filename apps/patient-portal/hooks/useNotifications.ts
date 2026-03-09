// ============================================================
// ATTENDING AI — useNotifications Hook
// apps/patient-portal/hooks/useNotifications.ts
//
// Real-time notifications via SignalR + polling fallback.
// Handles in-app notification list, unread badges, and
// push notification registration.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '../lib/api';
import type { Notification, NotificationType } from '../lib/api';

// ============================================================
// SignalR connection (lazy loaded)
// ============================================================

let signalRConnection: any = null;
let connectionPromise: Promise<any> | null = null;

async function getSignalRConnection() {
  if (signalRConnection?.state === 'Connected') return signalRConnection;

  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      const signalR = await import('@microsoft/signalr');
      const hubUrl = process.env.NEXT_PUBLIC_SIGNALR_URL ?? 'http://localhost:5000/hubs/clinical';

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            // Get token from session/cookie
            return document.cookie
              .split('; ')
              .find((c) => c.startsWith('access_token='))
              ?.split('=')[1] ?? '';
          },
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      await connection.start();
      signalRConnection = connection;
      console.log('🔔 SignalR connected for patient notifications');
      return connection;
    } catch (err) {
      console.warn('SignalR connection failed, falling back to polling', err);
      connectionPromise = null;
      return null;
    }
  })();

  return connectionPromise;
}

// ============================================================
// Types
// ============================================================

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Subscribe to specific notification type */
  onNotification: (type: NotificationType, callback: (n: Notification) => void) => () => void;
}

// ============================================================
// Hook
// ============================================================

export function useNotifications(options?: {
  pollIntervalMs?: number;
  enableSignalR?: boolean;
  limit?: number;
}): UseNotificationsReturn {
  const { pollIntervalMs = 30000, enableSignalR = true, limit = 50 } = options ?? {};

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const listenersRef = useRef<Map<NotificationType, Set<(n: Notification) => void>>>(new Map());

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getNotifications({ limit }),
        notificationsApi.getUnreadCount(),
      ]);

      if (mountedRef.current) {
        if (notifRes.ok) {
          const raw = notifRes.data as any;
          const list = Array.isArray(raw) ? raw : Array.isArray(raw?.notifications) ? raw.notifications : [];
          setNotifications(list);
        }
        if (countRes.ok) setUnreadCount(countRes.data?.count ?? 0);
        setError(null);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError('Could not load notifications');
        setLoading(false);
      }
    }
  }, [limit]);

  // Handle incoming real-time notification
  const handleIncomingNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => {
      // Deduplicate
      if (prev.some((n) => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });
    setUnreadCount((c) => c + 1);

    // Notify type-specific listeners
    const type = notification.type;
    const listeners = listenersRef.current.get(type);
    if (listeners) {
      listeners.forEach((cb) => cb(notification));
    }
  }, []);

  // Setup SignalR
  useEffect(() => {
    if (!enableSignalR || typeof window === 'undefined') return;

    let connection: any = null;

    const setup = async () => {
      connection = await getSignalRConnection();
      if (!connection) return;

      // Patient-relevant events
      const events = [
        'NewLabResult',
        'NewMessage',
        'AppointmentReminder',
        'PrescriptionUpdate',
        'AssessmentComplete',
      ];

      events.forEach((event) => {
        connection.on(event, (data: any) => {
          handleIncomingNotification({
            id: data.id ?? `${event}-${Date.now()}`,
            type: mapEventToType(event),
            title: data.title ?? event,
            body: data.body ?? data.message ?? '',
            timestamp: data.timestamp ?? new Date().toISOString(),
            read: false,
            actionUrl: data.actionUrl,
            metadata: data,
          });
        });
      });
    };

    setup();

    return () => {
      // Don't disconnect — shared singleton, but unregister event listeners
      if (connection) {
        const events = [
          'NewLabResult',
          'NewMessage',
          'AppointmentReminder',
          'PrescriptionUpdate',
          'AssessmentComplete',
        ];
        events.forEach((event) => {
          connection.off(event);
        });
      }
    };
  }, [enableSignalR, handleIncomingNotification]);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();

    const interval = setInterval(fetchNotifications, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications, pollIntervalMs]);

  // Mark read
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Type-specific subscription
  const onNotification = useCallback(
    (type: NotificationType, callback: (n: Notification) => void) => {
      if (!listenersRef.current.has(type)) {
        listenersRef.current.set(type, new Set());
      }
      listenersRef.current.get(type)!.add(callback);

      return () => {
        listenersRef.current.get(type)?.delete(callback);
      };
    },
    []
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
    onNotification,
  };
}

// ============================================================
// Helpers
// ============================================================

function mapEventToType(event: string): NotificationType {
  switch (event) {
    case 'NewLabResult': return 'lab-result';
    case 'NewMessage': return 'message';
    case 'AppointmentReminder': return 'appointment';
    case 'PrescriptionUpdate': return 'prescription';
    case 'AssessmentComplete': return 'assessment';
    default: return 'system';
  }
}

export default useNotifications;
