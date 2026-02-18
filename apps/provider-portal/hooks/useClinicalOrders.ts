// =============================================================================
// ATTENDING AI — Unified Clinical Orders Hook (REFACTORED)
// apps/provider-portal/hooks/useClinicalOrders.ts
//
// CHANGES:
//   • Map → Record references (stores now use Records)
//   • Removed method alias references (submitReferral → submitReferrals)
//   • Uses OrderingContext canonical type
//   • Removed l.lab || l.test backward compat (only l.lab now)
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useLabOrderingStore, type SelectedLab } from '@/store/labOrderingStore';
import { useImagingOrderingStore, type SelectedStudy } from '@/store/imagingOrderingStore';
import { useMedicationOrderingStore, type SelectedMedication } from '@/store/medicationOrderingStore';
import { useReferralOrderingStore, type SelectedReferral } from '@/store/referralOrderingStore';
import { useClinicalSafety } from './useClinicalSafety';
import type { OrderingContext, OrderPriority } from '@attending/shared/catalogs';

// Re-export for convenience
export type { OrderingContext };
/** @deprecated Use OrderingContext */
export type PatientContext = OrderingContext;

export type OrderType = 'lab' | 'imaging' | 'medication' | 'referral';

export interface OrderSummary {
  type: OrderType;
  count: number;
  hasSTAT: boolean;
  items: Array<{ id: string; name: string; priority: OrderPriority }>;
}

export interface ClinicalOrdersState {
  patientContext: OrderingContext | null;
  labs: { selected: Record<string, SelectedLab>; count: number; hasSTAT: boolean };
  imaging: { selected: Record<string, SelectedStudy>; count: number; hasSTAT: boolean };
  medications: { selected: Record<string, SelectedMedication>; count: number; hasSTAT: boolean };
  referrals: { selected: Record<string, SelectedReferral>; count: number; hasUrgent: boolean };
  totalOrders: number;
  hasSafetyAlerts: boolean;
}

export interface SafetyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  drugInteractions: Array<{ drugs: [string, string]; severity: string; description: string }>;
  contraindications: Array<{ medication: string; reason: string }>;
}

// =============================================================================
// Hook
// =============================================================================

