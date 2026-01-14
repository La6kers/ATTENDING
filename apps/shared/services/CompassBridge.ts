// apps/shared/services/CompassBridge.ts
// Bridge Service for COMPASS → Provider Portal Communication
// Handles real-time assessment updates, red flag alerts, and emergency notifications

import type { 
  PatientAssessment, 
  UrgencyLevel, 
  ClinicalData,
  ClinicalSummary,
  Notification,
  UserLocation,
} from '../types';
import type { RedFlag, AssessmentContext } from '../machines/assessmentMachine';

// ================================
// EVENT TYPES
// ================================

export type AssessmentEventType = 
  | 'assessment:started'
  | 'assessment:updated'
  | 'assessment:completed'
  | 'assessment:submitted'
  | 'redflag:detected'
  | 'emergency:triggered';

export interface AssessmentEvent {
  type: AssessmentEventType;
  payload: {
    assessment?: Partial<PatientAssessment>;
    assessmentId?: string;
    sessionId?: string;
    redFlag?: RedFlag;
    location?: UserLocation;
    timestamp: string;
  };
}

export type AssessmentEventCallback = (event: AssessmentEvent) => void;
export type UnsubscribeFn = () => void;

export interface CompassBridgeConfig {
  apiUrl?: string;
  wsUrl?: string;
  enableRealtime?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

// ================================
// PENDING ASSESSMENT TYPE
// ================================

interface PendingAssessment {
  id: string;
  sessionId: string;
  patientId?: string;
  patientName?: string;
  chiefComplaint: string;
  status: 'in-progress' | 'completed' | 'submitted';
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  redFlags: RedFlag[];
  hpiData: Record<string, any>;
  responses: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

// ================================
// COMPASS BRIDGE SINGLETON
// ================================

class CompassBridgeClass {
  private static instance: CompassBridgeClass;
  private subscribers: Map<AssessmentEventType | '*', Set<AssessmentEventCallback>> = new Map();
  private pendingAssessments: Map<string, PendingAssessment> = new Map();
  private config: CompassBridgeConfig = {
    enableRealtime: true,
    retryAttempts: 3,
    retryDelay: 1000,
  };
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting: boolean = false;

  private constructor() {
    // Initialize subscriber maps
    this.subscribers.set('*', new Set());
  }

  static getInstance(): CompassBridgeClass {
    if (!CompassBridgeClass.instance) {
      CompassBridgeClass.instance = new CompassBridgeClass();
    }
    return CompassBridgeClass.instance;
  }

  /**
   * Configure the bridge with API and WebSocket URLs
   */
  configure(config: Partial<CompassBridgeConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.wsUrl && this.config.enableRealtime) {
      this.connectWebSocket();
    }
  }

  // ================================
  // WEBSOCKET CONNECTION
  // ================================

