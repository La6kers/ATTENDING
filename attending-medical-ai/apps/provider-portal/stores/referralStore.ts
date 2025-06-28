/**
 * Referral state management using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Referral,
  CreateReferralRequest,
  UpdateReferralRequest,
  ReferralFilters,
  ReferralSort,
  ReferralStatus,
  ReferralUrgency,
  SpecialtyType,
  Provider,
  AIReferralRecommendation,
  ReferralAnalytics,
  ReferralTemplate,
  ReferralAppeal,
  ProviderSearchCriteria,
  ProviderSearchResult,
  ReferralAction,
  ReferralActionResult,
} from '../types/referral.types';

interface ReferralState {
  // Core data
  referrals: Referral[];
  selectedReferral: Referral | null;
  providers: Provider[];
  aiRecommendations: AIReferralRecommendation[];
  templates: ReferralTemplate[];
  appeals: ReferralAppeal[];
  analytics: ReferralAnalytics | null;
  
  // Provider search
  providerSearchResults: ProviderSearchResult | null;
  searchCriteria: ProviderSearchCriteria | null;
  
  // UI state
  expandedCards: Set<string>;
  filters: ReferralFilters;
  sort: ReferralSort;
  searchQuery: string;
  
  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isPreviewModalOpen: boolean;
  isProviderSearchModalOpen: boolean;
  isAppealModalOpen: boolean;
  editingReferral: Referral | null;
  previewingReferral: Referral | null;
  appealingReferral: Referral | null;
  
  // Loading and error states
  isLoading: boolean;
  isSubmitting: boolean;
  isSearchingProviders: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions - Core CRUD
  setReferrals: (referrals: Referral[]) => void;
  addReferral: (referral: Referral) => void;
  updateReferral: (id: string, updates: Partial<Referral>) => void;
  removeReferral: (id: string) => void;
  
  // Actions - Selection and expansion
  selectReferral: (referral: Referral | null) => void;
  toggleCardExpansion: (referralId: string) => void;
  expandAllCards: () => void;
  collapseAllCards: () => void;
  
  // Actions - Filtering and sorting
  setFilters: (filters: Partial<ReferralFilters>) => void;
  clearFilters: () => void;
  setSort: (sort: ReferralSort) => void;
  setSearchQuery: (query: string) => void;
  
  // Actions - Referral operations
  createReferral: (request: CreateReferralRequest) => Promise<ReferralActionResult>;
  submitReferral: (referralId: string) => Promise<ReferralActionResult>;
  updateReferralStatus: (referralId: string, status: ReferralStatus) => Promise<ReferralActionResult>;
  cancelReferral: (referralId: string, reason?: string) => Promise<ReferralActionResult>;
  duplicateReferral: (referralId: string) => Promise<ReferralActionResult>;
  
  // Actions - Provider management
  setProviders: (providers: Provider[]) => void;
  searchProviders: (criteria: ProviderSearchCriteria) => Promise<void>;
  clearProviderSearch: () => void;
  
  // Actions - AI recommendations
  setAIRecommendations: (recommendations: AIReferralRecommendation[]) => void;
  generateAIRecommendation: (patientData: any) => Promise<AIReferralRecommendation>;
  
  // Actions - Templates
  setTemplates: (templates: ReferralTemplate[]) => void;
  createTemplate: (template: Omit<ReferralTemplate, 'id' | 'createdAt' | 'usageCount'>) => void;
  useTemplate: (templateId: string) => CreateReferralRequest | null;
  
  // Actions - Appeals
  setAppeals: (appeals: ReferralAppeal[]) => void;
  createAppeal: (referralId: string, reason: string) => Promise<ReferralActionResult>;
  updateAppealStatus: (appealId: string, status: ReferralAppeal['status']) => void;
  
  // Actions - Analytics
  setAnalytics: (analytics: ReferralAnalytics) => void;
  refreshAnalytics: () => Promise<void>;
  
  // Actions - Modal management
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (referral: Referral) => void;
  closeEditModal: () => void;
  openPreviewModal: (referral: Referral) => void;
  closePreviewModal: () => void;
  openProviderSearchModal: () => void;
  closeProviderSearchModal: () => void;
  openAppealModal: (referral: Referral) => void;
  closeAppealModal: () => void;
  
  // Actions - Loading states
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  setSearchingProviders: (searching: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Utility
  refresh: () => Promise<void>;
  reset: () => void;
  
  // Computed getters
  getFilteredReferrals: () => Referral[];
  getSortedReferrals: (referrals: Referral[]) => Referral[];
  getReferralById: (id: string) => Referral | undefined;
  getReferralsByStatus: (status: ReferralStatus) => Referral[];
  getReferralsByUrgency: (urgency: ReferralUrgency) => Referral[];
  getReferralsBySpecialty: (specialty: SpecialtyType) => Referral[];
  getUrgentReferrals: () => Referral[];
  getPendingReferrals: () => Referral[];
  getOverdueReferrals: () => Referral[];
  getProviderById: (id: string) => Provider | undefined;
  getRecommendationsForReferral: (referralId: string) => AIReferralRecommendation[];
  getAppealsForReferral: (referralId: string) => ReferralAppeal[];
}

const initialFilters: ReferralFilters = {
  status: undefined,
  urgency: undefined,
  specialty: undefined,
  dateRange: undefined,
  providerId: undefined,
  patientId: undefined,
  needsAuthorization: undefined,
  overdue: undefined,
  searchQuery: undefined,
};

const initialSort: ReferralSort = {
  field: 'createdAt',
  direction: 'desc',
};

const initialAnalytics: ReferralAnalytics = {
  totalReferrals: 0,
  pendingReferrals: 0,
  approvedReferrals: 0,
  deniedReferrals: 0,
  completedReferrals: 0,
  averageProcessingTime: 0,
  averageWaitTime: 0,
  approvalRate: 0,
  urgentReferrals: 0,
  bySpecialty: {} as Record<SpecialtyType, number>,
  byStatus: {} as Record<ReferralStatus, number>,
  byUrgency: {} as Record<ReferralUrgency, number>,
  monthlyTrends: [],
};

export const useReferralStore = create<ReferralState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        referrals: [],
        selectedReferral: null,
        providers: [],
        aiRecommendations: [],
        templates: [],
        appeals: [],
        analytics: initialAnalytics,
        
        providerSearchResults: null,
        searchCriteria: null,
        
        expandedCards: new Set(),
        filters: initialFilters,
        sort: initialSort,
        searchQuery: '',
        
        isCreateModalOpen: false,
        isEditModalOpen: false,
        isPreviewModalOpen: false,
        isProviderSearchModalOpen: false,
        isAppealModalOpen: false,
        editingReferral: null,
        previewingReferral: null,
        appealingReferral: null,
        
        isLoading: false,
        isSubmitting: false,
        isSearchingProviders: false,
        error: null,
        lastUpdated: null,
        
        // Core CRUD actions
        setReferrals: (referrals) =>
          set((state) => {
            state.referrals = referrals;
            state.lastUpdated = new Date();
            state.error = null;
          }),
        
        addReferral: (referral) =>
          set((state) => {
            state.referrals.unshift(referral); // Add to beginning for newest first
            state.lastUpdated = new Date();
          }),
        
        updateReferral: (id, updates) =>
          set((state) => {
            const index = state.referrals.findIndex((ref) => ref.id === id);
            if (index !== -1) {
              state.referrals[index] = { ...state.referrals[index], ...updates, updatedAt: new Date() };
              state.lastUpdated = new Date();
            }
          }),
        
        removeReferral: (id) =>
          set((state) => {
            state.referrals = state.referrals.filter((ref) => ref.id !== id);
            if (state.selectedReferral?.id === id) {
              state.selectedReferral = null;
            }
            state.expandedCards.delete(id);
            state.lastUpdated = new Date();
          }),
        
        // Selection and expansion
        selectReferral: (referral) =>
          set((state) => {
            state.selectedReferral = referral;
          }),
        
        toggleCardExpansion: (referralId) =>
          set((state) => {
            if (state.expandedCards.has(referralId)) {
              state.expandedCards.delete(referralId);
            } else {
              state.expandedCards.add(referralId);
            }
          }),
        
        expandAllCards: () =>
          set((state) => {
            state.referrals.forEach((ref) => state.expandedCards.add(ref.id));
          }),
        
        collapseAllCards: () =>
          set((state) => {
            state.expandedCards.clear();
          }),
        
        // Filtering and sorting
        setFilters: (newFilters) =>
          set((state) => {
            state.filters = { ...state.filters, ...newFilters };
          }),
        
        clearFilters: () =>
          set((state) => {
            state.filters = initialFilters;
            state.searchQuery = '';
          }),
        
        setSort: (sort) =>
          set((state) => {
            state.sort = sort;
          }),
        
        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query;
            state.filters.searchQuery = query;
          }),
        
        // Referral operations
        createReferral: async (request) => {
          const { setSubmitting, setError, addReferral } = get();
          try {
            setSubmitting(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            const newReferral: Referral = {
              id: `ref-${Date.now()}`,
              patientId: request.patientId,
              providerId: request.preferredProviderId || '',
              requestingProviderId: 'current-provider', // Would come from auth context
              specialty: request.specialty,
              subspecialty: request.subspecialty,
              urgency: request.urgency,
              status: 'draft',
              preferredProvider: undefined,
              assignedProvider: undefined,
              alternativeProviders: [],
              clinicalJustification: {
                primaryDiagnosis: request.primaryDiagnosis,
                icdCodes: request.icdCodes || [],
                symptoms: request.symptoms || [],
                redFlags: request.redFlags || [],
                clinicalReason: request.clinicalReason,
                supportingDocumentation: request.supportingDocumentation || [],
              },
              insurance: {
                id: `ins-${Date.now()}`,
                status: 'pending',
                priorAuthRequired: true,
                referralRequired: true,
              },
              patientNotified: false,
              providerNotified: false,
              notifications: [],
              attachments: [],
              notes: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'current-user',
              updatedBy: 'current-user',
            };
            
            addReferral(newReferral);
            
            return {
              success: true,
              message: 'Referral created successfully',
              referralId: newReferral.id,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create referral';
            setError(errorMessage);
            return {
              success: false,
              message: errorMessage,
              errors: [errorMessage],
            };
          } finally {
            setSubmitting(false);
          }
        },
        
        submitReferral: async (referralId) => {
          const { setSubmitting, setError, updateReferral } = get();
          try {
            setSubmitting(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));
            
            updateReferral(referralId, {
              status: 'submitted',
              submittedAt: new Date(),
              providerNotified: true,
            });
            
            return {
              success: true,
              message: 'Referral submitted successfully',
              referralId,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to submit referral';
            setError(errorMessage);
            return {
              success: false,
              message: errorMessage,
              errors: [errorMessage],
            };
          } finally {
            setSubmitting(false);
          }
        },
        
        updateReferralStatus: async (referralId, status) => {
          const { setSubmitting, setError, updateReferral } = get();
          try {
            setSubmitting(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            const updates: Partial<Referral> = { status };
            
            // Add timestamp based on status
            switch (status) {
              case 'approved':
                updates.authorizedAt = new Date();
                break;
              case 'scheduled':
                updates.scheduledAt = new Date();
                break;
              case 'completed':
                updates.completedAt = new Date();
                break;
              case 'cancelled':
                updates.cancelledAt = new Date();
                break;
            }
            
            updateReferral(referralId, updates);
            
            return {
              success: true,
              message: `Referral status updated to ${status}`,
              referralId,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update referral status';
            setError(errorMessage);
            return {
              success: false,
              message: errorMessage,
              errors: [errorMessage],
            };
          } finally {
            setSubmitting(false);
          }
        },
        
        cancelReferral: async (referralId, reason) => {
          const { updateReferralStatus } = get();
          const result = await updateReferralStatus(referralId, 'cancelled');
          
          if (result.success && reason) {
            // Add cancellation note
            // This would typically be handled by the API
          }
          
          return result;
        },
        
        duplicateReferral: async (referralId) => {
          const { getReferralById, createReferral } = get();
          const originalReferral = getReferralById(referralId);
          
          if (!originalReferral) {
            return {
              success: false,
              message: 'Original referral not found',
              errors: ['Referral not found'],
            };
          }
          
          const duplicateRequest: CreateReferralRequest = {
            patientId: originalReferral.patientId,
            specialty: originalReferral.specialty,
            subspecialty: originalReferral.subspecialty,
            urgency: originalReferral.urgency,
            preferredProviderId: originalReferral.preferredProvider?.id,
            clinicalReason: originalReferral.clinicalJustification.clinicalReason,
            primaryDiagnosis: originalReferral.clinicalJustification.primaryDiagnosis,
            icdCodes: originalReferral.clinicalJustification.icdCodes,
            symptoms: originalReferral.clinicalJustification.symptoms,
            redFlags: originalReferral.clinicalJustification.redFlags,
            supportingDocumentation: originalReferral.clinicalJustification.supportingDocumentation,
          };
          
          return await createReferral(duplicateRequest);
        },
        
        // Provider management
        setProviders: (providers) =>
          set((state) => {
            state.providers = providers;
          }),
        
        searchProviders: async (criteria) => {
          const { setSearchingProviders, setError } = get();
          try {
            setSearchingProviders(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            // Mock search results
            const mockResults: ProviderSearchResult = {
              providers: [],
              totalFound: 0,
              searchCriteria: criteria,
              searchRadius: criteria.location?.radius || 25,
            };
            
            set((state) => {
              state.providerSearchResults = mockResults;
              state.searchCriteria = criteria;
            });
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Provider search failed');
          } finally {
            setSearchingProviders(false);
          }
        },
        
        clearProviderSearch: () =>
          set((state) => {
            state.providerSearchResults = null;
            state.searchCriteria = null;
          }),
        
        // AI recommendations
        setAIRecommendations: (recommendations) =>
          set((state) => {
            state.aiRecommendations = recommendations;
          }),
        
        generateAIRecommendation: async (patientData) => {
          // Simulate AI recommendation generation
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
          const recommendation: AIReferralRecommendation = {
            id: `ai-rec-${Date.now()}`,
            confidence: 0.85,
            reasoning: 'Based on patient symptoms and clinical presentation',
            suggestedSpecialty: 'cardiology',
            suggestedUrgency: 'priority',
            clinicalIndicators: ['Chest pain', 'Elevated blood pressure'],
            riskFactors: ['Family history', 'Smoking'],
            recommendedProviders: [],
          };
          
          set((state) => {
            state.aiRecommendations.push(recommendation);
          });
          
          return recommendation;
        },
        
        // Templates
        setTemplates: (templates) =>
          set((state) => {
            state.templates = templates;
          }),
        
        createTemplate: (template) =>
          set((state) => {
            const newTemplate: ReferralTemplate = {
              ...template,
              id: `template-${Date.now()}`,
              createdAt: new Date(),
              usageCount: 0,
            };
            state.templates.push(newTemplate);
          }),
        
        useTemplate: (templateId) => {
          const { templates } = get();
          const template = templates.find((t) => t.id === templateId);
          
          if (!template) return null;
          
          // Increment usage count
          set((state) => {
            const templateIndex = state.templates.findIndex((t) => t.id === templateId);
            if (templateIndex !== -1) {
              state.templates[templateIndex].usageCount++;
            }
          });
          
          return {
            patientId: '', // Would be filled from context
            specialty: template.specialty,
            subspecialty: template.subspecialty,
            urgency: template.defaultUrgency,
            clinicalReason: template.clinicalReasonTemplate,
            primaryDiagnosis: '',
            icdCodes: template.icdCodes,
          };
        },
        
        // Appeals
        setAppeals: (appeals) =>
          set((state) => {
            state.appeals = appeals;
          }),
        
        createAppeal: async (referralId, reason) => {
          const { setSubmitting, setError } = get();
          try {
            setSubmitting(true);
            setError(null);
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            const newAppeal: ReferralAppeal = {
              id: `appeal-${Date.now()}`,
              referralId,
              reason,
              status: 'pending',
              submittedAt: new Date(),
              submittedBy: 'current-user',
              supportingDocuments: [],
              timeline: [{
                id: `timeline-${Date.now()}`,
                type: 'submitted',
                description: 'Appeal submitted for review',
                occurredAt: new Date(),
                performedBy: 'current-user',
              }],
            };
            
            set((state) => {
              state.appeals.push(newAppeal);
            });
            
            return {
              success: true,
              message: 'Appeal submitted successfully',
              referralId,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create appeal';
            setError(errorMessage);
            return {
              success: false,
              message: errorMessage,
              errors: [errorMessage],
            };
          } finally {
            setSubmitting(false);
          }
        },
        
        updateAppealStatus: (appealId, status) =>
          set((state) => {
            const appeal = state.appeals.find((a) => a.id === appealId);
            if (appeal) {
              appeal.status = status;
              appeal.timeline.push({
                id: `timeline-${Date.now()}`,
                type: status === 'approved' ? 'decision-made' : 'under-review',
                description: `Appeal status changed to ${status}`,
                occurredAt: new Date(),
                performedBy: 'system',
              });
            }
          }),
        
        // Analytics
        setAnalytics: (analytics) =>
          set((state) => {
            state.analytics = analytics;
          }),
        
        refreshAnalytics: async () => {
          const { setLoading, setError, referrals } = get();
          try {
            setLoading(true);
            setError(null);
            
            // Calculate analytics from current referrals
            const analytics = calculateAnalytics(referrals);
            
            set((state) => {
              state.analytics = analytics;
            });
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh analytics');
          } finally {
            setLoading(false);
          }
        },
        
        // Modal management
        openCreateModal: () =>
          set((state) => {
            state.isCreateModalOpen = true;
          }),
        
        closeCreateModal: () =>
          set((state) => {
            state.isCreateModalOpen = false;
          }),
        
        openEditModal: (referral) =>
          set((state) => {
            state.isEditModalOpen = true;
            state.editingReferral = referral;
          }),
        
        closeEditModal: () =>
          set((state) => {
            state.isEditModalOpen = false;
            state.editingReferral = null;
          }),
        
        openPreviewModal: (referral) =>
          set((state) => {
            state.isPreviewModalOpen = true;
            state.previewingReferral = referral;
          }),
        
        closePreviewModal: () =>
          set((state) => {
            state.isPreviewModalOpen = false;
            state.previewingReferral = null;
          }),
        
        openProviderSearchModal: () =>
          set((state) => {
            state.isProviderSearchModalOpen = true;
          }),
        
        closeProviderSearchModal: () =>
          set((state) => {
            state.isProviderSearchModalOpen = false;
          }),
        
        openAppealModal: (referral) =>
          set((state) => {
            state.isAppealModalOpen = true;
            state.appealingReferral = referral;
          }),
        
        closeAppealModal: () =>
          set((state) => {
            state.isAppealModalOpen = false;
            state.appealingReferral = null;
          }),
        
        // Loading states
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
            if (loading) {
              state.error = null;
            }
          }),
        
        setSubmitting: (submitting) =>
          set((state) => {
            state.isSubmitting = submitting;
          }),
        
        setSearchingProviders: (searching) =>
          set((state) => {
            state.isSearchingProviders = searching;
          }),
        
        setError: (error) =>
          set((state) => {
            state.error = error;
            state.isLoading = false;
            state.isSubmitting = false;
            state.isSearchingProviders = false;
          }),
        
        // Utility actions
        refresh: async () => {
          const { setLoading, setError } = get();
          try {
            setLoading(true);
            // This would typically call referral service APIs
            // await referralService.refreshReferrals();
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh referrals');
          } finally {
            setLoading(false);
          }
        },
        
        reset: () =>
          set((state) => {
            state.referrals = [];
            state.selectedReferral = null;
            state.providers = [];
            state.aiRecommendations = [];
            state.templates = [];
            state.appeals = [];
            state.analytics = initialAnalytics;
            state.providerSearchResults = null;
            state.searchCriteria = null;
            state.expandedCards.clear();
            state.filters = initialFilters;
            state.sort = initialSort;
            state.searchQuery = '';
            state.isCreateModalOpen = false;
            state.isEditModalOpen = false;
            state.isPreviewModalOpen = false;
            state.isProviderSearchModalOpen = false;
            state.isAppealModalOpen = false;
            state.editingReferral = null;
            state.previewingReferral = null;
            state.appealingReferral = null;
            state.isLoading = false;
            state.isSubmitting = false;
            state.isSearchingProviders = false;
            state.error = null;
            state.lastUpdated = null;
          }),
        
        // Computed getters
        getFilteredReferrals: () => {
          const { referrals, filters, searchQuery } = get();
          let filtered = [...referrals];
          
          // Apply status filter
          if (filters.status && filters.status.length > 0) {
            filtered = filtered.filter((ref) => filters.status!.includes(ref.status));
          }
          
          // Apply urgency filter
          if (filters.urgency && filters.urgency.length > 0) {
            filtered = filtered.filter((ref) => filters.urgency!.includes(ref.urgency));
          }
          
          // Apply specialty filter
          if (filters.specialty && filters.specialty.length > 0) {
            filtered = filtered.filter((ref) => filters.specialty!.includes(ref.specialty));
          }
          
          // Apply date range filter
          if (filters.dateRange) {
            filtered = filtered.filter((ref) => {
              const refDate = new Date(ref.createdAt);
              return refDate >= filters.dateRange!.start && refDate <= filters.dateRange!.end;
            });
          }
          
          // Apply provider filter
          if (filters.providerId && filters.providerId.length > 0) {
            filtered = filtered.filter((ref) => 
              filters.providerId!.includes(ref.providerId) ||
              (ref.assignedProvider && filters.providerId!.includes(ref.assignedProvider.id))
            );
          }
          
          // Apply patient filter
          if (filters.patientId) {
            filtered = filtered.filter((ref) => ref.patientId === filters.patientId);
          }
          
          // Apply authorization filter
          if (filters.needsAuthorization !== undefined) {
            filtered = filtered.filter((ref) => {
              const needsAuth = ref.insurance.priorAuthRequired && ref.insurance.status === 'pending';
              return filters.needsAuthorization ? needsAuth : !needsAuth;
            });
          }
          
          // Apply overdue filter
          if (filters.overdue) {
            const now = new Date();
            filtered = filtered.filter((ref) => {
              if (ref.status === 'submitted' && ref.submittedAt) {
                const daysSinceSubmission = (now.getTime() - ref.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceSubmission > 7; // Consider overdue after 7 days
              }
              return false;
            });
          }
          
          // Apply search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((ref) =>
              ref.specialty.toLowerCase().includes(query) ||
              ref.clinicalJustification.primaryDiagnosis.toLowerCase().includes(query) ||
              ref.clinicalJustification.clinicalReason.toLowerCase().includes(query) ||
              (ref.assignedProvider && ref.assignedProvider.name.toLowerCase().includes(query))
            );
          }
          
          return filtered;
        },
        
        getSortedReferrals: (referrals) => {
          const { sort } = get();
          const sorted = [...referrals];
          
          sorted.sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (sort.field) {
              case 'createdAt':
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
              case 'urgency':
                const urgencyOrder = { urgent: 3, priority: 2, routine: 1 };
                aValue = urgencyOrder[a.urgency];
                bValue = urgencyOrder[b.urgency];
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'specialty':
                aValue = a.specialty;
                bValue = b.specialty;
                break;
              case 'appointmentDate':
                aValue = a.appointmentDate ? new Date(a.appointmentDate) : new Date(0);
                bValue = b.appointmentDate ? new Date(b.appointmentDate) : new Date(0);
                break;
              case 'patientName':
                // This would typically come from patient data
                aValue = a.patientId;
                bValue = b.patientId;
                break;
              default:
                return 0;
            }
            
            if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
            return 0;
          });
          
          return sorted;
        },
        
        getReferralById: (id) => {
          const { referrals } = get();
          return referrals.find((ref) => ref.id === id);
        },
        
        getReferralsByStatus: (status) => {
          const { referrals } = get();
          return referrals.filter((ref) => ref.status === status);
        },
        
        getReferralsByUrgency: (urgency) => {
          const { referrals } = get();
          return referrals.filter((ref) => ref.urgency === urgency);
        },
        
        getReferralsBySpecialty: (specialty) => {
          const { referrals } = get();
          return referrals.filter((ref) => ref.specialty === specialty);
        },
        
        getUrgentReferrals: () => {
          const { referrals } = get();
          return referrals.filter((ref) => ref.urgency === 'urgent');
        },
        
        getPendingReferrals: () => {
          const { referrals } = get();
          return referrals.filter((ref) => 
            ref.status === 'draft' || 
            ref.status === 'submitted' || 
            ref.status === 'authorization-pending'
          );
        },
        
        getOverdueReferrals: () => {
          const { referrals } = get();
          const now = new Date();
          return referrals.filter((ref) => {
            if (ref.status === 'submitted' && ref.submittedAt) {
              const daysSinceSubmission = (now.getTime() - ref.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceSubmission > 7;
            }
            return false;
          });
        },
        
        getProviderById: (id) => {
          const { providers } = get();
          return providers.find((provider) => provider.id === id);
        },
        
        getRecommendationsForReferral: (referralId) => {
          const { aiRecommendations } = get();
          return aiRecommendations.filter((rec) => rec.id === referralId);
        },
        
        getAppealsForReferral: (referralId) => {
          const { appeals } = get();
          return appeals.filter((appeal) => appeal.referralId === referralId);
        },
      })),
      {
        name: 'referral-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          expandedCards: Array.from(state.expandedCards),
          filters: state.filters,
          sort: state.sort,
          templates: state.templates,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert array back to Set after rehydration
            state.expandedCards = new Set(state.expandedCards as any);
          }
        },
      }
    ),
    {
      name: 'referral-store',
    }
  )
);

// Helper function to calculate analytics
function calculateAnalytics(referrals: Referral[]): ReferralAnalytics {
  const totalReferrals = referrals.length;
  const pendingReferrals = referrals.filter(r => 
    r.status === 'draft' || r.status === 'submitted' || r.status === 'authorization-pending'
  ).length;
  const approvedReferrals = referrals.filter(r => r.status === 'approved').length;
  const deniedReferrals = referrals.filter(r => r.status === 'denied').length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const urgentReferrals = referrals.filter(r => r.urgency === 'urgent').length;
  
  // Calculate average processing time
  const processedReferrals = referrals.filter(r => r.submittedAt && r.authorizedAt);
  const averageProcessingTime = processedReferrals.length > 0 
    ? processedReferrals.reduce((sum, r) => {
        const processingTime = (r.authorizedAt!.getTime() - r.submittedAt!.getTime()) / (1000 * 60 * 60 * 24);
        return sum + processingTime;
      }, 0) / processedReferrals.length
    : 0;
  
  // Calculate average wait time
  const scheduledReferrals = referrals.filter(r => r.submittedAt && r.scheduledAt);
  const averageWaitTime = scheduledReferrals.length > 0
    ? scheduledReferrals.reduce((sum, r) => {
        const waitTime = (r.scheduledAt!.getTime() - r.submittedAt!.getTime()) / (1000 * 60 * 60 * 24);
        return sum + waitTime;
      }, 0) / scheduledReferrals.length
    : 0;
  
  // Calculate approval rate
  const approvalRate = (approvedReferrals + completedReferrals) > 0 
    ? ((approvedReferrals + completedReferrals) / (approvedReferrals + deniedReferrals + completedReferrals)) * 100
    : 0;
  
  // Group by specialty
  const bySpecialty = referrals.reduce((acc, r) => {
    acc[r.specialty] = (acc[r.specialty] || 0) + 1;
    return acc;
  }, {} as Record<SpecialtyType, number>);
  
  // Group by status
  const byStatus = referrals.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<ReferralStatus, number>);
  
  // Group by urgency
  const byUrgency = referrals.reduce((acc, r) => {
    acc[r.urgency] = (acc[r.urgency] || 0) + 1;
    return acc;
  }, {} as Record<ReferralUrgency, number>);
  
  // Generate monthly trends (simplified)
  const monthlyTrends = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthReferrals = referrals.filter(r => {
      const refDate = new Date(r.createdAt);
      return refDate.getMonth() === month.getMonth() && refDate.getFullYear() === month.getFullYear();
    });
    
    monthlyTrends.push({
      month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      total: monthReferrals.length,
      approved: monthReferrals.filter(r => r.status === 'approved').length,
      denied: monthReferrals.filter(r => r.status === 'denied').length,
      completed: monthReferrals.filter(r => r.status === 'completed').length,
    });
  }
  
  return {
    totalReferrals,
    pendingReferrals,
    approvedReferrals,
    deniedReferrals,
    completedReferrals,
    averageProcessingTime,
    averageWaitTime,
    approvalRate,
    urgentReferrals,
    bySpecialty,
    byStatus,
    byUrgency,
    monthlyTrends,
  };
}

// Selectors for better performance
export const referralSelectors = {
  filteredAndSortedReferrals: (state: ReferralState) => {
    const filtered = state.getFilteredReferrals();
    return state.getSortedReferrals(filtered);
  },
  
  referralAnalytics: (state: ReferralState) => state.analytics,
  
  isCardExpanded: (referralId: string) => (state: ReferralState) =>
    state.expandedCards.has(referralId),
  
  hasActiveFilters: (state: ReferralState) => {
    const { filters, searchQuery } = state;
    return !!(
      searchQuery ||
      filters.status?.length ||
      filters.urgency?.length ||
      filters.specialty?.length ||
      filters.dateRange ||
      filters.providerId?.length ||
      filters.patientId ||
      filters.needsAuthorization !== undefined ||
      filters.overdue
    );
  },
  
  referralCount: (state: ReferralState) => state.referrals.length,
  
  isLoading: (state: ReferralState) => 
    state.isLoading || state.isSubmitting || state.isSearchingProviders,
  
  urgentReferralsCount: (state: ReferralState) => 
    state.referrals.filter(r => r.urgency === 'urgent').length,
  
  pendingAuthorizationsCount: (state: ReferralState) =>
    state.referrals.filter(r => 
      r.insurance.priorAuthRequired && r.insurance.status === 'pending'
    ).length,
};

// Action creators for complex operations
export const referralActions = {
  // Bulk operations
  bulkUpdateStatus: async (referralIds: string[], status: ReferralStatus) => {
    const { updateReferralStatus } = useReferralStore.getState();
    const results = await Promise.all(
      referralIds.map(id => updateReferralStatus(id, status))
    );
    return results;
  },
  
  // Toggle all cards based on current state
  toggleAllCards: () => {
    const { referrals, expandedCards, expandAllCards, collapseAllCards } = useReferralStore.getState();
    const allExpanded = referrals.every(ref => expandedCards.has(ref.id));
    if (allExpanded) {
      collapseAllCards();
    } else {
      expandAllCards();
    }
  },
  
  // Smart filtering
  applyQuickFilter: (filterType: 'urgent' | 'pending' | 'overdue' | 'needsAuth') => {
    const { setFilters, clearFilters } = useReferralStore.getState();
    clearFilters();
    
    switch (filterType) {
      case 'urgent':
        setFilters({ urgency: ['urgent'] });
        break;
      case 'pending':
        setFilters({ status: ['draft', 'submitted', 'authorization-pending'] });
        break;
      case 'overdue':
        setFilters({ overdue: true });
        break;
      case 'needsAuth':
        setFilters({ needsAuthorization: true });
        break;
    }
  },
  
  // Create referral from AI recommendation
  createFromAIRecommendation: async (recommendation: AIReferralRecommendation, patientId: string) => {
    const { createReferral } = useReferralStore.getState();
    
    const request: CreateReferralRequest = {
      patientId,
      specialty: recommendation.suggestedSpecialty,
      urgency: recommendation.suggestedUrgency,
      clinicalReason: recommendation.reasoning,
      primaryDiagnosis: '', // Would need to be provided
      symptoms: recommendation.clinicalIndicators,
      redFlags: recommendation.riskFactors,
    };
    
    return await createReferral(request);
  },
};
