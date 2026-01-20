// =============================================================================
// ATTENDING AI - WebSocket Hooks
// apps/shared/lib/websocket/hooks.ts
//
// Specialized React hooks for clinical real-time features
// =============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocketContext } from './WebSocketProvider';
import {
  WebSocketChannel, ConnectionState, AssessmentQueueEvent, EmergencyAlertEvent,
  CriticalResultEvent, PatientStatusEvent, ProviderPresenceEvent, OrderUpdateEvent,
  ProviderMessageEvent, SystemNotificationEvent, HandoffEvent, UrgencyLevel,
} from './types';

// =============================================================================
// Connection Hooks
// =============================================================================

export function useConnectionState(): ConnectionState {
  const { connectionState } = useWebSocketContext();
  return connectionState;
}

export function useIsConnected(): boolean {
  const { isConnected } = useWebSocketContext();
  return isConnected;
}

export function useReconnect(): () => Promise<void> {
  const { connect } = useWebSocketContext();
  return connect;
}

// =============================================================================
// Generic Subscription Hook
// =============================================================================

export function useSubscription<T>(
  channel: WebSocketChannel,
  handler: (payload: T) => void,
  event?: string,
  enabled = true
): void {
  const { subscribe } = useWebSocketContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return subscribe<T>(channel, (payload) => handlerRef.current(payload), event);
  }, [channel, event, enabled, subscribe]);
}

// =============================================================================
// Assessment Hooks
// =============================================================================

export function useAssessmentQueue(): {
  queue: AssessmentQueueEvent[];
  urgentCount: number;
  totalCount: number;
} {
  const [queue, setQueue] = useState<AssessmentQueueEvent[]>([]);

  useSubscription<AssessmentQueueEvent>('assessments:queue', (event) => {
    setQueue((prev) => {
      switch (event.action) {
        case 'added':
          return [...prev, event].sort((a, b) => (a.position || 0) - (b.position || 0));
        case 'updated':
          return prev.map((item) => (item.assessmentId === event.assessmentId ? { ...item, ...event } : item));
        case 'removed':
          return prev.filter((item) => item.assessmentId !== event.assessmentId);
        case 'reordered':
          return prev.map((item) => (item.assessmentId === event.assessmentId ? { ...item, position: event.position } : item))
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        default:
          return prev;
      }
    });
  });

  const urgentCount = queue.filter((a) => a.urgencyLevel === 'emergency' || a.urgencyLevel === 'high').length;

  return { queue, urgentCount, totalCount: queue.length };
}

export function useUrgentAssessments(onUrgent?: (assessment: AssessmentQueueEvent) => void): AssessmentQueueEvent[] {
  const [urgent, setUrgent] = useState<AssessmentQueueEvent[]>([]);

  useSubscription<AssessmentQueueEvent>('assessments:urgent', (event) => {
    setUrgent((prev) => {
      const exists = prev.some((a) => a.assessmentId === event.assessmentId);
      if (!exists) {
        onUrgent?.(event);
        return [event, ...prev].slice(0, 20);
      }
      return prev;
    });
  });

  return urgent;
}

export function useAssessmentStatus(assessmentId: string): AssessmentQueueEvent | null {
  const [status, setStatus] = useState<AssessmentQueueEvent | null>(null);

  useSubscription<AssessmentQueueEvent>('assessments:status', (event) => {
    if (event.assessmentId === assessmentId) setStatus(event);
  });

  return status;
}

// =============================================================================
// Emergency Hooks
// =============================================================================

