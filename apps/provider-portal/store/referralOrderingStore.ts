// ============================================================
// Referral Ordering Store — REFACTORED
// apps/provider-portal/store/referralOrderingStore.ts
//
// CHANGES:
//   • Map → Record (JSON-serializable)
//   • Removed method aliases (submitReferral → submitReferrals, clearReferral → clearOrder)
//   • Uses OrderingContext (with PatientContext backward compat)
//   • Deduplicated generateAIRecommendations / loadAIRecommendations
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  type OrderingContext,
  type PatientContext,
} from '@attending/shared/catalogs';

// =============================================================================
// Re-exports
// =============================================================================
export type { Specialty, ReferralProvider, ReferralRecommendation, ReferralUrgency, SpecialtyCategory, OrderingContext, PatientContext };
export { SPECIALTY_CATALOG, PROVIDER_DIRECTORY };

// =============================================================================
// Types
// =============================================================================

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
// Store Interface
// =============================================================================

interface ReferralOrderingState {
  specialtyCatalog: Specialty[];
  providerDirectory: ReferralProvider[];
  searchQuery: string;
  categoryFilter: 'all' | SpecialtyCategory;
  selectedReferrals: Record<string, SelectedReferral>;  // ← was Map
  defaultUrgency: ReferralUrgency;
  aiRecommendations: ReferralRecommendation[];
  loadingRecommendations: boolean;
  patientContext: OrderingContext | null;
  selectedSpecialtyForProviders: string | null;
  filteredProviders: ReferralProvider[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedReferralIds: string[];

  // Actions
  setPatientContext: (context: OrderingContext) => void;
  generateAIRecommendations: () => Promise<void>;
  loadCatalogs: () => void;
  searchProviders: (specialty: string, insurance?: string) => void;
  addReferral: (specialty: Specialty, urgency?: ReferralUrgency) => void;
  updateReferral: (code: string, updates: Partial<SelectedReferral>) => void;
  removeReferral: (code: string) => void;
  setPreferredProvider: (specialtyCode: string, provider: ReferralProvider) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (filter: 'all' | SpecialtyCategory) => void;
  setDefaultUrgency: (urgency: ReferralUrgency) => void;
  resetFilters: () => void;
  submitReferrals: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;

  // Computed
  getSelectedReferralsArray: () => SelectedReferral[];
  getFilteredCatalog: () => Specialty[];
  getStatCount: () => number;
  getAuthRequiredCount: () => number;
  hasRedFlagReferrals: () => boolean;
}

// =============================================================================
// Store
// =============================================================================

export const useReferralOrderingStore = create<ReferralOrderingState>()(
  devtools(
    immer((set, get) => ({
      specialtyCatalog: getAllSpecialties(),
      providerDirectory: PROVIDER_DIRECTORY,
      searchQuery: '',
      categoryFilter: 'all' as 'all' | SpecialtyCategory,
      selectedReferrals: {} as Record<string, SelectedReferral>,
      defaultUrgency: 'ROUTINE' as ReferralUrgency,
      aiRecommendations: [],
      loadingRecommendations: false,
      patientContext: null,
      selectedSpecialtyForProviders: null,
      filteredProviders: [],
      loading: false,
      submitting: false,
      error: null,
      lastSubmittedReferralIds: [],

      setPatientContext: (context) => {
        set(state => { state.patientContext = context; });
      },

      // Unified recommendation generation (was duplicated as loadAIRecommendations)
      generateAIRecommendations: async () => {
        const { patientContext } = get();
        if (!patientContext) return;

        set(state => { state.loadingRecommendations = true; });

        try {
          const response = await fetch('/api/referrals/ai-recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId: patientContext.id, context: patientContext }),
          });

          if (response.ok) {
            const recommendations = await response.json();
            set(state => { state.aiRecommendations = recommendations; state.loadingRecommendations = false; });
            return;
          }
        } catch { /* fallthrough to local generator */ }

        // Fallback: synchronous local generator
        const fallbackRecs = generateReferralRecommendations({
          chiefComplaint: patientContext.chiefComplaint,
          redFlags: patientContext.redFlags,
          insurancePlan: patientContext.insurancePlan || '',
        });
        set(state => { state.aiRecommendations = fallbackRecs; state.loadingRecommendations = false; });
      },

      loadCatalogs: () => {
        set(state => {
          state.specialtyCatalog = getAllSpecialties();
          state.providerDirectory = PROVIDER_DIRECTORY;
        });
      },

      searchProviders: (specialty, insurance) => {
        set(state => {
          state.selectedSpecialtyForProviders = specialty;
          state.filteredProviders = getProvidersBySpecialty(specialty, insurance);
        });
      },

      addReferral: (specialty, urgency) => {
        const aiRec = get().aiRecommendations.find(r => r.specialty === specialty.code);
        set(state => {
          state.selectedReferrals[specialty.code] = {
            specialty,
            urgency: urgency || aiRec?.urgency || state.defaultUrgency,
            clinicalQuestion: aiRec?.clinicalQuestion || '',
            relevantHistory: '',
            attachedDocuments: [],
            priorAuthRequired: specialty.requiresAuth,
            aiRecommended: !!aiRec,
          };
        });
      },

      updateReferral: (code, updates) => {
        set(state => {
          if (state.selectedReferrals[code]) {
            state.selectedReferrals[code] = { ...state.selectedReferrals[code], ...updates };
          }
        });
      },

      removeReferral: (code) => {
        set(state => { delete state.selectedReferrals[code]; });
      },

      setPreferredProvider: (specialtyCode, provider) => {
        set(state => {
          if (state.selectedReferrals[specialtyCode]) {
            state.selectedReferrals[specialtyCode].preferredProvider = provider;
          }
        });
      },

      setSearchQuery: (query) => set(state => { state.searchQuery = query; }),
      setCategoryFilter: (filter) => set(state => { state.categoryFilter = filter; }),
      setDefaultUrgency: (urgency) => set(state => { state.defaultUrgency = urgency; }),
      resetFilters: () => set(state => { state.searchQuery = ''; state.categoryFilter = 'all'; }),

      submitReferrals: async (encounterId) => {
        set(state => { state.submitting = true; state.error = null; });

        const { selectedReferrals, patientContext } = get();
        const referralIds: string[] = [];
        const failedCodes: string[] = [];
        let lastError: string | null = null;

        for (const [code, referral] of Object.entries(selectedReferrals)) {
          try {
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
                priorAuthRequired: referral.priorAuthRequired,
              }),
            });

            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || 'Failed to submit referral');
            }
            const result = await response.json();
            referralIds.push(result.id);
            // Remove successfully submitted item
            set(state => { delete state.selectedReferrals[code]; });
          } catch (err) {
            failedCodes.push(code);
            lastError = err instanceof Error ? err.message : 'Failed to submit referral';
          }
        }

        set(state => {
          state.submitting = false;
          state.lastSubmittedReferralIds = referralIds;
          if (failedCodes.length > 0) {
            state.error = `${referralIds.length} submitted, ${failedCodes.length} failed: ${lastError}`;
          }
        });

        // Only full-clear if everything succeeded
        if (failedCodes.length === 0) get().clearOrder();

        if (failedCodes.length > 0 && referralIds.length === 0) {
          throw new Error(lastError || 'All referrals failed');
        }

        return referralIds;
      },

      clearOrder: () => set(state => {
        state.selectedReferrals = {};
        state.aiRecommendations = [];
        // NOTE: Do NOT clear patientContext here — it should outlive
        // individual orders. The patient context is shared across all
        // ordering stores and cleared only via reset or page navigation.
        state.error = null;
        state.searchQuery = '';
        state.categoryFilter = 'all';
      }),

      // Computed
      getSelectedReferralsArray: () => Object.values(get().selectedReferrals),
      getFilteredCatalog: () => {
        const { searchQuery, categoryFilter, specialtyCatalog } = get();
        let results = searchQuery ? searchSpecialties(searchQuery) : specialtyCatalog;
        if (categoryFilter !== 'all') results = results.filter(s => s.category === categoryFilter);
        return results;
      },
      getStatCount: () => Object.values(get().selectedReferrals).filter(r => r.urgency === 'STAT').length,
      getAuthRequiredCount: () => Object.values(get().selectedReferrals).filter(r => r.priorAuthRequired).length,
      hasRedFlagReferrals: () => {
        const { aiRecommendations, selectedReferrals } = get();
        return aiRecommendations.some(rec => rec.redFlagRelated && selectedReferrals[rec.specialty]);
      },
    })),
    { name: 'referral-ordering-store' }
  )
);

export default useReferralOrderingStore;
