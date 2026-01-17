// =============================================================================
// ATTENDING AI - Clinical Safety Hook
// apps/provider-portal/hooks/useClinicalSafety.ts
//
// Provides access to critical clinical safety services:
// - Red flag detection for emergency symptoms
// - Triage classification (ESI 1-5)
// - Drug interaction checking
// - Clinical protocol retrieval
// =============================================================================

import { useCallback, useMemo } from 'react';
import {
  redFlagEvaluator,
  triageClassifier,
  drugInteractionChecker,
  clinicalProtocolEngine,
  labRecommender,
  type RedFlagInput,
  type RedFlagResult,
  type RedFlag,
  type TriageInput,
  type TriageResult,
  type DrugCheckInput,
  type DrugCheckResult,
  type ProtocolResult,
  type LabRecommendation,
  type LabRecommenderInput,
} from '@attending/clinical-services';

// =============================================================================
// Types
// =============================================================================

export interface ClinicalSafetyResult {
  redFlags: RedFlagResult;
  triage: TriageResult | null;
  hasEmergency: boolean;
  hasCritical: boolean;
}

export interface PatientPresentation {
  symptoms: string[];
  chiefComplaint: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    painLevel?: number;
  };
  age?: number;
  painLevel?: number;
  mentalStatus?: 'normal' | 'altered' | 'unresponsive';
}

// Re-export types for consumers
export type { RedFlagResult, RedFlag, TriageResult, DrugCheckResult, ProtocolResult, LabRecommendation };

// =============================================================================
// Hook Implementation
// =============================================================================