  private connectWebSocket(): void {
    if (!this.config.wsUrl || this.isConnecting) return;
    if (typeof WebSocket === 'undefined') {
      console.warn('[CompassBridge] WebSocket not available in this environment');
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        console.log('[CompassBridge] WebSocket connected');
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && data.payload) {
            this.emit(data.type, data.payload);
          }
        } catch (e) {
          console.error('[CompassBridge] Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[CompassBridge] WebSocket disconnected');
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[CompassBridge] WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (e) {
      console.error('[CompassBridge] Failed to connect WebSocket:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (!this.config.enableRealtime) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, this.config.retryDelay || 1000);
  }

  // ================================
  // EVENT SUBSCRIPTION
  // ================================

  /**
   * Subscribe to assessment events
   * @param eventType - Specific event type or '*' for all events
   * @param callback - Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe(eventType: AssessmentEventType | '*', callback: AssessmentEventCallback): UnsubscribeFn {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  private emit(type: AssessmentEventType, payload: AssessmentEvent['payload']): void {
    const event: AssessmentEvent = { type, payload };

    // Notify specific subscribers
    this.subscribers.get(type)?.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('[CompassBridge] Error in event callback:', e);
      }
    });

    // Notify wildcard subscribers
    this.subscribers.get('*')?.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('[CompassBridge] Error in wildcard callback:', e);
      }
    });
  }

  // ================================
  // ASSESSMENT LIFECYCLE
  // ================================

  /**
   * Start a new assessment session
   */
  startAssessment(sessionId: string, patientInfo?: { id?: string; name?: string }): void {
    const assessment: PendingAssessment = {
      id: `assess_${Date.now()}`,
      sessionId,
      patientId: patientInfo?.id,
      patientName: patientInfo?.name,
      chiefComplaint: '',
      status: 'in-progress',
      urgencyLevel: 'standard',
      urgencyScore: 0,
      redFlags: [],
      hpiData: {},
      responses: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.pendingAssessments.set(sessionId, assessment);
    
    this.emit('assessment:started', {
      assessmentId: assessment.id,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update an in-progress assessment
   */
  updateAssessment(sessionId: string, updates: Partial<PendingAssessment>): void {
    const existing = this.pendingAssessments.get(sessionId);
    if (!existing) {
      console.warn('[CompassBridge] No assessment found for session:', sessionId);
      return;
    }

    const updated: PendingAssessment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.pendingAssessments.set(sessionId, updated);

    this.emit('assessment:updated', {
      assessment: this.toPendingPatientAssessment(updated),
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark assessment as completed (ready for review)
   */
  completeAssessment(sessionId: string): PendingAssessment | null {
    const assessment = this.pendingAssessments.get(sessionId);
    if (!assessment) {
      console.warn('[CompassBridge] No assessment found for session:', sessionId);
      return null;
    }

    assessment.status = 'completed';
    assessment.updatedAt = new Date().toISOString();

    this.emit('assessment:completed', {
      assessment: this.toPendingPatientAssessment(assessment),
      sessionId,
      timestamp: new Date().toISOString(),
    });

    return assessment;
  }

  /**
   * Submit assessment to provider portal
   */
  async submitAssessment(sessionId: string): Promise<PatientAssessment | null> {
    const assessment = this.pendingAssessments.get(sessionId);
    if (!assessment) {
      console.warn('[CompassBridge] No assessment found for session:', sessionId);
      return null;
    }

    assessment.status = 'submitted';
    assessment.submittedAt = new Date().toISOString();
    assessment.updatedAt = new Date().toISOString();

    // Build the full patient assessment for submission
    const patientAssessment = this.buildPatientAssessment(assessment);

    // Submit to API if configured
    if (this.config.apiUrl) {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/assessments/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patientAssessment),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `Failed to submit assessment: ${response.statusText}`);
        }
      } catch (error) {
        console.error('[CompassBridge] Failed to submit assessment:', error);
        // Continue with local notification even if API fails
      }
    }

    // Emit submission event
    this.emit('assessment:submitted', {
      assessment: patientAssessment,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    // Remove from pending after successful submission
    this.pendingAssessments.delete(sessionId);

    return patientAssessment as PatientAssessment;
  }

  // ================================
  // RED FLAG HANDLING
  // ================================

  /**
   * Report a detected red flag
   */
  reportRedFlag(sessionId: string, redFlag: RedFlag): void {
    const assessment = this.pendingAssessments.get(sessionId);
    if (!assessment) {
      console.warn('[CompassBridge] No assessment found for session:', sessionId);
      return;
    }

    // Add red flag if not already present
    const exists = assessment.redFlags.some(rf => rf.id === redFlag.id);
    if (!exists) {
      assessment.redFlags.push(redFlag);
    }

    // Recalculate urgency
    this.recalculateUrgency(assessment);
    this.pendingAssessments.set(sessionId, assessment);

    this.emit('redflag:detected', {
      assessment: this.toPendingPatientAssessment(assessment),
      redFlag,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  // ================================
  // EMERGENCY HANDLING
  // ================================

  /**
   * Trigger emergency alert
   */
  triggerEmergency(sessionId: string, location?: UserLocation): void {
    const assessment = this.pendingAssessments.get(sessionId);
    
    if (assessment) {
      assessment.urgencyLevel = 'high';
      assessment.urgencyScore = 100;
      this.pendingAssessments.set(sessionId, assessment);
    }

    this.emit('emergency:triggered', {
      assessment: assessment ? this.toPendingPatientAssessment(assessment) : undefined,
      assessmentId: assessment?.id,
      sessionId,
      location,
      timestamp: new Date().toISOString(),
    });

    // Send to API if configured
    if (this.config.apiUrl) {
      fetch(`${this.config.apiUrl}/api/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          assessmentId: assessment?.id,
          location,
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.error('[CompassBridge] Failed to send emergency alert:', err));
    }
  }

  // ================================
  // URGENCY CALCULATION
  // ================================

  private recalculateUrgency(assessment: PendingAssessment): void {
    let score = 0;

    // Base score from severity
    const severity = assessment.hpiData?.severity || assessment.responses?.severity;
    if (typeof severity === 'number') {
      score += severity * 5; // 0-50 points
    }

    // Red flag contribution
    assessment.redFlags.forEach(rf => {
      score += rf.severity === 'critical' ? 30 : 15;
    });

    // Cap at 100
    score = Math.min(100, score);
    assessment.urgencyScore = score;

    // Determine level
    if (score >= 80 || assessment.redFlags.some(rf => rf.requiresEmergency)) {
      assessment.urgencyLevel = 'high';
    } else if (score >= 50) {
      assessment.urgencyLevel = 'moderate';
    } else {
      assessment.urgencyLevel = 'standard';
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Get an in-progress assessment by session ID
   */
  getAssessment(sessionId: string): PendingAssessment | undefined {
    return this.pendingAssessments.get(sessionId);
  }

  /**
   * Get all pending assessments
   */
  getAllPending(): PendingAssessment[] {
    return Array.from(this.pendingAssessments.values());
  }

  /**
   * Disconnect WebSocket and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ================================
  // CONVERSION HELPERS
  // ================================

  private toPendingPatientAssessment(pending: PendingAssessment): Partial<PatientAssessment> {
    return {
      id: pending.id,
      patientId: pending.patientId || '',
      patientName: pending.patientName || 'Unknown',
      chiefComplaint: pending.chiefComplaint,
      urgencyLevel: pending.urgencyLevel,
      redFlags: pending.redFlags.map(rf => rf.name),
      riskFactors: [],
      differentialDiagnosis: [],
      hpiData: pending.hpiData,
      status: pending.status === 'in-progress' ? 'in_progress' : 'pending',
      submittedAt: pending.submittedAt || pending.createdAt,
    };
  }

  private buildPatientAssessment(pending: PendingAssessment): Partial<PatientAssessment> {
    return {
      id: pending.id,
      patientId: pending.patientId || `patient_${Date.now()}`,
      patientName: pending.patientName || 'Unknown Patient',
      patientAge: 0, // Would be filled from patient record
      patientGender: 'Unknown',
      chiefComplaint: pending.chiefComplaint,
      urgencyLevel: pending.urgencyLevel,
      redFlags: pending.redFlags.map(rf => rf.name),
      riskFactors: [],
      differentialDiagnosis: [],
      hpiData: pending.hpiData,
      medicalHistory: {
        conditions: pending.responses.medicalHistory as string[] || [],
        medications: pending.responses.medications as string[] || [],
        allergies: pending.responses.allergies as string[] || [],
      },
      status: 'pending',
      submittedAt: pending.submittedAt || new Date().toISOString(),
      clinicalSummary: undefined,
    };
  }
}

// Export singleton instance
export const CompassBridge = CompassBridgeClass.getInstance();
export default CompassBridge;
