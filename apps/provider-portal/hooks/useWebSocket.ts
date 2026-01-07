// WebSocket Hook for Real-time Updates
// apps/provider-portal/hooks/useWebSocket.ts

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

type MessageHandler = (data: any) => void;

interface UseWebSocketOptions {
  onNotification?: (notification: any) => void;
  onEmergency?: (alert: any) => void;
  onCriticalResult?: (result: any) => void;
  onAssessmentUpdate?: (assessment: any) => void;
  autoConnect?: boolean;
}

interface WebSocketState {
  isConnected: boolean;
  lastMessage: any;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    error: null,
  });

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

  // Register message handlers
  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  // Remove message handler
  const off = useCallback((type: string, handler: MessageHandler) => {
    handlersRef.current.get(type)?.delete(handler);
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      setState(prev => ({ ...prev, lastMessage: data }));

      // Route to specific handlers
      const handlers = handlersRef.current.get(data.type);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }

      // Call option handlers
      switch (data.type) {
        case 'URGENT_ASSESSMENT':
        case 'NEW_ASSESSMENT':
          options.onAssessmentUpdate?.(data);
          options.onNotification?.(data);
          break;
        case 'RED_FLAG_DETECTED':
        case 'EMERGENCY_PROTOCOL_ACTIVATED':
          options.onEmergency?.(data);
          options.onNotification?.(data);
          playAlertSound('emergency');
          break;
        case 'CRITICAL_LAB_RESULT':
          options.onCriticalResult?.(data);
          options.onNotification?.(data);
          playAlertSound('critical');
          break;
        default:
          if (data.type?.includes('NOTIFICATION') || data.type?.includes('MESSAGE')) {
            options.onNotification?.(data);
          }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [options]);

  // Play alert sound
  const playAlertSound = (type: 'emergency' | 'critical' | 'normal') => {
    if (typeof window === 'undefined') return;
    
    try {
      const frequencies: Record<string, number[]> = {
        emergency: [880, 440, 880, 440], // Urgent alternating tones
        critical: [660, 550, 660],       // Critical three-tone
        normal: [440],                   // Single beep
      };

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const tones = frequencies[type] || frequencies.normal;
      
      tones.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.2 + 0.15);
        
        oscillator.start(audioContext.currentTime + i * 0.2);
        oscillator.stop(audioContext.currentTime + i * 0.2 + 0.15);
      });
    } catch (error) {
      console.log('Audio not available');
    }
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!session?.user?.id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        setState(prev => ({ ...prev, isConnected: true, error: null }));

        // Authenticate
        wsRef.current?.send(JSON.stringify({
          type: 'AUTH',
          payload: {
            userId: session.user.id,
            role: session.user.role,
          },
        }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: error as any }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setState(prev => ({ ...prev, error: error as Error }));
    }
  }, [session?.user?.id, session?.user?.role, handleMessage, wsUrl]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  // Send message
  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Subscribe to specific encounter updates
  const subscribeToEncounter = useCallback((encounterId: string) => {
    send('SUBSCRIBE_ENCOUNTER', { encounterId });
  }, [send]);

  // Unsubscribe from encounter updates
  const unsubscribeFromEncounter = useCallback((encounterId: string) => {
    send('UNSUBSCRIBE_ENCOUNTER', { encounterId });
  }, [send]);

  // Auto-connect on mount
  useEffect(() => {
    if (options.autoConnect !== false && session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, options.autoConnect]);

  return {
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    error: state.error,
    connect,
    disconnect,
    send,
    on,
    off,
    subscribeToEncounter,
    unsubscribeFromEncounter,
    playAlertSound,
  };
}

export default useWebSocket;
