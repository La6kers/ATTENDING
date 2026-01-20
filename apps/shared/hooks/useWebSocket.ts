// ============================================================
// ATTENDING AI - WebSocket Client Hook
// apps/shared/hooks/useWebSocket.ts
//
// Real-time communication hook for patient-provider connection
// Revolutionary Feature: Live emergency alerts & assessment sync
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// =============================================================================
// Types
// =============================================================================

export interface User {
  id: string;
  socketId: string;
  type: 'provider' | 'patient';
  name: string;
  role?: string;
  connectedAt: Date;
  lastSeen: Date;
  currentPatientId?: string;
  sessionId?: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  type: 'text' | 'system' | 'alert' | 'clinical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  sessionId: string;
  type: string;
  urgencyLevel: 'critical' | 'emergent' | 'urgent';
  symptoms: string[];
  redFlags: string[];
  location?: { lat: number; lng: number };
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AssessmentUpdate {
  sessionId: string;
  patientId: string;
  phase: string;
  progressPercent: number;
  urgencyLevel: string;
  redFlagCount: number;
  timestamp: Date;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface WebSocketConfig {
  url?: string;
  userType: 'provider' | 'patient';
  userId: string;
  userName: string;
  userRole?: string;
  sessionId?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onEmergencyAlert?: (alert: EmergencyAlert) => void;
  onMessage?: (message: Message) => void;
  onAssessmentUpdate?: (update: AssessmentUpdate) => void;
  onPresenceUpdate?: (users: User[]) => void;
  onProviderConnected?: (data: { providerId: string; name: string }) => void;
  onQueuePosition?: (position: number) => void;
}

export interface WebSocketHook {
  // State
  status: ConnectionStatus;
  isConnected: boolean;
  activeUsers: User[];
  activeEmergencies: EmergencyAlert[];
  queuePosition: number | null;
  error: string | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  sendMessage: (toId: string, content: string, metadata?: Record<string, any>) => void;
  triggerEmergency: (alert: Omit<EmergencyAlert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeEmergency: (emergencyId: string) => void;
  sendAssessmentUpdate: (update: Omit<AssessmentUpdate, 'timestamp'>) => void;
  viewPatient: (patientId: string) => void;
  requestProvider: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWebSocket(config: WebSocketConfig): WebSocketHook {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    userType,
    userId,
    userName,
    userRole,
    sessionId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onEmergencyAlert,
    onMessage,
    onAssessmentUpdate,
    onPresenceUpdate,
    onProviderConnected,
    onQueuePosition,
  } = config;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [activeEmergencies, setActiveEmergencies] = useState<EmergencyAlert[]>([]);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setStatus('connecting');
    setError(null);

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
      setStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Join as provider or patient
      if (userType === 'provider') {
        socket.emit('provider:join', {
          providerId: userId,
          name: userName,
          role: userRole || 'Physician',
        });
      } else {
        socket.emit('patient:join', {
          patientId: userId,
          name: userName,
          sessionId: sessionId || `session-${Date.now()}`,
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setStatus('disconnected');

      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err);
      setStatus('error');
      setError(`Connection failed: ${err.message}`);
    });

    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
      reconnectAttemptsRef.current++;
    });

    socket.io.on('reconnect', () => {
      console.log('[WebSocket] Reconnected');
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
    });

    socket.io.on('reconnect_failed', () => {
      setStatus('error');
      setError('Failed to reconnect after multiple attempts');
    });

    // Presence updates
    socket.on('presence-update', (users: User[]) => {
      setActiveUsers(users);
      onPresenceUpdate?.(users);
    });

    // Emergency alerts
    socket.on('emergency:new', (alert: EmergencyAlert) => {
      console.log('[WebSocket] Emergency alert:', alert);
      setActiveEmergencies(prev => [...prev, alert]);
      onEmergencyAlert?.(alert);

      // Play audio alert for providers
      if (userType === 'provider') {
        playEmergencySound(alert.urgencyLevel);
      }
    });

    socket.on('emergency:acknowledged', (data: { emergencyId: string; acknowledgedBy: string }) => {
      setActiveEmergencies(prev =>
        prev.map(e =>
          e.id === data.emergencyId
            ? { ...e, acknowledged: true, acknowledgedBy: data.acknowledgedBy, acknowledgedAt: new Date() }
            : e
        )
      );
    });

    // Messages
    socket.on('patient:message-received', (message: Message) => {
      onMessage?.(message);
    });

    socket.on('provider:message-received', (message: Message) => {
      onMessage?.(message);
    });

    // Assessment updates (for providers)
    socket.on('patient:assessment-updated', (update: AssessmentUpdate) => {
      onAssessmentUpdate?.(update);
    });

    // Patient-specific events
    if (userType === 'patient') {
      socket.on('provider:connected', (data: { providerId: string; name: string }) => {
        console.log('[WebSocket] Provider connected:', data);
        onProviderConnected?.(data);
      });

      socket.on('queue-position', (position: number) => {
        setQueuePosition(position);
        onQueuePosition?.(position);
      });
    }

    // Patient connection/disconnection (for providers)
    if (userType === 'provider') {
      socket.on('patient:connected', (user: User) => {
        setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
        onPresenceUpdate?.([...activeUsers.filter(u => u.id !== user.id), user]);
      });

      socket.on('patient:disconnected', (data: { patientId: string }) => {
        setActiveUsers(prev => prev.filter(u => u.id !== data.patientId));
      });
    }

    // Error handling
    socket.on('error', (err: { code: string; message: string }) => {
      console.error('[WebSocket] Error:', err);
      setError(err.message);
    });

    // Keep-alive
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    socket.on('pong', () => {
      // Connection is alive
    });

    socketRef.current = socket;

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [url, userType, userId, userName, userRole, sessionId, reconnectAttempts, reconnectDelay,
      onEmergencyAlert, onMessage, onAssessmentUpdate, onPresenceUpdate, onProviderConnected, onQueuePosition, activeUsers]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    socketRef.current?.disconnect();
    setStatus('disconnected');
  }, []);

  // Send message
  const sendMessage = useCallback((toId: string, content: string, metadata?: Record<string, any>) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Not connected, cannot send message');
      return;
    }

    if (userType === 'provider') {
      socketRef.current.emit('provider:message', {
        patientId: toId,
        content,
        metadata,
      });
    } else {
      socketRef.current.emit('patient:message', {
        content,
        metadata,
      });
    }
  }, [userType]);

  // Trigger emergency
  const triggerEmergency = useCallback((alert: Omit<EmergencyAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Not connected, cannot trigger emergency');
      return;
    }

    socketRef.current.emit('patient:emergency', alert);
  }, []);

  // Acknowledge emergency
  const acknowledgeEmergency = useCallback((emergencyId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('provider:acknowledge-emergency', { emergencyId });
  }, []);

  // Send assessment update
  const sendAssessmentUpdate = useCallback((update: Omit<AssessmentUpdate, 'timestamp'>) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('patient:assessment-update', update);
  }, []);

  // View patient (provider only)
  const viewPatient = useCallback((patientId: string) => {
    if (!socketRef.current?.connected || userType !== 'provider') return;

    socketRef.current.emit('provider:view-patient', { patientId });
  }, [userType]);

  // Request provider (patient only)
  const requestProvider = useCallback(() => {
    if (!socketRef.current?.connected || userType !== 'patient') return;

    socketRef.current.emit('patient:request-provider');
  }, [userType]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    isConnected: status === 'connected',
    activeUsers,
    activeEmergencies,
    queuePosition,
    error,
    connect,
    disconnect,
    sendMessage,
    triggerEmergency,
    acknowledgeEmergency,
    sendAssessmentUpdate,
    viewPatient,
    requestProvider,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function playEmergencySound(urgency: 'critical' | 'emergent' | 'urgent') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different tones for different urgency levels
    const frequencies = {
      critical: [880, 1100, 880, 1100], // Alternating high tones
      emergent: [660, 880, 660],
      urgent: [440, 550],
    };

    const freq = frequencies[urgency];
    let time = audioContext.currentTime;

    freq.forEach((f, i) => {
      oscillator.frequency.setValueAtTime(f, time + i * 0.2);
    });

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + freq.length * 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + freq.length * 0.2);
  } catch (e) {
    console.warn('[WebSocket] Could not play emergency sound:', e);
  }
}

export default useWebSocket;
