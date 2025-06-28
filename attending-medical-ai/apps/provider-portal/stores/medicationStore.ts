/**
 * Medication state management using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Medication,
  MedicationListFilters,
  MedicationListSort,
  MedicationSummary,
  Interaction,
  AIRecommendation,
  MedicationAction,
} from '../types/medication.types';

interface MedicationState {
  // Core data
  medications: Medication[];
  selectedMedication: Medication | null;
  interactions: Interaction[];
  aiRecommendations: AIRecommendation[];
  summary: MedicationSummary | null;
  
  // UI state
  expandedCards: Set<string>;
  filters: MedicationListFilters;
  sort: MedicationListSort;
  searchQuery: string;
  
  // Loading and error states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Modal and form states
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  editingMedication: Medication | null;
  
  // Actions
  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  updateMedication: (id: string, updates: Partial<Medication>) => void;
  removeMedication: (id: string) => void;
  
  // Selection and expansion
  selectMedication: (medication: Medication | null) => void;
  toggleCardExpansion: (medicationId: string) => void;
  expandAllCards: () => void;
  collapseAllCards: () => void;
  
  // Filtering and sorting
  setFilters: (filters: Partial<MedicationListFilters>) => void;
  clearFilters: () => void;
  setSort: (sort: MedicationListSort) => void;
  setSearchQuery: (query: string) => void;
  
  // Interactions and recommendations
  setInteractions: (interactions: Interaction[]) => void;
  addInteraction: (interaction: Interaction) => void;
  removeInteraction: (interactionId: string) => void;
  setAIRecommendations: (recommendations: AIRecommendation[]) => void;
  
  // Summary and analytics
  setSummary: (summary: MedicationSummary) => void;
  updateSummary: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Modal management
  openAddModal: () => void;
  closeAddModal: () => void;
  openEditModal: (medication: Medication) => void;
  closeEditModal: () => void;
  
  // Utility actions
  refresh: () => Promise<void>;
  reset: () => void;
  
  // Computed getters
  getFilteredMedications: () => Medication[];
  getSortedMedications: (medications: Medication[]) => Medication[];
  getMedicationById: (id: string) => Medication | undefined;
  getActiveMedications: () => Medication[];
  getExpiredMedications: () => Medication[];
  getMedicationsNeedingRefill: () => Medication[];
  getMedicationsWithInteractions: () => Medication[];
  getInteractionsForMedication: (medicationId: string) => Interaction[];
  getAIRecommendationsForMedication: (medicationId: string) => AIRecommendation[];
}

const initialFilters: MedicationListFilters = {
  status: undefined,
  prescriber: undefined,
  pharmacy: undefined,
  form: undefined,
  hasInteractions: undefined,
  needsRefill: undefined,
  searchQuery: undefined,
};

const initialSort: MedicationListSort = {
  field: 'name',
  direction: 'asc',
};

const initialSummary: MedicationSummary = {
  totalMedications: 0,
  activeMedications: 0,
  expiredMedications: 0,
  needingRefill: 0,
  withInteractions: 0,
  totalMonthlyCost: 0,
};

export const useMedicationStore = create<MedicationState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        medications: [],
        selectedMedication: null,
        interactions: [],
        aiRecommendations: [],
        summary: initialSummary,
        
        expandedCards: new Set(),
        filters: initialFilters,
        sort: initialSort,
        searchQuery: '',
        
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdated: null,
        
        isAddModalOpen: false,
        isEditModalOpen: false,
        editingMedication: null,
        
        // Core medication actions
        setMedications: (medications) =>
          set((state) => {
            state.medications = medications;
            state.lastUpdated = new Date();
            state.error = null;
          }),
        
        addMedication: (medication) =>
          set((state) => {
            state.medications.push(medication);
            state.lastUpdated = new Date();
          }),
        
        updateMedication: (id, updates) =>
          set((state) => {
            const index = state.medications.findIndex((med) => med.id === id);
            if (index !== -1) {
              state.medications[index] = { ...state.medications[index], ...updates };
              state.lastUpdated = new Date();
            }
          }),
        
        removeMedication: (id) =>
          set((state) => {
            state.medications = state.medications.filter((med) => med.id !== id);
            if (state.selectedMedication?.id === id) {
              state.selectedMedication = null;
            }
            state.expandedCards.delete(id);
            state.lastUpdated = new Date();
          }),
        
        // Selection and expansion
        selectMedication: (medication) =>
          set((state) => {
            state.selectedMedication = medication;
          }),
        
        toggleCardExpansion: (medicationId) =>
          set((state) => {
            if (state.expandedCards.has(medicationId)) {
              state.expandedCards.delete(medicationId);
            } else {
              state.expandedCards.add(medicationId);
            }
          }),
        
        expandAllCards: () =>
          set((state) => {
            state.medications.forEach((med) => state.expandedCards.add(med.id));
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
        
        // Interactions and recommendations
        setInteractions: (interactions) =>
          set((state) => {
            state.interactions = interactions;
          }),
        
        addInteraction: (interaction) =>
          set((state) => {
            state.interactions.push(interaction);
          }),
        
        removeInteraction: (interactionId) =>
          set((state) => {
            state.interactions = state.interactions.filter((i) => i.id !== interactionId);
          }),
        
        setAIRecommendations: (recommendations) =>
          set((state) => {
            state.aiRecommendations = recommendations;
          }),
        
        // Summary and analytics
        setSummary: (summary) =>
          set((state) => {
            state.summary = summary;
          }),
        
        updateSummary: () =>
          set((state) => {
            const medications = state.medications;
            const activeMeds = medications.filter((med) => med.status === 'active');
            const expiredMeds = medications.filter((med) => med.status === 'expired');
            const needingRefill = medications.filter((med) => 
              med.refillsRemaining === 0 || 
              (med.nextRefillDate && new Date(med.nextRefillDate) <= new Date())
            );
            const withInteractions = medications.filter((med) => 
              state.interactions.some((interaction) => 
                interaction.medicationIds.includes(med.id)
              )
            );
            const totalCost = medications.reduce((sum, med) => sum + (med.cost || 0), 0);
            
            state.summary = {
              totalMedications: medications.length,
              activeMedications: activeMeds.length,
              expiredMedications: expiredMeds.length,
              needingRefill: needingRefill.length,
              withInteractions: withInteractions.length,
              totalMonthlyCost: totalCost,
            };
          }),
        
        // Loading states
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
            if (loading) {
              state.error = null;
            }
          }),
        
        setRefreshing: (refreshing) =>
          set((state) => {
            state.isRefreshing = refreshing;
          }),
        
        setError: (error) =>
          set((state) => {
            state.error = error;
            state.isLoading = false;
            state.isRefreshing = false;
          }),
        
        // Modal management
        openAddModal: () =>
          set((state) => {
            state.isAddModalOpen = true;
          }),
        
        closeAddModal: () =>
          set((state) => {
            state.isAddModalOpen = false;
          }),
        
        openEditModal: (medication) =>
          set((state) => {
            state.isEditModalOpen = true;
            state.editingMedication = medication;
          }),
        
        closeEditModal: () =>
          set((state) => {
            state.isEditModalOpen = false;
            state.editingMedication = null;
          }),
        
        // Utility actions
        refresh: async () => {
          const { setRefreshing, setError } = get();
          try {
            setRefreshing(true);
            // This would typically call an API service
            // await medicationService.refreshMedications();
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh medications');
          } finally {
            setRefreshing(false);
          }
        },
        
        reset: () =>
          set((state) => {
            state.medications = [];
            state.selectedMedication = null;
            state.interactions = [];
            state.aiRecommendations = [];
            state.summary = initialSummary;
            state.expandedCards.clear();
            state.filters = initialFilters;
            state.sort = initialSort;
            state.searchQuery = '';
            state.isLoading = false;
            state.isRefreshing = false;
            state.error = null;
            state.lastUpdated = null;
            state.isAddModalOpen = false;
            state.isEditModalOpen = false;
            state.editingMedication = null;
          }),
        
        // Computed getters
        getFilteredMedications: () => {
          const { medications, filters, searchQuery } = get();
          let filtered = [...medications];
          
          // Apply status filter
          if (filters.status && filters.status.length > 0) {
            filtered = filtered.filter((med) => filters.status!.includes(med.status));
          }
          
          // Apply prescriber filter
          if (filters.prescriber && filters.prescriber.length > 0) {
            filtered = filtered.filter((med) => filters.prescriber!.includes(med.prescriber.id));
          }
          
          // Apply pharmacy filter
          if (filters.pharmacy && filters.pharmacy.length > 0) {
            filtered = filtered.filter((med) => filters.pharmacy!.includes(med.pharmacy.id));
          }
          
          // Apply form filter
          if (filters.form && filters.form.length > 0) {
            filtered = filtered.filter((med) => filters.form!.includes(med.form));
          }
          
          // Apply interaction filter
          if (filters.hasInteractions !== undefined) {
            const { interactions } = get();
            filtered = filtered.filter((med) => {
              const hasInteraction = interactions.some((interaction) =>
                interaction.medicationIds.includes(med.id)
              );
              return filters.hasInteractions ? hasInteraction : !hasInteraction;
            });
          }
          
          // Apply refill filter
          if (filters.needsRefill !== undefined) {
            filtered = filtered.filter((med) => {
              const needsRefill = med.refillsRemaining === 0 || 
                (med.nextRefillDate && new Date(med.nextRefillDate) <= new Date());
              return filters.needsRefill ? needsRefill : !needsRefill;
            });
          }
          
          // Apply search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((med) =>
              med.name.toLowerCase().includes(query) ||
              med.genericName.toLowerCase().includes(query) ||
              med.prescriber.name.toLowerCase().includes(query) ||
              (med.indication && med.indication.toLowerCase().includes(query))
            );
          }
          
          return filtered;
        },
        
        getSortedMedications: (medications) => {
          const { sort } = get();
          const sorted = [...medications];
          
          sorted.sort((a, b) => {
            let aValue: any;
            let bValue: any;
            
            switch (sort.field) {
              case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
              case 'prescribedDate':
                aValue = new Date(a.prescribedDate);
                bValue = new Date(b.prescribedDate);
                break;
              case 'lastFilled':
                aValue = a.lastFilled ? new Date(a.lastFilled) : new Date(0);
                bValue = b.lastFilled ? new Date(b.lastFilled) : new Date(0);
                break;
              case 'nextRefillDate':
                aValue = a.nextRefillDate ? new Date(a.nextRefillDate) : new Date(0);
                bValue = b.nextRefillDate ? new Date(b.nextRefillDate) : new Date(0);
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
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
        
        getMedicationById: (id) => {
          const { medications } = get();
          return medications.find((med) => med.id === id);
        },
        
        getActiveMedications: () => {
          const { medications } = get();
          return medications.filter((med) => med.status === 'active');
        },
        
        getExpiredMedications: () => {
          const { medications } = get();
          return medications.filter((med) => med.status === 'expired');
        },
        
        getMedicationsNeedingRefill: () => {
          const { medications } = get();
          return medications.filter((med) =>
            med.refillsRemaining === 0 ||
            (med.nextRefillDate && new Date(med.nextRefillDate) <= new Date())
          );
        },
        
        getMedicationsWithInteractions: () => {
          const { medications, interactions } = get();
          return medications.filter((med) =>
            interactions.some((interaction) => interaction.medicationIds.includes(med.id))
          );
        },
        
        getInteractionsForMedication: (medicationId) => {
          const { interactions } = get();
          return interactions.filter((interaction) =>
            interaction.medicationIds.includes(medicationId)
          );
        },
        
        getAIRecommendationsForMedication: (medicationId) => {
          const { aiRecommendations } = get();
          return aiRecommendations.filter((rec) => rec.medicationId === medicationId);
        },
      })),
      {
        name: 'medication-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          expandedCards: Array.from(state.expandedCards),
          filters: state.filters,
          sort: state.sort,
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
      name: 'medication-store',
    }
  )
);

// Selectors for better performance
export const medicationSelectors = {
  filteredAndSortedMedications: (state: MedicationState) => {
    const filtered = state.getFilteredMedications();
    return state.getSortedMedications(filtered);
  },
  
  medicationSummary: (state: MedicationState) => state.summary,
  
  isCardExpanded: (medicationId: string) => (state: MedicationState) =>
    state.expandedCards.has(medicationId),
  
  hasActiveFilters: (state: MedicationState) => {
    const { filters, searchQuery } = state;
    return !!(
      searchQuery ||
      filters.status?.length ||
      filters.prescriber?.length ||
      filters.pharmacy?.length ||
      filters.form?.length ||
      filters.hasInteractions !== undefined ||
      filters.needsRefill !== undefined
    );
  },
  
  medicationCount: (state: MedicationState) => state.medications.length,
  
  isLoading: (state: MedicationState) => state.isLoading || state.isRefreshing,
};

// Action creators for complex operations
export const medicationActions = {
  // Bulk operations
  bulkUpdateStatus: (medicationIds: string[], status: Medication['status']) => {
    const { updateMedication } = useMedicationStore.getState();
    medicationIds.forEach((id) => updateMedication(id, { status }));
  },
  
  // Toggle all cards based on current state
  toggleAllCards: () => {
    const { medications, expandedCards, expandAllCards, collapseAllCards } = useMedicationStore.getState();
    const allExpanded = medications.every((med) => expandedCards.has(med.id));
    if (allExpanded) {
      collapseAllCards();
    } else {
      expandAllCards();
    }
  },
  
  // Smart filtering
  applyQuickFilter: (filterType: 'needsRefill' | 'hasInteractions' | 'active' | 'expired') => {
    const { setFilters, clearFilters } = useMedicationStore.getState();
    clearFilters();
    
    switch (filterType) {
      case 'needsRefill':
        setFilters({ needsRefill: true });
        break;
      case 'hasInteractions':
        setFilters({ hasInteractions: true });
        break;
      case 'active':
        setFilters({ status: ['active'] });
        break;
      case 'expired':
        setFilters({ status: ['expired'] });
        break;
    }
  },
};
