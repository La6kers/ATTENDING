// ============================================================
// Medication Ordering Store
// apps/provider-portal/store/medicationOrderingStore.ts
//
// Uses shared catalogs and recommendation service
// Streamlined from ~1100 lines to ~350 lines
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import from shared catalogs
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
  type PatientContext,
} from '@attending/shared/catalogs';

import { 
  clinicalRecommendationService,
  type MedicationRecommendation 
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-export types for backward compatibility
// =============================================================================
export type { Medication, DrugInteraction, DrugCategory, DosageForm, DrugSchedule, OrderPriority, PatientContext };
export type PrescriptionPriority = OrderPriority;
export type AIMedicationRecommendation = MedicationRecommendation; // Alias for component imports
export type { MedicationRecommendation };

export { MEDICATION_CATALOG, DRUG_INTERACTIONS };

// =============================================================================
// Store-specific Types
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
// Store State Interface
// =============================================================================

interface MedicationOrderingState {
  patientContext: PatientContext | null;
  selectedMedications: Map<string, SelectedMedication>;
  aiRecommendations: MedicationRecommendation[];
  isLoadingRecommendations: boolean;
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
  setPatientContext: (context: PatientContext) => void;
  addMedication: (medId: string, options?: Partial<Omit<SelectedMedication, 'medication'>>) => void;
  removeMedication: (medId: string) => void;
  updateMedication: (medId: string, updates: Partial<SelectedMedication>) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DrugCategory | 'all') => void;
  setPreferredPharmacy: (pharmacy: PharmacyInfo) => void;
  generateAIRecommendations: () => Promise<void>;
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
// Store Implementation
// =============================================================================

export const useMedicationOrderingStore = create<MedicationOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedMedications: new Map(),
      aiRecommendations: [],
      isLoadingRecommendations: false,
      detectedInteractions: [],
      allergyAlerts: [],
      searchQuery: '',
      categoryFilter: 'all',
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

        // Check allergies first
        get().checkAllergies(medId);

        set(state => {
          state.selectedMedications.set(medId, {
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
            rationale: options.rationale
          });
        });

        // Check interactions after adding
        get().checkInteractions();
      },

      removeMedication: (medId) => {
        set(state => {
          state.selectedMedications.delete(medId);
          state.allergyAlerts = state.allergyAlerts.filter(a => a.medication !== medId);
        });
        get().checkInteractions();
      },

      updateMedication: (medId, updates) => {
        set(state => {
          const existing = state.selectedMedications.get(medId);
          if (existing) {
            state.selectedMedications.set(medId, { ...existing, ...updates });
          }
        });
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      setPreferredPharmacy: (pharmacy) => set({ preferredPharmacy: pharmacy }),

      // AI Recommendations - Uses shared ClinicalRecommendationService
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;

        set({ isLoadingRecommendations: true });

        try {
          const recommendations = await clinicalRecommendationService.generateMedicationRecommendations(patientContext);
          set({ aiRecommendations: recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('Failed to generate medication recommendations:', error);
          set({ isLoadingRecommendations: false, error: 'Failed to generate recommendations' });
        }
      },

      addAIRecommendedMedication: (medId, priority, rationale) => {
        get().addMedication(medId, { priority, rationale, aiRecommended: true });
      },

      // Uses shared checkDrugInteractions from catalogs
      checkInteractions: () => {
        const { selectedMedications, patientContext } = get();
        const selectedIds = Array.from(selectedMedications.keys());
        const allMeds = [...selectedIds, ...(patientContext?.currentMedications || [])];
        
        const detected = checkDrugInteractions(allMeds);
        set({ detectedInteractions: detected });
      },

      checkAllergies: (medId) => {
        const { patientContext, allergyAlerts } = get();
        if (!patientContext) return;

        const med = getMedication(medId);
        if (!med) return;

        const newAlerts: AllergyAlert[] = [];

        for (const allergy of patientContext.allergies || []) {
          // Normalize allergy to extract allergen name and build DrugAllergy object
          const allergenName = typeof allergy === 'string' ? allergy : allergy.allergen;
          const allergyObj: DrugAllergy = typeof allergy === 'string' 
            ? { allergen: allergy, reaction: 'Unknown', severity: 'moderate' }
            : { 
                allergen: allergy.allergen, 
                reaction: allergy.reaction || 'Unknown', 
                severity: allergy.severity || 'moderate' 
              };
          
          // Direct match
          if (
            med.genericName.toLowerCase().includes(allergenName.toLowerCase()) ||
            med.brandName.toLowerCase().includes(allergenName.toLowerCase())
          ) {
            newAlerts.push({ 
              medication: medId, 
              allergy: { ...allergyObj, crossReactivity: [] }, 
              crossReactivity: false 
            });
          }
          
          // Penicillin cross-reactivity
          if (allergenName.toLowerCase() === 'penicillin') {
            if (med.genericName.toLowerCase().includes('amoxicillin') ||
                med.genericName.toLowerCase().includes('ampicillin')) {
              newAlerts.push({ 
                medication: medId, 
                allergy: { ...allergyObj, crossReactivity: ['amoxicillin', 'ampicillin'] }, 
                crossReactivity: true 
              });
            }
          }
        }

        if (newAlerts.length > 0) {
          set(state => {
            state.allergyAlerts = [
              ...state.allergyAlerts.filter(a => a.medication !== medId), 
              ...newAlerts
            ];
          });
        }
      },

      submitPrescriptions: async (encounterId) => {
        const { selectedMedications, preferredPharmacy } = get();
        
        if (selectedMedications.size === 0) throw new Error('No medications selected');
        
        set({ submitting: true, error: null });
        
        try {
          const rxIds: string[] = [];
          
          for (const [id, selectedMed] of selectedMedications.entries()) {
            const response = await fetch('/api/prescriptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                medicationName: selectedMed.medication.genericName,
                brandName: selectedMed.medication.brandName,
                strength: selectedMed.strength,
                form: selectedMed.form,
                quantity: selectedMed.quantity,
                daysSupply: selectedMed.daysSupply,
                refills: selectedMed.refills,
                directions: selectedMed.directions,
                indication: selectedMed.indication,
                dispenseAsWritten: selectedMed.dispenseAsWritten,
                pharmacyId: preferredPharmacy?.id,
                isControlled: selectedMed.medication.isControlled,
                schedule: selectedMed.medication.schedule
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit prescription');
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
        state.selectedMedications = new Map();
        state.detectedInteractions = [];
        state.allergyAlerts = [];
        state.error = null;
      }),

      getSelectedMedicationsArray: () => Array.from(get().selectedMedications.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        let results = searchQuery ? searchMedications(searchQuery) : Object.values(MEDICATION_CATALOG);
        if (categoryFilter !== 'all') {
          results = results.filter(med => med.category === categoryFilter);
        }
        return results;
      },

      getTotalCost: () => {
        const meds = get().getSelectedMedicationsArray();
        return meds.reduce(
          (sum, m) => ({
            generic: sum.generic + m.medication.cost.generic,
            brand: sum.brand + m.medication.cost.brand
          }),
          { generic: 0, brand: 0 }
        );
      },

      getControlledCount: () => get().getSelectedMedicationsArray().filter(m => m.medication.isControlled).length,
      hasBlackBoxWarnings: () => get().getSelectedMedicationsArray().some(m => m.medication.blackBoxWarning),
    })),
    { name: 'medication-ordering-store' }
  )
);

export default useMedicationOrderingStore;
