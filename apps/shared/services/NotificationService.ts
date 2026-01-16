// apps/shared/services/NotificationService.ts
// Unified Notification Service for ATTENDING AI Platform
// Handles in-app notifications, toast messages, and COMPASS assessment alerts

import type { Notification, UrgencyLevel } from '../types';

// ================================
// TYPES
// ================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'compass';

export interface NotificationOptions {
  id?: string;
  title: string;
  message: string;
  type?: NotificationType;
  duration?: number; // milliseconds, 0 = persistent
  data?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export interface CompassNotificationOptions extends NotificationOptions {
  assessmentId: string;
  patientId?: string;
  patientName?: string;
  urgencyLevel: UrgencyLevel;
  redFlags?: string[];
  chiefComplaint?: string;
}

export type NotificationCallback = (notification: Notification) => void;
export type UnsubscribeFn = () => void;

export interface NotificationServiceConfig {
  maxNotifications?: number;
  defaultDuration?: number;
  enableSound?: boolean;
  soundUrl?: string;
}

// ================================
// NOTIFICATION SERVICE
// ================================

class NotificationServiceClass {
  private static instance: NotificationServiceClass;
  private notifications: Notification[] = [];
  private subscribers: Set<NotificationCallback> = new Set();
  private config: NotificationServiceConfig = {
    maxNotifications: 50,
    defaultDuration: 5000,
    enableSound: true,
  };

  private constructor() {}

  static getInstance(): NotificationServiceClass {
    if (!NotificationServiceClass.instance) {
      NotificationServiceClass.instance = new NotificationServiceClass();
    }
    return NotificationServiceClass.instance;
  }

  /**
   * Configure the notification service
   */
  configure(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ================================
  // SUBSCRIPTION
  // ================================

  /**
   * Subscribe to notification updates
   */
  subscribe(callback: NotificationCallback): UnsubscribeFn {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(notification: Notification): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (e) {
        console.error('[NotificationService] Error in subscriber callback:', e);
      }
    });
  }

  // ================================
  // CORE NOTIFICATION METHODS
  // ================================

  private createNotification(options: NotificationOptions): Notification {
    const id = options.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: Notification = {
      id,
      type: options.type === 'compass' ? 'urgent_assessment' : 
            options.type === 'error' ? 'system' :
            options.type === 'warning' ? 'system' : 'message',
      title: options.title,
      message: options.message,
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: options.actionUrl,
    };

    // Add to notifications array
    this.notifications.unshift(notification);

    // Trim old notifications
    if (this.notifications.length > (this.config.maxNotifications || 50)) {
      this.notifications = this.notifications.slice(0, this.config.maxNotifications);
    }

    // Play sound for urgent notifications
    if (this.config.enableSound && (options.type === 'error' || options.type === 'compass')) {
      this.playNotificationSound();
    }

    // Notify subscribers
    this.notifySubscribers(notification);

    // Auto-dismiss if duration set
    if (options.duration !== 0) {
      const duration = options.duration || this.config.defaultDuration || 5000;
      setTimeout(() => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      }, duration);
    }

    return notification;
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, data?: Record<string, unknown>): Notification {
    return this.createNotification({
      title,
      message,
      type: 'info',
      data,
    });
  }

  /**
   * Show a success notification
   */
  success(title: string, message: string, data?: Record<string, unknown>): Notification {
    return this.createNotification({
      title,
      message,
      type: 'success',
      data,
    });
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, data?: Record<string, unknown>): Notification {
    return this.createNotification({
      title,
      message,
      type: 'warning',
      data,
      duration: 8000, // Warnings stay longer
    });
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, data?: Record<string, unknown>): Notification {
    return this.createNotification({
      title,
      message,
      type: 'error',
      data,
      duration: 0, // Errors persist until dismissed
    });
  }

  // ================================
  // COMPASS-SPECIFIC NOTIFICATIONS
  // ================================

  /**
   * Show a COMPASS assessment notification
   */
  compassAssessment(options: CompassNotificationOptions): Notification {
    const urgencyEmoji = {
      emergency: '🆘',
      high: '🚨',
      moderate: '⚠️',
      standard: 'ℹ️',
    }[options.urgencyLevel] || 'ℹ️';

    const title = `${urgencyEmoji} ${options.title || 'New COMPASS Assessment'}`;
    
    let message = options.message;
    if (options.patientName) {
      message = `Patient: ${options.patientName}\n${message}`;
    }
    if (options.chiefComplaint) {
      message += `\nChief Complaint: ${options.chiefComplaint}`;
    }
    if (options.redFlags && options.redFlags.length > 0) {
      message += `\n⚠️ Red Flags: ${options.redFlags.join(', ')}`;
    }

    const notification = this.createNotification({
      title,
      message,
      type: 'compass',
      duration: options.urgencyLevel === 'high' ? 0 : 10000,
      data: {
        assessmentId: options.assessmentId,
        patientId: options.patientId,
        urgencyLevel: options.urgencyLevel,
        redFlags: options.redFlags,
      },
      actionUrl: `/assessments/${options.assessmentId}`,
      actionLabel: 'Review Assessment',
    });

    // Add urgencyLevel to the notification
    (notification as any).urgencyLevel = options.urgencyLevel;
    (notification as any).assessmentId = options.assessmentId;
    (notification as any).patientId = options.patientId;

    return notification;
  }

  /**
   * Show a red flag alert notification
   */
  redFlagAlert(
    assessmentId: string,
    redFlagName: string,
    description: string,
    patientName?: string
  ): Notification {
    return this.compassAssessment({
      assessmentId,
      patientName,
      urgencyLevel: 'high',
      title: '🚨 Critical Red Flag Detected',
      message: `${redFlagName}: ${description}`,
      redFlags: [redFlagName],
    });
  }

  /**
   * Show an emergency notification
   */
  emergency(
    assessmentId: string,
    message: string,
    location?: { latitude: number; longitude: number }
  ): Notification {
    let locationStr = '';
    if (location) {
      locationStr = `\n📍 Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    return this.createNotification({
      title: '🚨 EMERGENCY TRIGGERED',
      message: `${message}${locationStr}`,
      type: 'error',
      duration: 0,
      data: {
        assessmentId,
        location,
        isEmergency: true,
      },
    });
  }

  // ================================
  // NOTIFICATION MANAGEMENT
  // ================================

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get notifications by type
   */
  getByType(type: Notification['type']): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifySubscribers(notification);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => {
      n.read = true;
    });
    // Notify with the most recent notification
    if (this.notifications.length > 0) {
      this.notifySubscribers(this.notifications[0]);
    }
  }

  /**
   * Remove a notification
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notifications = [];
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get urgent (COMPASS) unread count
   */
  getUrgentUnreadCount(): number {
    return this.notifications.filter(
      n => !n.read && n.type === 'urgent_assessment'
    ).length;
  }

  // ================================
  // SOUND
  // ================================

  private playNotificationSound(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    
    try {
      // Use a simple beep sound - in production, use a proper notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Audio not supported or blocked
      console.debug('[NotificationService] Unable to play notification sound');
    }
  }
}

// Export singleton instance
export const NotificationService = NotificationServiceClass.getInstance();
export default NotificationService;
