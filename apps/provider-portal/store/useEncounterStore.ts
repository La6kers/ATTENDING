// =============================================================================
// ATTENDING AI - Encounter Context Store
// apps/provider-portal/store/useEncounterStore.ts
//
// Zustand store managing encounter lifecycle state across
// previsit -> diagnosis -> treatment -> documentation -> complete phases.
// Replaces sessionStorage approach for cross-page data passing.
// Persisted to sessionStorage (survives navigation, cleared on browser close).
// =============================================================================

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export interface EncounterPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  hpiSummary: string;
  vitals: { bp: string; hr: number; temp: number; rr: number; spo2: number };
  allergies: string[];
  medications: string[];
  redFlags: string[];
}

export interface CompassData {
  onset: string;
  location: string;
  duration: string;
  character: string;
  aggravating: string[];
  relieving: string[];
  timing: string;
  severity: number;
  associatedSymptoms: string[];
  rawResponses: Record<string, string>;
}

export interface SuggestedDiagnosis {
  id: string;
  name: string;
  icdCode: string;
  probability: number;
  category: 'primary' | 'secondary' | 'rule-out';
  selected: boolean;
  ambientMatches: string[];
  aiSuggested: boolean;
  providerConfirmed: boolean;
}

export interface SelectedTreatment {
  id: string;
  name: string;
  category: string;
  diagnosisId: string;
}

export interface AmbientTranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

export type EncounterPhase =
  | 'previsit'
  | 'diagnosis'
  | 'treatment'
  | 'documentation'
  | 'complete'
  | null;

export type AmbientState = 'off' | 'listening' | 'paused';

export interface EncounterState {
  // Patient context
  patient: EncounterPatient | null;

  // Assessment data from COMPASS
  assessmentId: string | null;
  compassData: CompassData | null;

  // Diagnoses
  suggestedDiagnoses: SuggestedDiagnosis[];

  // Treatments (populated after diagnosis selection)
  selectedTreatments: SelectedTreatment[];

  // Ambient state
  ambientState: AmbientState;
  ambientTranscript: AmbientTranscriptEntry[];

  // Encounter metadata
  encounterId: string | null;
  encounterStartedAt: string | null;
  encounterPhase: EncounterPhase;

  // Cost tracking
  encounterCost: number;

  // Actions
  setPatient: (patient: EncounterState['patient']) => void;
  setAssessment: (assessmentId: string, compassData: EncounterState['compassData']) => void;
  setSuggestedDiagnoses: (diagnoses: EncounterState['suggestedDiagnoses']) => void;
  toggleDiagnosis: (id: string) => void;
  updateDiagnosisProbability: (id: string, delta: number, matchedTerm?: string) => void;
  setSelectedTreatments: (treatments: EncounterState['selectedTreatments']) => void;
  startEncounter: () => void;
  setPhase: (phase: EncounterState['encounterPhase']) => void;
  setAmbientState: (state: EncounterState['ambientState']) => void;
  addAmbientTranscript: (entry: AmbientTranscriptEntry) => void;
  addEncounterCost: (cost: number) => void;
  resetEncounter: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  patient: null as EncounterState['patient'],
  assessmentId: null as string | null,
  compassData: null as CompassData | null,
  suggestedDiagnoses: [] as SuggestedDiagnosis[],
  selectedTreatments: [] as SelectedTreatment[],
  ambientState: 'off' as AmbientState,
  ambientTranscript: [] as AmbientTranscriptEntry[],
  encounterId: null as string | null,
  encounterStartedAt: null as string | null,
  encounterPhase: null as EncounterPhase,
  encounterCost: 0,
};

// =============================================================================
// Store Implementation
// =============================================================================

