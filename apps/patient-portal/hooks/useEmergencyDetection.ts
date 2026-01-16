// =============================================================================
// ATTENDING AI - Emergency Detection Hook for COMPASS
// apps/patient-portal/hooks/useEmergencyDetection.ts
//
// Real-time emergency symptom detection during patient chat assessment.
// Triggers immediate alerts for life-threatening conditions.
// =============================================================================

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  redFlagEvaluator,
  emergencyLocationService,
  type RedFlagMatch,
  type EvaluationResult,
  type UrgencyLevel,
  type EmergencyFacility,
} from '@attending/clinical-services';

// =============================================================================
// Types
// =============================================================================

export interface EmergencyAlert {
  id: string;
  timestamp: Date;
  urgency: UrgencyLevel;
  matches: RedFlagMatch[];
  message: string;
  call911: boolean;
  instructions: string[];
}

export interface EmergencyState {
  isEmergency: boolean;
  alert: EmergencyAlert | null;
  nearestFacility: EmergencyFacility | null;
  detectionHistory: EvaluationResult[];
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
// Hook Implementation
// =============================================================================

export function useEmergencyDetection() {
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    isEmergency: false,
    alert: null,
    nearestFacility: null,
    detectionHistory: [],
  });
  
  const alertIdCounter = useRef(0);
  const hasShownAlert = useRef<Set<string>>(new Set());

  /**
   * Evaluate a single message for emergency symptoms
   */
  const evaluateMessage = useCallback((message: string): EvaluationResult => {
    return redFlagEvaluator.evaluateNarrative(message);
  }, []);

  /**
   * Evaluate accumulated symptoms from the assessment
   */
  const evaluateSymptoms = useCallback((symptoms: string[]): EvaluationResult => {
    return redFlagEvaluator.evaluate(symptoms);
  }, []);

  /**
   * Process message and check for emergencies
   * Returns true if an emergency was detected
   */
  const processMessage = useCallback((
    message: string,
    accumulatedSymptoms: string[] = []
  ): { isEmergency: boolean; result: EvaluationResult } => {
    // Evaluate the current message
    const messageResult = redFlagEvaluator.evaluateNarrative(message);
    
    // Also evaluate accumulated symptoms
    const symptomResult = accumulatedSymptoms.length > 0 
      ? redFlagEvaluator.evaluate(accumulatedSymptoms)
      : { hasRedFlags: false, matches: [], highestUrgency: 'none' as UrgencyLevel, recommendations: [] };
    
    // Merge results
    const allMatches = [...messageResult.matches, ...symptomResult.matches];
    const uniqueMatches = allMatches.reduce((acc, match) => {
      if (!acc.find(m => m.pattern.id === match.pattern.id)) {
        acc.push(match);
      }
      return acc;
    }, [] as RedFlagMatch[]);
    
    // Determine highest urgency
    const urgencyOrder: UrgencyLevel[] = ['critical', 'emergent', 'urgent', 'standard', 'none'];
    const highestUrgency = uniqueMatches.reduce((highest, match) => {
      const currentIndex = urgencyOrder.indexOf(match.pattern.urgency);
      const highestIndex = urgencyOrder.indexOf(highest);
      return currentIndex < highestIndex ? match.pattern.urgency : highest;
    }, 'none' as UrgencyLevel);
    
    const result: EvaluationResult = {
      hasRedFlags: uniqueMatches.length > 0,
      matches: uniqueMatches,
      highestUrgency,
      recommendations: [...new Set([
        ...messageResult.recommendations,
        ...symptomResult.recommendations
      ])],
    };
    
    // Update detection history
    setEmergencyState(prev => ({
      ...prev,
      detectionHistory: [...prev.detectionHistory, result],
    }));
    
    // Check if this is a new emergency
    const isEmergency = highestUrgency === 'critical' || highestUrgency === 'emergent';
    
    if (isEmergency) {
      // Create unique key for this set of red flags
      const alertKey = uniqueMatches.map(m => m.pattern.id).sort().join('|');
      
      // Only show alert if we haven't shown it before
      if (!hasShownAlert.current.has(alertKey)) {
        hasShownAlert.current.add(alertKey);
        
        const alert: EmergencyAlert = {
          id: `emergency-${++alertIdCounter.current}`,
          timestamp: new Date(),
          urgency: highestUrgency,
          matches: uniqueMatches,
          message: EMERGENCY_MESSAGES[highestUrgency],
          call911: highestUrgency === 'critical',
          instructions: EMERGENCY_INSTRUCTIONS[highestUrgency],
        };
        
        setEmergencyState(prev => ({
          ...prev,
          isEmergency: true,
          alert,
        }));
        
        // Try to get nearest emergency facility
        findNearestEmergencyFacility();
      }
    }
    
    return { isEmergency, result };
  }, []);

  /**
   * Find nearest emergency facility using geolocation
   */
  const findNearestEmergencyFacility = useCallback(async () => {
    try {
      const result = await emergencyLocationService.findNearestFacility();
      if (result.success && result.facility) {
        setEmergencyState(prev => ({
          ...prev,
          nearestFacility: result.facility!,
        }));
      }
    } catch (error) {
      console.error('Failed to find nearest emergency facility:', error);
    }
  }, []);

  /**
   * Acknowledge and dismiss emergency alert
   * (User has seen it and taken action)
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
      nearestFacility: null,
      detectionHistory: [],
    });
  }, []);

  /**
   * Check if specific symptom keywords indicate emergency
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
    nearestFacility: emergencyState.nearestFacility,
    
    // Actions
    evaluateMessage,
    evaluateSymptoms,
    processMessage,
    acknowledgeAlert,
    resetEmergencyState,
    checkSymptomKeywords,
    findNearestEmergencyFacility,
  };
}

// =============================================================================
// Standalone function for server-side use
// =============================================================================

export function evaluateForEmergency(
  message: string,
  symptoms: string[] = []
): { isEmergency: boolean; urgency: UrgencyLevel; matches: RedFlagMatch[] } {
  const messageResult = redFlagEvaluator.evaluateNarrative(message);
  const symptomResult = symptoms.length > 0 
    ? redFlagEvaluator.evaluate(symptoms)
    : { hasRedFlags: false, matches: [], highestUrgency: 'none' as UrgencyLevel };
  
  const allMatches = [...messageResult.matches, ...symptomResult.matches];
  const urgencyOrder: UrgencyLevel[] = ['critical', 'emergent', 'urgent', 'standard', 'none'];
  
  const highestUrgency = allMatches.reduce((highest, match) => {
    const currentIndex = urgencyOrder.indexOf(match.pattern.urgency);
    const highestIndex = urgencyOrder.indexOf(highest);
    return currentIndex < highestIndex ? match.pattern.urgency : highest;
  }, 'none' as UrgencyLevel);
  
  return {
    isEmergency: highestUrgency === 'critical' || highestUrgency === 'emergent',
    urgency: highestUrgency,
    matches: allMatches,
  };
}

export default useEmergencyDetection;
