// =============================================================================
// ATTENDING AI — Unified Clinical Orders Hook
// apps/provider-portal/hooks/useClinicalOrders.ts
//
// FIXES:
//   • Uses Zustand selectors (not full store subscriptions)
//   • Record-based (stores use Records)
//   • Uses OrderingContext canonical type
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useLabOrderingStore } from '@/store/labOrderingStore';
import { useImagingOrderingStore } from '@/store/imagingOrderingStore';
import { useMedicationOrderingStore } from '@/store/medicationOrderingStore';
import { useReferralOrderingStore } from '@/store/referralOrderingStore';
import { useClinicalSafety } from './useClinicalSafety';
import type { OrderingContext, OrderPriority } from '@attending/shared/catalogs';

import type { SelectedLab } from '@/store/labOrderingStore';
import type { SelectedStudy } from '@/store/imagingOrderingStore';
import type { SelectedMedication } from '@/store/medicationOrderingStore';
import type { SelectedReferral } from '@/store/referralOrderingStore';

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
// Hook — uses selectors to minimize re-renders
// =============================================================================

export function useClinicalOrders() {
  // ── Selectors: subscribe only to fields we actually need ───
  const selectedLabs = useLabOrderingStore(s => s.selectedLabs);
  const labPatientCtx = useLabOrderingStore(s => s.patientContext);
  const labSetCtx = useLabOrderingStore(s => s.setPatientContext);
  const labGenRecs = useLabOrderingStore(s => s.generateAIRecommendations);
  const labClear = useLabOrderingStore(s => s.clearOrder);
  const labSubmit = useLabOrderingStore(s => s.submitOrder);

  const selectedStudies = useImagingOrderingStore(s => s.selectedStudies);
  const imgPatientCtx = useImagingOrderingStore(s => s.patientContext);
  const imgSetCtx = useImagingOrderingStore(s => s.setPatientContext);
  const imgGenRecs = useImagingOrderingStore(s => s.generateAIRecommendations);
  const imgClear = useImagingOrderingStore(s => s.clearOrder);
  const imgSubmit = useImagingOrderingStore(s => s.submitOrder);

  const selectedMedications = useMedicationOrderingStore(s => s.selectedMedications);
  const medPatientCtx = useMedicationOrderingStore(s => s.patientContext);
  const medSetCtx = useMedicationOrderingStore(s => s.setPatientContext);
  const medGenRecs = useMedicationOrderingStore(s => s.generateAIRecommendations);
  const medClear = useMedicationOrderingStore(s => s.clearOrder);
  const medSubmitRx = useMedicationOrderingStore(s => s.submitPrescriptions);

  const selectedReferrals = useReferralOrderingStore(s => s.selectedReferrals);
  const refPatientCtx = useReferralOrderingStore(s => s.patientContext);
  const refSetCtx = useReferralOrderingStore(s => s.setPatientContext);
  const refGenRecs = useReferralOrderingStore(s => s.generateAIRecommendations);
  const refClear = useReferralOrderingStore(s => s.clearOrder);
  const refSubmit = useReferralOrderingStore(s => s.submitReferrals);

  const { checkDrugInteractions, checkMedicationSafety } = useClinicalSafety();

  // ── Unified State ──────────────────────────────────────────
  const state = useMemo<ClinicalOrdersState>(() => {
    const labCount = Object.keys(selectedLabs).length;
    const imgCount = Object.keys(selectedStudies).length;
    const medCount = Object.keys(selectedMedications).length;
    const refCount = Object.keys(selectedReferrals).length;

    return {
      patientContext: labPatientCtx || imgPatientCtx || medPatientCtx || refPatientCtx,
      labs: {
        selected: selectedLabs,
        count: labCount,
        hasSTAT: Object.values(selectedLabs).some(l => l.priority === 'STAT'),
      },
      imaging: {
        selected: selectedStudies,
        count: imgCount,
        hasSTAT: Object.values(selectedStudies).some(s => s.priority === 'STAT'),
      },
      medications: {
        selected: selectedMedications,
        count: medCount,
        hasSTAT: Object.values(selectedMedications).some(m => m.priority === 'STAT'),
      },
      referrals: {
        selected: selectedReferrals,
        count: refCount,
        hasUrgent: Object.values(selectedReferrals).some(
          r => r.urgency === 'STAT' || r.urgency === 'URGENT',
        ),
      },
      totalOrders: labCount + imgCount + medCount + refCount,
      hasSafetyAlerts: false,
    };
  }, [selectedLabs, selectedStudies, selectedMedications, selectedReferrals,
      labPatientCtx, imgPatientCtx, medPatientCtx, refPatientCtx]);

  // ── Set patient context for ALL stores at once ─────────────
  const setPatientContext = useCallback((context: OrderingContext) => {
    labSetCtx(context);
    imgSetCtx(context);
    medSetCtx(context);
    refSetCtx(context);
  }, [labSetCtx, imgSetCtx, medSetCtx, refSetCtx]);

  // ── Generate AI recommendations for all order types ────────
  const generateAllRecommendations = useCallback(() => {
    labGenRecs();
    imgGenRecs();
    medGenRecs();
    refGenRecs();
  }, [labGenRecs, imgGenRecs, medGenRecs, refGenRecs]);

  // ── Clear all orders ───────────────────────────────────────
  const clearAllOrders = useCallback(() => {
    labClear();
    imgClear();
    medClear();
    refClear();
  }, [labClear, imgClear, medClear, refClear]);

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

    if (state.medications.count > 0) {
      const validation = validateMedicationSafety();
      if (!validation.isValid) return { success: false, results: {}, errors: validation.errors };
    }

    try {
      if (state.labs.count > 0) {
        const labIds = await labSubmit(encounterId);
        if (Array.isArray(labIds)) results.labs = labIds;
      }
      if (state.imaging.count > 0) {
        results.imaging = await imgSubmit(encounterId);
      }
      if (state.medications.count > 0) {
        results.medications = await medSubmitRx(encounterId);
      }
      if (state.referrals.count > 0) {
        results.referrals = await refSubmit(encounterId);
      }
      return { success: true, results };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Failed to submit orders');
      return { success: false, results, errors };
    }
  }, [state, labSubmit, imgSubmit, medSubmitRx, refSubmit, validateMedicationSafety]);

  // ── Return ─────────────────────────────────────────────────
  return {
    state,
    patientContext: state.patientContext,
    totalOrders: state.totalOrders,
    setPatientContext,
    generateAllRecommendations,
    clearAllOrders,
    validateMedicationSafety,
    getOrderSummary,
    submitAllOrders,
  };
}

export default useClinicalOrders;
