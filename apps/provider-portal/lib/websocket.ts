// ============================================================
// WebSocket Client - Real-time Communication
// apps/provider-portal/lib/websocket.ts
//
// Connects provider portal to WebSocket server for:
// - New assessment notifications
// - Urgent assessment alerts
// - Real-time status updates
// - Provider presence
// ============================================================

import { io, Socket } from 'socket.io-client';
import { useAssessmentQueueStore, PatientAssessment } from '@/store/assessmentQueueStore';

// Types for WebSocket events
interface AssessmentNotification {
  assessment: PatientAssessment;
  timestamp: string;
  source: 'compass' | 'api' | 'webhook';
}

interface UrgentAlert {
  assessmentId: string;
  patientName: string;
  chiefComplaint: string;
  redFlags: string[];
  urgencyScore: number;
  timestamp: string;
}

interface ProviderPresence {
  providerId: string;
  providerName: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  currentAssessment?: string;
}

interface StatusUpdate {
  assessmentId: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

// WebSocket configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// Singleton socket instance
let socket: Socket | null = null;
let reconnectAttempts = 0;
let isConnecting = false;

// Audio for urgent alerts
let urgentSound: HTMLAudioElement | null = null;

// Initialize audio (call once on client)
export function initializeAudio() {
  if (typeof window !== 'undefined' && !urgentSound) {
    urgentSound = new Audio('/sounds/urgent-alert.mp3');
    urgentSound.volume = 0.5;
  }
}

// Play urgent alert sound
function playUrgentSound() {
  if (urgentSound) {
    urgentSound.currentTime = 0;
    urgentSound.play().catch(e => console.log('Could not play sound:', e));
  }
}

// ============================================================
// MAIN SOCKET CONNECTION
// ============================================================

export function connectWebSocket(providerId: string, providerName: string): Socket {
  if (socket?.connected) {
    console.log('[WS] Already connected');
    return socket;
  }
  
  if (isConnecting) {
    console.log('[WS] Connection in progress...');
    return socket!;
  }
  
  isConnecting = true;
  console.log('[WS] Connecting to:', WS_URL);
  
  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
    timeout: 10000,
    query: {
      role: 'provider',
      providerId,
      providerName,
    },
  });

  // =====================================================
  // CONNECTION EVENTS
  // =====================================================
  
  socket.on('connect', () => {
    console.log('[WS] Connected successfully');
    isConnecting = false;
    reconnectAttempts = 0;
    
    // Register as provider
    socket!.emit('provider:join', {
      providerId,
      providerName,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
    isConnecting = false;
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] Connection error:', error);
    isConnecting = false;
    reconnectAttempts++;
    
    if (reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.error('[WS] Max reconnection attempts reached');
    }
  });

  // =====================================================
  // ASSESSMENT EVENTS
  // =====================================================
  
  // New assessment submitted from COMPASS
  socket.on('assessment:new', (data: AssessmentNotification) => {
    console.log('[WS] New assessment received:', data.assessment.id);
    
    // Add to store
    useAssessmentQueueStore.getState().addAssessment(data.assessment);
    
    // Show browser notification if permitted
    showBrowserNotification(
      `New Assessment: ${data.assessment.patientName}`,
      data.assessment.chiefComplaint
    );
  });

  // Urgent assessment alert
  socket.on('assessment:urgent', (data: UrgentAlert) => {
    console.log('[WS] 🚨 URGENT assessment:', data.assessmentId);
    
    // Play alert sound
    playUrgentSound();
    
    // Show prominent browser notification
    showBrowserNotification(
      `🚨 URGENT: ${data.patientName}`,
      `${data.chiefComplaint}\nRed Flags: ${data.redFlags.join(', ')}`,
      'urgent'
    );
    
    // Refresh assessments to ensure we have latest
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  // Assessment status updated by another provider
  socket.on('assessment:status-updated', (data: StatusUpdate) => {
    console.log('[WS] Assessment status updated:', data);
    
    // Refresh to get updated data
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  // Assessment assigned to you
  socket.on('assessment:assigned', (data: { assessmentId: string; patientName: string }) => {
    console.log('[WS] Assessment assigned to you:', data.assessmentId);
    
    showBrowserNotification(
      'Assessment Assigned',
      `${data.patientName} has been assigned to you`
    );
    
    useAssessmentQueueStore.getState().refreshAssessments();
  });

  // =====================================================
  // PRESENCE EVENTS
  // =====================================================
  
  socket.on('provider:online', (data: ProviderPresence) => {
    console.log('[WS] Provider online:', data.providerName);
  });

  socket.on('provider:offline', (data: { providerId: string }) => {
    console.log('[WS] Provider offline:', data.providerId);
  });

  // =====================================================
  // SYSTEM EVENTS
  // =====================================================
  
  socket.on('server:shutdown', (data: { message: string }) => {
    console.warn('[WS] Server shutdown notice:', data.message);
  });

  socket.on('ping', () => {
    socket!.emit('pong', { timestamp: Date.now() });
  });

  return socket;
}

// ============================================================
// DISCONNECT
// ============================================================

export function disconnectWebSocket() {
  if (socket) {
    socket.emit('provider:leave');
    socket.disconnect();
    socket = null;
    isConnecting = false;
  }
}

// ============================================================
// EMIT EVENTS
// ============================================================

export function emitAssessmentViewing(assessmentId: string) {
  if (socket?.connected) {
    socket.emit('assessment:viewing', {
      assessmentId,
      timestamp: new Date().toISOString(),
    });
  }
}

export function emitAssessmentStatusChange(assessmentId: string, newStatus: string) {
  if (socket?.connected) {
    socket.emit('assessment:status-change', {
      assessmentId,
      newStatus,
      timestamp: new Date().toISOString(),
    });
  }
}

export function emitProviderStatus(status: 'online' | 'busy' | 'away') {
  if (socket?.connected) {
    socket.emit('provider:status', {
      status,
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================
// BROWSER NOTIFICATIONS
// ============================================================

async function showBrowserNotification(
  title: string, 
  body: string, 
  type: 'normal' | 'urgent' = 'normal'
) {
  // Check if notifications are supported and permitted
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  // Request permission if needed
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: type === 'urgent' ? 'urgent-assessment' : 'assessment',
      requireInteraction: type === 'urgent',
      silent: type !== 'urgent', // Only make sound for urgent
    });

    // Auto-close normal notifications after 5 seconds
    if (type === 'normal') {
      setTimeout(() => notification.close(), 5000);
    }

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// ============================================================
// REQUEST NOTIFICATION PERMISSION
// ============================================================

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// ============================================================
// CONNECTION STATUS
// ============================================================

export function isWebSocketConnected(): boolean {
  return socket?.connected || false;
}

export function getSocket(): Socket | null {
  return socket;
}

// ============================================================
// REACT HOOK FOR WEBSOCKET
// ============================================================

export function useWebSocket() {
  return {
    isConnected: isWebSocketConnected(),
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    emitViewing: emitAssessmentViewing,
    emitStatusChange: emitAssessmentStatusChange,
    emitProviderStatus,
    requestNotifications: requestNotificationPermission,
  };
}