export function useClinicalSafety() {
  /**
   * Evaluate symptoms for red flags (emergency conditions)
   * CRITICAL: This should be called whenever patient symptoms are updated
   */
  const evaluateRedFlags = useCallback((symptoms: string[]): RedFlagResult => {
    return redFlagEvaluator.evaluate({
      symptoms,
      chiefComplaint: symptoms.join(', '),
    });
  }, []);

  /**
   * Evaluate a text narrative for red flags
   * Useful for free-text chief complaint parsing
   */
  const evaluateNarrative = useCallback((narrative: string): RedFlagResult => {
    return redFlagEvaluator.evaluate({
      symptoms: [],
      chiefComplaint: narrative,
    });
  }, []);

  /**
   * Classify patient triage level (ESI 1-5)
   * ESI 1 = Immediate life-saving intervention required
   * ESI 5 = Non-urgent
   */
  const classifyTriage = useCallback((
    presentation: PatientPresentation
  ): TriageResult => {
    const input: TriageInput = {
      chiefComplaint: presentation.chiefComplaint,
      symptoms: presentation.symptoms,
      vitals: presentation.vitalSigns,
      age: presentation.age,
    };
    
    return triageClassifier.classify(input);
  }, []);

  /**
   * Perform comprehensive clinical safety evaluation
   * Combines red flag detection + triage classification
   */
  const evaluateSafety = useCallback((
    presentation: PatientPresentation
  ): ClinicalSafetyResult => {
    // Evaluate red flags from symptoms and chief complaint
    const redFlagInput: RedFlagInput = {
      symptoms: presentation.symptoms,
      chiefComplaint: presentation.chiefComplaint,
      vitals: presentation.vitalSigns,
      age: presentation.age,
    };
    
    const redFlags = redFlagEvaluator.evaluate(redFlagInput);
    
    // Classify triage
    const triage = classifyTriage(presentation);
    
    return {
      redFlags,
      triage,
      hasEmergency: redFlags.isEmergency,
      hasCritical: redFlags.redFlags.some(rf => rf.severity === 'critical'),
    };
  }, [classifyTriage]);

  /**
   * Check for drug-drug interactions
   * CRITICAL: Call before finalizing medication orders
   */
  const checkDrugInteractions = useCallback((
    currentMedications: string[],
    newMedication: string
  ): DrugCheckResult => {
    return drugInteractionChecker.check({
      medications: [...currentMedications, newMedication],
    });
  }, []);

  /**
   * Check medication against patient allergies
   */
  const checkAllergies = useCallback((
    medication: string,
    allergies: string[]
  ): DrugCheckResult => {
    return drugInteractionChecker.check({
      medications: [medication],
      allergies,
    });
  }, []);

  /**
   * Comprehensive medication safety check
   * Includes drug interactions + allergy cross-reactivity
   */
  const checkMedicationSafety = useCallback((
    medication: string,
    currentMedications: string[],
    allergies: string[]
  ): {
    interactions: DrugCheckResult;
    allergyRisk: DrugCheckResult;
    isSafe: boolean;
  } => {
    const interactions = drugInteractionChecker.check({
      medications: [...currentMedications, medication],
    });
    const allergyRisk = drugInteractionChecker.check({
      medications: [medication],
      allergies,
    });
    
    const hasSevereInteraction = interactions.interactions.some(
      i => i.severity === 'major' || i.severity === 'contraindicated'
    );
    const hasAllergyRisk = allergyRisk.allergyAlerts.length > 0;
    
    return {
      interactions,
      allergyRisk,
      isSafe: !hasSevereInteraction && !hasAllergyRisk,
    };
  }, []);

  /**
   * Get clinical protocol for a condition
   * Returns evidence-based treatment protocols
   */
  const getProtocol = useCallback((
    protocolId: string
  ): ProtocolResult | null => {
    return clinicalProtocolEngine.getProtocol(protocolId);
  }, []);

  /**
   * Search protocols by keyword
   */
  const searchProtocols = useCallback((
    _query: string
  ): ProtocolResult[] => {
    // Return all protocols since there's no search method - consumer can filter
    return clinicalProtocolEngine.getAllProtocols();
  }, []);

  /**
   * Get recommended labs based on symptoms
   */
  const getLabRecommendations = useCallback((
    symptoms: string[],
    context?: { age?: number; sex?: 'male' | 'female' }
  ): LabRecommendation[] => {
    const input: LabRecommenderInput = {
      symptoms,
      chiefComplaint: symptoms.join(', '),
      age: context?.age || 0,
      gender: context?.sex || 'unknown',
    };
    return labRecommender.getRecommendations(input);
  }, []);

  // Return all clinical safety functions
  return useMemo(() => ({
    // Red flag detection
    evaluateRedFlags,
    evaluateNarrative,
    
    // Triage classification
    classifyTriage,
    
    // Combined safety evaluation
    evaluateSafety,
    
    // Drug safety
    checkDrugInteractions,
    checkAllergies,
    checkMedicationSafety,
    
    // Clinical protocols
    getProtocol,
    searchProtocols,
    
    // Lab recommendations
    getLabRecommendations,
  }), [
    evaluateRedFlags,
    evaluateNarrative,
    classifyTriage,
    evaluateSafety,
    checkDrugInteractions,
    checkAllergies,
    checkMedicationSafety,
    getProtocol,
    searchProtocols,
    getLabRecommendations,
  ]);
}

// =============================================================================
// Standalone utility functions (for use outside React components)
// =============================================================================

export const clinicalSafety = {
  evaluateRedFlags: (symptoms: string[]) => redFlagEvaluator.evaluate({ symptoms, chiefComplaint: symptoms.join(', ') }),
  evaluateNarrative: (narrative: string) => redFlagEvaluator.evaluate({ symptoms: [], chiefComplaint: narrative }),
  classifyTriage: (input: TriageInput) => triageClassifier.classify(input),
  checkDrugInteractions: (meds: string[], newMed: string) => 
    drugInteractionChecker.check({ medications: [...meds, newMed] }),
  checkAllergies: (med: string, allergies: string[]) => 
    drugInteractionChecker.check({ medications: [med], allergies }),
  getProtocol: (id: string) => clinicalProtocolEngine.getProtocol(id),
  getLabRecommendations: (symptoms: string[]) => labRecommender.getRecommendations({ 
    symptoms, 
    chiefComplaint: symptoms.join(', '), 
    age: 0, 
    gender: 'unknown' 
  }),
};

export default useClinicalSafety;
