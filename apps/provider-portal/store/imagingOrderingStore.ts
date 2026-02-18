// ============================================================
// Imaging Ordering Store — REFACTORED
// apps/provider-portal/store/imagingOrderingStore.ts
//
// CHANGES:
//   • Map → Record (JSON-serializable)
//   • ClinicalRecommendationService is now synchronous
//   • Removed type aliases (ImagingPriority, AIImagingRecommendation)
//   • Uses OrderingContext (with PatientContext backward compat)
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  IMAGING_CATALOG,
  getImagingStudy,
  searchImaging,
  getNonContrastAlternative,
  type ImagingStudy,
  type ImagingModality,
  type OrderPriority,
  type OrderingContext,
  type PatientContext,
} from '@attending/shared/catalogs';

import {
  clinicalRecommendationService,
  type ImagingRecommendation,
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-exports
// =============================================================================
export type { ImagingStudy, ImagingModality, OrderPriority, OrderingContext, PatientContext };
export type { ImagingRecommendation };
export { IMAGING_CATALOG };

// =============================================================================
// Types
// =============================================================================

export interface SelectedStudy {
  study: ImagingStudy;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
  clinicalHistory?: string;
  laterality?: 'left' | 'right' | 'bilateral' | 'none';
  contrast: boolean;
  specialInstructions?: string;
}

// =============================================================================
// Store Interface
// =============================================================================

interface ImagingOrderingState {
  patientContext: OrderingContext | null;
  selectedStudies: Record<string, SelectedStudy>;   // ← was Map
  defaultPriority: OrderPriority;
  clinicalIndication: string;
  encounterId: string | null;
  aiRecommendations: ImagingRecommendation[];
  loadingRecommendations: boolean;
  searchQuery: string;
  modalityFilter: ImagingModality | 'all';
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];

  // Actions
  setPatientContext: (context: OrderingContext) => void;
  addStudy: (studyCode: string, options?: Partial<Omit<SelectedStudy, 'study'>>) => void;
  removeStudy: (studyCode: string) => void;
  updateStudyPriority: (studyCode: string, priority: OrderPriority) => void;
  updateStudyContrast: (studyCode: string, contrast: boolean) => void;
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSearchQuery: (query: string) => void;
  setModalityFilter: (modality: ImagingModality | 'all') => void;
  resetFilters: () => void;
  generateAIRecommendations: () => void;
  addAIRecommendedStudies: (category: 'critical' | 'recommended' | 'consider') => void;
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;

  // Computed
  getSelectedStudiesArray: () => SelectedStudy[];
  getFilteredCatalog: () => ImagingStudy[];
  getTotalCost: () => number;
  getStatCount: () => number;
  hasContrastStudies: () => boolean;
  getRadiationTotal: () => string;
}

// =============================================================================
// Store
// =============================================================================

