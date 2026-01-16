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
  clinicalProtocolService,
  labRecommender,
  type RedFlagMatch,
  type EvaluationResult,
  type TriageResult,
  type VitalSigns,
  type PatientContext,
  type InteractionCheckResult,
  type ClinicalProtocol,
  type RecommendationResult,
} from '@attending/clinical-services';

// =============================================================================
// Types
// =============================================================================

export interface ClinicalSafetyResult {
  redFlags: EvaluationResult;
  triage: TriageResult | null;
  hasEmergency: boolean;
  hasCritical: boolean;
}

export interface PatientPresentation {
  symptoms: string[];
  chiefComplaint: string;
  vitalSigns?: VitalSigns;
  age?: number;
  painLevel?: number;
  mentalStatus?: 'normal' | 'altered' | 'unresponsive';
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useClinicalSafety() {
  /**
   * Evaluate symptoms for red flags (emergency conditions)
   * CRITICAL: This should be called whenever patient symptoms are updated
   */
  const evaluateRedFlags = useCallback((symptoms: string[]): EvaluationResult => {
    return redFlagEvaluator.evaluate(symptoms);
  }, []);

  /**
   * Evaluate a text narrative for red flags
   * Useful for free-text chief complaint parsing
   */
  const evaluateNarrative = useCallback((narrative: string): EvaluationResult => {
    return redFlagEvaluator.evaluateNarrative(narrative);
  }, []);

  /**
   * Classify patient triage level (ESI 1-5)
   * ESI 1 = Immediate life-saving intervention required
   * ESI 5 = Non-urgent
   */
  const classifyTriage = useCallback((
    presentation: PatientPresentation
  ): TriageResult => {
    const context: PatientContext = {
      age: presentation.age,
      chiefComplaint: presentation.chiefComplaint,
      symptoms: presentation.symptoms,
      vitalSigns: presentation.vitalSigns,
      painLevel: presentation.painLevel,
      mentalStatus: presentation.mentalStatus,
    };
    
    return triageClassifier.classify(context);
  }, []);

  /**
   * Perform comprehensive clinical safety evaluation
   * Combines red flag detection + triage classification
   */
  const evaluateSafety = useCallback((
    presentation: PatientPresentation
  ): ClinicalSafetyResult => {
    // Evaluate red flags from symptoms and chief complaint
    const symptomFlags = redFlagEvaluator.evaluate(presentation.symptoms);
    const narrativeFlags = redFlagEvaluator.evaluateNarrative(presentation.chiefComplaint);
    
    // Merge red flag results
    const allMatches = [...symptomFlags.matches, ...narrativeFlags.matches];
    const uniqueMatches = allMatches.reduce((acc, match) => {
      const existing = acc.find(m => m.pattern.id === match.pattern.id);
      if (!existing || match.confidence > existing.confidence) {
        return [...acc.filter(m => m.pattern.id !== match.pattern.id), match];
      }
      return acc;
    }, [] as RedFlagMatch[]);
    
    // Determine highest urgency from red flags
    const urgencyOrder = ['critical', 'emergent', 'urgent', 'standard', 'none'] as const;
    const highestUrgency = uniqueMatches.reduce((highest, match) => {
      const currentIndex = urgencyOrder.indexOf(match.pattern.urgency);
      const highestIndex = urgencyOrder.indexOf(highest);
      return currentIndex < highestIndex ? match.pattern.urgency : highest;
    }, 'none' as typeof urgencyOrder[number]);
    
    const redFlags: EvaluationResult = {
      hasRedFlags: uniqueMatches.length > 0,
      matches: uniqueMatches,
      highestUrgency,
      recommendations: [...new Set([
        ...symptomFlags.recommendations,
        ...narrativeFlags.recommendations
      ])],
    };
    
    // Classify triage
    const triage = classifyTriage(presentation);
    
    return {
      redFlags,
      triage,
      hasEmergency: highestUrgency === 'critical' || highestUrgency === 'emergent',
      hasCritical: highestUrgency === 'critical',
    };
  }, [classifyTriage]);

  /**
   * Check for drug-drug interactions
   * CRITICAL: Call before finalizing medication orders
   */
  const checkDrugInteractions = useCallback((
    currentMedications: string[],
    newMedication: string
  ): InteractionCheckResult => {
    return drugInteractionChecker.checkInteractions(currentMedications, newMedication);
  }, []);

  /**
   * Check medication against patient allergies
   */
  const checkAllergies = useCallback((
    medication: string,
    allergies: string[]
  ): InteractionCheckResult => {
    return drugInteractionChecker.checkAllergies(medication, allergies);
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
    interactions: InteractionCheckResult;
    allergyRisk: InteractionCheckResult;
    isSafe: boolean;
  } => {
    const interactions = drugInteractionChecker.checkInteractions(currentMedications, medication);
    const allergyRisk = drugInteractionChecker.checkAllergies(medication, allergies);
    
    const hasSevereInteraction = interactions.interactions.some(
      i => i.severity === 'severe' || i.severity === 'contraindicated'
    );
    const hasAllergyRisk = allergyRisk.hasInteractions;
    
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
  ): ClinicalProtocol | undefined => {
    return clinicalProtocolService.getProtocol(protocolId);
  }, []);

  /**
   * Search protocols by keyword
   */
  const searchProtocols = useCallback((
    query: string
  ): ClinicalProtocol[] => {
    return clinicalProtocolService.searchProtocols(query);
  }, []);

  /**
   * Get recommended labs based on symptoms
   */
  const getLabRecommendations = useCallback((
    symptoms: string[],
    context?: { age?: number; sex?: 'male' | 'female' }
  ): RecommendationResult => {
    return labRecommender.recommend(symptoms, context);
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
  evaluateRedFlags: (symptoms: string[]) => redFlagEvaluator.evaluate(symptoms),
  evaluateNarrative: (narrative: string) => redFlagEvaluator.evaluateNarrative(narrative),
  classifyTriage: (context: PatientContext) => triageClassifier.classify(context),
  checkDrugInteractions: (meds: string[], newMed: string) => 
    drugInteractionChecker.checkInteractions(meds, newMed),
  checkAllergies: (med: string, allergies: string[]) => 
    drugInteractionChecker.checkAllergies(med, allergies),
  getProtocol: (id: string) => clinicalProtocolService.getProtocol(id),
  getLabRecommendations: (symptoms: string[]) => labRecommender.recommend(symptoms),
};

export default useClinicalSafety;
