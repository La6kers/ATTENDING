// ============================================================
// Lab Ordering Store — REFACTORED
// apps/provider-portal/store/labOrderingStore.ts
//
// CHANGES:
//   • Map → Record (JSON-serializable, no enableMapSet needed)
//   • Removed all backward-compat aliases (one name per concept)
//   • Removed duplicate loading/isLoading, submitting/isSubmitting
//   • ClinicalRecommendationService is now synchronous
//   • SelectedLab.lab only (removed redundant .test)
//   • Unified recommendation type (no AILabRecommendation alias)
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  type OrderingContext,
  // Keep PatientContext re-export for consumers still using old name
  type PatientContext,
} from '@attending/shared/catalogs';

import {
  clinicalRecommendationService,
  type LabRecommendation,
} from '@attending/shared/services/ClinicalRecommendationService';

// =============================================================================
// Re-exports
// =============================================================================
export type { LabTest, LabPanel, LabCategory, OrderPriority, OrderingContext, PatientContext };
export type { LabRecommendation };
export const LAB_CATALOG = LAB_CATALOG_OBJ;
export const LAB_PANELS = LAB_PANELS_OBJ;

// =============================================================================
// Panel Name → Test Code Mappings
// =============================================================================
const PANEL_CODE_MAPPINGS: Record<string, string[]> = {
  BMP:      ['BMP'],
  CMP:      ['CMP'],
  CBC:      ['CBC', 'CBC-DIFF'],
  LIPID:    ['LIPID'],
  CARDIAC:  ['TROP-I', 'BNP'],
  COAG:     ['PT-INR', 'PTT', 'FIBRIN', 'DDIMER'],
  THYROID:  ['TSH', 'FT4', 'FT3'],
  LIVER:    ['LFT'],
  RENAL:    ['BMP', 'BUN', 'CR'],
  SEPSIS:   ['CBC-DIFF', 'CMP', 'LACTATE', 'PROCALCITONIN', 'BCULT'],
  ACS:      ['TROP-I', 'CBC-DIFF', 'BMP', 'PT-INR', 'BNP', 'DDIMER'],
  BASIC:    ['BMP'],
  COMP:     ['CMP'],
  'CBC-PANEL': ['CBC-DIFF'],
  'LIPID-PANEL': ['LIPID'],
  ANEMIA:   ['CBC-DIFF', 'IRON', 'FERRITIN', 'B12', 'FOLATE', 'RETIC'],
  INFLAM:   ['ESR', 'CRP'],
};

// =============================================================================
// Types
// =============================================================================

export interface SelectedLab {
  lab: LabTest;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

export interface AIRecommendation {
  labCode: string;
  labName: string;
  priority: OrderPriority;
  rationale: string;
  category: 'critical' | 'recommended' | 'optional';
  confidence: number;
}

interface ClinicalContext {
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

// =============================================================================
// Store Interface
// =============================================================================

interface LabOrderingState {
  // Data
  selectedLabs: Record<string, SelectedLab>;     // ← was Map
  patientContext: OrderingContext | null;

  // Order settings
  defaultPriority: OrderPriority;
  clinicalIndication: string;
  specialInstructions: string;
  encounterId: string | null;

  // AI
  aiRecommendations: AIRecommendation[];
  loadingRecommendations: boolean;

  // Search & filter
  searchQuery: string;
  categoryFilter: LabCategory | 'all';

  // Workflow
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];

  // Actions
  setPatientContext: (context: OrderingContext) => void;
  addLab: (labOrCode: LabTest | string, options?: { priority?: OrderPriority; rationale?: string; aiRecommended?: boolean }) => void;
  addLabPanel: (panelName: string) => void;
  removeLab: (testCode: string) => void;
  updateLabPriority: (testCode: string, priority: OrderPriority) => void;
  setDefaultPriority: (priority: OrderPriority) => void;
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: LabCategory | 'all') => void;
  resetFilters: () => void;
  loadAIRecommendations: (patientId: string, context: ClinicalContext) => void;
  generateAIRecommendations: () => void;
  addAIRecommendedLabs: (category: 'critical' | 'recommended' | 'consider') => void;
  applyRecommendation: (recommendation: AIRecommendation) => void;
  submitOrder: (encounterId?: string) => Promise<string[] | boolean>;
  clearOrder: () => void;

  // Computed
  getSelectedLabsArray: () => SelectedLab[];
  getFilteredCatalog: () => LabTest[];
  getTotalCost: () => number;
  getStatCount: () => number;
  getFastingRequired: () => boolean;
  canSubmit: () => boolean;
}

// =============================================================================
// Fallback Recommendations (when API + shared service both unavailable)
// =============================================================================