export function useEmergencyAlerts(onAlert?: (alert: EmergencyAlertEvent) => void): {
  activeAlerts: EmergencyAlertEvent[];
  acknowledgeAlert: (alertId: string) => void;
  clearAlert: (alertId: string) => void;
} {
  const [alerts, setAlerts] = useState<EmergencyAlertEvent[]>([]);
  const { client } = useWebSocketContext();

  useSubscription<EmergencyAlertEvent>('emergency:alerts', (event) => {
    setAlerts((prev) => {
      const exists = prev.some((a) => a.alertId === event.alertId);
      if (!exists) {
        onAlert?.(event);
        return [event, ...prev];
      }
      return prev.map((a) => (a.alertId === event.alertId ? event : a));
    });
  });

  useSubscription<EmergencyAlertEvent>('emergency:acknowledged', (event) => {
    setAlerts((prev) => prev.map((a) => (a.alertId === event.alertId ? { ...a, acknowledgedBy: event.acknowledgedBy } : a)));
  });

  const acknowledgeAlert = useCallback((alertId: string) => {
    client.send({
      id: `ack-${alertId}`,
      type: 'event',
      channel: 'emergency:acknowledged',
      payload: { alertId, acknowledgedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }, [client]);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
  }, []);

  return { activeAlerts: alerts, acknowledgeAlert, clearAlert };
}

// =============================================================================
// Results Hooks
// =============================================================================

export function useCriticalResults(onCritical?: (result: CriticalResultEvent) => void): {
  results: CriticalResultEvent[];
  acknowledgeResult: (resultId: string) => void;
  unacknowledgedCount: number;
} {
  const [results, setResults] = useState<CriticalResultEvent[]>([]);
  const { client } = useWebSocketContext();

  useSubscription<CriticalResultEvent>('results:critical', (event) => {
    setResults((prev) => {
      const exists = prev.some((r) => r.resultId === event.resultId);
      if (!exists) {
        onCritical?.(event);
        return [event, ...prev].slice(0, 50);
      }
      return prev.map((r) => (r.resultId === event.resultId ? event : r));
    });
  });

  const acknowledgeResult = useCallback((resultId: string) => {
    client.send({
      id: `ack-result-${resultId}`,
      type: 'event',
      channel: 'results:critical',
      event: 'acknowledge',
      payload: { resultId, acknowledgedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
    setResults((prev) => prev.map((r) => (r.resultId === resultId ? { ...r, acknowledgedBy: 'current_user', acknowledgedAt: new Date().toISOString() } : r)));
  }, [client]);

  const unacknowledgedCount = results.filter((r) => r.requiresAcknowledgment && !r.acknowledgedBy).length;

  return { results, acknowledgeResult, unacknowledgedCount };
}

export function useLabResults(patientId?: string): OrderUpdateEvent[] {
  const [results, setResults] = useState<OrderUpdateEvent[]>([]);

  useSubscription<OrderUpdateEvent>('results:labs', (event) => {
    if (!patientId || event.patientId === patientId) {
      setResults((prev) => [event, ...prev].slice(0, 100));
    }
  });

  return results;
}

export function useImagingResults(patientId?: string): OrderUpdateEvent[] {
  const [results, setResults] = useState<OrderUpdateEvent[]>([]);

  useSubscription<OrderUpdateEvent>('results:imaging', (event) => {
    if (!patientId || event.patientId === patientId) {
      setResults((prev) => [event, ...prev].slice(0, 100));
    }
  });

  return results;
}

// =============================================================================
// Order Hooks
// =============================================================================

export function useOrderUpdates(orderType?: 'lab' | 'imaging' | 'medication' | 'referral'): OrderUpdateEvent[] {
  const [orders, setOrders] = useState<OrderUpdateEvent[]>([]);

  const channels: WebSocketChannel[] = orderType
    ? [`orders:${orderType}s` as WebSocketChannel]
    : ['orders:labs', 'orders:imaging', 'orders:medications', 'orders:referrals'];

  channels.forEach((channel) => {
    useSubscription<OrderUpdateEvent>(channel, (event) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o.orderId === event.orderId);
        if (exists) return prev.map((o) => (o.orderId === event.orderId ? event : o));
        return [event, ...prev].slice(0, 100);
      });
    });
  });

  return orders;
}

// =============================================================================
// Patient Hooks
// =============================================================================

