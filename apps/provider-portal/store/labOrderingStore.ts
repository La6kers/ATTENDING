// ============================================================
// Lab Ordering Store - Refactored
// apps/provider-portal/store/labOrderingStore.ts
//
// REFACTORED: Uses shared catalogs and recommendation service
// Reduced from ~900 lines to ~250 lines
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import from shared catalogs instead of embedding
import {
  LAB_CATALOG,
  LAB_PANELS,
  getLabTest,
  getLabPanel,
  searchLabs,
  type LabTest,
  type LabPanel,
  type LabCategory,
  type OrderPriority,
  type PatientContext,
  type AIRecommendation,
} from '@attending/shared/catalogs';

import { 
  clinicalRecommendationService,
  type LabRecommendation 
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-export types for backward compatibility
// =============================================================================
export type { LabTest, LabPanel, LabCategory, OrderPriority, PatientContext };
export type LabPriority = OrderPriority; // Alias for backward compatibility
export { LAB_CATALOG, LAB_PANELS };

// =============================================================================
// Store-specific Types
// =============================================================================

export interface SelectedLab {
  test: LabTest;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

// =============================================================================
// Store State Interface
// =============================================================================

interface LabOrderingState {
  // Patient context
  patientContext: PatientContext | null;
  
  // Selected labs
  selectedLabs: Map<string, SelectedLab>;
  
  // Order settings
  priority: OrderPriority;
  clinicalIndication: string;
  specialInstructions: string;
  encounterId: string | null;
  
  // AI Recommendations
  aiRecommendations: LabRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search & Filter
  searchQuery: string;
  categoryFilter: LabCategory | 'all';
  
  // UI State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addLab: (testCode: string, options?: { priority?: OrderPriority; rationale?: string; aiRecommended?: boolean }) => void;
  addPanel: (panelId: string) => void;
  removeLab: (testCode: string) => void;
  updateLabPriority: (testCode: string, priority: OrderPriority) => void;
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: LabCategory | 'all') => void;
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedLabs: (category: 'critical' | 'recommended' | 'consider') => void;
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed getters
  getSelectedLabsArray: () => SelectedLab[];
  getFilteredCatalog: () => LabTest[];
  getTotalCost: () => number;
  getStatCount: () => number;
  getFastingRequired: () => boolean;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useLabOrderingStore = create<LabOrderingState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      patientContext: null,
      selectedLabs: new Map(),
      priority: 'ROUTINE',
      clinicalIndication: '',
      specialInstructions: '',
      encounterId: null,
      aiRecommendations: [],
      isLoadingRecommendations: false,
      searchQuery: '',
      categoryFilter: 'all',
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedOrderIds: [],

      // Patient Context
      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
          if (context.chiefComplaint) {
            state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
          }
        });
        get().generateAIRecommendations();
      },

      // Lab Selection
      addLab: (testCode, options = {}) => {
        const test = getLabTest(testCode);
        if (!test) {
          console.warn(`Lab test ${testCode} not found in catalog`);
          return;
        }
        
        set(state => {
          state.selectedLabs.set(testCode, {
            test,
            priority: options.priority || test.defaultPriority,
            aiRecommended: options.aiRecommended || false,
            rationale: options.rationale
          });
        });
      },

      addPanel: (panelId) => {
        const panel = getLabPanel(panelId);
        if (!panel) {
          console.warn(`Lab panel ${panelId} not found`);
          return;
        }
        panel.tests.forEach(testCode => get().addLab(testCode));
      },

      removeLab: (testCode) => {
        set(state => { state.selectedLabs.delete(testCode); });
      },

      updateLabPriority: (testCode, priority) => {
        set(state => {
          const lab = state.selectedLabs.get(testCode);
          if (lab) lab.priority = priority;
        });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.priority = priority;
          state.selectedLabs.forEach(lab => { lab.priority = priority; });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),

      // AI Recommendations - NOW USES SHARED SERVICE
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set({ isLoadingRecommendations: true });
        
        try {
          const recommendations = await clinicalRecommendationService.generateLabRecommendations(patientContext);
          set({ aiRecommendations: recommendations, isLoadingRecommendations: false });
        } catch (error) {
          console.error('Failed to generate AI recommendations:', error);
          set({ isLoadingRecommendations: false, error: 'Failed to generate AI recommendations' });
        }
      },

      addAIRecommendedLabs: (category) => {
        const { aiRecommendations, addLab } = get();
        aiRecommendations
          .filter(rec => rec.category === category)
          .forEach(rec => {
            addLab(rec.testCode, {
              priority: rec.priority,
              rationale: rec.rationale,
              aiRecommended: true
            });
          });
      },

      // Order Submission
      submitOrder: async (encounterId) => {
        const { selectedLabs, clinicalIndication, specialInstructions } = get();
        
        if (selectedLabs.size === 0) throw new Error('No labs selected');
        
        set({ submitting: true, error: null });
        
        try {
          const tests = Array.from(selectedLabs.values()).map(sl => ({
            code: sl.test.code,
            name: sl.test.name,
            category: sl.test.category,
            specimenType: sl.test.specimenType,
            priority: sl.priority
          }));
          
          const response = await fetch('/api/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encounterId, tests, indication: clinicalIndication, specialInstructions,
              priority: tests.some(t => t.priority === 'STAT') ? 'STAT' : 
                       tests.some(t => t.priority === 'ASAP') ? 'ASAP' : 'ROUTINE'
            })
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit lab order');
          }
          
          const result = await response.json();
          const orderIds = Array.isArray(result) ? result.map((r: any) => r.id) : [result.id];
          
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
        state.selectedLabs = new Map();
        state.priority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.error = null;
      }),

      // Computed Getters
      getSelectedLabsArray: () => Array.from(get().selectedLabs.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        let results = searchQuery ? searchLabs(searchQuery) : Object.values(LAB_CATALOG);
        if (categoryFilter !== 'all') {
          results = results.filter(test => test.category === categoryFilter);
        }
        return results;
      },

      getTotalCost: () => get().getSelectedLabsArray().reduce((sum, sl) => sum + sl.test.cost, 0),
      getStatCount: () => get().getSelectedLabsArray().filter(sl => sl.priority === 'STAT').length,
      getFastingRequired: () => get().getSelectedLabsArray().some(sl => sl.test.requiresFasting),
    })),
    { name: 'lab-ordering-store' }
  )
);

export default useLabOrderingStore;
