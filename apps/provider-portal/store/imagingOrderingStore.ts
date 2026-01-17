// ============================================================
// Imaging Ordering Store
// apps/provider-portal/store/imagingOrderingStore.ts
//
// Uses shared catalogs and recommendation service
// Streamlined from ~750 lines to ~280 lines
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import from shared catalogs
import {
  IMAGING_CATALOG,
  getImagingStudy,
  searchImaging,
  getImagingByModality,
  getNonContrastAlternative,
  type ImagingStudy,
  type ImagingModality,
  type OrderPriority,
  type PatientContext,
} from '@attending/shared/catalogs';

import { 
  clinicalRecommendationService,
  type ImagingRecommendation 
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-export types for backward compatibility
// =============================================================================
export type { ImagingStudy, ImagingModality, OrderPriority, PatientContext };
export type ImagingPriority = OrderPriority;
export type AIImagingRecommendation = ImagingRecommendation; // Alias for component imports
export type { ImagingRecommendation };
export { IMAGING_CATALOG };

// =============================================================================
// Store-specific Types
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
// Store State Interface
// =============================================================================

interface ImagingOrderingState {
  patientContext: PatientContext | null;
  selectedStudies: Map<string, SelectedStudy>;
  priority: OrderPriority;
  clinicalIndication: string;
  encounterId: string | null;
  aiRecommendations: ImagingRecommendation[];
  isLoadingRecommendations: boolean;
  searchQuery: string;
  modalityFilter: ImagingModality | 'all';
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addStudy: (studyCode: string, options?: Partial<Omit<SelectedStudy, 'study'>>) => void;
  removeStudy: (studyCode: string) => void;
  updateStudyPriority: (studyCode: string, priority: OrderPriority) => void;
  updateStudyContrast: (studyCode: string, contrast: boolean) => void;
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSearchQuery: (query: string) => void;
  setModalityFilter: (modality: ImagingModality | 'all') => void;
  generateAIRecommendations: () => Promise<void>;
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
// Store Implementation
// =============================================================================

export const useImagingOrderingStore = create<ImagingOrderingState>()(
  devtools(
    immer((set, get) => ({
      patientContext: null,
      selectedStudies: new Map(),
      priority: 'ROUTINE',
      clinicalIndication: '',
      encounterId: null,
      aiRecommendations: [],
      isLoadingRecommendations: false,
      searchQuery: '',
      modalityFilter: 'all',
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
        
        // Check for contrast allergy and suggest alternative
        const { patientContext } = get();
        if (study.contrast && patientContext?.allergies?.some(a => {
          const allergenName = typeof a === 'string' ? a : a.allergen;
          return allergenName.toLowerCase().includes('contrast') || 
                 allergenName.toLowerCase().includes('iodine');
        })) {
          const alternative = getNonContrastAlternative(studyCode);
          if (alternative) {
            console.warn(`Patient has contrast allergy. Consider ${alternative.code} instead.`);
          }
        }
        
        set(state => {
          state.selectedStudies.set(studyCode, {
            study,
            priority: options.priority || study.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale,
            clinicalHistory: options.clinicalHistory,
            laterality: options.laterality || 'none',
            contrast: options.contrast ?? study.contrast ?? false,
            specialInstructions: options.specialInstructions
          });
        });
      },

      removeStudy: (studyCode) => {
        set(state => { state.selectedStudies.delete(studyCode); });
      },

      updateStudyPriority: (studyCode, priority) => {
        set(state => {
          const study = state.selectedStudies.get(studyCode);
          if (study) study.priority = priority;
        });
      },

      updateStudyContrast: (studyCode, contrast) => {
        set(state => {
          const study = state.selectedStudies.get(studyCode);
          if (study) study.contrast = contrast;
        });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.priority = priority;
          state.selectedStudies.forEach(study => { study.priority = priority; });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setModalityFilter: (modality) => set({ modalityFilter: modality }),

      // AI Recommendations - Uses shared ClinicalRecommendationService
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set({ isLoadingRecommendations: true });
        
        try {
          const recommendations = await clinicalRecommendationService.generateImagingRecommendations(patientContext);
          set({ aiRecommendations: recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('Failed to generate imaging recommendations:', error);
          set({ isLoadingRecommendations: false, error: 'Failed to generate recommendations' });
        }
      },

      addAIRecommendedStudies: (category) => {
        const { aiRecommendations, addStudy } = get();
        aiRecommendations
          .filter(rec => rec.category === category)
          .forEach(rec => {
            addStudy(rec.studyCode, {
              priority: rec.priority,
              rationale: rec.rationale,
              aiRecommended: true
            });
          });
      },

      submitOrder: async (encounterId) => {
        const { selectedStudies, clinicalIndication } = get();
        
        if (selectedStudies.size === 0) throw new Error('No imaging studies selected');
        
        set({ submitting: true, error: null });
        
        try {
          const orderIds: string[] = [];
          
          for (const [code, selectedStudy] of selectedStudies.entries()) {
            const response = await fetch('/api/imaging', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                studyType: selectedStudy.study.modality,
                studyName: selectedStudy.study.name,
                bodyPart: selectedStudy.study.bodyPart,
                laterality: selectedStudy.laterality,
                priority: selectedStudy.priority,
                indication: clinicalIndication,
                clinicalHistory: selectedStudy.clinicalHistory,
                contrast: selectedStudy.contrast,
                contrastType: selectedStudy.study.contrastType,
                specialInstructions: selectedStudy.specialInstructions
              })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit imaging order');
            }
            
            const result = await response.json();
            orderIds.push(result.id);
          }
          
          set(state => { state.submitting = false; state.lastSubmittedOrderIds = orderIds; });
          get().clearOrder();
          return orderIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit order';
          });
          throw error;
        }
      },

      clearOrder: () => set(state => {
        state.selectedStudies = new Map();
        state.priority = 'ROUTINE';
        state.clinicalIndication = '';
        state.error = null;
      }),

      getSelectedStudiesArray: () => Array.from(get().selectedStudies.values()),

      getFilteredCatalog: () => {
        const { searchQuery, modalityFilter } = get();
        let results = searchQuery ? searchImaging(searchQuery) : Object.values(IMAGING_CATALOG);
        if (modalityFilter !== 'all') {
          results = results.filter(study => study.modality === modalityFilter);
        }
        return results;
      },

      getTotalCost: () => get().getSelectedStudiesArray().reduce((sum, s) => sum + s.study.cost, 0),
      getStatCount: () => get().getSelectedStudiesArray().filter(s => s.priority === 'STAT').length,
      hasContrastStudies: () => get().getSelectedStudiesArray().some(s => s.contrast),
      
      getRadiationTotal: () => {
        const studies = get().getSelectedStudiesArray();
        const totalMsv = studies.reduce((sum, s) => {
          const dose = s.study.radiationDose;
          if (dose) {
            const value = parseFloat(dose.replace(' mSv', ''));
            return sum + (isNaN(value) ? 0 : value);
          }
          return sum;
        }, 0);
        return `${totalMsv.toFixed(1)} mSv`;
      }
    })),
    { name: 'imaging-ordering-store' }
  )
);

export default useImagingOrderingStore;