function generateFallbackRecommendations(context: ClinicalContext): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const complaint = (context.chiefComplaint || '').toLowerCase();

  if (complaint.includes('chest pain') || complaint.includes('chest pressure')) {
    recommendations.push(
      { labCode: 'TROP-I', labName: 'Troponin I', priority: 'STAT', rationale: 'Rule out ACS', category: 'critical', confidence: 0.95 },
      { labCode: 'BNP', labName: 'BNP', priority: 'STAT', rationale: 'Evaluate cardiac function', category: 'critical', confidence: 0.9 },
      { labCode: 'DDIMER', labName: 'D-Dimer', priority: 'STAT', rationale: 'Rule out PE', category: 'recommended', confidence: 0.85 },
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Baseline assessment', category: 'recommended', confidence: 0.8 },
      { labCode: 'BMP', labName: 'Basic Metabolic Panel', priority: 'ROUTINE', rationale: 'Electrolytes and renal function', category: 'recommended', confidence: 0.75 },
    );
  } else if (complaint.includes('fever') || complaint.includes('infection') || complaint.includes('confusion')) {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'STAT', rationale: 'Evaluate WBC/infection', category: 'critical', confidence: 0.95 },
      { labCode: 'CMP', labName: 'Comprehensive Metabolic Panel', priority: 'STAT', rationale: 'Metabolic assessment', category: 'critical', confidence: 0.9 },
      { labCode: 'LACTATE', labName: 'Lactic Acid', priority: 'STAT', rationale: 'Sepsis marker', category: 'critical', confidence: 0.85 },
      { labCode: 'PROCALCITONIN', labName: 'Procalcitonin', priority: 'STAT', rationale: 'Bacterial infection marker', category: 'recommended', confidence: 0.8 },
      { labCode: 'BCULT', labName: 'Blood Culture', priority: 'STAT', rationale: 'Identify pathogen', category: 'critical', confidence: 0.9 },
    );
  } else if (complaint.includes('abdominal pain') || complaint.includes('stomach pain')) {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Evaluate for infection', category: 'recommended', confidence: 0.9 },
      { labCode: 'CMP', labName: 'Comprehensive Metabolic Panel', priority: 'ROUTINE', rationale: 'Liver and metabolic function', category: 'recommended', confidence: 0.85 },
      { labCode: 'LIPASE', labName: 'Lipase', priority: 'ROUTINE', rationale: 'Rule out pancreatitis', category: 'recommended', confidence: 0.8 },
      { labCode: 'UA', labName: 'Urinalysis', priority: 'ROUTINE', rationale: 'Rule out UTI', category: 'optional', confidence: 0.7 },
    );
  } else {
    recommendations.push(
      { labCode: 'CBC-DIFF', labName: 'CBC with Differential', priority: 'ROUTINE', rationale: 'Baseline assessment', category: 'recommended', confidence: 0.7 },
      { labCode: 'BMP', labName: 'Basic Metabolic Panel', priority: 'ROUTINE', rationale: 'Metabolic screening', category: 'optional', confidence: 0.5 },
    );
  }

  return recommendations;
}

// =============================================================================
// Store
// =============================================================================

