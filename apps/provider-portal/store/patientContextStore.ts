// =============================================================================
// ATTENDING AI - Patient Context Store
// apps/provider-portal/store/patientContextStore.ts
//
// Unified patient context that persists across ordering pages
// All ordering stores should reference this for patient data
// =============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// =============================================================================
// Types
// =============================================================================

export interface PatientDemographics {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  pregnancyStatus?: 'pregnant' | 'not_pregnant' | 'unknown';
  preferredLanguage?: string;
  phone?: string;
  email?: string;
}

export interface PatientVitals {
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  temperature?: number;
  temperatureUnit?: 'F' | 'C';
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'in';
  painLevel?: number;
  bloodGlucose?: number;
  recordedAt?: string;
}

export interface PatientAllergy {
  id: string;
  allergen: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  type: 'drug' | 'food' | 'environmental' | 'other';
}

export interface PatientMedication {
  id: string;
  name: string;
  genericName?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  prescriber?: string;
  isActive: boolean;
}

export interface PatientCondition {
  id: string;
  name: string;
  icdCode?: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate?: string;
}

export interface EncounterContext {
  encounterId: string;
  chiefComplaint: string;
  visitType: string;
  scheduledAt?: string;
  startedAt?: string;
  providerId: string;
  providerName: string;
  location?: string;
  roomNumber?: string;
}

export interface ClinicalContext {
  symptoms: Array<{
    name: string;
    severity?: number;
    duration?: string;
    location?: string;
    timing?: string;
  }>;
  hpi?: {
    onset?: string;
    location?: string;
    duration?: string;
    character?: string;
    severity?: number;
    timing?: string;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    associatedSymptoms?: string[];
  };
  redFlags: string[];
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  urgencyScore: number;
}

export interface InsuranceInfo {
  insuranceId?: string;
  insuranceName?: string;
  groupNumber?: string;
  memberId?: string;
  priorAuthRequired?: boolean;
}

// Format expected by AI services
export interface PatientContextForAI {
  patientId: string;
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    pregnancyStatus?: 'pregnant' | 'not_pregnant' | 'unknown';
  };
  chiefComplaint: string;
  symptoms: Array<{
    name: string;
    severity?: number;
    duration?: string;
    location?: string;
  }>;
  vitals?: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    painLevel?: number;
  };
  allergies: Array<{ allergen: string; reaction?: string; severity?: string }>;
  medications: Array<{ name: string; dose?: string; frequency?: string }>;
  medicalHistory: string[];
  redFlags?: string[];
}

export interface PatientContextState {
  // Patient data
  demographics: PatientDemographics | null;
  vitals: PatientVitals | null;
  allergies: PatientAllergy[];
  medications: PatientMedication[];
  conditions: PatientCondition[];
  insurance: InsuranceInfo | null;
  
  // Encounter data
  encounter: EncounterContext | null;
  clinical: ClinicalContext | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  loadPatient: (patientId: string) => Promise<void>;
  loadEncounter: (encounterId: string) => Promise<void>;
  loadFromAssessment: (assessmentId: string) => Promise<void>;
  
  updateVitals: (vitals: Partial<PatientVitals>) => void;
  updateClinical: (clinical: Partial<ClinicalContext>) => void;
  addRedFlag: (flag: string) => void;
  removeRedFlag: (flag: string) => void;
  
  // Computed getters
  getPatientDisplayName: () => string;
  getPatientAge: () => number;
  getActiveAllergies: () => PatientAllergy[];
  getActiveMedications: () => PatientMedication[];
  hasAllergy: (substance: string) => boolean;
  isPregnant: () => boolean;
  needsPregnancyTest: () => boolean;
  
