// ============================================================
// Medication Ordering Store — REFACTORED
// apps/provider-portal/store/medicationOrderingStore.ts
//
// CHANGES:
//   • Map → Record (JSON-serializable)
//   • ClinicalRecommendationService is now synchronous
//   • Removed type aliases (PrescriptionPriority, AIMedicationRecommendation)
//   • Uses OrderingContext (with PatientContext backward compat)
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  MEDICATION_CATALOG,
  DRUG_INTERACTIONS,
  getMedication,
  searchMedications,
  checkDrugInteractions,
  type Medication,
  type DrugInteraction,
  type DrugCategory,
  type DosageForm,
  type DrugSchedule,
  type OrderPriority,
  type OrderingContext,
  type PatientContext,
} from '@attending/shared/catalogs';

import {
  clinicalRecommendationService,
  type MedicationRecommendation,
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-exports
// =============================================================================
export type { Medication, DrugInteraction, DrugCategory, DosageForm, DrugSchedule, OrderPriority, OrderingContext, PatientContext };
export type { MedicationRecommendation };
export { MEDICATION_CATALOG, DRUG_INTERACTIONS };

// =============================================================================
// Types
// =============================================================================

export interface SelectedMedication {
  medication: Medication;
  strength: string;
  form: DosageForm;
  quantity: number;
  daysSupply: number;
  refills: number;
  directions: string;
  indication: string;
  priority: OrderPriority;
  dispenseAsWritten: boolean;
  aiRecommended: boolean;
  rationale?: string;
}

export interface DrugAllergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  crossReactivity?: string[];
}

export interface PharmacyInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hours: string;
  isPreferred: boolean;
  acceptsEprescribe: boolean;
}

export interface AllergyAlert {
  medication: string;
  allergy: DrugAllergy;
  crossReactivity: boolean;
}

// =============================================================================
// Store Interface
// =============================================================================

interface MedicationOrderingState {
  patientContext: OrderingContext | null;
  selectedMedications: Record<string, SelectedMedication>;  // ← was Map
  aiRecommendations: MedicationRecommendation[];
  loadingRecommendations: boolean;
  detectedInteractions: DrugInteraction[];
  allergyAlerts: AllergyAlert[];
  searchQuery: string;
  categoryFilter: DrugCategory | 'all';
  preferredPharmacy: PharmacyInfo | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedRxIds: string[];

  // Actions
  setPatientContext: (context: OrderingContext) => void;
  addMedication: (medId: string, options?: Partial<Omit<SelectedMedication, 'medication'>>) => void;
  removeMedication: (medId: string) => void;
  updateMedication: (medId: string, updates: Partial<SelectedMedication>) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DrugCategory | 'all') => void;
  resetFilters: () => void;
  setPreferredPharmacy: (pharmacy: PharmacyInfo) => void;
  generateAIRecommendations: () => void;
  addAIRecommendedMedication: (medId: string, priority: OrderPriority, rationale: string) => void;
  checkInteractions: () => void;
  checkAllergies: (medId: string) => void;
  submitPrescriptions: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;

  // Computed
  getSelectedMedicationsArray: () => SelectedMedication[];
  getFilteredCatalog: () => Medication[];
  getTotalCost: () => { generic: number; brand: number };
  getControlledCount: () => number;
  hasBlackBoxWarnings: () => boolean;
}

// =============================================================================
// Store
// =============================================================================

