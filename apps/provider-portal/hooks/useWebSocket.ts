// =============================================================================
// ATTENDING AI - Provider Portal WebSocket Hook
// apps/provider-portal/hooks/useWebSocket.ts
//
// Provider-specific real-time features using SignalR (matching the .NET backend):
// - Emergency alert propagation with audio
// - Live assessment queue updates
// - Provider presence/collaboration
// - Critical lab and imaging notifications
//
// Consolidated to SignalR only — socket.io dependency removed.
// The .NET backend exposes SignalR at /hubs/notifications.
// =============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  HubConnectionBuilder,
  HubConnection,
  HubConnectionState,
  LogLevel,
  HttpTransportType,
} from '@microsoft/signalr';
import { useProviderStore } from '@/store/useProviderStore';
import type {
  ConnectionStatus,
} from '@attending/shared/hooks/useWebSocket';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'assessment:new'
  | 'assessment:urgent'
  | 'assessment:status-updated'
  | 'emergency:alert'
  | 'red-flag:detected'
  | 'lab:critical'
  | 'lab:ready'
  | 'imaging:ready'
  | 'message:received'
  | 'provider:online'
  | 'provider:offline'
  | 'server:shutdown';

export interface WebSocketConfig {
  url?: string;
  providerId: string;
  providerName: string;
  specialty?: string;
  autoConnect?: boolean;
  enableAudioAlerts?: boolean;
  accessToken?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onEmergency?: (alert: EmergencyAlert) => void;
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
  requiresAcknowledgment: boolean;
  audioAlert: boolean;
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

export interface ProviderPresence {
  providerId: string;
  name: string;
  specialty?: string;
  status: 'online' | 'busy' | 'away';
  lastActive: Date;
  currentPatient?: string;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastEventTime: string | null;
  activeProviders: ProviderPresence[];
  pendingEmergencies: EmergencyAlert[];
}

// ============================================================================
// Audio Alert Manager
// ============================================================================

class AudioAlertManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private alertSounds: Record<string, AudioBuffer | null> = {};
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private async initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.alertSounds.critical = await this.generateTone([880, 988, 880, 988], [0.15, 0.15, 0.15, 0.15], 0.5);
      this.alertSounds.emergency = await this.generateTone([660, 770, 880], [0.2, 0.2, 0.3], 0.4);
      this.alertSounds.urgent = await this.generateTone([660, 550], [0.2, 0.2], 0.3);
      this.alertSounds.standard = await this.generateTone([440], [0.15], 0.2);
    } catch (error) {
      console.warn('[AudioAlert] Initialization failed:', error);
    }
  }

  private async generateTone(
    frequencies: number[],
    durations: number[],
    volume: number
  ): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const totalDuration = durations.reduce((a, b) => a + b, 0) + (durations.length - 1) * 0.05;
    const buffer = this.audioContext.createBuffer(1, Math.ceil(sampleRate * totalDuration), sampleRate);
    const data = buffer.getChannelData(0);

    let currentSample = 0;

    for (let i = 0; i < frequencies.length; i++) {
      const freq = frequencies[i];
      const dur = durations[i];
      const numSamples = Math.floor(dur * sampleRate);

      for (let j = 0; j < numSamples; j++) {
        const t = j / sampleRate;
        const envelope = Math.sin(Math.PI * j / numSamples);
        data[currentSample + j] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
      }

      currentSample += numSamples + Math.floor(0.05 * sampleRate);
    }

    return buffer;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async play(type: 'critical' | 'emergency' | 'urgent' | 'standard', repeat: number = 1) {
    if (!this.enabled || !this.audioContext || !this.alertSounds[type] || this.isPlaying) {
      return;
    }

    this.isPlaying = true;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      for (let r = 0; r < repeat; r++) {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.alertSounds[type];
        source.connect(this.audioContext.destination);
        source.start();
        await new Promise(resolve => setTimeout(resolve, (source.buffer?.duration || 0.5) * 1000 + 200));
      }
    } catch (error) {
      console.warn('[AudioAlert] Playback failed:', error);
    } finally {
      this.isPlaying = false;
    }
  }

  async playEmergency(urgencyLevel: 'critical' | 'emergent' | 'urgent') {
    switch (urgencyLevel) {
      case 'critical':
        await this.play('critical', 3);
        break;
      case 'emergent':
        await this.play('emergency', 2);
        break;
      case 'urgent':
        await this.play('urgent', 1);
        break;
    }
  }
}

// ============================================================================
// SignalR WebSocket Hook
// ============================================================================

