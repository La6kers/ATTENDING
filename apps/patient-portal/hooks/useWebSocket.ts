// ============================================================
// WebSocket Client Hook
// apps/patient-portal/hooks/useWebSocket.ts
//
// Manages WebSocket connection for real-time communication
// with the notification server
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url?: string;
  sessionId: string;
  patientId?: string;
  autoConnect?: boolean;
}

interface SubmissionResult {
  success: boolean;
  assessmentId?: string;
  queuePosition?: number;
  error?: string;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  queuePosition: number | null;
}

export function useWebSocket(config: WebSocketConfig) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    queuePosition: null,
  });

  const { 
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003',
    sessionId,
    patientId,
    autoConnect = true,
  } = config;

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      query: {
        role: 'patient',
        sessionId,
        patientId: patientId || `temp_${Date.now()}`,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to notification server');
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      
      // Register as patient
      socket.emit('patient:join', {
        patientId: patientId || `temp_${Date.now()}`,
        sessionId,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Unable to connect to server'
      }));
    });

    // Assessment submission acknowledged
    socket.on('assessment:submitted', (data: SubmissionResult) => {
      console.log('[WS] Assessment submitted:', data);
      if (data.success) {
        setState(prev => ({ ...prev, queuePosition: data.queuePosition || null }));
      }
    });

    // Queue position update
    socket.on('queue:update', (data: { position: number }) => {
      setState(prev => ({ ...prev, queuePosition: data.position }));
    });

    // Provider is viewing your assessment
    socket.on('assessment:being-viewed', (data: { viewerName: string }) => {
      console.log(`[WS] Assessment being viewed by ${data.viewerName}`);
    });

    // Assessment status changed
    socket.on('assessment:status-updated', (data: { newStatus: string }) => {
      console.log('[WS] Assessment status updated:', data.newStatus);
    });

    // Server shutdown
    socket.on('server:shutdown', () => {
      console.log('[WS] Server shutting down');
      setState(prev => ({ ...prev, isConnected: false }));
    });

    // Ping/pong for keepalive
    socket.on('pong', () => {
      // Connection is alive
    });

    socketRef.current = socket;

    // Store socket reference globally for other components
    if (typeof window !== 'undefined') {
      (window as any).socket = socket;
    }
  }, [url, sessionId, patientId]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
      
      if (typeof window !== 'undefined') {
        delete (window as any).socket;
      }
    }
  }, []);

  // Submit assessment via WebSocket
  const submitAssessment = useCallback((assessment: any): Promise<SubmissionResult> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Set up one-time listener for response
      socketRef.current.once('assessment:submitted', (result: SubmissionResult) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Submission failed'));
        }
      });

      // Send assessment
      socketRef.current.emit('assessment:submit', {
        assessment,
        sessionId,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Submission timeout'));
      }, 10000);
    });
  }, [sessionId]);

  // Send typing indicator
  const sendTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('patient:typing', { sessionId });
    }
  }, [sessionId]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, sessionId, connect, disconnect]);

  // Ping to keep connection alive
  useEffect(() => {
    if (!state.isConnected) return;

    const pingInterval = setInterval(() => {
      socketRef.current?.emit('ping');
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [state.isConnected]);

  return {
    ...state,
    connect,
    disconnect,
    submitAssessment,
    sendTyping,
    socket: socketRef.current,
  };
}

export default useWebSocket;
