// ============================================================
// WebSocket Client - DEPRECATED
// apps/provider-portal/lib/websocket.ts
//
// This module has been replaced by hooks/useWebSocket.ts which
// uses SignalR to match the .NET backend hub at /hubs/notifications.
//
// This file is retained only to avoid breaking dynamic imports
// during the transition. All new code should use the hook:
//
//   import { useProviderWebSocket } from '@/hooks/useWebSocket';
//
// ============================================================

import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
  HttpTransportType,
} from '@microsoft/signalr';
import type { PatientAssessment } from '@/store/assessmentQueueStore';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';

// Types for WebSocket events
interface AssessmentNotification {
  assessment: PatientAssessment;
  timestamp: string;
  source: 'compass' | 'api' | 'webhook';
}

interface UrgentAlert {
  assessmentId: string;
  patientName: string;
  chiefComplaint: string;
  redFlags: string[];
  urgencyScore: number;
  timestamp: string;
}

interface ProviderPresence {
  providerId: string;
  providerName: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  currentAssessment?: string;
}

interface StatusUpdate {
  assessmentId: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

// SignalR configuration
const HUB_URL = (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5260').replace(/\/$/, '') + '/hubs/notifications';
const RECONNECT_ATTEMPTS = 5;

// Singleton connection instance
let connection: HubConnection | null = null;
let isConnecting = false;

// Audio for urgent alerts
let urgentSound: HTMLAudioElement | null = null;

// Initialize audio (call once on client)
export function initializeAudio() {
  if (typeof window !== 'undefined' && !urgentSound) {
    urgentSound = new Audio('/sounds/urgent-alert.mp3');
    urgentSound.volume = 0.5;
  }
}

// Play urgent alert sound
function playUrgentSound() {
  if (urgentSound) {
    urgentSound.currentTime = 0;
    urgentSound.play().catch(e => console.log('Could not play sound:', e));
  }
}

// ============================================================
// MAIN SIGNALR CONNECTION
// ============================================================

export function connectWebSocket(providerId: string, providerName: string): HubConnection {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    console.log('[SignalR] Already connected');
    return connection;
  }

  if (isConnecting && connection) {
    console.log('[SignalR] Connection in progress...');
    return connection;
  }

  isConnecting = true;
  console.log('[SignalR] Connecting to:', HUB_URL);

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        if (retryContext.previousRetryCount >= RECONNECT_ATTEMPTS) return null;
        return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
      },
    })
    .configureLogging(
      process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Warning
    )
    .build();

  // =====================================================
  // CONNECTION EVENTS
  // =====================================================

  connection.onreconnecting((error) => {
    console.log('[SignalR] Reconnecting...', error?.message);
  });

  connection.onreconnected((connectionId) => {
    console.log('[SignalR] Reconnected:', connectionId);
    connection?.invoke('ProviderJoin', {
      providerId,
      providerName,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('[SignalR] Re-registration failed:', err));
  });

  connection.onclose((error) => {
    console.log('[SignalR] Connection closed:', error?.message);
    isConnecting = false;
  });

  // =====================================================
  // ASSESSMENT EVENTS (PascalCase to match .NET hub)
  // =====================================================

  connection.on('AssessmentNew', (data: AssessmentNotification) => {
    console.log('[SignalR] New assessment received:', data.assessment.id);
    useAssessmentQueueStore.getState().addAssessment(data.assessment);
    showBrowserNotification(
      `New Assessment: ${data.assessment.patientName}`,
      data.assessment.chiefComplaint
    );
  });

  connection.on('AssessmentUrgent', (data: UrgentAlert) => {
    console.log('[SignalR] URGENT assessment:', data.assessmentId);
    playUrgentSound();
    showBrowserNotification(
      `URGENT: ${data.patientName}`,
      `${data.chiefComplaint}\nRed Flags: ${data.redFlags.join(', ')}`,
      'urgent'
    );
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  connection.on('AssessmentStatusUpdated', (_data: StatusUpdate) => {
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  connection.on('AssessmentAssigned', (data: { assessmentId: string; patientName: string }) => {
    showBrowserNotification(
      'Assessment Assigned',
      `${data.patientName} has been assigned to you`
    );
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  // =====================================================
  // PRESENCE EVENTS
  // =====================================================

  connection.on('ProviderOnline', (data: ProviderPresence) => {
    console.log('[SignalR] Provider online:', data.providerName);
  });

  connection.on('ProviderOffline', (data: { providerId: string }) => {
    console.log('[SignalR] Provider offline:', data.providerId);
  });

  // =====================================================
  // SYSTEM EVENTS
  // =====================================================

  connection.on('ServerShutdown', (data: { message: string }) => {
    console.warn('[SignalR] Server shutdown notice:', data.message);
  });

  // Start connection
  connection.start()
    .then(() => {
      console.log('[SignalR] Connected successfully');
      isConnecting = false;
      connection?.invoke('ProviderJoin', {
        providerId,
        providerName,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error('[SignalR] ProviderJoin failed:', err));
    })
    .catch((err) => {
      console.error('[SignalR] Connection failed:', err);
      isConnecting = false;
    });

  return connection;
}

// ============================================================
// DISCONNECT
// ============================================================

export function disconnectWebSocket() {
  if (connection) {
    connection.invoke('ProviderLeave').catch(() => {});
    connection.stop();
    connection = null;
    isConnecting = false;
  }
}

// ============================================================
// EMIT EVENTS
// ============================================================

export function emitAssessmentViewing(assessmentId: string) {
  if (connection?.state === HubConnectionState.Connected) {
    connection.invoke('AssessmentViewing', {
      assessmentId,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('[SignalR] AssessmentViewing failed:', err));
  }
}

export function emitAssessmentStatusChange(assessmentId: string, newStatus: string) {
  if (connection?.state === HubConnectionState.Connected) {
    connection.invoke('AssessmentStatusChange', {
      assessmentId,
      newStatus,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('[SignalR] AssessmentStatusChange failed:', err));
  }
}

export function emitProviderStatus(status: 'online' | 'busy' | 'away') {
  if (connection?.state === HubConnectionState.Connected) {
    connection.invoke('ProviderStatus', {
      status,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('[SignalR] ProviderStatus failed:', err));
  }
}

// ============================================================
// BROWSER NOTIFICATIONS
// ============================================================

async function showBrowserNotification(
  title: string,
  body: string,
  type: 'normal' | 'urgent' = 'normal'
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: type === 'urgent' ? 'urgent-assessment' : 'assessment',
      requireInteraction: type === 'urgent',
      silent: type !== 'urgent',
    });

    if (type === 'normal') {
      setTimeout(() => notification.close(), 5000);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// ============================================================
// REQUEST NOTIFICATION PERMISSION
// ============================================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// ============================================================
// CONNECTION STATUS
// ============================================================

export function isWebSocketConnected(): boolean {
  return connection?.state === HubConnectionState.Connected || false;
}

export function getConnection(): HubConnection | null {
  return connection;
}

// ============================================================
// REACT HOOK FOR WEBSOCKET (prefer hooks/useWebSocket.ts instead)
// ============================================================

export function useWebSocket() {
  return {
    isConnected: isWebSocketConnected(),
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    emitViewing: emitAssessmentViewing,
    emitStatusChange: emitAssessmentStatusChange,
    emitProviderStatus,
    requestNotifications: requestNotificationPermission,
  };
}
