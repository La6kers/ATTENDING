/**
 * ATTENDING AI - Notification Context
 * 
 * React context for managing SignalR notifications across the application.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import notificationClient, {
  CriticalResultNotification,
  EmergencyAssessmentNotification,
  OrderStatusNotification,
  NewAssessmentNotification,
  RedFlagNotification,
  PlayAlertCommand,
  playAlert,
  initializeAlerts,
} from './notificationClient';
import * as signalR from '@microsoft/signalr';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationContextValue {
  // Connection state
  isConnected: boolean;
  connectionState: signalR.HubConnectionState;
  
  // Connect/disconnect
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Patient watching
  watchPatient: (patientId: string) => Promise<void>;
  unwatchPatient: (patientId: string) => Promise<void>;
  watchedPatients: string[];
  
  // Emergency alerts
  joinEmergencyAlerts: () => Promise<void>;
  leaveEmergencyAlerts: () => Promise<void>;
  isInEmergencyAlertsGroup: boolean;
  
  // Recent notifications
  recentCriticalResults: CriticalResultNotification[];
  recentEmergencies: EmergencyAssessmentNotification[];
  recentOrderUpdates: OrderStatusNotification[];
  
  // Counts
  unreadCriticalCount: number;
  unreadEmergencyCount: number;
  
  // Actions
  clearCriticalResults: () => void;
  clearEmergencies: () => void;
  markAllAsRead: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface NotificationProviderProps {
  children: ReactNode;
  accessToken?: string;
  autoConnect?: boolean;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  accessToken,
  autoConnect = true,
  maxNotifications = 50,
}: NotificationProviderProps) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );
  
  // Watched patients
  const [watchedPatients, setWatchedPatients] = useState<string[]>([]);
  const [isInEmergencyAlertsGroup, setIsInEmergencyAlertsGroup] = useState(false);
  
  // Notifications
  const [recentCriticalResults, setRecentCriticalResults] = useState<CriticalResultNotification[]>([]);
  const [recentEmergencies, setRecentEmergencies] = useState<EmergencyAssessmentNotification[]>([]);
  const [recentOrderUpdates, setRecentOrderUpdates] = useState<OrderStatusNotification[]>([]);
  
  // Unread counts
  const [unreadCriticalCount, setUnreadCriticalCount] = useState(0);
  const [unreadEmergencyCount, setUnreadEmergencyCount] = useState(0);

  // Initialize audio alerts on mount
  useEffect(() => {
    initializeAlerts();
  }, []);

  // Handle critical result notification
  const handleCriticalResult = useCallback((notification: CriticalResultNotification) => {
    setRecentCriticalResults(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    setUnreadCriticalCount(prev => prev + 1);
    
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('⚠️ Critical Lab Result', {
        body: `${notification.testName}: ${notification.value} - ${notification.patientName}`,
        tag: `critical-${notification.labOrderId}`,
        requireInteraction: true,
      });
    }
  }, [maxNotifications]);

  // Handle emergency assessment notification
  const handleEmergencyAssessment = useCallback((notification: EmergencyAssessmentNotification) => {
    setRecentEmergencies(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    setUnreadEmergencyCount(prev => prev + 1);
    
    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification('🚨 EMERGENCY', {
        body: `${notification.patientName}: ${notification.chiefComplaint}`,
        tag: `emergency-${notification.assessmentId}`,
        requireInteraction: true,
      });
    }
  }, [maxNotifications]);

  // Handle order status change
  const handleOrderStatusChange = useCallback((notification: OrderStatusNotification) => {
    setRecentOrderUpdates(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
  }, [maxNotifications]);

  // Handle play alert command
  const handlePlayAlert = useCallback((command: PlayAlertCommand) => {
    playAlert(command.type, command.repeat);
  }, []);

  // Configure notification client
  useEffect(() => {
    notificationClient.configure({
      onCriticalResult: handleCriticalResult,
      onEmergencyAssessment: handleEmergencyAssessment,
      onOrderStatusChange: handleOrderStatusChange,
      onPlayAlert: handlePlayAlert,
      onConnected: () => {
        setIsConnected(true);
        setConnectionState(signalR.HubConnectionState.Connected);
      },
      onDisconnected: () => {
        setIsConnected(false);
        setConnectionState(signalR.HubConnectionState.Disconnected);
      },
      onReconnecting: () => {
        setConnectionState(signalR.HubConnectionState.Reconnecting);
      },
      onReconnected: () => {
        setIsConnected(true);
        setConnectionState(signalR.HubConnectionState.Connected);
      },
    }, accessToken);
  }, [
    accessToken,
    handleCriticalResult,
    handleEmergencyAssessment,
    handleOrderStatusChange,
    handlePlayAlert,
  ]);

  // Auto-connect if enabled and token is available
  useEffect(() => {
    if (autoConnect && accessToken) {
      notificationClient.connect().catch(console.error);
    }
    
    return () => {
      notificationClient.disconnect();
    };
  }, [autoConnect, accessToken]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Connect
  const connect = useCallback(async () => {
    await notificationClient.connect();
  }, []);

  // Disconnect
  const disconnect = useCallback(async () => {
    await notificationClient.disconnect();
  }, []);

  // Watch patient
  const watchPatient = useCallback(async (patientId: string) => {
    await notificationClient.watchPatient(patientId);
    setWatchedPatients(prev => {
      if (!prev.includes(patientId)) {
        return [...prev, patientId];
      }
      return prev;
    });
  }, []);

  // Unwatch patient
  const unwatchPatient = useCallback(async (patientId: string) => {
    await notificationClient.unwatchPatient(patientId);
    setWatchedPatients(prev => prev.filter(id => id !== patientId));
  }, []);

  // Join emergency alerts
  const joinEmergencyAlerts = useCallback(async () => {
    await notificationClient.joinEmergencyAlerts();
    setIsInEmergencyAlertsGroup(true);
  }, []);

  // Leave emergency alerts
  const leaveEmergencyAlerts = useCallback(async () => {
    await notificationClient.leaveEmergencyAlerts();
    setIsInEmergencyAlertsGroup(false);
  }, []);

  // Clear critical results
  const clearCriticalResults = useCallback(() => {
    setRecentCriticalResults([]);
    setUnreadCriticalCount(0);
  }, []);

  // Clear emergencies
  const clearEmergencies = useCallback(() => {
    setRecentEmergencies([]);
    setUnreadEmergencyCount(0);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setUnreadCriticalCount(0);
    setUnreadEmergencyCount(0);
  }, []);

  const value: NotificationContextValue = {
    isConnected,
    connectionState,
    connect,
    disconnect,
    watchPatient,
    unwatchPatient,
    watchedPatients,
    joinEmergencyAlerts,
    leaveEmergencyAlerts,
    isInEmergencyAlertsGroup,
    recentCriticalResults,
    recentEmergencies,
    recentOrderUpdates,
    unreadCriticalCount,
    unreadEmergencyCount,
    clearCriticalResults,
    clearEmergencies,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for watching a specific patient
 */
