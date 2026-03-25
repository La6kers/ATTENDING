// ============================================================
// Clinical Order Store Factory - Enhanced Version
// apps/shared/stores/createClinicalOrderStore.ts
//
// Factory function to create Zustand stores for clinical ordering
// Eliminates ~70% duplicate code across Lab, Imaging, Medication, Referral stores
// ============================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  PatientContext,
  OrderPriority,
  RecommendationCategory,
  BaseCatalogItem,
  BaseSelectedItem,
  BaseAIRecommendation,
  ClinicalStore,
  ClinicalStoreConfig,
} from './types';

// =============================================================================
// Factory Function
// =============================================================================

export function createClinicalOrderStore<
  TItem extends BaseCatalogItem,
  TSelectedItem extends BaseSelectedItem<TItem>,
  TRecommendation extends BaseAIRecommendation,
  TCategory extends string
>(
  config: ClinicalStoreConfig<TItem, TSelectedItem, TRecommendation, TCategory>
) {
  type StoreState = ClinicalStore<TItem, TSelectedItem, TRecommendation, TCategory>;

  return create<StoreState>()(
    devtools(
      immer((set, get) => ({
        // =====================================================================
        // Initial State
        // =====================================================================
        patientContext: null,
        selectedItems: new Map(),
        globalPriority: 'ROUTINE' as OrderPriority,
        clinicalIndication: '',
        specialInstructions: '',
        aiRecommendations: [],
        isLoadingRecommendations: false,
        searchQuery: '',
        categoryFilter: 'all' as TCategory | 'all',
        loading: false,
        submitting: false,
        error: null,
        lastSubmittedOrderIds: [],

        // =====================================================================
        // Patient Context
        // =====================================================================
        setPatientContext: (context: PatientContext) => {
          set(state => {
            state.patientContext = context;
            // Auto-set clinical indication from chief complaint
            if (context.chiefComplaint) {
              state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
            }
          });
          // Auto-generate AI recommendations when patient context is set
          get().generateAIRecommendations();
        },

        // =====================================================================
        // Item Selection
        // =====================================================================
        addItem: (code: string, options = {}) => {
          const item = config.catalog[code];
          if (!item) {
            console.warn(`[${config.name}] Item ${code} not found in catalog`);
            return;
          }

          set(state => {
            const selectedItem = config.createSelectedItem(item, options as Partial<Omit<TSelectedItem, 'item'>>);
            // Use any to bypass Immer's Draft type inference with generics
            (state.selectedItems as Map<string, TSelectedItem>).set(code, selectedItem);
          });
        },

        removeItem: (code: string) => {
          set(state => {
            state.selectedItems.delete(code);
          });
        },

        updateItemPriority: (code: string, priority: OrderPriority) => {
          set(state => {
            const item = state.selectedItems.get(code);
            if (item) {
              item.priority = priority;
            }
          });
        },

        // =====================================================================
        // Order Settings
        // =====================================================================
        setGlobalPriority: (priority: OrderPriority) => {
          set(state => {
            state.globalPriority = priority;
            // Update all selected items
            state.selectedItems.forEach(item => {
              item.priority = priority;
            });
          });
        },

        setClinicalIndication: (indication: string) => {
          set({ clinicalIndication: indication });
        },

        setSpecialInstructions: (instructions: string) => {
          set({ specialInstructions: instructions });
        },

        // =====================================================================
        // Search & Filter
        // =====================================================================
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        setCategoryFilter: (category: TCategory | 'all') => {
          set({ categoryFilter: category });
        },

        // =====================================================================
        // AI Recommendations
        // =====================================================================
        generateAIRecommendations: async () => {
          const { patientContext } = get();
          if (!patientContext) return;

          set({ isLoadingRecommendations: true, error: null });

          try {
            // Simulate API delay for realistic UX
            await new Promise(resolve => setTimeout(resolve, 600));
            
            const recommendations = await config.generateRecommendations(patientContext);
            
            set({
              aiRecommendations: recommendations,
              isLoadingRecommendations: false,
            });
          } catch (error) {
            console.error(`[${config.name}] Failed to generate AI recommendations:`, error);
            set({
              isLoadingRecommendations: false,
              error: 'Failed to generate AI recommendations',
            });
          }
        },

        addAIRecommendedItems: (category: RecommendationCategory) => {
          const { aiRecommendations, addItem } = get();
          
          aiRecommendations
            .filter(rec => rec.category === category)
            .forEach(rec => {
              addItem(rec.itemCode, {
                priority: rec.priority,
                rationale: rec.rationale,
                aiRecommended: true,
              } as Partial<Omit<TSelectedItem, 'item'>>);
            });
        },

        // =====================================================================
        // Order Submission
        // =====================================================================
        submitOrder: async (encounterId: string) => {
          const { selectedItems, patientContext, clinicalIndication } = get();

          if (selectedItems.size === 0) {
            throw new Error('No items selected');
          }

          set({ submitting: true, error: null });

          try {
            const orderIds: string[] = [];

            // Submit each item
            for (const [code, selectedItem] of selectedItems.entries()) {
              const payload = {
                encounterId,
                indication: clinicalIndication,
                ...config.transformForSubmit(selectedItem, patientContext),
              };

              const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to submit ${code}`);
              }

              const result = await response.json();
              orderIds.push(result.id);
            }

            set(state => {
              state.submitting = false;
              state.lastSubmittedOrderIds = orderIds;
            });

            // Clear order after successful submission
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

        clearOrder: () => {
          set(state => {
            state.selectedItems = new Map();
            state.globalPriority = 'ROUTINE';
            state.clinicalIndication = '';
            state.specialInstructions = '';
            state.error = null;
          });
        },

        // =====================================================================
        // Computed Getters
        // =====================================================================
        getSelectedItemsArray: () => {
          return Array.from(get().selectedItems.values());
        },

        getFilteredCatalog: () => {
          const { searchQuery, categoryFilter } = get();
          const query = searchQuery.toLowerCase().trim();

          return Object.values(config.catalog).filter(item => {
            // Category filter
            if (categoryFilter !== 'all' && item.category !== categoryFilter) {
              return false;
            }

            // Search filter
            if (query) {
              const searchFields = config.getItemSearchFields(item);
              return searchFields.some(field => 
                field.toLowerCase().includes(query)
              );
            }

            return true;
          });
        },

        getTotalCost: () => {
          const items = get().getSelectedItemsArray();
          return items.reduce((sum, selected) => sum + selected.item.cost, 0);
        },

        getStatCount: () => {
          const items = get().getSelectedItemsArray();
          return items.filter(selected => selected.priority === 'STAT').length;
        },
      })),
      { name: config.name }
    )
  );
}

export default createClinicalOrderStore;
