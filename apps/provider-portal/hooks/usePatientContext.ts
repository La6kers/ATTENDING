// usePatientContext.ts
// Shared hook for patient context across all pages
// apps/provider-portal/hooks/usePatientContext.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface PatientContext {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | string;
  mrn: string;
  dateOfBirth?: string;
  chiefComplaint?: string;
  insurancePlan?: string;
  allergies?: string[];
  currentMedications?: string[];
  medicalHistory?: string[];
  redFlags?: string[];
  // Safety-critical info (for imaging/medications)
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  // Context-specific
  encounterId?: string;
  assessmentId?: string;
}

interface PatientContextState {
  /** Currently selected patient, or null for "All" views */
  selectedPatient: PatientContext | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Recent patients for quick access */
  recentPatients: PatientContext[];
  /** Maximum recent patients to keep */
  maxRecentPatients: number;
}

interface PatientContextActions {
  /** Select a patient */
  selectPatient: (patient: PatientContext) => void;
  /** Clear selected patient (go to "All" view) */
  clearSelectedPatient: () => void;
  /** Update selected patient info */
  updateSelectedPatient: (updates: Partial<PatientContext>) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Clear error */
  clearError: () => void;
  /** Check if a patient is selected */
  hasPatient: () => boolean;
  /** Get display name for header */
  getDisplayName: () => string;
}

// ============================================================================
// Store
// ============================================================================

export const usePatientContextStore = create<PatientContextState & PatientContextActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        selectedPatient: null,
        isLoading: false,
        error: null,
        recentPatients: [],
        maxRecentPatients: 5,

        // Actions
        selectPatient: (patient) => {
          set((state) => {
            state.selectedPatient = patient;
            state.error = null;
            
            // Add to recent patients (avoid duplicates)
            const existingIndex = state.recentPatients.findIndex(p => p.id === patient.id);
            if (existingIndex > -1) {
              state.recentPatients.splice(existingIndex, 1);
            }
            state.recentPatients.unshift(patient);
            
            // Keep only max recent
            if (state.recentPatients.length > state.maxRecentPatients) {
              state.recentPatients = state.recentPatients.slice(0, state.maxRecentPatients);
            }
          });
        },

        clearSelectedPatient: () => {
          set((state) => {
            state.selectedPatient = null;
          });
        },

        updateSelectedPatient: (updates) => {
          set((state) => {
            if (state.selectedPatient) {
              state.selectedPatient = { ...state.selectedPatient, ...updates };
            }
          });
        },

        setLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
            state.isLoading = false;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        hasPatient: () => {
          return get().selectedPatient !== null;
        },

        getDisplayName: () => {
          const patient = get().selectedPatient;
          return patient ? patient.name : 'All Patients';
        },
      })),
      {
        name: 'patient-context',
        partialize: (state) => ({
          recentPatients: state.recentPatients,
        }),
      }
    ),
    { name: 'patient-context' }
  )
);

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * usePatientContext - Easy access to patient context
 * 
 * @example
 * ```tsx
 * const { patient, select, clear, hasPatient } = usePatientContext();
 * 
 * // Check if patient is selected
 * if (hasPatient) {
 *   console.log(`Working with ${patient.name}`);
 * }
 * 
 * // Select a patient
 * select({ id: '123', name: 'John Doe', ... });
 * 
 * // Clear selection
 * clear();
 * ```
 */
export function usePatientContext() {
  const patient = usePatientContextStore((s) => s.selectedPatient);
  const select = usePatientContextStore((s) => s.selectPatient);
  const clear = usePatientContextStore((s) => s.clearSelectedPatient);
  const update = usePatientContextStore((s) => s.updateSelectedPatient);
  const hasPatient = usePatientContextStore((s) => s.hasPatient);
  const displayName = usePatientContextStore((s) => s.getDisplayName);
  const recentPatients = usePatientContextStore((s) => s.recentPatients);
  const isLoading = usePatientContextStore((s) => s.isLoading);
  const error = usePatientContextStore((s) => s.error);

  return {
    patient,
    select,
    clear,
    update,
    hasPatient: hasPatient(),
    displayName: displayName(),
    recentPatients,
    isLoading,
    error,
  };
}

export default usePatientContext;