export const useImagingOrderingStore = create<ImagingOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedStudies: {} as Record<string, SelectedStudy>,
      defaultPriority: 'ROUTINE' as OrderPriority,
      clinicalIndication: '',
      encounterId: null,
      aiRecommendations: [],
      loadingRecommendations: false,
      searchQuery: '',
      modalityFilter: 'all' as ImagingModality | 'all',
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedOrderIds: [],

      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
          if (context.chiefComplaint) {
            state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
          }
        });
        get().generateAIRecommendations();
      },

      addStudy: (studyCode, options = {}) => {
        const study = getImagingStudy(studyCode);
        if (!study) {
          console.warn(`Imaging study ${studyCode} not found in catalog`);
          return;
        }

        // Contrast allergy safety check
        const { patientContext } = get();
        if (study.contrast && patientContext?.allergies?.some(a => {
          const name = typeof a === 'string' ? a : a.allergen;
          return name.toLowerCase().includes('contrast') || name.toLowerCase().includes('iodine');
        })) {
          const alt = getNonContrastAlternative(studyCode);
          if (alt) console.warn(`Patient has contrast allergy. Consider ${alt.code} instead.`);
        }

        set(state => {
          state.selectedStudies[studyCode] = {
            study,
            priority: options.priority || study.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale,
            clinicalHistory: options.clinicalHistory,
            laterality: options.laterality || 'none',
            contrast: options.contrast ?? study.contrast ?? false,
            specialInstructions: options.specialInstructions,
          };
        });
      },

      removeStudy: (studyCode) => {
        set(state => { delete state.selectedStudies[studyCode]; });
      },

      updateStudyPriority: (studyCode, priority) => {
        set(state => {
          if (state.selectedStudies[studyCode]) state.selectedStudies[studyCode].priority = priority;
        });
      },

      updateStudyContrast: (studyCode, contrast) => {
        set(state => {
          if (state.selectedStudies[studyCode]) state.selectedStudies[studyCode].contrast = contrast;
        });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.defaultPriority = priority;
          Object.values(state.selectedStudies).forEach(s => { s.priority = priority; });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setModalityFilter: (modality) => set({ modalityFilter: modality }),
      resetFilters: () => set(state => { state.searchQuery = ''; state.modalityFilter = 'all'; }),

      // Synchronous rule-based recommendations
      generateAIRecommendations: () => {
        const { patientContext } = get();
        if (!patientContext) return;
        // Synchronous — no loading state needed (single tick)
        const recommendations = clinicalRecommendationService.generateImagingRecommendations(patientContext);
        set({ aiRecommendations: recommendations, loadingRecommendations: false });
      },

      addAIRecommendedStudies: (category) => {
        const { aiRecommendations, addStudy } = get();
        aiRecommendations
          .filter(rec => rec.category === category)
          .forEach(rec => {
            addStudy(rec.studyCode, { priority: rec.priority, rationale: rec.rationale, aiRecommended: true });
          });
      },

      submitOrder: async (encounterId) => {
        const { selectedStudies, clinicalIndication } = get();
        const studiesArray = Object.entries(selectedStudies);

        if (studiesArray.length === 0) throw new Error('No imaging studies selected');
        set({ submitting: true, error: null });

        const orderIds: string[] = [];
        const failedCodes: string[] = [];
        let lastError: string | null = null;

        for (const [code, sel] of studiesArray) {
          try {
            const response = await fetch('/api/imaging', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                studyType: sel.study.modality,
                studyName: sel.study.name,
                bodyPart: sel.study.bodyPart,
                laterality: sel.laterality,
                priority: sel.priority,
                indication: clinicalIndication,
                clinicalHistory: sel.clinicalHistory,
                contrast: sel.contrast,
                contrastType: sel.study.contrastType,
                specialInstructions: sel.specialInstructions,
              }),
            });
            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || 'Failed to submit imaging order');
            }
            const result = await response.json();
            orderIds.push(result.id);
            // Remove successfully submitted item
            set(state => { delete state.selectedStudies[code]; });
          } catch (err) {
            failedCodes.push(code);
            lastError = err instanceof Error ? err.message : 'Failed to submit order';
          }
        }

        set(state => {
          state.submitting = false;
          state.lastSubmittedOrderIds = orderIds;
          if (failedCodes.length > 0) {
            state.error = `${orderIds.length} submitted, ${failedCodes.length} failed: ${lastError}`;
          }
        });

        // Only full-clear if everything succeeded
        if (failedCodes.length === 0) get().clearOrder();

        if (failedCodes.length > 0 && orderIds.length === 0) {
          throw new Error(lastError || 'All imaging orders failed');
        }

        return orderIds;
      },

      clearOrder: () => set(state => {
        state.selectedStudies = {};
        state.defaultPriority = 'ROUTINE';
        state.clinicalIndication = '';
        state.error = null;
        state.searchQuery = '';
        state.modalityFilter = 'all';
      }),

      // Computed
      getSelectedStudiesArray: () => Object.values(get().selectedStudies),
      getFilteredCatalog: () => {
        const { searchQuery, modalityFilter } = get();
        let results = searchQuery ? searchImaging(searchQuery) : Object.values(IMAGING_CATALOG);
        if (modalityFilter !== 'all') results = results.filter(s => s.modality === modalityFilter);
        return results;
      },
      getTotalCost: () => Object.values(get().selectedStudies).reduce((sum, s) => sum + s.study.cost, 0),
      getStatCount: () => Object.values(get().selectedStudies).filter(s => s.priority === 'STAT').length,
      hasContrastStudies: () => Object.values(get().selectedStudies).some(s => s.contrast),
      getRadiationTotal: () => {
        const total = Object.values(get().selectedStudies).reduce((sum, s) => {
          const dose = s.study.radiationDose;
          if (dose) { const v = parseFloat(dose.replace(' mSv', '')); return sum + (isNaN(v) ? 0 : v); }
          return sum;
        }, 0);
        return `${total.toFixed(1)} mSv`;
      },
    })),
    { name: 'imaging-ordering-store' }
  )
);

export default useImagingOrderingStore;
