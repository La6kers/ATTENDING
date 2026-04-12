// ============================================================
// useNotifications Hook - @attending/shared
// apps/shared/hooks/useNotifications.ts
//
// Browser notification management with permission handling
// ============================================================

import { useState, useCallback, useEffect } from 'react';

export interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
  onClick?: () => void;
  onClose?: () => void;
  autoClose?: number; // milliseconds
}

export interface UseNotificationsReturn {
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => Notification | null;
}

/**
 * Hook for managing browser notifications
 * 
 * @example
 * const { permission, requestPermission, showNotification } = useNotifications();
 * 
 * // Request permission
 * await requestPermission();
 * 
 * // Show notification
 * showNotification('New Assessment', {
 *   body: 'Patient John Doe submitted a new assessment',
 *   tag: 'assessment',
 *   onClick: () => router.push('/assessments/123'),
 * });
 */
export function useNotifications(): UseNotificationsReturn {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (!isSupported) return 'unsupported';
    return Notification.permission;
  });

  // Update permission state on mount
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported in this browser');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    if (permission === 'denied') {
      console.warn('[Notifications] Permission was previously denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      return false;
    }
  }, [isSupported, permission]);

  // Show notification
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (!isSupported || permission !== 'granted') {
        console.warn('[Notifications] Cannot show notification - not supported or not permitted');
        return null;
      }

      try {
        const notification = new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/logo.png',
          badge: options?.badge || '/badge.png',
          tag: options?.tag,
          requireInteraction: options?.requireInteraction,
          silent: options?.silent,
          data: options?.data,
        });

        // Handle click
        if (options?.onClick) {
          notification.onclick = () => {
            window.focus();
            notification.close();
            options.onClick?.();
          };
        }

        // Handle close
        if (options?.onClose) {
          notification.onclose = options.onClose;
        }

        // Auto-close
        if (options?.autoClose) {
          setTimeout(() => {
            notification.close();
          }, options.autoClose);
        }

        return notification;
      } catch (error) {
        console.error('[Notifications] Error showing notification:', error);
        return null;
      }
    },
    [isSupported, permission]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
  };
}

export default useNotifications;