export const useEncounterStore = create<EncounterState>()(
  devtools(
    persist(
      immer((set, _get) => ({
        ...initialState,

        // =====================================================================
        // Patient Context
        // =====================================================================

        setPatient: (patient) => {
          set(state => {
            state.patient = patient;
          });
        },

        // =====================================================================
        // Assessment / COMPASS Data
        // =====================================================================

        setAssessment: (assessmentId, compassData) => {
          set(state => {
            state.assessmentId = assessmentId;
            state.compassData = compassData;
          });
        },

        // =====================================================================
        // Diagnoses
        // =====================================================================

        setSuggestedDiagnoses: (diagnoses) => {
          set(state => {
            state.suggestedDiagnoses = diagnoses;
          });
        },

        toggleDiagnosis: (id) => {
          set(state => {
            const dx = state.suggestedDiagnoses.find(d => d.id === id);
            if (dx) {
              dx.selected = !dx.selected;
              // When provider toggles selection, mark as confirmed
              dx.providerConfirmed = dx.selected;
            }
          });
        },

        updateDiagnosisProbability: (id, delta, matchedTerm) => {
          set(state => {
            const dx = state.suggestedDiagnoses.find(d => d.id === id);
            if (dx) {
              // Clamp probability between 0 and 100
              dx.probability = Math.max(0, Math.min(100, dx.probability + delta));

              // Track which ambient terms contributed to the change
              if (matchedTerm && !dx.ambientMatches.includes(matchedTerm)) {
                dx.ambientMatches.push(matchedTerm);
              }
            }
          });
        },

        // =====================================================================
        // Treatments
        // =====================================================================

        setSelectedTreatments: (treatments) => {
          set(state => {
            state.selectedTreatments = treatments;
          });
        },

        // =====================================================================
        // Encounter Lifecycle
        // =====================================================================

        startEncounter: () => {
          set(state => {
            state.encounterId = `enc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            state.encounterStartedAt = new Date().toISOString();
            state.encounterPhase = 'previsit';
            state.encounterCost = 0;
          });
        },

        setPhase: (phase) => {
          set(state => {
            state.encounterPhase = phase;
          });
        },

        // =====================================================================
        // Ambient Listening
        // =====================================================================

        setAmbientState: (ambientState) => {
          set(state => {
            state.ambientState = ambientState;
          });
        },

        addAmbientTranscript: (entry) => {
          set(state => {
            state.ambientTranscript.push(entry);
          });
        },

        // =====================================================================
        // Cost Tracking
        // =====================================================================

        addEncounterCost: (cost) => {
          set(state => {
            state.encounterCost += cost;
          });
        },

        // =====================================================================
        // Reset
        // =====================================================================

        resetEncounter: () => {
          set(initialState);
        },
      })),
      {
        name: 'encounter-context-storage',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          patient: state.patient,
          assessmentId: state.assessmentId,
          compassData: state.compassData,
          suggestedDiagnoses: state.suggestedDiagnoses,
          selectedTreatments: state.selectedTreatments,
          ambientState: state.ambientState,
          ambientTranscript: state.ambientTranscript,
          encounterId: state.encounterId,
          encounterStartedAt: state.encounterStartedAt,
          encounterPhase: state.encounterPhase,
          encounterCost: state.encounterCost,
        }),
      }
    ),
    { name: 'EncounterStore' }
  )
);

// =============================================================================
// Convenience Hooks
// =============================================================================

/** Select only patient data */
export function useEncounterPatient() {
  return useEncounterStore(state => state.patient);
}

/** Select diagnoses with actions */
export function useEncounterDiagnoses() {
  return useEncounterStore(state => ({
    diagnoses: state.suggestedDiagnoses,
    selectedDiagnoses: state.suggestedDiagnoses.filter(d => d.selected),
    setSuggestedDiagnoses: state.setSuggestedDiagnoses,
    toggleDiagnosis: state.toggleDiagnosis,
    updateDiagnosisProbability: state.updateDiagnosisProbability,
  }));
}

/** Select treatments with actions */
export function useEncounterTreatments() {
  return useEncounterStore(state => ({
    treatments: state.selectedTreatments,
    setSelectedTreatments: state.setSelectedTreatments,
  }));
}

/** Select ambient listening state */
export function useAmbientListener() {
  return useEncounterStore(state => ({
    ambientState: state.ambientState,
    transcript: state.ambientTranscript,
    setAmbientState: state.setAmbientState,
    addAmbientTranscript: state.addAmbientTranscript,
  }));
}

/** Select encounter phase and lifecycle actions */
export function useEncounterPhase() {
  return useEncounterStore(state => ({
    phase: state.encounterPhase,
    encounterId: state.encounterId,
    startedAt: state.encounterStartedAt,
    cost: state.encounterCost,
    startEncounter: state.startEncounter,
    setPhase: state.setPhase,
    addEncounterCost: state.addEncounterCost,
    resetEncounter: state.resetEncounter,
  }));
}
