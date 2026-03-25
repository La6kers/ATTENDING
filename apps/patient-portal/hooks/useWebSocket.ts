// ============================================================
// ATTENDING AI - Patient Portal WebSocket Hook
// apps/patient-portal/hooks/useWebSocket.ts
//
// Patient-specific real-time features via SignalR:
// - Emergency alert triggering
// - Assessment progress reporting
// - Provider connection/queue management
//
// Uses @microsoft/signalr to match the .NET backend hub at /hubs/notifications.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
  HttpTransportType,
} from '@microsoft/signalr';
import type {
  EmergencyAlert as SharedEmergencyAlert,
  AssessmentUpdate as SharedAssessmentUpdate,
  ConnectionStatus,
} from '@attending/shared/hooks/useWebSocket';

// =============================================================================
// Types
// =============================================================================

interface WebSocketConfig {
  url?: string;
  sessionId: string;
  patientId?: string;
  patientName?: string;
  autoConnect?: boolean;
  onEmergencyAcknowledged?: (data: EmergencyAcknowledgment) => void;
  onProviderConnected?: (data: ProviderInfo) => void;
  onProviderMessage?: (message: ProviderMessage) => void;
}

interface SubmissionResult {
  success: boolean;
  assessmentId?: string;
  queuePosition?: number;
  error?: string;
}

interface EmergencyAlert {
  patientId: string;
  patientName: string;
  sessionId: string;
  type: string;
  urgencyLevel: 'critical' | 'emergent' | 'urgent';
  symptoms: string[];
  redFlags: string[];
  location?: { lat: number; lng: number };
}

interface EmergencyAcknowledgment {
  emergencyId: string;
  acknowledgedBy: string;
  acknowledgedAt: Date;
}

interface ProviderInfo {
  providerId: string;
  name: string;
  specialty?: string;
}

interface ProviderMessage {
  id: string;
  fromId: string;
  fromName: string;
  content: string;
  timestamp: Date;
}

