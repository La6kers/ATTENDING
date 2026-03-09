// ============================================================
// ATTENDING AI - Shared WebSocket Types
// apps/shared/hooks/useWebSocket.ts
//
// Shared type definitions used by both provider and patient
// portal WebSocket hooks. Each portal implements its own
// SignalR-based hook:
//   - provider-portal/hooks/useWebSocket.ts
//   - patient-portal/hooks/useWebSocket.ts
//
// This module no longer provides a base connection hook.
// The previous Socket.IO-based useWebSocketConnection has
// been removed — both portals now use @microsoft/signalr.
// ============================================================

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
  connectionId: string;
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
