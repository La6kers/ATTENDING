// =============================================================================
// ATTENDING AI - WebSocket Provider
// apps/shared/lib/websocket/WebSocketProvider.tsx
//
// React context provider with audio alerts for clinical events
// =============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { WebSocketClient, getWebSocketClient } from './WebSocketClient';
import {
  WebSocketConfig, ConnectionState, WebSocketChannel, EventHandler,
  AudioAlertConfig, DEFAULT_AUDIO_ALERTS, AlertSoundType,
  EmergencyAlertEvent, CriticalResultEvent, AssessmentQueueEvent,
} from './types';

// =============================================================================
// Context Types
// =============================================================================

interface WebSocketContextValue {
  client: WebSocketClient;
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  subscribe: <T>(channel: WebSocketChannel, handler: EventHandler<T>, event?: string) => () => void;
  playAlert: (type: AlertSoundType) => void;
  setAudioEnabled: (enabled: boolean) => void;
  audioEnabled: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

interface WebSocketProviderProps {
  children: ReactNode;
  config?: Partial<WebSocketConfig>;
  audioConfig?: Partial<AudioAlertConfig>;
  autoConnect?: boolean;
  token?: string;
  onEmergencyAlert?: (alert: EmergencyAlertEvent) => void;
  onCriticalResult?: (result: CriticalResultEvent) => void;
  onUrgentAssessment?: (assessment: AssessmentQueueEvent) => void;
  onConnectionChange?: (state: ConnectionState) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

export function WebSocketProvider({
  children,
  config,
  audioConfig,
  autoConnect = true,
  token,
  onEmergencyAlert,
  onCriticalResult,
  onUrgentAssessment,
  onConnectionChange,
}: WebSocketProviderProps): JSX.Element {
  const clientRef = useRef<WebSocketClient>(getWebSocketClient(config));
  const audioRefs = useRef<Map<AlertSoundType, HTMLAudioElement>>(new Map());

  const [connectionState, setConnectionState] = useState<ConnectionState>(clientRef.current.getState());
  const [audioEnabled, setAudioEnabled] = useState(audioConfig?.enabled ?? DEFAULT_AUDIO_ALERTS.enabled);

  const finalAudioConfig: AudioAlertConfig = { ...DEFAULT_AUDIO_ALERTS, ...audioConfig };

  // ===========================================================================
  // Audio Alert System
  // ===========================================================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    Object.entries(finalAudioConfig.alerts).forEach(([type, src]) => {
      const audio = new Audio(src);
      audio.volume = finalAudioConfig.volume;
      audio.preload = 'auto';
      audioRefs.current.set(type as AlertSoundType, audio);
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  const playAlert = useCallback((type: AlertSoundType) => {
    if (!audioEnabled) return;

    const audio = audioRefs.current.get(type);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((err) => console.warn('[WebSocket] Audio play failed:', err));
    }
  }, [audioEnabled]);

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  const connect = useCallback(async (authToken?: string) => {
    try {
      await clientRef.current.connect(authToken || token);
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      throw error;
    }
  }, [token]);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
  }, []);

  const subscribe = useCallback(<T,>(channel: WebSocketChannel, handler: EventHandler<T>, event?: string) => {
    return clientRef.current.subscribe(channel, handler, event);
  }, []);

  // ===========================================================================
  // Connection State Listener
  // ===========================================================================

  useEffect(() => {
    const unsubscribe = clientRef.current.onConnectionChange((state) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    });

    return unsubscribe;
  }, [onConnectionChange]);

  // ===========================================================================
  // Auto-Connect
  // ===========================================================================

  useEffect(() => {
    if (autoConnect && token) {
      connect(token).catch(() => {});
    }

    return () => {
      if (autoConnect) disconnect();
    };
  }, [autoConnect, token]);

  // ===========================================================================
  // Clinical Alert Subscriptions
  // ===========================================================================

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Emergency alerts
    if (onEmergencyAlert) {
      unsubscribers.push(
        clientRef.current.subscribe<EmergencyAlertEvent>('emergency:alerts', (payload) => {
          playAlert('emergency');
          onEmergencyAlert(payload);
        })
      );
      unsubscribers.push(
        clientRef.current.subscribe<EmergencyAlertEvent>('emergency:broadcast', (payload) => {
          playAlert('emergency');
          onEmergencyAlert(payload);
        })
      );
    }

    // Critical results
    if (onCriticalResult) {
      unsubscribers.push(
        clientRef.current.subscribe<CriticalResultEvent>('results:critical', (payload) => {
          playAlert(payload.criticalityLevel === 'panic' ? 'emergency' : 'critical');
          onCriticalResult(payload);
        })
      );
    }

    // Urgent assessments
    if (onUrgentAssessment) {
      unsubscribers.push(
        clientRef.current.subscribe<AssessmentQueueEvent>('assessments:urgent', (payload) => {
          playAlert('urgent');
          onUrgentAssessment(payload);
        })
      );
    }

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [onEmergencyAlert, onCriticalResult, onUrgentAssessment, playAlert]);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue: WebSocketContextValue = {
    client: clientRef.current,
    connectionState,
    isConnected: connectionState.status === 'connected',
    connect,
    disconnect,
    subscribe,
    playAlert,
    setAudioEnabled,
    audioEnabled,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// =============================================================================
// Connection Status Component
// =============================================================================

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps): JSX.Element {
  const { connectionState, isConnected } = useWebSocketContext();

  const statusColors: Record<string, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    reconnecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${statusColors[connectionState.status] || 'bg-gray-500'}`} />
      <span className="text-sm capitalize">{connectionState.status}</span>
      {showDetails && connectionState.status === 'reconnecting' && (
        <span className="text-xs text-gray-500">
          (Attempt {connectionState.reconnectAttempts})
        </span>
      )}
    </div>
  );
}

export { WebSocketContext };
