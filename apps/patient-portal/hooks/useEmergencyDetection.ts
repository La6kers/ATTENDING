// =============================================================================
// ATTENDING AI - Emergency Detection Hook for COMPASS
// apps/patient-portal/hooks/useEmergencyDetection.ts
//
// Real-time emergency symptom detection during patient chat assessment.
// Triggers immediate alerts for life-threatening conditions.
// =============================================================================

import { useCallback, useState, useRef } from 'react';
import { redFlagEvaluator, type RedFlagResult } from '@attending/clinical-services';

// =============================================================================
// Types
// =============================================================================

export type UrgencyLevel = 'critical' | 'emergent' | 'urgent' | 'standard' | 'none';

export interface EmergencyAlert {
  id: string;
  timestamp: Date;
  urgency: UrgencyLevel;
  redFlags: string[];
  message: string;
  call911: boolean;
  instructions: string[];
}

export interface EmergencyState {
  isEmergency: boolean;
  alert: EmergencyAlert | null;
  detectionHistory: RedFlagResult[];
}

// =============================================================================
// Emergency Messages by Urgency
// =============================================================================

const EMERGENCY_MESSAGES: Record<UrgencyLevel, string> = {
  critical: '🚨 CALL 911 IMMEDIATELY - You may be experiencing a life-threatening emergency.',
  emergent: '⚠️ URGENT: Please seek emergency care immediately or call 911.',
  urgent: '⚡ Important: These symptoms need prompt medical attention today.',
  standard: 'Please discuss these symptoms with your healthcare provider.',
  none: '',
};

const EMERGENCY_INSTRUCTIONS: Record<UrgencyLevel, string[]> = {
  critical: [
    'Call 911 or have someone call for you right now',
    'Do not drive yourself to the hospital',
    'If you have chest pain, chew an aspirin if not allergic',
    'Stay calm and sit or lie down',
    'Unlock your door for emergency responders',
  ],
  emergent: [
    'Go to the nearest emergency room immediately',
    'Have someone drive you - do not drive yourself',
    'Bring a list of your current medications',
    'If symptoms worsen, call 911',
  ],
  urgent: [
    'Contact your healthcare provider today',
    'If unable to reach your provider, visit urgent care',
    'Monitor your symptoms closely',
    'If symptoms worsen, seek emergency care',
  ],
  standard: [
    'Schedule an appointment with your healthcare provider',
    'Note any changes in your symptoms',
  ],
  none: [],
};

// =============================================================================
// Helper to map severity to urgency level
// =============================================================================

function severityToUrgency(severity: 'warning' | 'urgent' | 'critical'): UrgencyLevel {
  switch (severity) {
    case 'critical': return 'critical';
    case 'urgent': return 'emergent';
    case 'warning': return 'urgent';
    default: return 'standard';
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useEmergencyDetection() {
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    isEmergency: false,
    alert: null,
    detectionHistory: [],
  });
  
  const alertIdCounter = useRef(0);
  const hasShownAlert = useRef<Set<string>>(new Set());

  /**
   * Evaluate a message for emergency symptoms using clinical-services
   */
  const evaluateMessage = useCallback((message: string): RedFlagResult => {
    return redFlagEvaluator.evaluate({
      symptoms: [message],
      chiefComplaint: message,
    });
  }, []);

  /**
   * Process message and check for emergencies
   * Returns true if an emergency was detected
   */
  const processMessage = useCallback((
    message: string,
    accumulatedSymptoms: string[] = []
  ): { isEmergency: boolean; result: RedFlagResult } => {
    // Evaluate using clinical-services
    const result = redFlagEvaluator.evaluate({
      symptoms: [message, ...accumulatedSymptoms],
      chiefComplaint: message,
    });
    
    // Update detection history
    setEmergencyState(prev => ({
      ...prev,
      detectionHistory: [...prev.detectionHistory, result],
    }));
    
    // Check if this is an emergency
    const isEmergency = result.isEmergency;
    
    if (isEmergency && result.redFlags.length > 0) {
      // Create unique key for this set of red flags
      const alertKey = result.redFlags.map(rf => rf.id).sort().join('|');
      
      // Only show alert if we haven't shown it before
      if (!hasShownAlert.current.has(alertKey)) {
        hasShownAlert.current.add(alertKey);
        
        // Find highest urgency
        const highestSeverity = result.redFlags.reduce((highest, rf) => {
          const order = ['warning', 'urgent', 'critical'];
          const currentIdx = order.indexOf(rf.severity);
          const highestIdx = order.indexOf(highest);
          return currentIdx > highestIdx ? rf.severity : highest;
        }, 'warning' as 'warning' | 'urgent' | 'critical');
        
        const urgency = severityToUrgency(highestSeverity);
        
        const alert: EmergencyAlert = {
          id: `emergency-${++alertIdCounter.current}`,
          timestamp: new Date(),
          urgency,
          redFlags: result.redFlags.map(rf => rf.symptom),
          message: EMERGENCY_MESSAGES[urgency],
          call911: urgency === 'critical',
          instructions: EMERGENCY_INSTRUCTIONS[urgency],
        };
        
        setEmergencyState(prev => ({
          ...prev,
          isEmergency: true,
          alert,
        }));
      }
    }
    
    return { isEmergency, result };
  }, []);

  /**
   * Acknowledge and dismiss emergency alert
   */
  const acknowledgeAlert = useCallback(() => {
    setEmergencyState(prev => ({
      ...prev,
      isEmergency: false,
      alert: null,
    }));
  }, []);

  /**
   * Reset all emergency state (for new assessment)
   */
  const resetEmergencyState = useCallback(() => {
    hasShownAlert.current.clear();
    setEmergencyState({
      isEmergency: false,
      alert: null,
      detectionHistory: [],
    });
  }, []);

  /**
   * Quick check for emergency keywords
   */
  const checkSymptomKeywords = useCallback((text: string): {
    isEmergency: boolean;
    keywords: string[];
  } => {
    const emergencyKeywords = [
      'chest pain', 'crushing', 'pressure',
      'cant breathe', 'cannot breathe', 'difficulty breathing', 'short of breath',
      'stroke', 'slurred speech', 'face drooping', 'arm weakness',
      'suicide', 'kill myself', 'end my life', 'want to die',
      'bleeding heavily', 'losing blood', 'wont stop bleeding',
      'unconscious', 'passed out', 'unresponsive',
      'anaphylaxis', 'throat closing', 'cant swallow',
      'overdose', 'took too many pills',
      'severe allergic', 'swelling throat',
    ];
    
    const lowerText = text.toLowerCase();
    const foundKeywords = emergencyKeywords.filter(kw => lowerText.includes(kw));
    
    return {
      isEmergency: foundKeywords.length > 0,
      keywords: foundKeywords,
    };
  }, []);

  return {
    // State
    emergencyState,
    isEmergency: emergencyState.isEmergency,
    currentAlert: emergencyState.alert,
    
    // Actions
    evaluateMessage,
    processMessage,
    acknowledgeAlert,
    resetEmergencyState,
    checkSymptomKeywords,
  };
}

// =============================================================================
// Standalone function for server-side use
// =============================================================================

export function evaluateForEmergency(
  message: string,
  symptoms: string[] = []
): { isEmergency: boolean; urgencyScore: number; redFlags: string[] } {
  const result = redFlagEvaluator.evaluate({
    symptoms: [message, ...symptoms],
    chiefComplaint: message,
  });
  
  return {
    isEmergency: result.isEmergency,
    urgencyScore: result.urgencyScore,
    redFlags: result.redFlags.map(rf => rf.symptom),
  };
}

export default useEmergencyDetection;
