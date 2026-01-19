// ============================================================
// Lab Ordering Store - Refactored with Test Compatibility
// apps/provider-portal/store/labOrderingStore.ts
//
// FIXED: Added missing properties and methods expected by tests:
// - labCatalog as Map
// - defaultPriority
// - setDefaultPriority()
// - loadAIRecommendations()
// - addLabPanel() with proper BMP support
// - resetFilters()
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Immer's MapSet plugin for Map/Set support in state
enableMapSet();

// Import from shared catalogs
import {
  LAB_CATALOG as LAB_CATALOG_OBJ,
  LAB_PANELS as LAB_PANELS_OBJ,
  getLabTest,
  getLabPanel,
  searchLabs,
  type LabTest,
  type LabPanel,
  type LabCategory,
  type OrderPriority,
  type PatientContext,
} from '@attending/shared/catalogs';

import { 
  clinicalRecommendationService,
  type LabRecommendation 
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-export types for backward compatibility
// =============================================================================
export type { LabTest, LabPanel, LabCategory, OrderPriority, PatientContext };
export type LabPriority = OrderPriority;
export type AILabRecommendation = LabRecommendation;
export type { LabRecommendation };

// Re-export catalogs - now also as Maps for test compatibility
export const LAB_CATALOG = LAB_CATALOG_OBJ;
export const LAB_PANELS = LAB_PANELS_OBJ;

// =============================================================================
// Lab Panel Mappings (for addLabPanel with common panel names)
// =============================================================================
const PANEL_CODE_MAPPINGS: Record<string, string[]> = {
  // Direct mappings to test codes
  'BMP': ['BMP'],
  'CMP': ['CMP'],
  'CBC': ['CBC', 'CBC-DIFF'],
  'LIPID': ['LIPID'],
  'CARDIAC': ['TROP-I', 'BNP'],
  'COAG': ['PT-INR', 'PTT', 'FIBRIN', 'DDIMER'],
  'THYROID': ['TSH', 'FT4', 'FT3'],
  'LIVER': ['LFT'],
  'RENAL': ['BMP', 'BUN', 'CR'],
  'SEPSIS': ['CBC-DIFF', 'CMP', 'LACTATE', 'PROCALCITONIN', 'BCULT'],
  'ACS': ['TROP-I', 'CBC-DIFF', 'BMP', 'PT-INR', 'BNP', 'DDIMER'],
  // Panel ID mappings
  'BASIC': ['BMP'],
  'COMP': ['CMP'],
  'CBC-PANEL': ['CBC-DIFF'],
  'LIPID-PANEL': ['LIPID'],
  'ANEMIA': ['CBC-DIFF', 'IRON', 'FERRITIN', 'B12', 'FOLATE', 'RETIC'],
  'INFLAM': ['ESR', 'CRP'],
};

// =============================================================================
// Store-specific Types
// =============================================================================

export interface SelectedLab {
  lab: LabTest;        // Changed from 'test' to 'lab' for test compatibility
  test?: LabTest;      // Keep for backward compat
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

export interface ClinicalContext {
  chiefComplaint: string;
  redFlags?: string[];
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  history?: string[];
}

export interface AIRecommendation {
  labCode: string;
  labName: string;
  priority: OrderPriority;
  rationale: string;
  category: 'critical' | 'recommended' | 'optional';
  confidence: number;
}

// =============================================================================
// Store State Interface
// =============================================================================

interface LabOrderingState {
  // Lab catalog as Map (for test compatibility)
  labCatalog: Map<string, LabTest>;
  
  // Selected labs as Map
  selectedLabs: Map<string, SelectedLab>;
  
  // Patient context
  patientContext: PatientContext | null;
  
  // Order settings
  defaultPriority: OrderPriority;  // FIXED: renamed from 'priority'
  clinicalIndication: string;
  specialInstructions: string;
  encounterId: string | null;
  
  // AI Recommendations
  aiRecommendations: AIRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search & Filter
  searchQuery: string;
  categoryFilter: LabCategory | 'all';
  
  // UI State
  loading: boolean;
  isLoading: boolean;
  submitting: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addLab: (labOrCode: LabTest | string, options?: { priority?: OrderPriority; rationale?: string; aiRecommended?: boolean }) => void;
  addLabPanel: (panelName: string) => void;  // FIXED: renamed from addPanel
  addPanel: (panelId: string) => void;       // Keep for backward compat
  removeLab: (testCode: string) => void;
  updateLabPriority: (testCode: string, priority: OrderPriority) => void;
  setDefaultPriority: (priority: OrderPriority) => void;  // FIXED: added
  setGlobalPriority: (priority: OrderPriority) => void;   // Keep for backward compat
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: LabCategory | 'all') => void;
  resetFilters: () => void;  // FIXED: added
  loadAIRecommendations: (patientId: string, context: ClinicalContext) => Promise<void>;  // FIXED: added
  generateAIRecommendations: () => Promise<void>;  // Keep for backward compat
  addAIRecommendedLabs: (category: 'critical' | 'recommended' | 'consider') => void;
  applyRecommendation: (recommendation: AIRecommendation) => void;
  submitOrder: (encounterId?: string) => Promise<string[] | boolean>;
  clearOrder: () => void;
  
  // Computed getters
  getSelectedLabsArray: () => SelectedLab[];
  getFilteredCatalog: () => LabTest[];
  getFilteredLabs: () => LabTest[];  // Alias for test compatibility
  getTotalCost: () => number;
  getStatCount: () => number;
  getFastingRequired: () => boolean;
  requiresFasting: () => boolean;  // Alias for test compatibility
  canSubmit: () => boolean;
}

// =============================================================================
// Fallback AI Recommendations
// =============================================================================

function generateFallbackRecommendations(context: ClinicalContext): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const complaint = (context.chiefComplaint || '').toLowerCase();
  
  // Chest pain workup
  if (complaint.includes('chest pain') || complaint.includes('chest pressure')) {
    recommendations.push(
      { labCode: 'TROP-I', labName: 'Troponin I', priority: 'STAT', rationale: 'Rule out ACS', category: 'critical', confidence: 0.95 },
      { labCode: 'BNP', labName: 'BNP', priority: 'STAT', rationale: 'Evaluate cardiac function', category: 'critical', confidence: 0.9 },
      { labCode: 'DDIMER', labName: 'D-Dimer', priority: 'STAT', rationale: 'Rule out PE', category: 'recommended', confidence: 0.85 },
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Baseline assessment', category: 'recommended', confidence: 0.8 },
      { labCode: 'BMP', labName: 'Basic Metabolic Panel', priority: 'ROUTINE', rationale: 'Electrolytes and renal function', category: 'recommended', confidence: 0.75 },
      { labCode: 'PT-INR', labName: 'PT/INR', priority: 'ROUTINE', rationale: 'Coagulation status', category: 'optional', confidence: 0.6 },
    );
  }
  
  // Fever/infection workup
  if (complaint.includes('fever') || complaint.includes('infection') || complaint.includes('confusion')) {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'STAT', rationale: 'Evaluate WBC/infection', category: 'critical', confidence: 0.95 },
      { labCode: 'CMP', labName: 'Comprehensive Metabolic Panel', priority: 'STAT', rationale: 'Metabolic assessment', category: 'critical', confidence: 0.9 },
      { labCode: 'LACTATE', labName: 'Lactic Acid', priority: 'STAT', rationale: 'Sepsis marker', category: 'critical', confidence: 0.85 },
      { labCode: 'PROCALCITONIN', labName: 'Procalcitonin', priority: 'STAT', rationale: 'Bacterial infection marker', category: 'recommended', confidence: 0.8 },
      { labCode: 'BCULT', labName: 'Blood Culture', priority: 'STAT', rationale: 'Identify pathogen', category: 'critical', confidence: 0.9 },
    );
  }
  
  // Abdominal pain
  if (complaint.includes('abdominal pain') || complaint.includes('stomach pain')) {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Evaluate for infection', category: 'recommended', confidence: 0.9 },
      { labCode: 'CMP', labName: 'Comprehensive Metabolic Panel', priority: 'ROUTINE', rationale: 'Liver and metabolic function', category: 'recommended', confidence: 0.85 },
      { labCode: 'LIPASE', labName: 'Lipase', priority: 'ROUTINE', rationale: 'Rule out pancreatitis', category: 'recommended', confidence: 0.8 },
      { labCode: 'UA', labName: 'Urinalysis', priority: 'ROUTINE', rationale: 'Rule out UTI', category: 'optional', confidence: 0.7 },
    );
  }
  
  // Default if no specific match
  if (recommendations.length === 0) {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Baseline assessment', category: 'recommended', confidence: 0.7 },
      { labCode: 'BMP', labName: 'Basic Metabolic Panel', priority: 'ROUTINE', rationale: 'Metabolic screening', category: 'optional', confidence: 0.5 },
    );
  }
  
  return recommendations;
}