export function usePatientStatus(patientId?: string): PatientStatusEvent | null {
  const [status, setStatus] = useState<PatientStatusEvent | null>(null);

  useSubscription<PatientStatusEvent>('patients:status', (event) => {
    if (!patientId || event.patientId === patientId) setStatus(event);
  });

  return status;
}

export function usePatientCheckins(): PatientStatusEvent[] {
  const [checkins, setCheckins] = useState<PatientStatusEvent[]>([]);

  useSubscription<PatientStatusEvent>('patients:checkin', (event) => {
    setCheckins((prev) => [event, ...prev].slice(0, 50));
  });

  return checkins;
}

// =============================================================================
// Provider Hooks
// =============================================================================

export function useProviderPresence(): Map<string, ProviderPresenceEvent> {
  const [presence, setPresence] = useState<Map<string, ProviderPresenceEvent>>(new Map());

  useSubscription<ProviderPresenceEvent>('providers:presence', (event) => {
    setPresence((prev) => {
      const next = new Map(prev);
      if (event.status === 'offline') next.delete(event.providerId);
      else next.set(event.providerId, event);
      return next;
    });
  });

  return presence;
}

export function useProviderMessages(onMessage?: (message: ProviderMessageEvent) => void): {
  messages: ProviderMessageEvent[];
  unreadCount: number;
  markAsRead: (messageId: string) => void;
} {
  const [messages, setMessages] = useState<ProviderMessageEvent[]>([]);

  useSubscription<ProviderMessageEvent>('providers:messages', (event) => {
    setMessages((prev) => [event, ...prev].slice(0, 100));
    onMessage?.(event);
  });

  const markAsRead = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.messageId === messageId ? { ...m, readAt: new Date().toISOString() } : m)));
  }, []);

  const unreadCount = messages.filter((m) => !m.readAt).length;

  return { messages, unreadCount, markAsRead };
}

export function useHandoffs(onHandoff?: (handoff: HandoffEvent) => void): {
  pendingHandoffs: HandoffEvent[];
  acceptHandoff: (handoffId: string) => void;
} {
  const [handoffs, setHandoffs] = useState<HandoffEvent[]>([]);
  const { client } = useWebSocketContext();

  useSubscription<HandoffEvent>('providers:handoff', (event) => {
    if (!event.acceptedAt) {
      setHandoffs((prev) => [event, ...prev]);
      onHandoff?.(event);
    } else {
      setHandoffs((prev) => prev.filter((h) => h.handoffId !== event.handoffId));
    }
  });

  const acceptHandoff = useCallback((handoffId: string) => {
    client.send({
      id: `accept-${handoffId}`,
      type: 'event',
      channel: 'providers:handoff',
      event: 'accept',
      payload: { handoffId, acceptedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
    setHandoffs((prev) => prev.filter((h) => h.handoffId !== handoffId));
  }, [client]);

  return { pendingHandoffs: handoffs, acceptHandoff };
}

// =============================================================================
// System Hooks
// =============================================================================

export function useSystemNotifications(): {
  notifications: SystemNotificationEvent[];
  dismiss: (notificationId: string) => void;
} {
  const [notifications, setNotifications] = useState<SystemNotificationEvent[]>([]);

  useSubscription<SystemNotificationEvent>('system:notifications', (event) => {
    setNotifications((prev) => {
      const exists = prev.some((n) => n.notificationId === event.notificationId);
      if (!exists) return [event, ...prev].slice(0, 20);
      return prev;
    });
  });

  useSubscription<SystemNotificationEvent>('system:broadcast', (event) => {
    setNotifications((prev) => [event, ...prev].slice(0, 20));
  });

  const dismiss = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
  }, []);

  return { notifications, dismiss };
}

// =============================================================================
// Audio Control Hook
// =============================================================================

export function useAudioAlerts(): {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  playAlert: (type: 'emergency' | 'critical' | 'urgent' | 'message' | 'notification') => void;
} {
  const { audioEnabled, setAudioEnabled, playAlert } = useWebSocketContext();
  return { enabled: audioEnabled, setEnabled: setAudioEnabled, playAlert };
}