export const useLabOrderingStore = create<LabOrderingState>()(
  devtools(
    immer((set, get) => ({
      // ── Initial state ─────────────────────────────────────
      selectedLabs: {} as Record<string, SelectedLab>,
      patientContext: null,
      defaultPriority: 'ROUTINE' as OrderPriority,
      clinicalIndication: '',
      specialInstructions: '',
      encounterId: null,
      aiRecommendations: [],
      loadingRecommendations: false,
      searchQuery: '',
      categoryFilter: 'all' as LabCategory | 'all',
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedOrderIds: [],

      // ── Patient Context ───────────────────────────────────
      setPatientContext: (context) => {
        set(state => {
          state.patientContext = context;
          if (context.chiefComplaint) {
            state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
          }
        });
        // Auto-generate recommendations (synchronous now)
        get().generateAIRecommendations();
      },

      // ── Lab Selection ─────────────────────────────────────
      addLab: (labOrCode, options = {}) => {
        const test = typeof labOrCode === 'string' ? getLabTest(labOrCode) : labOrCode;
        if (!test) {
          console.warn(`Lab test not found in catalog`);
          return;
        }
        set(state => {
          if (!state.selectedLabs[test.code]) {
            state.selectedLabs[test.code] = {
              lab: test,
              priority: options.priority || state.defaultPriority,
              aiRecommended: options.aiRecommended || false,
              rationale: options.rationale,
            };
          }
        });
      },

      addLabPanel: (panelName) => {
        const upperName = panelName.toUpperCase();
        const testCodes = PANEL_CODE_MAPPINGS[upperName];
        if (testCodes?.length) {
          testCodes.forEach(code => {
            const labTest = getLabTest(code);
            if (labTest) get().addLab(labTest);
          });
          return;
        }
        const panel = getLabPanel(upperName);
        if (panel) {
          panel.tests.forEach(testCode => get().addLab(testCode));
          return;
        }
        console.warn(`Lab panel ${panelName} not found`);
      },

      removeLab: (testCode) => {
        set(state => { delete state.selectedLabs[testCode]; });
      },

      updateLabPriority: (testCode, priority) => {
        set(state => {
          if (state.selectedLabs[testCode]) {
            state.selectedLabs[testCode].priority = priority;
          }
        });
      },

      setDefaultPriority: (priority) => {
        set(state => { state.defaultPriority = priority; });
      },

      setGlobalPriority: (priority) => {
        set(state => {
          state.defaultPriority = priority;
          Object.values(state.selectedLabs).forEach(lab => { lab.priority = priority; });
        });
      },

      setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCategoryFilter: (category) => set({ categoryFilter: category }),
      resetFilters: () => set(state => { state.searchQuery = ''; state.categoryFilter = 'all'; }),

      // ── AI Recommendations (synchronous rule-based) ───────
      loadAIRecommendations: (_patientId, context) => {
        // Use synchronous shared service via patientContext
        const fallbackRecs = generateFallbackRecommendations(context);
        set({ aiRecommendations: fallbackRecs, loadingRecommendations: false });
      },

      generateAIRecommendations: () => {
        const { patientContext } = get();
        if (!patientContext) return;

        set({ loadingRecommendations: true });

        // Synchronous call — no async needed
        const recommendations = clinicalRecommendationService.generateLabRecommendations(patientContext);
        const mapped: AIRecommendation[] = recommendations.map(r => ({
          labCode: r.testCode,
          labName: r.testName || r.testCode,
          priority: r.priority,
          rationale: r.rationale,
          category: r.category === 'consider' ? 'optional' : r.category as 'critical' | 'recommended' | 'optional',
          confidence: r.confidence || 0.8,
        }));

        set({ aiRecommendations: mapped, loadingRecommendations: false });
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
              aiRecommended: true,
            });
          });
      },

      applyRecommendation: (recommendation) => {
        get().addLab(recommendation.labCode, {
          priority: recommendation.priority,
          rationale: recommendation.rationale,
          aiRecommended: true,
        });
      },

      // ── Order Submission ──────────────────────────────────
      submitOrder: async (encounterId) => {
        const { selectedLabs, clinicalIndication, specialInstructions } = get();
        const labsArray = Object.values(selectedLabs);

        if (labsArray.length === 0) {
          set({ error: 'No labs selected' });
          return false;
        }
        if (!clinicalIndication) {
          set({ error: 'Clinical indication is required' });
          return false;
        }

        set({ submitting: true, error: null });

        try {
          const tests = labsArray.map(sl => ({
            code: sl.lab.code,
            name: sl.lab.name,
            category: sl.lab.category,
            specimenType: sl.lab.specimenType,
            priority: sl.priority,
          }));

          const response = await fetch('/api/labs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              encounterId: encounterId || get().encounterId,
              tests,
              indication: clinicalIndication,
              specialInstructions,
              priority: tests.some(t => t.priority === 'STAT') ? 'STAT'
                : tests.some(t => t.priority === 'ASAP') ? 'ASAP' : 'ROUTINE',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit lab order');
          }

          const result = await response.json();
          const orderIds = Array.isArray(result) ? result.map((r: any) => r.id) : [result.id];

          set(state => {
            state.submitting = false;
            state.lastSubmittedOrderIds = orderIds;
          });

          get().clearOrder();
          return orderIds.length > 0 ? orderIds : true;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit order';
          });
          return false;
        }
      },

      clearOrder: () => set(state => {
        state.selectedLabs = {};
        state.defaultPriority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.aiRecommendations = [];
        state.error = null;
        state.searchQuery = '';
        state.categoryFilter = 'all';
      }),

      // ── Computed ──────────────────────────────────────────
      getSelectedLabsArray: () => Object.values(get().selectedLabs),
      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter } = get();
        let results = searchQuery ? searchLabs(searchQuery) : Object.values(LAB_CATALOG_OBJ);
        if (categoryFilter !== 'all') {
          results = results.filter(test => test.category === categoryFilter);
        }
        return results;
      },
      getTotalCost: () => Object.values(get().selectedLabs).reduce((sum, sl) => sum + (sl.lab?.cost || 0), 0),
      getStatCount: () => Object.values(get().selectedLabs).filter(sl => sl.priority === 'STAT').length,
      getFastingRequired: () => Object.values(get().selectedLabs).some(sl => sl.lab?.requiresFasting),
      canSubmit: () => {
        const state = get();
        return Object.keys(state.selectedLabs).length > 0
          && state.clinicalIndication.length > 0
          && !state.submitting;
      },
    })),
    { name: 'lab-ordering-store' }
  )
);

export default useLabOrderingStore;