// =============================================================================
// Store Implementation
// =============================================================================

// Create lab catalog as Map
const createLabCatalogMap = (): Map<string, LabTest> => {
  const map = new Map<string, LabTest>();
  Object.entries(LAB_CATALOG_OBJ).forEach(([code, test]) => {
    map.set(code, test);
  });
  return map;
};

export const useLabOrderingStore = create<LabOrderingState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      labCatalog: createLabCatalogMap(),
      selectedLabs: new Map(),
      patientContext: null,
      defaultPriority: 'ROUTINE',
      clinicalIndication: '',
      specialInstructions: '',
      encounterId: null,
      aiRecommendations: [],
      isLoadingRecommendations: false,
      searchQuery: '',
      categoryFilter: 'all',
      loading: false,
      isLoading: false,
      submitting: false,
      isSubmitting: false,
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

      // Lab Selection - handles both LabTest object and string code
      addLab: (labOrCode, options = {}) => {
        let test: LabTest | undefined;
        
        if (typeof labOrCode === 'string') {
          test = getLabTest(labOrCode);
        } else {
          test = labOrCode;
        }
        
        if (!test) {
          console.warn(`Lab test not found in catalog`);
          return;
        }
        
        set(state => {
          if (!state.selectedLabs.has(test!.code)) {
            state.selectedLabs.set(test!.code, {
              lab: test!,
              test: test!,  // backward compat
              priority: options.priority || state.defaultPriority,
              aiRecommended: options.aiRecommended || false,
              rationale: options.rationale
            });
          }
        });
      },

      // FIXED: addLabPanel with proper panel name support
      addLabPanel: (panelName) => {
        const upperName = panelName.toUpperCase();
        
        // First check our mappings
        const testCodes = PANEL_CODE_MAPPINGS[upperName];
        if (testCodes && testCodes.length > 0) {
          testCodes.forEach(code => {
            const labTest = getLabTest(code);
            if (labTest) {
              get().addLab(labTest);
            }
          });
          return;
        }
        
        // Fallback to panel lookup
        const panel = getLabPanel(upperName);
        if (panel) {
          panel.tests.forEach(testCode => get().addLab(testCode));
          return;
        }
        
        console.warn(`Lab panel ${panelName} not found`);
      },

      // Keep addPanel for backward compatibility
      addPanel: (panelId) => {
        get().addLabPanel(panelId);
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

      // FIXED: setDefaultPriority
      setDefaultPriority: (priority) => {
        set(state => {
          state.defaultPriority = priority;
        });
      },

      // Keep setGlobalPriority for backward compatibility
      setGlobalPriority: (priority) => {
        set(state => {
          state.defaultPriority = priority;
          state.selectedLabs.forEach(lab => { lab.priority = priority; });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),

      // FIXED: resetFilters
      resetFilters: () => {
        set(state => {
          state.searchQuery = '';
          state.categoryFilter = 'all';
        });
      },

      // FIXED: loadAIRecommendations (for test compatibility)
      loadAIRecommendations: async (patientId, context) => {
        set({ isLoading: true, isLoadingRecommendations: true, error: null });
        
        try {
          // Try to fetch from API
          const response = await fetch('/api/clinical/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, ...context }),
          });
          
          if (!response.ok) {
            throw new Error('AI service unavailable');
          }
          
          const data = await response.json();
          const recommendations = data.data?.recommendations || [];
          
          set({ 
            aiRecommendations: recommendations, 
            isLoading: false,
            isLoadingRecommendations: false 
          });
        } catch (error) {
          // Use fallback recommendations
          console.log('Using fallback recommendations engine');
          const fallbackRecs = generateFallbackRecommendations(context);
          set({ 
            aiRecommendations: fallbackRecs, 
            isLoading: false,
            isLoadingRecommendations: false,
          });
        }
      },

      // Keep generateAIRecommendations for backward compat
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set({ isLoadingRecommendations: true, isLoading: true });
        
        try {
          const recommendations = await clinicalRecommendationService.generateLabRecommendations(patientContext);
          // Map to our format
          const mapped: AIRecommendation[] = recommendations.map(r => ({
            labCode: r.testCode,
            labName: r.testName || r.testCode,
            priority: r.priority,
            rationale: r.rationale,
            category: r.category,
            confidence: r.confidence || 0.8,
          }));
          set({ aiRecommendations: mapped, isLoadingRecommendations: false, isLoading: false });
        } catch (error) {
          console.error('Failed to generate AI recommendations:', error);
          // Use fallback
          const fallbackRecs = generateFallbackRecommendations({
            chiefComplaint: patientContext.chiefComplaint || '',
            redFlags: patientContext.redFlags || [],
          });
          set({ 
            aiRecommendations: fallbackRecs, 
            isLoadingRecommendations: false, 
            isLoading: false,
            error: 'Using fallback recommendations' 
          });
        }
      },

      addAIRecommendedLabs: (category) => {
        const { aiRecommendations, addLab } = get();
        const mappedCategory = category === 'consider' ? 'optional' : category;
        aiRecommendations
          .filter(rec => rec.category === mappedCategory)
          .forEach(rec => {
            addLab(rec.labCode, {
              priority: rec.priority,
              rationale: rec.rationale,
              aiRecommended: true
            });
          });
      },

      applyRecommendation: (recommendation) => {
        get().addLab(recommendation.labCode, {
          priority: recommendation.priority,
          rationale: recommendation.rationale,
          aiRecommended: true
        });
      },

      // Order Submission
      submitOrder: async (encounterId) => {
        const { selectedLabs, clinicalIndication, specialInstructions } = get();
        
        if (selectedLabs.size === 0) {
          set({ error: 'No labs selected' });
          return false;
        }
        
        if (!clinicalIndication) {
          set({ error: 'Clinical indication is required' });
          return false;
        }
        
        set({ submitting: true, isSubmitting: true, error: null });
        
        try {
          const tests = Array.from(selectedLabs.values()).map(sl => ({
            code: sl.lab.code,
            name: sl.lab.name,
            category: sl.lab.category,
            specimenType: sl.lab.specimenType,
            priority: sl.priority
          }));
          
          const response = await fetch('/api/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encounterId: encounterId || get().encounterId,
              tests,
              indication: clinicalIndication,
              specialInstructions,
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
          
          set(state => {
            state.submitting = false;
            state.isSubmitting = false;
            state.lastSubmittedOrderIds = orderIds;
          });
          
          get().clearOrder();
          return orderIds.length > 0 ? orderIds : true;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.isSubmitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit order';
          });
          return false;
        }
      },

      clearOrder: () => set(state => {
        state.selectedLabs = new Map();
        state.defaultPriority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.aiRecommendations = [];
        state.error = null;
        // Also reset filters
        state.searchQuery = '';
        state.categoryFilter = 'all';
      }),

      // Computed Getters
      getSelectedLabsArray: () => Array.from(get().selectedLabs.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter, labCatalog } = get();
        let results = searchQuery ? searchLabs(searchQuery) : Array.from(labCatalog.values());
        if (categoryFilter !== 'all') {
          results = results.filter(test => test.category === categoryFilter);
        }
        return results;
      },

      // Alias for test compatibility
      getFilteredLabs: () => get().getFilteredCatalog(),

      getTotalCost: () => get().getSelectedLabsArray().reduce((sum, sl) => sum + (sl.lab?.cost || 0), 0),
      
      getStatCount: () => get().getSelectedLabsArray().filter(sl => sl.priority === 'STAT').length,
      
      getFastingRequired: () => get().getSelectedLabsArray().some(sl => sl.lab?.requiresFasting),
      
      // Alias for test compatibility
      requiresFasting: () => get().getFastingRequired(),
      
      canSubmit: () => {
        const state = get();
        return state.selectedLabs.size > 0 && 
               state.clinicalIndication.length > 0 &&
               !state.isSubmitting;
      },
    })),
    { name: 'lab-ordering-store' }
  )
);

export default useLabOrderingStore;