export function usePatientNotifications(patientId: string | null) {
  const { watchPatient, unwatchPatient, recentOrderUpdates } = useNotifications();
  
  useEffect(() => {
    if (patientId) {
      watchPatient(patientId);
      return () => {
        unwatchPatient(patientId);
      };
    }
  }, [patientId, watchPatient, unwatchPatient]);
  
  // Filter order updates for this patient
  const patientOrderUpdates = recentOrderUpdates.filter(
    update => update.patientId === patientId
  );
  
  return { patientOrderUpdates };
}

/**
 * Hook for emergency alert monitoring
 */
export function useEmergencyMonitor() {
  const {
    joinEmergencyAlerts,
    leaveEmergencyAlerts,
    recentEmergencies,
    recentCriticalResults,
    unreadEmergencyCount,
    unreadCriticalCount,
  } = useNotifications();
  
  useEffect(() => {
    joinEmergencyAlerts();
    return () => {
      leaveEmergencyAlerts();
    };
  }, [joinEmergencyAlerts, leaveEmergencyAlerts]);
  
  const totalAlerts = unreadEmergencyCount + unreadCriticalCount;
  const hasAlerts = totalAlerts > 0;
  
  return {
    recentEmergencies,
    recentCriticalResults,
    unreadEmergencyCount,
    unreadCriticalCount,
    totalAlerts,
    hasAlerts,
  };
}

export default {
  NotificationProvider,
  useNotifications,
  usePatientNotifications,
  useEmergencyMonitor,
};
