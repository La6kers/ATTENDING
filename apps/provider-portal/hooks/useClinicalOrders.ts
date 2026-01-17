// =============================================================================
// ATTENDING AI - Unified Clinical Orders Hook
// apps/provider-portal/hooks/useClinicalOrders.ts
//
// Provides a unified API for all clinical ordering workflows:
// - Labs, Imaging, Medications, Referrals
// - Integrates clinical safety checks
// - Coordinates cross-order validation
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useLabOrderingStore, type SelectedLab } from '@/store/labOrderingStore';
import { useImagingOrderingStore, type SelectedStudy } from '@/store/imagingOrderingStore';
import { useMedicationOrderingStore, type SelectedMedication } from '@/store/medicationOrderingStore';
import { useReferralOrderingStore, type SelectedReferral } from '@/store/referralOrderingStore';
import { useClinicalSafety } from './useClinicalSafety';
import type { PatientContext, OrderPriority } from '@attending/shared/catalogs';

// =============================================================================
// Types
// =============================================================================

// Re-export for convenience - use the canonical shared type
export type { PatientContext };

export type OrderType = 'lab' | 'imaging' | 'medication' | 'referral';

export interface OrderSummary {
  type: OrderType;
  count: number;
  hasSTAT: boolean;
  items: Array<{
    id: string;
    name: string;
    priority: OrderPriority;
  }>;
}

export interface ClinicalOrdersState {
  patientContext: PatientContext | null;
  labs: {
    selected: Map<string, SelectedLab>;
    count: number;
    hasSTAT: boolean;
  };
  imaging: {
    selected: Map<string, SelectedStudy>;
    count: number;
    hasSTAT: boolean;
  };
  medications: {
    selected: Map<string, SelectedMedication>;
    count: number;
    hasSTAT: boolean;
  };
  referrals: {
    selected: Map<string, SelectedReferral>;
    count: number;
    hasUrgent: boolean;
  };
  totalOrders: number;
  hasSafetyAlerts: boolean;
}