interface AssessmentProgress {
  phase: string;
  progressPercent: number;
  urgencyLevel: string;
  redFlagCount: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  queuePosition: number | null;
  connectedProvider: ProviderInfo | null;
  lastEmergencyId: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useWebSocket(config: WebSocketConfig) {
  const connectionRef = useRef<HubConnection | null>(null);
  const reconnectAttempts = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    queuePosition: null,
    connectedProvider: null,
    lastEmergencyId: null,
  });

  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5260',
    sessionId,
    patientId,
    patientName = 'Patient',
    autoConnect = true,
    onEmergencyAcknowledged,
    onProviderConnected,
    onProviderMessage,
  } = config;

  // Build the SignalR hub URL
  const hubUrl = url.replace(/\/$/, '') + '/hubs/notifications';

  // Connect to SignalR hub
  const connect = useCallback(() => {
    if (
      connectionRef.current &&
      connectionRef.current.state !== HubConnectionState.Disconnected
    ) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: async () => {
          const session = await fetch('/api/auth/session').then(r => r.json());
          return session?.accessToken || '';
        },
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          reconnectAttempts.current = retryContext.previousRetryCount;
          if (retryContext.previousRetryCount >= 10) return null; // stop after 10
          // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .configureLogging(
        process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Warning
      )
      .build();

    // Connection lifecycle events
    connection.onreconnecting((error) => {
      console.log('[SignalR] Reconnecting...', error?.message);
      setState(prev => ({ ...prev, isConnected: false, isConnecting: true }));
    });

    connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected:', connectionId);
      reconnectAttempts.current = 0;
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));

      // Re-register as patient after reconnection
      connection.invoke('PatientJoin', {
        patientId: patientId || `patient_${sessionId}`,
        name: patientName,
        sessionId,
      }).catch(err => console.error('[SignalR] Re-registration failed:', err));
    });

    connection.onclose((error) => {
      console.log('[SignalR] Connection closed:', error?.message);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectedProvider: null,
      }));
    });

    // --- Server-to-client event handlers (PascalCase to match .NET hub) ---

    // Queue position updates
    connection.on('QueuePosition', (position: number) => {
      setState(prev => ({ ...prev, queuePosition: position }));
    });

    // Provider connected to this patient
    connection.on('ProviderConnected', (data: ProviderInfo) => {
      setState(prev => ({ ...prev, connectedProvider: data }));
      onProviderConnected?.(data);
    });

    connection.on('ProviderDisconnected', () => {
      setState(prev => ({ ...prev, connectedProvider: null }));
    });

    // Provider messages
    connection.on('ProviderMessageReceived', (message: ProviderMessage) => {
      onProviderMessage?.(message);
    });

    // Provider typing indicator
    connection.on('ProviderTyping', (_data: { isTyping: boolean }) => {
      // Can be used to show typing indicator in UI
    });

    // Emergency acknowledgment
    connection.on('EmergencyAcknowledged', (data: EmergencyAcknowledgment) => {
      onEmergencyAcknowledged?.(data);
    });

    // Assessment events
    connection.on('AssessmentSubmitted', (data: SubmissionResult) => {
      if (data.queuePosition) {
        setState(prev => ({ ...prev, queuePosition: data.queuePosition! }));
      }
    });

    connection.on('AssessmentBeingViewed', (_data: { viewerName: string }) => {
      // Can be used to show "provider is reviewing your assessment" indicator
    });

    connection.on('AssessmentStatusUpdated', (_data: { newStatus: string }) => {
      // Can be used to update assessment status in UI
    });

    // Error events from server
    connection.on('Error', (error: { code: string; message: string }) => {
      console.error('[SignalR] Server error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    });

    // Start the connection
    connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected to patient hub');
        reconnectAttempts.current = 0;
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));

        // Register as patient
        connection.invoke('PatientJoin', {
          patientId: patientId || `patient_${sessionId}`,
          name: patientName,
          sessionId,
        }).catch(err => console.error('[SignalR] PatientJoin failed:', err));
      })
      .catch((err) => {
        console.error('[SignalR] Connection failed:', err);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: 'Unable to connect. Please check your connection.',
        }));
      });

    connectionRef.current = connection;
  }, [hubUrl, sessionId, patientId, patientName, onEmergencyAcknowledged, onProviderConnected, onProviderMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.stop();
      connectionRef.current = null;
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectedProvider: null,
      }));
    }
  }, []);

  // Send emergency alert
  const sendEmergencyAlert = useCallback(
    (alert: Omit<EmergencyAlert, 'patientId' | 'patientName' | 'sessionId'>) => {
      if (
        !connectionRef.current ||
        connectionRef.current.state !== HubConnectionState.Connected
      ) {
        console.error('[SignalR] Cannot send emergency: not connected');
        return false;
      }

      const fullAlert: EmergencyAlert = {
        ...alert,
        patientId: patientId || `patient_${sessionId}`,
        patientName,
        sessionId,
      };

      connectionRef.current
        .invoke('PatientEmergency', fullAlert)
        .catch(err => console.error('[SignalR] Emergency alert failed:', err));

      return true;
    },
    [patientId, patientName, sessionId]
  );

  // Send assessment progress update
  const sendAssessmentProgress = useCallback(
    (progress: AssessmentProgress) => {
      if (
        !connectionRef.current ||
        connectionRef.current.state !== HubConnectionState.Connected
      ) {
        return;
      }

      connectionRef.current
        .invoke('PatientAssessmentUpdate', { sessionId, ...progress })
        .catch(err => console.error('[SignalR] Assessment update failed:', err));
    },
    [sessionId]
  );

  // Submit completed assessment
  const submitAssessment = useCallback(
    (assessment: Record<string, unknown>): Promise<SubmissionResult> => {
      return new Promise((resolve, reject) => {
        if (
          !connectionRef.current ||
          connectionRef.current.state !== HubConnectionState.Connected
        ) {
          reject(new Error('SignalR not connected'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Submission timeout'));
        }, 15000);

        // Listen for the one-time response
        const handler = (result: SubmissionResult) => {
          clearTimeout(timeout);
          connectionRef.current?.off('AssessmentSubmitted', handler);
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Submission failed'));
          }
        };

        connectionRef.current.on('AssessmentSubmitted', handler);

        connectionRef.current
          .invoke('AssessmentSubmit', {
            assessment,
            sessionId,
            patientId,
            patientName,
            submittedAt: new Date().toISOString(),
          })
          .catch((err) => {
            clearTimeout(timeout);
            connectionRef.current?.off('AssessmentSubmitted', handler);
            reject(err);
          });
      });
    },
    [sessionId, patientId, patientName]
  );

  // Send message to provider
  const sendMessage = useCallback((content: string) => {
    if (
      !connectionRef.current ||
      connectionRef.current.state !== HubConnectionState.Connected
    ) {
      return false;
    }

    connectionRef.current
      .invoke('PatientMessage', { content })
      .catch(err => console.error('[SignalR] Message send failed:', err));

    return true;
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean = true) => {
    if (
      !connectionRef.current ||
      connectionRef.current.state !== HubConnectionState.Connected
    ) {
      return;
    }
    connectionRef.current
      .invoke('PatientTyping', { isTyping })
      .catch(err => console.error('[SignalR] Typing indicator failed:', err));
  }, []);

  // Request provider connection
  const requestProvider = useCallback(() => {
    if (
      !connectionRef.current ||
      connectionRef.current.state !== HubConnectionState.Connected
    ) {
      return;
    }
    connectionRef.current
      .invoke('PatientRequestProvider')
      .catch(err => console.error('[SignalR] Provider request failed:', err));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, sessionId, connect, disconnect]);

  return {
    // State
    ...state,

    // Connection methods
    connect,
    disconnect,

    // Communication methods
    sendEmergencyAlert,
    sendAssessmentProgress,
    submitAssessment,
    sendMessage,
    sendTyping,
    requestProvider,
  };
}

export default useWebSocket;
