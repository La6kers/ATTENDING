// Notifications Store using Zustand
// apps/provider-portal/hooks/useNotifications.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT' | 'CRITICAL';
  isRead: boolean;
  timestamp: string;
  actionUrl?: string;
  assessmentId?: string;
  patientId?: string;
  orderId?: string;
  data?: any;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // Selectors
  getUnreadCount: () => number;
  getUrgentNotifications: () => Notification[];
  getRecentNotifications: (limit?: number) => Notification[];
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
        };

        set((state) => {
          // Dedupe - don't add if same type + assessmentId/orderId exists within last 5 seconds
          const isDuplicate = state.notifications.some(n => {
            const timeDiff = new Date().getTime() - new Date(n.timestamp).getTime();
            return timeDiff < 5000 && 
              n.type === notification.type &&
              (n.assessmentId === notification.assessmentId || n.orderId === notification.orderId);
          });

          if (isDuplicate) return state;

          const notifications = [newNotification, ...state.notifications].slice(0, 100); // Keep max 100
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, isRead: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.isRead).length;
      },

      getUrgentNotifications: () => {
        return get().notifications.filter(
          n => !n.isRead && (n.priority === 'URGENT' || n.priority === 'STAT' || n.priority === 'CRITICAL')
        );
      },

      getRecentNotifications: (limit = 10) => {
        return get().notifications.slice(0, limit);
      },
    }),
    {
      name: 'attending-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Only persist last 50
      }),
    }
  )
);

export default useNotifications;