export function useClinicalOrders() {
  const labStore = useLabOrderingStore();
  const imagingStore = useImagingOrderingStore();
  const medStore = useMedicationOrderingStore();
  const referralStore = useReferralOrderingStore();
  const { checkDrugInteractions, checkMedicationSafety } = useClinicalSafety();

  // ── Unified State ──────────────────────────────────────────
  const state = useMemo<ClinicalOrdersState>(() => {
    const labsObj = labStore.selectedLabs;
    const imagingObj = imagingStore.selectedStudies;
    const medsObj = medStore.selectedMedications;
    const refsObj = referralStore.selectedReferrals;

    const labCount = Object.keys(labsObj).length;
    const imgCount = Object.keys(imagingObj).length;
    const medCount = Object.keys(medsObj).length;
    const refCount = Object.keys(refsObj).length;

    return {
      patientContext:
        labStore.patientContext || imagingStore.patientContext ||
        medStore.patientContext || referralStore.patientContext,
      labs: {
        selected: labsObj,
        count: labCount,
        hasSTAT: Object.values(labsObj).some(l => l.priority === 'STAT'),
      },
      imaging: {
        selected: imagingObj,
        count: imgCount,
        hasSTAT: Object.values(imagingObj).some(s => s.priority === 'STAT'),
      },
      medications: {
        selected: medsObj,
        count: medCount,
        hasSTAT: Object.values(medsObj).some(m => m.priority === 'STAT'),
      },
      referrals: {
        selected: refsObj,
        count: refCount,
        hasUrgent: Object.values(refsObj).some(
          r => r.urgency === 'STAT' || r.urgency === 'URGENT',
        ),
      },
      totalOrders: labCount + imgCount + medCount + refCount,
      hasSafetyAlerts: false,
    };
  }, [
    labStore.selectedLabs, labStore.patientContext,
    imagingStore.selectedStudies, imagingStore.patientContext,
    medStore.selectedMedications, medStore.patientContext,
    referralStore.selectedReferrals, referralStore.patientContext,
  ]);

  // ── Set patient context for ALL stores at once ─────────────
  const setPatientContext = useCallback((context: OrderingContext) => {
    labStore.setPatientContext(context);
    imagingStore.setPatientContext(context);
    medStore.setPatientContext(context);
    referralStore.setPatientContext(context);
  }, [labStore, imagingStore, medStore, referralStore]);

  // ── Generate AI recommendations for all order types ────────
  const generateAllRecommendations = useCallback(() => {
    // Labs, imaging, meds are now synchronous
    labStore.generateAIRecommendations();
    imagingStore.generateAIRecommendations();
    medStore.generateAIRecommendations();
    // Referrals still async (API call with fallback)
    referralStore.generateAIRecommendations();
  }, [labStore, imagingStore, medStore, referralStore]);

  // ── Clear all orders ───────────────────────────────────────
  const clearAllOrders = useCallback(() => {
    labStore.clearOrder();
    imagingStore.clearOrder();
    medStore.clearOrder();
    referralStore.clearOrder();
  }, [labStore, imagingStore, medStore, referralStore]);

  // ── Medication Safety Validation ───────────────────────────
  const validateMedicationSafety = useCallback((): SafetyValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const drugInteractions: SafetyValidation['drugInteractions'] = [];
    const contraindications: SafetyValidation['contraindications'] = [];

    const selectedMeds = Object.values(state.medications.selected);
    const medNames = selectedMeds.map(m => m.medication.genericName);

    const rawAllergies = state.patientContext?.allergies || [];
    const patientAllergies: string[] = rawAllergies.map(
      (a: string | { allergen: string }) => (typeof a === 'string' ? a : a.allergen),
    );

    const currentMeds = state.patientContext?.currentMedications || [];

    for (const selected of selectedMeds) {
      const medName = selected.medication.genericName;
      const safetyCheck = checkMedicationSafety(medName, currentMeds, patientAllergies);

      if (!safetyCheck.isSafe) {
        if (safetyCheck.allergyRisk?.allergyAlerts?.length) {
          safetyCheck.allergyRisk.allergyAlerts.forEach((alert: { message: string }) => {
            errors.push(`${medName}: Potential allergic reaction - ${alert.message}`);
            contraindications.push({ medication: medName, reason: alert.message });
          });
        }

        if (safetyCheck.interactions?.interactions?.length) {
          safetyCheck.interactions.interactions.forEach((ix: { drug1: string; drug2: string; severity: string; description: string }) => {
            (ix.severity === 'major' || ix.severity === 'contraindicated' ? errors : warnings)
              .push(`${medName}: ${ix.description}`);
            drugInteractions.push({ drugs: [ix.drug1, ix.drug2], severity: ix.severity, description: ix.description });
          });
        }

        safetyCheck.interactions?.contraindications?.forEach((ci: string) => {
          errors.push(`${medName}: ${ci}`);
          contraindications.push({ medication: medName, reason: ci });
        });

        safetyCheck.interactions?.warnings?.forEach((w: string) => warnings.push(`${medName}: ${w}`));
      }
    }

    // Cross-check between newly selected medications
    for (let i = 0; i < medNames.length; i++) {
      for (let j = i + 1; j < medNames.length; j++) {
        const result = checkDrugInteractions([medNames[i]], medNames[j]);
        if (result.interactions?.length) {
          result.interactions.forEach((ix: { drug1: string; drug2: string; severity: string; description: string }) => {
            const alreadyFound = drugInteractions.find(
              d => d.drugs.includes(ix.drug1) && d.drugs.includes(ix.drug2),
            );
            if (!alreadyFound) {
              (ix.severity === 'major' || ix.severity === 'contraindicated' ? errors : warnings)
                .push(`Interaction: ${medNames[i]} + ${medNames[j]} - ${ix.description}`);
              drugInteractions.push({ drugs: [ix.drug1, ix.drug2], severity: ix.severity, description: ix.description });
            }
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings, drugInteractions, contraindications };
  }, [state, checkDrugInteractions, checkMedicationSafety]);

  // ── Order Summary ──────────────────────────────────────────
  const getOrderSummary = useCallback((): OrderSummary[] => {
    const summaries: OrderSummary[] = [];

    if (state.labs.count > 0) {
      summaries.push({
        type: 'lab',
        count: state.labs.count,
        hasSTAT: state.labs.hasSTAT,
        items: Object.values(state.labs.selected).map(l => ({
          id: l.lab?.code || 'unknown',
          name: l.lab?.name || 'Unknown',
          priority: l.priority,
        })),
      });
    }

    if (state.imaging.count > 0) {
      summaries.push({
        type: 'imaging',
        count: state.imaging.count,
        hasSTAT: state.imaging.hasSTAT,
        items: Object.values(state.imaging.selected).map(s => ({
          id: s.study.code, name: s.study.name, priority: s.priority,
        })),
      });
    }

    if (state.medications.count > 0) {
      summaries.push({
        type: 'medication',
        count: state.medications.count,
        hasSTAT: state.medications.hasSTAT,
        items: Object.values(state.medications.selected).map(m => ({
          id: m.medication.code || m.medication.genericName,
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
        items: Object.values(state.referrals.selected).map(r => ({
          id: r.specialty.code, name: r.specialty.name, priority: r.urgency as OrderPriority,
        })),
      });
    }

    return summaries;
  }, [state]);

  // ── Submit All Orders ──────────────────────────────────────
  const submitAllOrders = useCallback(async (encounterId: string) => {
    const results: { labs?: string[]; imaging?: string[]; medications?: string[]; referrals?: string[] } = {};
    const errors: string[] = [];

    // Validate medications first
    if (state.medications.count > 0) {
      const validation = validateMedicationSafety();
      if (!validation.isValid) return { success: false, results: {}, errors: validation.errors };
    }

    try {
      if (state.labs.count > 0) {
        const labIds = await labStore.submitOrder(encounterId);
        if (Array.isArray(labIds)) results.labs = labIds;
      }
      if (state.imaging.count > 0) {
        results.imaging = await imagingStore.submitOrder(encounterId);
      }
      if (state.medications.count > 0) {
        results.medications = await medStore.submitPrescriptions(encounterId);
      }
      if (state.referrals.count > 0) {
        results.referrals = await referralStore.submitReferrals(encounterId);
      }
      return { success: true, results };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Failed to submit orders');
      return { success: false, results, errors };
    }
  }, [state, labStore, imagingStore, medStore, referralStore, validateMedicationSafety]);

  // ── Return ─────────────────────────────────────────────────
  return {
    state,
    patientContext: state.patientContext,
    totalOrders: state.totalOrders,
    labs: labStore,
    imaging: imagingStore,
    medications: medStore,
    referrals: referralStore,
    setPatientContext,
    generateAllRecommendations,
    clearAllOrders,
    validateMedicationSafety,
    getOrderSummary,
    submitAllOrders,
  };
}

export default useClinicalOrders;