export const useMedicationOrderingStore = create<MedicationOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedMedications: {} as Record<string, SelectedMedication>,
      aiRecommendations: [],
      loadingRecommendations: false,
      detectedInteractions: [],
      allergyAlerts: [],
      searchQuery: '',
      categoryFilter: 'all' as DrugCategory | 'all',
      preferredPharmacy: null,
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedRxIds: [],

      setPatientContext: (context) => {
        set(state => { state.patientContext = context; });
        get().generateAIRecommendations();
      },

      addMedication: (medId, options = {}) => {
        const med = getMedication(medId);
        if (!med) {
          console.warn(`Medication ${medId} not found in catalog`);
          return;
        }

        // Safety: check allergies before adding
        get().checkAllergies(medId);

        set(state => {
          state.selectedMedications[medId] = {
            medication: med,
            strength: options.strength || med.defaultStrength,
            form: options.form || med.defaultForm,
            quantity: options.quantity || med.defaultQuantity,
            daysSupply: options.daysSupply || med.defaultDaysSupply,
            refills: options.refills ?? med.defaultRefills,
            directions: options.directions || med.defaultDirections,
            indication: options.indication || '',
            priority: options.priority || 'ROUTINE',
            dispenseAsWritten: options.dispenseAsWritten || false,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale,
          };
        });

        get().checkInteractions();
      },

      removeMedication: (medId) => {
        set(state => {
          delete state.selectedMedications[medId];
          state.allergyAlerts = state.allergyAlerts.filter(a => a.medication !== medId);
        });
        get().checkInteractions();
      },

      updateMedication: (medId, updates) => {
        set(state => {
          if (state.selectedMedications[medId]) {
            state.selectedMedications[medId] = { ...state.selectedMedications[medId], ...updates };
          }
        });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      resetFilters: () => set(state => { state.searchQuery = ''; state.categoryFilter = 'all'; }),
      setPreferredPharmacy: (pharmacy) => set({ preferredPharmacy: pharmacy }),

      // Synchronous rule-based recommendations
      generateAIRecommendations: () => {
        const { patientContext } = get();
        if (!patientContext) return;
        set({ loadingRecommendations: true });
        const recommendations = clinicalRecommendationService.generateMedicationRecommendations(patientContext);
        set({ aiRecommendations: recommendations, loadingRecommendations: false });
      },

      addAIRecommendedMedication: (medId, priority, rationale) => {
        get().addMedication(medId, { priority, rationale, aiRecommended: true });
      },

      checkInteractions: () => {
        const { selectedMedications, patientContext } = get();
        const selectedIds = Object.keys(selectedMedications);
        const allMeds = [...selectedIds, ...(patientContext?.currentMedications || [])];
        set({ detectedInteractions: checkDrugInteractions(allMeds) });
      },

      checkAllergies: (medId) => {
        const { patientContext } = get();
        if (!patientContext) return;

        const med = getMedication(medId);
        if (!med) return;

        const newAlerts: AllergyAlert[] = [];

        for (const allergy of patientContext.allergies || []) {
          const allergenName = typeof allergy === 'string' ? allergy : allergy.allergen;
          const allergyObj: DrugAllergy = typeof allergy === 'string'
            ? { allergen: allergy, reaction: 'Unknown', severity: 'moderate' }
            : { allergen: allergy.allergen, reaction: allergy.reaction || 'Unknown', severity: allergy.severity || 'moderate' };

          // Direct match
          if (med.genericName.toLowerCase().includes(allergenName.toLowerCase()) ||
              med.brandName.toLowerCase().includes(allergenName.toLowerCase())) {
            newAlerts.push({ medication: medId, allergy: { ...allergyObj, crossReactivity: [] }, crossReactivity: false });
          }

          // Penicillin cross-reactivity
          if (allergenName.toLowerCase() === 'penicillin' &&
              (med.genericName.toLowerCase().includes('amoxicillin') || med.genericName.toLowerCase().includes('ampicillin'))) {
            newAlerts.push({
              medication: medId,
              allergy: { ...allergyObj, crossReactivity: ['amoxicillin', 'ampicillin'] },
              crossReactivity: true,
            });
          }
        }

        if (newAlerts.length > 0) {
          set(state => {
            state.allergyAlerts = [...state.allergyAlerts.filter(a => a.medication !== medId), ...newAlerts];
          });
        }
      },

      submitPrescriptions: async (encounterId) => {
        const { selectedMedications, preferredPharmacy } = get();
        const medsArray = Object.entries(selectedMedications);

        if (medsArray.length === 0) throw new Error('No medications selected');
        set({ submitting: true, error: null });

        try {
          const rxIds: string[] = [];

          for (const [_id, sel] of medsArray) {
            const response = await fetch('/api/prescriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                medicationName: sel.medication.genericName,
                brandName: sel.medication.brandName,
                strength: sel.strength,
                form: sel.form,
                quantity: sel.quantity,
                daysSupply: sel.daysSupply,
                refills: sel.refills,
                directions: sel.directions,
                indication: sel.indication,
                dispenseAsWritten: sel.dispenseAsWritten,
                pharmacyId: preferredPharmacy?.id,
                isControlled: sel.medication.isControlled,
                schedule: sel.medication.schedule,
              }),
            });
            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || 'Failed to submit prescription');
            }
            const result = await response.json();
            rxIds.push(result.id);
          }

          set(state => { state.submitting = false; state.lastSubmittedRxIds = rxIds; });
          get().clearOrder();
          return rxIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit prescriptions';
          });
          throw error;
        }
      },

      clearOrder: () => set(state => {
        state.selectedMedications = {};
        state.detectedInteractions = [];
        state.allergyAlerts = [];
        state.error = null;
        state.searchQuery = '';
        state.categoryFilter = 'all';
      }),

      // Computed
      getSelectedMedicationsArray: () => Object.values(get().selectedMedications),
      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        let results = searchQuery ? searchMedications(searchQuery) : Object.values(MEDICATION_CATALOG);
        if (categoryFilter !== 'all') results = results.filter(m => m.category === categoryFilter);
        return results;
      },
      getTotalCost: () => Object.values(get().selectedMedications).reduce(
        (sum, m) => ({ generic: sum.generic + m.medication.cost.generic, brand: sum.brand + m.medication.cost.brand }),
        { generic: 0, brand: 0 }
      ),
      getControlledCount: () => Object.values(get().selectedMedications).filter(m => m.medication.isControlled).length,
      hasBlackBoxWarnings: () => Object.values(get().selectedMedications).some(m => m.medication.blackBoxWarning),
    })),
    { name: 'medication-ordering-store' }
  )
);

export default useMedicationOrderingStore;
