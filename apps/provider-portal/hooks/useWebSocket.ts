// =============================================================================
// ATTENDING AI - Enhanced WebSocket Hook for Provider Portal
// apps/provider-portal/hooks/useWebSocket.ts
//
// Revolutionary Real-Time Features:
// - Emergency alert propagation with audio
// - Live assessment queue updates
// - Provider presence/collaboration
// - Critical lab and imaging notifications
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
// Audio Alert Manager - Enhanced
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
      
      // Critical: Loud, rapid 4-tone alert
      this.alertSounds.critical = await this.generateTone([880, 988, 880, 988], [0.15, 0.15, 0.15, 0.15], 0.5);
      
      // Emergency: Escalating 3-tone alert  
      this.alertSounds.emergency = await this.generateTone([660, 770, 880], [0.2, 0.2, 0.3], 0.4);
      
      // Urgent: 2-tone attention getter
      this.alertSounds.urgent = await this.generateTone([660, 550], [0.2, 0.2], 0.3);
      
      // Standard: Single soft tone
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
        const envelope = Math.sin(Math.PI * j / numSamples); // Smooth envelope
        data[currentSample + j] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
      }
      
      currentSample += numSamples + Math.floor(0.05 * sampleRate); // Gap between tones
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
        
        // Wait for sound to finish plus a small gap
        await new Promise(resolve => setTimeout(resolve, (source.buffer?.duration || 0.5) * 1000 + 200));
      }
    } catch (error) {
      console.warn('[AudioAlert] Playback failed:', error);
    } finally {
      this.isPlaying = false;
    }
  }

  // Play emergency alert with escalation
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
// WebSocket Hook
// ============================================================================