  // For API calls (formatted context)
  getPatientContext: () => PatientContextForAI;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  demographics: null,
  vitals: null,
  allergies: [] as PatientAllergy[],
  medications: [] as PatientMedication[],
  conditions: [] as PatientCondition[],
  insurance: null,
  encounter: null,
  clinical: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// =============================================================================
// Utility Functions
// =============================================================================

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

function parseJsonField<T>(val: any, def: T): T {
  if (!val) return def;
  if (Array.isArray(val)) return val as T;
  try { return JSON.parse(val) as T; } catch { return def; }
}

// =============================================================================
// Store Implementation
// =============================================================================

export const usePatientContextStore = create<PatientContextState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // =====================================================================
        // Data Loading Actions
        // =====================================================================
        
        loadPatient: async (patientId: string) => {
          set(state => { 
            state.isLoading = true; 
            state.error = null; 
          });
          
          try {
            const response = await fetch(`/api/patients/${patientId}`);
            if (!response.ok) throw new Error('Failed to load patient');
            
            const data = await response.json();
            
            set(state => {
              state.demographics = {
                id: data.id,
                mrn: data.mrn,
                firstName: data.firstName,
                lastName: data.lastName,
                dateOfBirth: data.dateOfBirth,
                age: calculateAge(data.dateOfBirth),
                gender: data.gender?.toLowerCase() || 'other',
                pregnancyStatus: data.pregnancyStatus,
                preferredLanguage: data.preferredLanguage,
                phone: data.phone,
                email: data.email,
              };
              state.allergies = (data.allergies || []).map((a: any) => ({
                id: a.id,
                allergen: a.allergen,
                reaction: a.reaction,
                severity: a.severity?.toLowerCase() || 'moderate',
                type: a.type?.toLowerCase() || 'drug',
              }));
              state.medications = (data.medications || []).map((m: any) => ({
                id: m.id,
                name: m.medicationName || m.name,
                genericName: m.genericName,
                dose: m.dose,
                frequency: m.frequency,
                route: m.route,
                startDate: m.startDate,
                prescriber: m.prescriber,
                isActive: m.isActive !== false,
              }));
              state.conditions = (data.conditions || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                icdCode: c.icdCode,
                status: c.status?.toLowerCase() || 'active',
                onsetDate: c.onsetDate,
              }));
              state.insurance = data.insuranceId ? {
                insuranceId: data.insuranceId,
                insuranceName: data.insuranceName,
              } : null;
              state.isLoading = false;
              state.lastUpdated = new Date().toISOString();
            });
          } catch (error: any) {
            set(state => {
              state.isLoading = false;
              state.error = error.message;
            });
          }
        },
        
        loadEncounter: async (encounterId: string) => {
          set(state => { state.isLoading = true; });
          
          try {
            const response = await fetch(`/api/encounters/${encounterId}`);
            if (!response.ok) throw new Error('Failed to load encounter');
            
            const data = await response.json();
            
            set(state => {
              state.encounter = {
                encounterId: data.id,
                chiefComplaint: data.chiefComplaint || '',
                visitType: data.visitType || 'OFFICE_VISIT',
                scheduledAt: data.scheduledAt,
                startedAt: data.startedAt,
                providerId: data.providerId,
                providerName: data.provider?.name || 'Unknown Provider',
                location: data.location,
                roomNumber: data.roomNumber,
              };
              
              if (data.vitals && data.vitals.length > 0) {
                const latestVitals = data.vitals[0];
                state.vitals = {
                  bloodPressure: latestVitals.systolic ? {
                    systolic: latestVitals.systolic,
                    diastolic: latestVitals.diastolic,
                  } : undefined,
                  heartRate: latestVitals.heartRate,
                  temperature: latestVitals.temperature,
                  temperatureUnit: latestVitals.temperatureUnit || 'F',
                  respiratoryRate: latestVitals.respiratoryRate,
                  oxygenSaturation: latestVitals.oxygenSaturation,
                  weight: latestVitals.weight,
                  weightUnit: latestVitals.weightUnit || 'lbs',
                  painLevel: latestVitals.painLevel,
                  recordedAt: latestVitals.recordedAt,
                };
              }
              
              state.isLoading = false;
              state.lastUpdated = new Date().toISOString();
            });
            
            if (data.patientId) {
              await get().loadPatient(data.patientId);
            }
          } catch (error: any) {
            set(state => {
              state.isLoading = false;
              state.error = error.message;
            });
          }
        },
        
        loadFromAssessment: async (assessmentId: string) => {
          set(state => { state.isLoading = true; });
          
          try {
            const response = await fetch(`/api/assessments/${assessmentId}`);
            if (!response.ok) throw new Error('Failed to load assessment');
            
            const data = await response.json();
            
            set(state => {
              state.clinical = {
                symptoms: [],
                hpi: {
                  onset: data.hpiOnset,
                  location: data.hpiLocation,
                  duration: data.hpiDuration,
                  character: data.hpiCharacter,
                  severity: data.hpiSeverity,
                  timing: data.hpiTiming,
                  aggravatingFactors: parseJsonField(data.hpiAggravating, []),
                  relievingFactors: parseJsonField(data.hpiRelieving, []),
                  associatedSymptoms: parseJsonField(data.hpiAssociated, []),
                },
                redFlags: parseJsonField(data.redFlags, []),
                urgencyLevel: data.urgencyLevel?.toLowerCase() || 'standard',
                urgencyScore: data.urgencyScore || 0,
              };
              
              state.encounter = {
                encounterId: data.encounterId || '',
                chiefComplaint: data.chiefComplaint || '',
                visitType: 'ASSESSMENT',
                providerId: data.assignedProviderId || '',
                providerName: data.assignedProvider?.name || '',
              };
              
              state.medications = parseJsonField(data.medications, []).map((m: any, i: number) => ({
                id: `med-${i}`,
                name: typeof m === 'string' ? m : m.name,
                dose: typeof m === 'string' ? undefined : m.dose,
                frequency: typeof m === 'string' ? undefined : m.frequency,
                isActive: true,
              }));
              
              state.allergies = parseJsonField(data.allergies, []).map((a: any, i: number) => ({
                id: `allergy-${i}`,
                allergen: typeof a === 'string' ? a : a.allergen,
                reaction: typeof a === 'string' ? undefined : a.reaction,
                severity: 'moderate' as const,
                type: 'drug' as const,
              }));
              
              state.isLoading = false;
              state.lastUpdated = new Date().toISOString();
            });
            
            if (data.patientId) {
              await get().loadPatient(data.patientId);
            }
          } catch (error: any) {
            set(state => {
              state.isLoading = false;
              state.error = error.message;
            });
          }
        },
        
        // =====================================================================
        // Update Actions
        // =====================================================================
        
        updateVitals: (vitals: Partial<PatientVitals>) => {
          set(state => {
            state.vitals = { ...state.vitals, ...vitals } as PatientVitals;
            state.lastUpdated = new Date().toISOString();
          });
        },
        
        updateClinical: (clinical: Partial<ClinicalContext>) => {
          set(state => {
            state.clinical = { 
              ...state.clinical, 
              ...clinical,
              symptoms: clinical.symptoms || state.clinical?.symptoms || [],
              redFlags: clinical.redFlags || state.clinical?.redFlags || [],
              urgencyLevel: clinical.urgencyLevel || state.clinical?.urgencyLevel || 'standard',
              urgencyScore: clinical.urgencyScore ?? state.clinical?.urgencyScore ?? 0,
            };
            state.lastUpdated = new Date().toISOString();
          });
        },
        
        addRedFlag: (flag: string) => {
          set(state => {
            if (!state.clinical) {
              state.clinical = {
                symptoms: [],
                redFlags: [flag],
                urgencyLevel: 'high',
                urgencyScore: 50,
              };
            } else if (!state.clinical.redFlags.includes(flag)) {
              state.clinical.redFlags.push(flag);
              if (state.clinical.urgencyLevel === 'standard') {
                state.clinical.urgencyLevel = 'moderate';
              }
            }
          });
        },
        
        removeRedFlag: (flag: string) => {
          set(state => {
            if (state.clinical) {
              state.clinical.redFlags = state.clinical.redFlags.filter(f => f !== flag);
            }
          });
        },
        
        // =====================================================================
        // Computed Getters
        // =====================================================================
        
        getPatientDisplayName: () => {
          const d = get().demographics;
          if (!d) return 'Unknown Patient';
          return `${d.lastName}, ${d.firstName}`;
        },
        
        getPatientAge: () => {
          const d = get().demographics;
          return d?.age || 0;
        },
        
        getActiveAllergies: () => {
          return get().allergies.filter(a => a.severity !== 'mild');
        },
        
        getActiveMedications: () => {
          return get().medications.filter(m => m.isActive);
        },
        
        hasAllergy: (substance: string) => {
          const lower = substance.toLowerCase();
          return get().allergies.some(a => 
            a.allergen.toLowerCase().includes(lower)
          );
        },
        
        isPregnant: () => {
          return get().demographics?.pregnancyStatus === 'pregnant';
        },
        
        needsPregnancyTest: () => {
          const d = get().demographics;
          if (!d) return false;
          return (
            d.gender === 'female' &&
            d.age >= 12 &&
            d.age <= 55 &&
            d.pregnancyStatus !== 'not_pregnant'
          );
        },
        
        // =====================================================================
        // Get Context for AI Services
        // =====================================================================
        
        getPatientContext: (): PatientContextForAI => {
          const state = get();
          const d = state.demographics;
          
          return {
            patientId: d?.id || '',
            demographics: {
              age: d?.age || 0,
              gender: d?.gender || 'other',
              pregnancyStatus: d?.pregnancyStatus,
            },
            chiefComplaint: state.encounter?.chiefComplaint || '',
            symptoms: state.clinical?.symptoms || [],
            vitals: state.vitals ? {
              bloodPressure: state.vitals.bloodPressure,
              heartRate: state.vitals.heartRate,
              temperature: state.vitals.temperature,
              respiratoryRate: state.vitals.respiratoryRate,
              oxygenSaturation: state.vitals.oxygenSaturation,
              painLevel: state.vitals.painLevel,
            } : undefined,
            allergies: state.allergies.map(a => ({
              allergen: a.allergen,
              reaction: a.reaction,
              severity: a.severity,
            })),
            medications: state.getActiveMedications().map(m => ({
              name: m.name,
              dose: m.dose,
              frequency: m.frequency,
            })),
            medicalHistory: state.conditions
              .filter(c => c.status === 'active')
              .map(c => c.name),
            redFlags: state.clinical?.redFlags,
          };
        },
        
        // =====================================================================
        // Reset
        // =====================================================================
        
        reset: () => {
          set(initialState);
        },
      })),
      {
        name: 'patient-context-storage',
        partialize: (state) => ({
          demographics: state.demographics,
          vitals: state.vitals,
          allergies: state.allergies,
          medications: state.medications,
          conditions: state.conditions,
          encounter: state.encounter,
          clinical: state.clinical,
          insurance: state.insurance,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    { name: 'PatientContextStore' }
  )
);

// =============================================================================
// Hook for easy access in components
// =============================================================================

export function usePatientContext() {
  return usePatientContextStore(state => ({
    patient: state.demographics,
    vitals: state.vitals,
    allergies: state.allergies,
    medications: state.medications,
    conditions: state.conditions,
    encounter: state.encounter,
    clinical: state.clinical,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    loadPatient: state.loadPatient,
    loadEncounter: state.loadEncounter,
    loadFromAssessment: state.loadFromAssessment,
    updateVitals: state.updateVitals,
    addRedFlag: state.addRedFlag,
    reset: state.reset,
    
    // Computed
    displayName: state.getPatientDisplayName(),
    age: state.getPatientAge(),
    hasAllergy: state.hasAllergy,
    isPregnant: state.isPregnant,
    needsPregnancyTest: state.needsPregnancyTest,
    getPatientContext: state.getPatientContext,
  }));
}