export interface SafetyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  drugInteractions: Array<{
    drugs: [string, string];
    severity: string;
    description: string;
  }>;
  contraindications: Array<{
    medication: string;
    reason: string;
  }>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useClinicalOrders() {
  // Get individual store states
  const labStore = useLabOrderingStore();
  const imagingStore = useImagingOrderingStore();
  const medStore = useMedicationOrderingStore();
  const referralStore = useReferralOrderingStore();
  
  // Get clinical safety functions
  const {
    checkDrugInteractions,
    checkMedicationSafety,
    evaluateSafety,
  } = useClinicalSafety();

  // ==========================================================================
  // Unified State
  // ==========================================================================

  const state = useMemo<ClinicalOrdersState>(() => {
    const labsSelected = labStore.selectedLabs;
    const imagingSelected = imagingStore.selectedStudies;
    const medsSelected = medStore.selectedMedications;
    const referralsSelected = referralStore.selectedReferrals;
    
    const labHasSTAT = Array.from(labsSelected.values()).some(l => l.priority === 'STAT');
    const imagingHasSTAT = Array.from(imagingSelected.values()).some(s => s.priority === 'STAT');
    const medsHasSTAT = Array.from(medsSelected.values()).some(m => m.priority === 'STAT');
    const referralHasUrgent = Array.from(referralsSelected.values()).some(
      r => r.urgency === 'STAT' || r.urgency === 'URGENT'
    );
    
    return {
      patientContext: labStore.patientContext || imagingStore.patientContext || 
                       medStore.patientContext || referralStore.patientContext,
      labs: {
        selected: labsSelected,
        count: labsSelected.size,
        hasSTAT: labHasSTAT,
      },
      imaging: {
        selected: imagingSelected,
        count: imagingSelected.size,
        hasSTAT: imagingHasSTAT,
      },
      medications: {
        selected: medsSelected,
        count: medsSelected.size,
        hasSTAT: medsHasSTAT,
      },
      referrals: {
        selected: referralsSelected,
        count: referralsSelected.size,
        hasUrgent: referralHasUrgent,
      },
      totalOrders: labsSelected.size + imagingSelected.size + 
                   medsSelected.size + referralsSelected.size,
      hasSafetyAlerts: false, // Will be computed in validateOrders
    };
  }, [
    labStore.selectedLabs,
    labStore.patientContext,
    imagingStore.selectedStudies,
    imagingStore.patientContext,
    medStore.selectedMedications,
    medStore.patientContext,
    referralStore.selectedReferrals,
    referralStore.patientContext,
  ]);

  // ==========================================================================
  // Unified Actions
  // ==========================================================================

  /**
   * Set patient context for all stores at once
   */
  const setPatientContext = useCallback((context: PatientContext) => {
    labStore.setPatientContext(context);
    imagingStore.setPatientContext(context);
    medStore.setPatientContext(context);
    referralStore.setPatientContext(context);
  }, [labStore, imagingStore, medStore, referralStore]);

  /**
   * Generate AI recommendations for all order types
   */
  const generateAllRecommendations = useCallback(async () => {
    await Promise.all([
      labStore.generateAIRecommendations(),
      imagingStore.generateAIRecommendations(),
      medStore.generateAIRecommendations(),
      referralStore.generateAIRecommendations(),
    ]);
  }, [labStore, imagingStore, medStore, referralStore]);

  /**
   * Clear all orders across all types
   */
  const clearAllOrders = useCallback(() => {
    labStore.clearOrder();
    imagingStore.clearOrder();
    medStore.clearOrder();
    referralStore.clearReferral();
  }, [labStore, imagingStore, medStore, referralStore]);

  /**
   * Validate all medication orders for safety
   */
  const validateMedicationSafety = useCallback((): SafetyValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const drugInteractions: SafetyValidation['drugInteractions'] = [];
    const contraindications: SafetyValidation['contraindications'] = [];
    
    const selectedMeds = Array.from(state.medications.selected.values());
    const medNames = selectedMeds.map(m => m.medication.genericName);
    
    // Normalize allergies to string array (can be string[] or {allergen, reaction, severity}[])
    const rawAllergies = state.patientContext?.allergies || [];
    const patientAllergies: string[] = rawAllergies.map((a: string | { allergen: string }) => 
      typeof a === 'string' ? a : a.allergen
    );
    
    const currentMeds = state.patientContext?.currentMedications || [];
    
    // Check each new medication
    for (const selected of selectedMeds) {
      const medName = selected.medication.genericName;
      
      // Check against patient allergies
      const safetyCheck = checkMedicationSafety(
        medName,
        currentMeds,
        patientAllergies
      );
      
      if (!safetyCheck.isSafe) {
        // Allergy risks (allergyAlerts is an array)
        if (safetyCheck.allergyRisk.allergyAlerts && safetyCheck.allergyRisk.allergyAlerts.length > 0) {
          safetyCheck.allergyRisk.allergyAlerts.forEach(alert => {
            errors.push(`${medName}: Potential allergic reaction - ${alert.message}`);
            contraindications.push({
              medication: medName,
              reason: alert.message,
            });
          });
        }
        
        // Drug interactions (interactions is an array of DrugInteraction)
        if (safetyCheck.interactions.interactions && safetyCheck.interactions.interactions.length > 0) {
          safetyCheck.interactions.interactions.forEach(interaction => {
            const severity = interaction.severity;
            if (severity === 'major' || severity === 'contraindicated') {
              errors.push(`${medName}: ${interaction.description}`);
            } else {
              warnings.push(`${medName}: ${interaction.description}`);
            }
            drugInteractions.push({
              drugs: [interaction.drug1, interaction.drug2],
              severity: interaction.severity,
              description: interaction.description,
            });
          });
        }
        
        // Add any contraindications from the result
        if (safetyCheck.interactions.contraindications) {
          safetyCheck.interactions.contraindications.forEach(ci => {
            errors.push(`${medName}: ${ci}`);
            contraindications.push({ medication: medName, reason: ci });
          });
        }
        
        // Add any warnings from the result
        if (safetyCheck.interactions.warnings) {
          safetyCheck.interactions.warnings.forEach(w => warnings.push(`${medName}: ${w}`));
        }
      }
    }
    
    // Check interactions between newly selected medications
    for (let i = 0; i < medNames.length; i++) {
      for (let j = i + 1; j < medNames.length; j++) {
        const result = checkDrugInteractions([medNames[i]], medNames[j]);
        if (result.interactions && result.interactions.length > 0) {
          result.interactions.forEach(interaction => {
            if (!drugInteractions.find(
              d => d.drugs.includes(interaction.drug1) && d.drugs.includes(interaction.drug2)
            )) {
              if (interaction.severity === 'major' || interaction.severity === 'contraindicated') {
                errors.push(`Interaction: ${medNames[i]} + ${medNames[j]} - ${interaction.description}`);
              } else {
                warnings.push(`Interaction: ${medNames[i]} + ${medNames[j]} - ${interaction.description}`);
              }
              drugInteractions.push({
                drugs: [interaction.drug1, interaction.drug2],
                severity: interaction.severity,
                description: interaction.description,
              });
            }
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      drugInteractions,
      contraindications,
    };
  }, [state, checkDrugInteractions, checkMedicationSafety]);

  /**
   * Get order summary for display
   */
  const getOrderSummary = useCallback((): OrderSummary[] => {
    const summaries: OrderSummary[] = [];
    
    if (state.labs.count > 0) {
      summaries.push({
        type: 'lab',
        count: state.labs.count,
        hasSTAT: state.labs.hasSTAT,
        items: Array.from(state.labs.selected.values()).map(l => ({
          id: l.test.code,
          name: l.test.name,
          priority: l.priority,
        })),
      });
    }
    
    if (state.imaging.count > 0) {
      summaries.push({
        type: 'imaging',
        count: state.imaging.count,
        hasSTAT: state.imaging.hasSTAT,
        items: Array.from(state.imaging.selected.values()).map(s => ({
          id: s.study.code,
          name: s.study.name,
          priority: s.priority,
        })),
      });
    }
    
    if (state.medications.count > 0) {
      summaries.push({
        type: 'medication',
        count: state.medications.count,
        hasSTAT: state.medications.hasSTAT,
        items: Array.from(state.medications.selected.values()).map(m => ({
          id: m.medication.id,
          name: m.medication.genericName,
          priority: m.priority,
        })),
      });
    }
    
    if (state.referrals.count > 0) {
      summaries.push({
        type: 'referral',
        count: state.referrals.count,
        hasSTAT: state.referrals.hasUrgent,
        items: Array.from(state.referrals.selected.values()).map(r => ({
          id: r.specialty.code,
          name: r.specialty.name,
          priority: r.urgency as OrderPriority,
        })),
      });
    }
    
    return summaries;
  }, [state]);

  /**
   * Submit all orders
   */
  const submitAllOrders = useCallback(async (encounterId: string): Promise<{
    success: boolean;
    results: {
      labs?: string[];
      imaging?: string[];
      medications?: string[];
      referrals?: string[];
    };
    errors?: string[];
  }> => {
    const results: {
      labs?: string[];
      imaging?: string[];
      medications?: string[];
      referrals?: string[];
    } = {};
    const errors: string[] = [];
    
    // Validate medications first
    if (state.medications.count > 0) {
      const validation = validateMedicationSafety();
      if (!validation.isValid) {
        return {
          success: false,
          results: {},
          errors: validation.errors,
        };
      }
    }
    
    try {
      // Submit labs
      if (state.labs.count > 0) {
        const labIds = await labStore.submitOrder(encounterId);
        results.labs = labIds;
      }
      
      // Submit imaging
      if (state.imaging.count > 0) {
        const imagingIds = await imagingStore.submitOrder(encounterId);
        results.imaging = imagingIds;
      }
      
      // Submit medications
      if (state.medications.count > 0) {
        const medIds = await medStore.submitPrescriptions(encounterId);
        results.medications = medIds;
      }
      
      // Submit referrals
      if (state.referrals.count > 0) {
        const referralIds = await referralStore.submitReferral(encounterId);
        results.referrals = referralIds;
      }
      
      return { success: true, results };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Failed to submit orders');
      return { success: false, results, errors };
    }
  }, [state, labStore, imagingStore, medStore, referralStore, validateMedicationSafety]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    state,
    patientContext: state.patientContext,
    totalOrders: state.totalOrders,
    
    // Individual store access (for specific operations)
    labs: labStore,
    imaging: imagingStore,
    medications: medStore,
    referrals: referralStore,
    
    // Unified actions
    setPatientContext,
    generateAllRecommendations,
    clearAllOrders,
    validateMedicationSafety,
    getOrderSummary,
    submitAllOrders,
  };
}

export default useClinicalOrders;