export function useWebSocket(config: WebSocketConfig) {
  const socketRef = useRef<Socket | null>(null);
  const audioManagerRef = useRef<AudioAlertManager | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEventTime: null,
    activeProviders: [],
    pendingEmergencies: [],
  });

  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    providerId,
    providerName,
    specialty,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onEmergency,
  } = config;

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

  // Sync audio enabled with store
  useEffect(() => {
    audioManagerRef.current?.setEnabled(audioAlertsEnabled);
  }, [audioAlertsEnabled]);

  // Handle emergency alerts
  const handleEmergencyAlert = useCallback((alert: EmergencyAlert) => {
    console.log('[WS] 🚨 EMERGENCY ALERT:', alert.type, alert.urgencyLevel);
    
    // Add to pending emergencies
    setState(prev => ({
      ...prev,
      pendingEmergencies: [...prev.pendingEmergencies, alert],
    }));

    // Play audio alert based on urgency
    if (alert.audioAlert) {
      audioManagerRef.current?.playEmergency(alert.urgencyLevel);
    }

    // Add to notifications
    addNotification({
      type: 'escalation',
      title: `🚨 ${alert.urgencyLevel.toUpperCase()} EMERGENCY`,
      message: `${alert.patientName}: ${alert.type} - ${alert.symptoms.join(', ')}`,
      assessmentId: alert.sessionId,
      urgency: 'critical',
    });

    // Callback for custom handling
    onEmergency?.(alert);

    // Browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`🚨 EMERGENCY: ${alert.patientName}`, {
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
    console.log('[WS] Assessment update:', update.sessionId, update.phase, `${update.progressPercent}%`);
    
    // Update or add assessment in queue
    // Map the string urgencyLevel to our UrgencyLevel type
    const mappedUrgency = (['critical', 'emergent', 'urgent', 'routine'].includes(update.urgencyLevel)
      ? update.urgencyLevel
      : 'routine') as 'critical' | 'emergent' | 'urgent' | 'routine';

    const assessmentData = {
      id: update.sessionId,
      chiefComplaint: update.chiefComplaint,
      urgencyLevel: mappedUrgency,
      updatedAt: update.timestamp.toISOString ? update.timestamp.toISOString() : new Date().toISOString(),
    };

    // Check if this is a new assessment or update
    updateAssessment(update.sessionId, assessmentData);

    // If high urgency, play alert
    if (update.urgencyLevel === 'critical' || update.urgencyLevel === 'emergent') {
      if (update.redFlagCount > 0) {
        audioManagerRef.current?.play('urgent');
      }
    }

    setState(prev => ({ ...prev, lastEventTime: new Date().toISOString() }));
  }, [updateAssessment]);

  // Handle other events
  const handleEvent = useCallback((eventType: string, data: any) => {
    setState(prev => ({ ...prev, lastEventTime: new Date().toISOString() }));

    switch (eventType) {
      case 'patient:connected':
        console.log('[WS] Patient connected:', data.name);
        // Note: addAssessment expects a full Assessment object
        // This is just a notification - the full assessment will come from the server
        addNotification({
          type: 'new-patient',
          title: 'New Patient Connected',
          message: `${data.name} has started an assessment`,
          assessmentId: data.sessionId || data.id,
          urgency: 'routine',
        });
        break;

      case 'patient:disconnected':
        console.log('[WS] Patient disconnected:', data.patientId);
        // 'disconnected' is not a valid status, use 'waiting' or remove
        // For now, just log it - the server should handle status updates
        addNotification({
          type: 'system',
          title: 'Patient Disconnected',
          message: `Patient ${data.patientId} has disconnected`,
          assessmentId: data.patientId,
          urgency: 'routine',
        });
        break;

      case 'patient:message-received':
        addNotification({
          type: 'message',
          title: 'Patient Message',
          message: data.content?.substring(0, 100) || 'New message',
          assessmentId: data.fromId,
          urgency: 'routine',
        });
        audioManagerRef.current?.play('standard');
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

      case 'lab:critical':
        addNotification({
          type: 'red-flag',
          title: '🔬 CRITICAL Lab',
          message: `${data.patientName}: ${data.testName} = ${data.value}`,
          assessmentId: data.assessmentId,
          urgency: 'critical',
        });
        audioManagerRef.current?.play('critical');
        break;

      case 'lab:ready':
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
        break;

      case 'imaging:ready':
        addNotification({
          type: 'system',
          title: 'Imaging Ready',
          message: `${data.patientName}: ${data.studyType}`,
          assessmentId: data.assessmentId,
          urgency: data.isStat ? 'urgent' : 'routine',
        });
        break;

      case 'presence-update':
        setState(prev => ({ ...prev, activeProviders: data }));
        break;

      case 'server:shutdown':
        setState(prev => ({ ...prev, error: 'Server shutting down' }));
        break;
    }
  }, [addAssessment, updateAssessment, addRedFlag, addNotification]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(url, {
      auth: {
        role: 'provider',
        providerId,
        providerName,
        specialty,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[WS] Connected to server');
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
      setConnectionStatus(true);
      reconnectAttemptsRef.current = 0;
      
      socket.emit('provider:join', {
        providerId,
        name: providerName,
        role: specialty || 'Provider',
      });

      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      reconnectAttemptsRef.current++;
      
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: 'Failed to connect. Please check your connection.' 
        }));
      }
      
      onError?.(error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[WS] Reconnected after', attemptNumber, 'attempts');
      reconnectAttemptsRef.current = 0;
    });

    // Emergency alerts (CRITICAL)
    socket.on('emergency:alert', handleEmergencyAlert);
    socket.on('emergency:new', handleEmergencyAlert);
    socket.on('emergency:acknowledged', (data) => {
      console.log('[WS] Emergency acknowledged:', data.alertId);
      setState(prev => ({
        ...prev,
        pendingEmergencies: prev.pendingEmergencies.filter(e => e.id !== data.alertId),
      }));
    });

    // Assessment events
    socket.on('patient:connected', (data) => handleEvent('patient:connected', data));
    socket.on('patient:disconnected', (data) => handleEvent('patient:disconnected', data));
    socket.on('patient:assessment-updated', handleAssessmentUpdate);
    socket.on('patient:message-received', (data) => handleEvent('patient:message-received', data));

    // Clinical events
    socket.on('red-flag:detected', (data) => handleEvent('red-flag:detected', data));
    socket.on('lab:critical', (data) => handleEvent('lab:critical', data));
    socket.on('lab:ready', (data) => handleEvent('lab:ready', data));
    socket.on('imaging:ready', (data) => handleEvent('imaging:ready', data));

    // Presence events
    socket.on('presence-update', (data) => handleEvent('presence-update', data));

    // Server events
    socket.on('server:shutdown', (data) => handleEvent('server:shutdown', data));

    socketRef.current = socket;

    // Store globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).__attendingSocket = socket;
    }
  }, [url, providerId, providerName, specialty, handleEmergencyAlert, handleAssessmentUpdate, handleEvent, setConnectionStatus, onConnect, onDisconnect, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('provider:leave');
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
      setConnectionStatus(false);
      
      if (typeof window !== 'undefined') {
        delete (window as any).__attendingSocket;
      }
    }
  }, [setConnectionStatus]);

  // Emit event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('[WS] Cannot emit, not connected');
    return false;
  }, []);

  // Acknowledge emergency
  const acknowledgeEmergency = useCallback((alertId: string) => {
    emit('provider:acknowledge-emergency', { emergencyId: alertId });
    setState(prev => ({
      ...prev,
      pendingEmergencies: prev.pendingEmergencies.filter(e => e.id !== alertId),
    }));
  }, [emit]);

  // View patient
  const viewPatient = useCallback((patientId: string) => {
    emit('provider:view-patient', { patientId });
  }, [emit]);

  // Send message to patient
  const sendMessage = useCallback((patientId: string, content: string) => {
    return emit('provider:message', { patientId, content });
  }, [emit]);

  // Set provider status
  const setStatus = useCallback((status: 'online' | 'busy' | 'away') => {
    emit('provider:status', { status });
  }, [emit]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Request notification permission
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
    // State
    ...state,
    
    // Connection
    connect,
    disconnect,
    
    // Actions
    emit,
    acknowledgeEmergency,
    viewPatient,
    sendMessage,
    setStatus,
    
    // Socket reference
    socket: socketRef.current,
  };
}

export default useWebSocket;
