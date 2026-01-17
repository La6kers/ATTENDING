// ============================================================
// Referral Ordering Store - Refactored
// apps/provider-portal/store/referralOrderingStore.ts
//
// REFACTORED: Uses shared catalogs and recommendation service
// Reduced from ~550 lines to ~280 lines
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import from shared catalogs
import {
  SPECIALTY_CATALOG,
  PROVIDER_DIRECTORY,
  getSpecialty,
  getAllSpecialties,
  searchSpecialties,
  getProvidersBySpecialty,
  generateReferralRecommendations,
  type Specialty,
  type SpecialtyCategory,
  type ReferralProvider,
  type ReferralRecommendation,
  type ReferralUrgency,
} from '@attending/shared/catalogs';

// =============================================================================
// Re-export types for backward compatibility
// =============================================================================
export type { Specialty, ReferralProvider, ReferralRecommendation, ReferralUrgency, SpecialtyCategory };
export { SPECIALTY_CATALOG, PROVIDER_DIRECTORY };

// =============================================================================
// Store-specific Types
// =============================================================================

export interface PatientContext {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
  primaryDiagnosis?: string;
  allergies: string[] | Array<{ allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }>;
  insurancePlan?: string;
  pcp?: string;
  redFlags: string[];
  currentMedications?: string[];
  medicalHistory?: string[];
}

export interface SelectedReferral {
  specialty: Specialty;
  urgency: ReferralUrgency;
  preferredProvider?: ReferralProvider;
  clinicalQuestion: string;
  relevantHistory: string;
  attachedDocuments: string[];
  priorAuthRequired: boolean;
  priorAuthStatus?: 'pending' | 'approved' | 'denied';
  aiRecommended?: boolean;
}

// =============================================================================
// Store State Interface
// =============================================================================

interface ReferralOrderingState {
  // Catalog State
  specialtyCatalog: Specialty[];
  providerDirectory: ReferralProvider[];
  searchQuery: string;
  categoryFilter: 'all' | SpecialtyCategory;
  
  // Selection State
  selectedReferrals: Map<string, SelectedReferral>;
  defaultUrgency: ReferralUrgency;
  
  // AI Integration
  aiRecommendations: ReferralRecommendation[];
  loadingRecommendations: boolean;
  patientContext: PatientContext | null;
  
  // Provider Search
  selectedSpecialtyForProviders: string | null;
  filteredProviders: ReferralProvider[];
  
  // Workflow State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedReferralIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  generateAIRecommendations: () => Promise<void>;
  loadCatalogs: () => Promise<void>;
  loadAIRecommendations: (patientId: string, context: PatientContext) => Promise<void>;
  searchProviders: (specialty: string, insurance?: string) => void;
  
