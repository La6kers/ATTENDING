// =============================================================================
// ATTENDING AI - WebSocket Hook for Provider Portal
// apps/provider-portal/hooks/useWebSocket.ts
//
// Real-time WebSocket connection with audio alerts for critical notifications.
// Integrates with the unified provider store for state management.
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useProviderStore } from '@/store/useProviderStore';

// ============================================================================
// Types
// ============================================================================

export type NotificationType = 
  | 'assessment:new'
  | 'assessment:urgent'
  | 'assessment:status-updated'
  | 'red-flag:detected'
  | 'lab:critical'
  | 'lab:ready'
  | 'message:received'
  | 'provider:online'
  | 'provider:offline'
  | 'server:shutdown';

export interface WebSocketConfig {
  url: string;
  providerId: string;
  providerName: string;
  autoConnect?: boolean;
  enableAudioAlerts?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEventTime: string | null;
}

// ============================================================================
// Audio Alert Manager
// ============================================================================

class AudioAlertManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private alertSounds: Record<string, AudioBuffer | null> = {
    critical: null,
    urgent: null,
    standard: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private async initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Generate simple alert tones
      this.alertSounds.critical = await this.generateTone(880, 0.3, 3); // High A, 3 beeps
      this.alertSounds.urgent = await this.generateTone(660, 0.2, 2);   // E, 2 beeps
      this.alertSounds.standard = await this.generateTone(440, 0.15, 1); // A, 1 beep
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  private async generateTone(frequency: number, duration: number, repeats: number): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const totalDuration = (duration + 0.1) * repeats; // duration + gap between beeps
    const buffer = this.audioContext.createBuffer(1, sampleRate * totalDuration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let r = 0; r < repeats; r++) {
      const startSample = Math.floor(r * (duration + 0.1) * sampleRate);
      const endSample = Math.floor(startSample + duration * sampleRate);
      
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const envelope = Math.sin(Math.PI * t / duration); // Fade in/out
        data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      }
    }

    return buffer;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async play(type: 'critical' | 'urgent' | 'standard') {
    if (!this.enabled || !this.audioContext || !this.alertSounds[type]) {
      return;
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = this.alertSounds[type];
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }
}

// ============================================================================
// WebSocket Hook
// ============================================================================