export function useWebSocket(config: WebSocketConfig) {
  const connectionRef = useRef<HubConnection | null>(null);
  const audioManagerRef = useRef<AudioAlertManager | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEventTime: null,
    activeProviders: [],
    pendingEmergencies: [],
  });

  const {
    url = process.env.NEXT_PUBLIC_SIGNALR_URL || process.env.NEXT_PUBLIC_WS_URL || '/hubs/notifications',
    providerId,
    providerName,
    specialty,
    autoConnect = true,
    accessToken,
    onConnect,
    onDisconnect,
    onError,
    onEmergency,
  } = config;

  const {
    setConnectionStatus,
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

  useEffect(() => {
    audioManagerRef.current?.setEnabled(audioAlertsEnabled);
  }, [audioAlertsEnabled]);

  // Handle emergency alerts
  const handleEmergencyAlert = useCallback((alert: EmergencyAlert) => {
    console.log('[SignalR] Emergency alert:', alert.type, alert.urgencyLevel);

    setState(prev => ({
      ...prev,
      pendingEmergencies: [...prev.pendingEmergencies, alert],
    }));

    if (alert.audioAlert) {
      audioManagerRef.current?.playEmergency(alert.urgencyLevel);
    }

    addNotification({
      type: 'escalation',
      title: `EMERGENCY: ${alert.urgencyLevel.toUpperCase()}`,
      message: `${alert.patientName}: ${alert.type} - ${alert.symptoms.join(', ')}`,
      assessmentId: alert.sessionId,
      urgency: 'critical',
    });

    onEmergency?.(alert);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`EMERGENCY: ${alert.patientName}`, {
          body: `${alert.type}: ${alert.redFlags.join(', ')}`,
          icon: '/icons/emergency.png',
          tag: alert.id,
          requireInteraction: true,
        });
      }
    }
  }, [addNotification, onEmergency]);

  // Handle assessment updates
  const handleAssessmentUpdate = useCallback((update: AssessmentUpdate) => {
    const mappedUrgency = (['critical', 'emergent', 'urgent', 'routine'].includes(update.urgencyLevel)
      ? update.urgencyLevel
      : 'routine') as 'critical' | 'emergent' | 'urgent' | 'routine';

    updateAssessment(update.sessionId, {
      id: update.sessionId,
      chiefComplaint: update.chiefComplaint,
      urgencyLevel: mappedUrgency,
      updatedAt: update.timestamp instanceof Date ? update.timestamp.toISOString() : new Date().toISOString(),
    });

    if (update.urgencyLevel === 'critical' || update.urgencyLevel === 'emergent') {
      if (update.redFlagCount > 0) {
        audioManagerRef.current?.play('urgent');
      }
    }

    setState(prev => ({ ...prev, lastEventTime: new Date().toISOString() }));
  }, [updateAssessment]);

  // Connect via SignalR
  const connect = useCallback(() => {
    if (connectionRef.current?.state === HubConnectionState.Connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const hubUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

    const builder = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: accessToken ? () => accessToken : undefined,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= 10) return null; // Stop after 10 attempts
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .configureLogging(
        process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Warning
      )
      .build();

    // Connection lifecycle
    builder.onclose((error) => {
      console.log('[SignalR] Connection closed', error?.message);
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
      onDisconnect?.();
    });

    builder.onreconnecting((error) => {
      console.log('[SignalR] Reconnecting...', error?.message);
      setState(prev => ({ ...prev, isConnected: false, isConnecting: true }));
    });

    builder.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected:', connectionId);
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
      setConnectionStatus(true);
      reconnectAttemptsRef.current = 0;

      // Re-join as provider
      builder.invoke('ProviderJoin', { providerId, name: providerName, specialty }).catch(console.error);
    });

    // Register event handlers
    builder.on('EmergencyAlert', handleEmergencyAlert);
    builder.on('EmergencyNew', handleEmergencyAlert);
    builder.on('EmergencyAcknowledged', (data: { alertId: string }) => {
      setState(prev => ({
        ...prev,
        pendingEmergencies: prev.pendingEmergencies.filter(e => e.id !== data.alertId),
      }));
    });

    builder.on('AssessmentUpdated', handleAssessmentUpdate);

    builder.on('PatientConnected', (data: { name: string; sessionId?: string; id?: string }) => {
      addNotification({
        type: 'new-patient',
        title: 'New Patient Connected',
        message: `${data.name} has started an assessment`,
        assessmentId: data.sessionId || data.id || '',
        urgency: 'routine',
      });
    });

    builder.on('PatientDisconnected', (data: { patientId: string }) => {
      addNotification({
        type: 'system',
        title: 'Patient Disconnected',
        message: `Patient ${data.patientId} has disconnected`,
        assessmentId: data.patientId,
        urgency: 'routine',
      });
    });

    builder.on('RedFlagDetected', (data: { assessmentId?: string; symptom: string; severity?: string }) => {
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
        title: 'RED FLAG',
        message: data.symptom,
        assessmentId: data.assessmentId,
        urgency: 'critical',
      });
      audioManagerRef.current?.play('critical');
    });

    builder.on('CriticalLabResult', (data: { patientName: string; testName: string; value: string; assessmentId?: string }) => {
      addNotification({
        type: 'red-flag',
        title: 'CRITICAL Lab',
        message: `${data.patientName}: ${data.testName} = ${data.value}`,
        assessmentId: data.assessmentId,
        urgency: 'critical',
      });
      audioManagerRef.current?.play('critical');
    });

    builder.on('LabReady', (data: { patientName: string; testName: string; assessmentId?: string; isAbnormal?: boolean }) => {
      addNotification({
        type: 'system',
        title: 'Lab Ready',
        message: `${data.patientName}: ${data.testName}`,
        assessmentId: data.assessmentId,
        urgency: data.isAbnormal ? 'urgent' : 'routine',
      });
      if (data.isAbnormal) {
        audioManagerRef.current?.play('urgent');
      }
    });

    builder.on('ImagingReady', (data: { patientName: string; studyType: string; assessmentId?: string; isStat?: boolean }) => {
      addNotification({
        type: 'system',
        title: 'Imaging Ready',
        message: `${data.patientName}: ${data.studyType}`,
        assessmentId: data.assessmentId,
        urgency: data.isStat ? 'urgent' : 'routine',
      });
    });

    builder.on('PresenceUpdate', (data: ProviderPresence[]) => {
      setState(prev => ({ ...prev, activeProviders: data }));
    });

    builder.on('MessageReceived', (data: { content?: string; fromId?: string }) => {
      addNotification({
        type: 'message',
        title: 'Patient Message',
        message: data.content?.substring(0, 100) || 'New message',
        assessmentId: data.fromId,
        urgency: 'routine',
      });
      audioManagerRef.current?.play('standard');
    });

    builder.on('ServerShutdown', () => {
      setState(prev => ({ ...prev, error: 'Server shutting down' }));
    });

    // Start connection
    builder
      .start()
      .then(() => {
        console.log('[SignalR] Connected');
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
        setConnectionStatus(true);
        reconnectAttemptsRef.current = 0;

        // Join as provider
        builder.invoke('ProviderJoin', { providerId, name: providerName, specialty }).catch(console.error);

        onConnect?.();
      })
      .catch((error) => {
        console.error('[SignalR] Connection failed:', error);
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: 'Failed to connect. Please check your connection.',
        }));
        onError?.(error);
      });

    connectionRef.current = builder;
  }, [
    url, providerId, providerName, specialty, accessToken,
    handleEmergencyAlert, handleAssessmentUpdate,
    setConnectionStatus, addNotification, addRedFlag, updateAssessment,
    onConnect, onDisconnect, onError,
  ]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.invoke('ProviderLeave').catch(() => {});
      connectionRef.current.stop();
      connectionRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
    }
  }, [setConnectionStatus]);

  // Invoke hub method
  const emit = useCallback((method: string, data: any) => {
    if (connectionRef.current?.state === HubConnectionState.Connected) {
      connectionRef.current.invoke(method, data).catch(console.error);
      return true;
    }
    console.warn('[SignalR] Cannot invoke, not connected');
    return false;
  }, []);

  // Acknowledge emergency
  const acknowledgeEmergency = useCallback((alertId: string) => {
    emit('AcknowledgeEmergency', { emergencyId: alertId });
    setState(prev => ({
      ...prev,
      pendingEmergencies: prev.pendingEmergencies.filter(e => e.id !== alertId),
    }));
  }, [emit]);

  // View patient
  const viewPatient = useCallback((patientId: string) => {
    emit('ViewPatient', { patientId });
  }, [emit]);

  // Send message to patient
  const sendMessage = useCallback((patientId: string, content: string) => {
    return emit('SendMessage', { patientId, content });
  }, [emit]);

  // Set provider status
  const setStatus = useCallback((status: 'online' | 'busy' | 'away') => {
    emit('SetStatus', { status });
  }, [emit]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    emit,
    acknowledgeEmergency,
    viewPatient,
    sendMessage,
    setStatus,
    connection: connectionRef.current,
  };
}

export default useWebSocket;