  addReferral: (specialty: Specialty, urgency?: ReferralUrgency) => void;
  updateReferral: (code: string, updates: Partial<SelectedReferral>) => void;
  removeReferral: (code: string) => void;
  setPreferredProvider: (specialtyCode: string, provider: ReferralProvider) => void;
  
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: ReferralOrderingState['categoryFilter']) => void;
  setDefaultUrgency: (urgency: ReferralUrgency) => void;
  
  submitReferrals: (encounterId: string) => Promise<string[]>;
  submitReferral: (encounterId: string) => Promise<string[]>; // Alias for submitReferrals
  clearOrder: () => void;
  clearReferral: () => void; // Alias for clearOrder
  
  // Computed Helpers
  getSelectedReferralsArray: () => SelectedReferral[];
  getFilteredCatalog: () => Specialty[];
  getStatCount: () => number;
  getAuthRequiredCount: () => number;
  hasRedFlagReferrals: () => boolean;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useReferralOrderingStore = create<ReferralOrderingState>()(
  devtools(
    immer((set, get) => ({
      // Initial State - Uses shared catalogs
      specialtyCatalog: getAllSpecialties(),
      providerDirectory: PROVIDER_DIRECTORY,
      searchQuery: '',
      categoryFilter: 'all',
      selectedReferrals: new Map(),
      defaultUrgency: 'ROUTINE',
      aiRecommendations: [],
      loadingRecommendations: false,
      patientContext: null,
      selectedSpecialtyForProviders: null,
      filteredProviders: [],
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedReferralIds: [],

      // Set patient context directly
      setPatientContext: (context: PatientContext) => {
        set(state => {
          state.patientContext = context;
        });
      },

      // Generate AI recommendations using current patient context
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;
        
        set(state => { state.loadingRecommendations = true; });
        
        try {
          const response = await fetch('/api/referrals/ai-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId: patientContext.id, context: patientContext })
          });

          if (!response.ok) {
            // Use shared fallback generator
            const fallbackRecs = generateReferralRecommendations({
              chiefComplaint: patientContext.chiefComplaint,
              redFlags: patientContext.redFlags,
              insurancePlan: patientContext.insurancePlan || ''
            });
            set(state => {
              state.aiRecommendations = fallbackRecs;
              state.loadingRecommendations = false;
            });
            return;
          }

          const recommendations = await response.json();
          set(state => {
            state.aiRecommendations = recommendations;
            state.loadingRecommendations = false;
          });
        } catch (error) {
          // Fallback to shared generator
          const fallbackRecs = generateReferralRecommendations({
            chiefComplaint: patientContext.chiefComplaint,
            redFlags: patientContext.redFlags,
            insurancePlan: patientContext.insurancePlan || ''
          });
          set(state => {
            state.aiRecommendations = fallbackRecs;
            state.loadingRecommendations = false;
          });
        }
      },

      // Load catalogs (refreshes from shared)
      loadCatalogs: async () => {
        set(state => { state.loading = true; });
        try {
          set(state => {
            state.specialtyCatalog = getAllSpecialties();
            state.providerDirectory = PROVIDER_DIRECTORY;
            state.loading = false;
          });
        } catch (error) {
          set(state => {
            state.error = 'Failed to load specialty catalog';
            state.loading = false;
          });
        }
      },

      // Load AI recommendations
      loadAIRecommendations: async (patientId: string, context: PatientContext) => {
        set(state => {
          state.loadingRecommendations = true;
          state.patientContext = context;
        });

        try {
          const response = await fetch('/api/referrals/ai-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId, context })
          });

          if (!response.ok) {
            // Use shared fallback generator
            const fallbackRecs = generateReferralRecommendations({
              chiefComplaint: context.chiefComplaint,
              redFlags: context.redFlags,
              insurancePlan: context.insurancePlan || ''
            });
            set(state => {
              state.aiRecommendations = fallbackRecs;
              state.loadingRecommendations = false;
            });
            return;
          }

          const recommendations = await response.json();
          set(state => {
            state.aiRecommendations = recommendations;
            state.loadingRecommendations = false;
          });
        } catch (error) {
          // Fallback to shared generator
          const fallbackRecs = generateReferralRecommendations({
            chiefComplaint: context.chiefComplaint,
            redFlags: context.redFlags,
            insurancePlan: context.insurancePlan || ''
          });
          set(state => {
            state.aiRecommendations = fallbackRecs;
            state.loadingRecommendations = false;
          });
        }
      },

      // Search providers using shared function
      searchProviders: (specialty: string, insurance?: string) => {
        set(state => {
          state.selectedSpecialtyForProviders = specialty;
          state.filteredProviders = getProvidersBySpecialty(specialty, insurance);
        });
      },

      // Add a referral
      addReferral: (specialty: Specialty, urgency?: ReferralUrgency) => {
        const aiRec = get().aiRecommendations.find(r => r.specialty === specialty.code);
        set(state => {
          state.selectedReferrals.set(specialty.code, {
            specialty,
            urgency: urgency || aiRec?.urgency || state.defaultUrgency,
            clinicalQuestion: aiRec?.clinicalQuestion || '',
            relevantHistory: '',
            attachedDocuments: [],
            priorAuthRequired: specialty.requiresAuth,
            aiRecommended: !!aiRec
          });
        });
      },

      // Update referral details
      updateReferral: (code: string, updates: Partial<SelectedReferral>) => {
        set(state => {
          const existing = state.selectedReferrals.get(code);
          if (existing) {
            state.selectedReferrals.set(code, { ...existing, ...updates });
          }
        });
      },

      // Remove referral
      removeReferral: (code: string) => {
        set(state => {
          state.selectedReferrals.delete(code);
        });
      },

      // Set preferred provider
      setPreferredProvider: (specialtyCode: string, provider: ReferralProvider) => {
        set(state => {
          const ref = state.selectedReferrals.get(specialtyCode);
          if (ref) {
            ref.preferredProvider = provider;
          }
        });
      },

      // Filters
      setSearchQuery: (query: string) => set(state => { state.searchQuery = query; }),
      setCategoryFilter: (filter) => set(state => { state.categoryFilter = filter; }),
      setDefaultUrgency: (urgency) => set(state => { state.defaultUrgency = urgency; }),

      // Submit referrals
      submitReferrals: async (encounterId: string) => {
        set(state => { state.submitting = true; state.error = null; });
        
        try {
          const { selectedReferrals, patientContext } = get();
          const referralIds: string[] = [];

          for (const [code, referral] of selectedReferrals) {
            const response = await fetch('/api/referrals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                encounterId,
                patientId: patientContext?.id,
                specialty: referral.specialty.code,
                specialtyName: referral.specialty.name,
                urgency: referral.urgency,
                preferredProviderId: referral.preferredProvider?.id,
                clinicalQuestion: referral.clinicalQuestion,
                relevantHistory: referral.relevantHistory,
                attachedDocuments: referral.attachedDocuments,
                priorAuthRequired: referral.priorAuthRequired
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to submit referral');
            }

            const result = await response.json();
            referralIds.push(result.id);
          }

          set(state => {
            state.submitting = false;
            state.lastSubmittedReferralIds = referralIds;
          });

          get().clearOrder();
          return referralIds;
        } catch (error) {
          set(state => {
            state.submitting = false;
            state.error = error instanceof Error ? error.message : 'Failed to submit referrals';
          });
          throw error;
        }
      },

      // Clear order
      clearOrder: () => set(state => {
        state.selectedReferrals = new Map();
        state.aiRecommendations = [];
        state.patientContext = null;
        state.error = null;
      }),

      // Alias for clearOrder (for consistency with useClinicalOrders hook)
      clearReferral: () => get().clearOrder(),

      // Alias for submitReferrals (for consistency with useClinicalOrders hook)
      submitReferral: async (encounterId: string) => get().submitReferrals(encounterId),

      // Computed helpers using shared search
      getSelectedReferralsArray: () => Array.from(get().selectedReferrals.values()),

      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter, specialtyCatalog } = get();
        let results = searchQuery ? searchSpecialties(searchQuery) : specialtyCatalog;
        if (categoryFilter !== 'all') {
          results = results.filter(spec => spec.category === categoryFilter);
        }
        return results;
      },

      getStatCount: () => {
        return get().getSelectedReferralsArray().filter(r => r.urgency === 'STAT').length;
      },

      getAuthRequiredCount: () => {
        return get().getSelectedReferralsArray().filter(r => r.priorAuthRequired).length;
      },

      hasRedFlagReferrals: () => {
        const { aiRecommendations, selectedReferrals } = get();
        return aiRecommendations.some(rec => 
          rec.redFlagRelated && selectedReferrals.has(rec.specialty)
        );
      }
    })),
    { name: 'referral-ordering-store' }
  )
);

export default useReferralOrderingStore;
