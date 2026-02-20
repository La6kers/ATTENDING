// ============================================================
// ATTENDING AI - Shared WebSocket Types & Connection Primitive
// apps/shared/hooks/useWebSocket.ts
//
// This module provides:
// 1. Shared types used by both provider and patient portals
// 2. A base connection hook (useWebSocketConnection) that handles
//    socket lifecycle, reconnection, and status tracking
//
// Portal-specific hooks should COMPOSE this base hook, not duplicate it.
// See:
//   - provider-portal/hooks/useWebSocket.ts (adds clinical events, audio alerts)
//   - patient-portal/hooks/useWebSocket.ts (adds queue, provider matching)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// =============================================================================
// Shared Types (used by both portals)
// =============================================================================

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
  patientName?: string;
  phase: string;
  progressPercent: number;
  urgencyLevel: string;
  redFlagCount: number;
  chiefComplaint?: string;
  timestamp: Date;
}

export interface PresenceUser {
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

export interface WebSocketMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  type: 'text' | 'system' | 'alert' | 'clinical';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// =============================================================================
// Base Connection Config
// =============================================================================

export interface BaseWebSocketConfig {
  /** WebSocket server URL (defaults to NEXT_PUBLIC_WS_URL) */
  url?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Max reconnection attempts */
  reconnectAttempts?: number;
  /** Reconnection delay in ms */
  reconnectDelay?: number;
  /** Socket.io auth payload */
  auth?: Record<string, unknown>;
  /** Called on successful connection */
  onConnect?: (socket: Socket) => void;
  /** Called on disconnect */
  onDisconnect?: (reason: string) => void;
  /** Called on connection error */
  onError?: (error: Error) => void;
}

export interface BaseWebSocketHook {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether currently connected */
  isConnected: boolean;
  /** Error message, if any */
  error: string | null;
  /** Raw socket reference for attaching custom event handlers */
  socket: Socket | null;
  /** Manually connect */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Emit an event (returns false if not connected) */
  emit: (event: string, data: unknown) => boolean;
}

// =============================================================================
// Base Connection Hook
//
// Handles socket lifecycle, reconnection, and status tracking.
// Portal-specific hooks compose this with their own event handlers.
// =============================================================================

export function useWebSocketConnection(config: BaseWebSocketConfig): BaseWebSocketHook {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003',
    autoConnect = true,
    reconnectAttempts = 10,
    reconnectDelay = 1000,
    auth,
    onConnect,
    onDisconnect,
    onError,
  } = config;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setStatus('connecting');
    setError(null);

    const socket = io(url, {
      auth,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
      reconnectCountRef.current = 0;
      onConnect?.(socket);
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      onDisconnect?.(reason);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      reconnectCountRef.current++;
      if (reconnectCountRef.current >= reconnectAttempts) {
        setStatus('error');
        setError('Failed to connect after multiple attempts');
      } else {
        setStatus('reconnecting');
      }
      onError?.(err);
    });

    socket.io.on('reconnect', () => {
      setStatus('connected');
      setError(null);
      reconnectCountRef.current = 0;
    });

    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setStatus('error');
      setError('Failed to reconnect after multiple attempts');
    });

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (socket.connected) socket.emit('ping');
    }, 30000);

    socket.on('pong', () => { /* alive */ });

    socketRef.current = socket;

    // Cleanup on unmount or reconnect
    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [url, auth, reconnectAttempts, reconnectDelay, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  const emit = useCallback((event: string, data: unknown): boolean => {
    if (!socketRef.current?.connected) {
      console.warn('[WS] Cannot emit, not connected');
      return false;
    }
    socketRef.current.emit(event, data);
    return true;
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => { disconnect(); };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    isConnected: status === 'connected',
    error,
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
  };
}

// =============================================================================
// Audio Utilities (shared between portals)
// =============================================================================

export function playEmergencySound(urgency: 'critical' | 'emergent' | 'urgent'): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number[]> = {
      critical: [880, 1100, 880, 1100],
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
    console.warn('[WS] Could not play emergency sound:', e);
  }
}

export default useWebSocketConnection;
