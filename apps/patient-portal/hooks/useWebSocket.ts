// ============================================================
// ATTENDING AI - Enhanced WebSocket Client Hook
// apps/patient-portal/hooks/useWebSocket.ts
//
// Real-time communication for:
// - Emergency alerts
// - Assessment progress
// - Provider connection
// - Queue updates
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    queuePosition: null,
    connectedProvider: null,
    lastEmergencyId: null,
  });

  const { 
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    sessionId,
    patientId,
    patientName = 'Patient',
    autoConnect = true,
    onEmergencyAcknowledged,
    onProviderConnected,
    onProviderMessage,
  } = config;

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      auth: {
        role: 'patient',
        sessionId,
        patientId: patientId || `patient_${Date.now()}`,
        patientName,
      },
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[WS] Connected to server');
      reconnectAttempts.current = 0;
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
      
      // Register as patient
      socket.emit('patient:join', {
        patientId: patientId || `patient_${Date.now()}`,
        name: patientName,
        sessionId,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false, connectedProvider: null }));
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: 'Unable to connect. Please check your connection.'
        }));
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[WS] Reconnected after', attemptNumber, 'attempts');
      reconnectAttempts.current = 0;
    });

    // Queue position updates
    socket.on('queue-position', (position: number) => {
      console.log('[WS] Queue position:', position);
      setState(prev => ({ ...prev, queuePosition: position }));
    });

    // Provider connected to this patient
    socket.on('provider:connected', (data: ProviderInfo) => {
      console.log('[WS] Provider connected:', data.name);
      setState(prev => ({ ...prev, connectedProvider: data }));
      onProviderConnected?.(data);
    });

    socket.on('provider:disconnected', () => {
      console.log('[WS] Provider disconnected');
      setState(prev => ({ ...prev, connectedProvider: null }));
    });

    // Provider messages
    socket.on('provider:message-received', (message: ProviderMessage) => {
      console.log('[WS] Provider message:', message.content);
      onProviderMessage?.(message);
    });

    // Provider typing indicator
    socket.on('provider:typing', (data: { isTyping: boolean }) => {
      // Can be used to show typing indicator
      console.log('[WS] Provider typing:', data.isTyping);
    });

    // Emergency acknowledgment
    socket.on('emergency:acknowledged', (data: EmergencyAcknowledgment) => {
      console.log('[WS] Emergency acknowledged by:', data.acknowledgedBy);
      onEmergencyAcknowledged?.(data);
    });

    // Assessment events
    socket.on('assessment:submitted', (data: SubmissionResult) => {
      console.log('[WS] Assessment submitted:', data);
      if (data.queuePosition) {
        setState(prev => ({ ...prev, queuePosition: data.queuePosition! }));
      }
    });

    socket.on('assessment:being-viewed', (data: { viewerName: string }) => {
      console.log('[WS] Assessment being viewed by:', data.viewerName);
    });

    socket.on('assessment:status-updated', (data: { newStatus: string }) => {
      console.log('[WS] Assessment status:', data.newStatus);
    });

    // Error events
    socket.on('error', (error: { code: string; message: string }) => {
      console.error('[WS] Server error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    });

    // Ping/pong for connection health
    socket.on('pong', () => {
      // Connection is healthy
    });

    socketRef.current = socket;

    // Store socket reference globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).__attendingSocket = socket;
    }
  }, [url, sessionId, patientId, patientName, onEmergencyAcknowledged, onProviderConnected, onProviderMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectedProvider: null 
      }));
      
      if (typeof window !== 'undefined') {
        delete (window as any).__attendingSocket;
      }
    }
  }, []);

  // Send emergency alert
  const sendEmergencyAlert = useCallback((alert: Omit<EmergencyAlert, 'patientId' | 'patientName' | 'sessionId'>) => {
    if (!socketRef.current?.connected) {
      console.error('[WS] Cannot send emergency: not connected');
      return false;
    }

    const fullAlert: EmergencyAlert = {
      ...alert,
      patientId: patientId || `patient_${Date.now()}`,
      patientName,
      sessionId,
    };

    console.log('[WS] Sending emergency alert:', fullAlert.type);
    socketRef.current.emit('patient:emergency', fullAlert);
    
    return true;
  }, [patientId, patientName, sessionId]);

  // Send assessment progress update
  const sendAssessmentProgress = useCallback((progress: AssessmentProgress) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('patient:assessment-update', {
      sessionId,
      ...progress,
    });
  }, [sessionId]);

  // Submit completed assessment
  const submitAssessment = useCallback((assessment: any): Promise<SubmissionResult> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Submission timeout'));
      }, 15000);

      socketRef.current.once('assessment:submitted', (result: SubmissionResult) => {
        clearTimeout(timeout);
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Submission failed'));
        }
      });

      socketRef.current.emit('assessment:submit', {
        assessment,
        sessionId,
        patientId,
        patientName,
        submittedAt: new Date().toISOString(),
      });
    });
  }, [sessionId, patientId, patientName]);

  // Send message to provider
  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current?.connected) return false;

    socketRef.current.emit('patient:message', { content });
    return true;
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean = true) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('patient:typing', { isTyping });
  }, []);

  // Request provider connection
  const requestProvider = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('patient:request-provider');
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

  // Keep-alive ping
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 25000);

    return () => clearInterval(pingInterval);
  }, [state.isConnected]);

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
    
    // Socket reference (for advanced use)
    socket: socketRef.current,
  };
}

export default useWebSocket;