export function useWebSocket(config: WebSocketConfig) {
  const socketRef = useRef<Socket | null>(null);
  const audioManagerRef = useRef<AudioAlertManager | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEventTime: null,
  });

  // Store actions
  const {
    setConnectionStatus,
    addAssessment,
    updateAssessment,
    addRedFlag,
    addNotification,
    audioAlertsEnabled,
  } = useProviderStore();

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new AudioAlertManager();
    return () => {
      audioManagerRef.current = null;
    };
  }, []);

  // Sync audio alerts enabled with store
  useEffect(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.setEnabled(audioAlertsEnabled);
    }
  }, [audioAlertsEnabled]);

  // Handle incoming events
  const handleEvent = useCallback((eventType: string, data: any) => {
    setState(prev => ({ ...prev, lastEventTime: new Date().toISOString() }));

    switch (eventType) {
      case 'assessment:new':
        addAssessment(data.assessment);
        if (data.assessment.urgencyLevel === 'critical' || data.assessment.urgencyLevel === 'emergent') {
          audioManagerRef.current?.play('urgent');
        }
        break;

      case 'assessment:urgent':
        addNotification({
          type: 'escalation',
          title: '🚨 URGENT Assessment',
          message: `${data.patientName}: ${data.chiefComplaint}`,
          assessmentId: data.assessmentId,
          urgency: 'critical',
        });
        audioManagerRef.current?.play('critical');
        break;

      case 'red-flag:detected':
        if (data.assessmentId) {
          addRedFlag(data.assessmentId, {
            id: `rf-${Date.now()}`,
            symptom: data.symptom,
            severity: data.severity || 'critical',
            detectedAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
        addNotification({
          type: 'red-flag',
          title: '⚠️ RED FLAG',
          message: data.symptom,
          assessmentId: data.assessmentId,
          urgency: 'critical',
        });
        audioManagerRef.current?.play('critical');
        break;

      case 'assessment:status-updated':
        updateAssessment(data.assessmentId, { status: data.newStatus });
        break;

      case 'lab:critical':
        addNotification({
          type: 'red-flag',
          title: '🔬 CRITICAL Lab Result',
          message: `${data.patientName}: ${data.testName} = ${data.value}`,
          assessmentId: data.assessmentId,
          urgency: 'critical',
        });
        audioManagerRef.current?.play('critical');
        break;

      case 'lab:ready':
        addNotification({
          type: 'system',
          title: 'Lab Result Ready',
          message: `${data.patientName}: ${data.testName}`,
          assessmentId: data.assessmentId,
          urgency: data.isAbnormal ? 'urgent' : 'routine',
        });
        if (data.isAbnormal) {
          audioManagerRef.current?.play('urgent');
        }
        break;

      case 'message:received':
        addNotification({
          type: 'message',
          title: 'New Message',
          message: `${data.senderName}: ${data.preview}`,
          assessmentId: data.assessmentId,
          urgency: 'routine',
        });
        audioManagerRef.current?.play('standard');
        break;

      case 'provider:online':
      case 'provider:offline':
        // Could update a provider list in store
        break;

      case 'server:shutdown':
        setState(prev => ({ ...prev, error: 'Server is shutting down' }));
        break;
    }
  }, [addAssessment, updateAssessment, addRedFlag, addNotification]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(config.url, {
      query: {
        role: 'provider',
        providerId: config.providerId,
        providerName: config.providerName,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to notification server');
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
      setConnectionStatus(true);
      reconnectAttemptsRef.current = 0;
      
      // Register as provider
      socket.emit('provider:join', {
        providerId: config.providerId,
        providerName: config.providerName,
      });

      config.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
      config.onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: 'Failed to connect to notification server' 
        }));
      }
      
      config.onError?.(error);
    });

    // Event handlers
    socket.on('assessment:new', (data) => handleEvent('assessment:new', data));
    socket.on('assessment:urgent', (data) => handleEvent('assessment:urgent', data));
    socket.on('assessment:status-updated', (data) => handleEvent('assessment:status-updated', data));
    socket.on('assessment:being-viewed', (data) => handleEvent('assessment:being-viewed', data));
    socket.on('red-flag:detected', (data) => handleEvent('red-flag:detected', data));
    socket.on('lab:critical', (data) => handleEvent('lab:critical', data));
    socket.on('lab:ready', (data) => handleEvent('lab:ready', data));
    socket.on('message:received', (data) => handleEvent('message:received', data));
    socket.on('provider:online', (data) => handleEvent('provider:online', data));
    socket.on('provider:offline', (data) => handleEvent('provider:offline', data));
    socket.on('server:shutdown', (data) => handleEvent('server:shutdown', data));

    // Queue status on initial connect
    socket.on('queue:status', (data) => {
      if (data.assessments) {
        data.assessments.forEach((assessment: any) => {
          addAssessment(assessment);
        });
      }
    });

    socketRef.current = socket;
  }, [config, handleEvent, setConnectionStatus, addAssessment]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('provider:leave');
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
    }
  }, [setConnectionStatus]);

  // Send event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WS] Cannot emit, not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.autoConnect, connect, disconnect]);

  // Set status (online/busy/away)
  const setStatus = useCallback((status: 'online' | 'busy' | 'away') => {
    emit('provider:status', { status });
  }, [emit]);

  // Notify viewing assessment
  const notifyViewing = useCallback((assessmentId: string) => {
    emit('assessment:viewing', { assessmentId });
  }, [emit]);

  // Update assessment status
  const updateStatus = useCallback((assessmentId: string, newStatus: string) => {
    emit('assessment:status-change', { assessmentId, newStatus });
  }, [emit]);

  return {
    ...state,
    connect,
    disconnect,
    emit,
    setStatus,
    notifyViewing,
    updateStatus,
    socket: socketRef.current,
  };
}

export default useWebSocket;
