// ============================================================
// WebSocket Hook - @attending/shared
// apps/shared/hooks/useWebSocket.ts
//
// Unified WebSocket hook for both Provider and Patient portals
// Handles connection, events, and automatic reconnection
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================
// TYPES
// ============================================================

export interface WebSocketConfig {
  /** WebSocket server URL (defaults to NEXT_PUBLIC_WS_URL or localhost:3003) */
  url?: string;
  /** User role - provider or patient */
  role: 'provider' | 'patient';
  /** User ID */
  userId: string;
  /** User display name */
  userName: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Enable reconnection (default: true) */
  reconnection?: boolean;
  /** Max reconnection attempts (default: 5) */
  reconnectionAttempts?: number;
  /** Reconnection delay in ms (default: 3000) */
  reconnectionDelay?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface WebSocketActions {
  connect: () => void;
  disconnect: () => void;
  emit: <T = any>(event: string, data: T) => void;
  on: <T = any>(event: string, callback: (data: T) => void) => () => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useWebSocket(config: WebSocketConfig): WebSocketState & WebSocketActions & { socket: Socket | null } {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  // Get WebSocket URL from config or environment
  const wsUrl = config.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

  // =====================================================
  // CONNECT
  // =====================================================
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[WS] Already connected');
      return;
    }

    if (state.isConnecting) {
      console.log('[WS] Connection already in progress');
      return;
    }

    console.log('[WS] Connecting to:', wsUrl);
    setState(s => ({ ...s, isConnecting: true, error: null }));

    const queryParams = config.role === 'provider'
      ? { role: 'provider', providerId: config.userId, providerName: config.userName }
      : { role: 'patient', patientId: config.userId, patientName: config.userName };

    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: config.reconnection !== false,
      reconnectionAttempts: config.reconnectionAttempts ?? 5,
      reconnectionDelay: config.reconnectionDelay ?? 3000,
      timeout: 10000,
      query: queryParams,
    });

    // Connection successful
    socketRef.current.on('connect', () => {
      console.log('[WS] Connected successfully');
      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      });

      // Emit join event
      socketRef.current?.emit(`${config.role}:join`, {
        [`${config.role}Id`]: config.userId,
        [`${config.role}Name`]: config.userName,
        timestamp: new Date().toISOString(),
      });
    });

    // Disconnection
    socketRef.current.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(s => ({ ...s, isConnected: false }));
    });

    // Connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      setState(s => ({
        ...s,
        isConnecting: false,
        error: error.message,
        reconnectAttempts: s.reconnectAttempts + 1,
      }));
    });

    // Reconnection attempt
    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WS] Reconnection attempt:', attemptNumber);
      setState(s => ({ ...s, reconnectAttempts: attemptNumber }));
    });

    // Reconnection successful
    socketRef.current.on('reconnect', () => {
      console.log('[WS] Reconnected');
      setState(s => ({ ...s, isConnected: true, reconnectAttempts: 0 }));
    });

    // Reconnection failed
    socketRef.current.on('reconnect_failed', () => {
      console.error('[WS] Reconnection failed');
      setState(s => ({
        ...s,
        isConnecting: false,
        error: 'Failed to reconnect after multiple attempts',
      }));
    });

    // Ping/pong for keep-alive
    socketRef.current.on('ping', () => {
      socketRef.current?.emit('pong', { timestamp: Date.now() });
    });

  }, [wsUrl, config.role, config.userId, config.userName, config.reconnection, config.reconnectionAttempts, config.reconnectionDelay, state.isConnecting]);

  // =====================================================
  // DISCONNECT
  // =====================================================
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WS] Disconnecting...');
      socketRef.current.emit(`${config.role}:leave`);
      socketRef.current.disconnect();
      socketRef.current = null;
      setState({
        isConnected: false,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    }
  }, [config.role]);

  // =====================================================
  // EMIT EVENT
  // =====================================================
  const emit = useCallback(<T = any>(event: string, data: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WS] Cannot emit - not connected');
    }
  }, []);

  // =====================================================
  // SUBSCRIBE TO EVENT
  // =====================================================
  const on = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
    // Track callback for cleanup
    if (!callbacksRef.current.has(event)) {
      callbacksRef.current.set(event, new Set());
    }
    callbacksRef.current.get(event)!.add(callback);

    // Subscribe
    socketRef.current?.on(event, callback);

    // Return unsubscribe function
    return () => {
      socketRef.current?.off(event, callback);
      callbacksRef.current.get(event)?.delete(callback);
    };
  }, []);

  // =====================================================
  // UNSUBSCRIBE FROM EVENT
  // =====================================================
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socketRef.current?.off(event, callback);
      callbacksRef.current.get(event)?.delete(callback);
    } else {
      socketRef.current?.off(event);
      callbacksRef.current.delete(event);
    }
  }, []);

  // =====================================================
  // AUTO-CONNECT ON MOUNT
  // =====================================================
  useEffect(() => {
    if (config.autoConnect !== false && config.userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.userId]); // Only reconnect if userId changes

  return {
    ...state,
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

// ============================================================
// TYPED EVENT HELPERS
// ============================================================

// Provider-specific events
export interface ProviderWSEvents {
  'assessment:new': {
    assessment: any;
    timestamp: string;
    source: 'compass' | 'api' | 'webhook';
  };
  'assessment:urgent': {
    assessmentId: string;
    patientName: string;
    chiefComplaint: string;
    redFlags: string[];
    urgencyScore: number;
    timestamp: string;
  };
  'assessment:status-updated': {
    assessmentId: string;
    newStatus: string;
    updatedBy: string;
    timestamp: string;
  };
  'assessment:assigned': {
    assessmentId: string;
    patientName: string;
  };
  'provider:online': {
    providerId: string;
    providerName: string;
    status: string;
  };
  'provider:offline': {
    providerId: string;
  };
  'queue:status': {
    assessments: any[];
    providers: number;
  };
}

// Patient-specific events
export interface PatientWSEvents {
  'assessment:submitted': {
    success: boolean;
    assessmentId: string;
    queuePosition: number;
  };
  'assessment:reviewed': {
    assessmentId: string;
    providerName: string;
  };
}

export default useWebSocket;
