// ============================================================
// Generic Ordering Store Factory
// apps/shared/stores/createOrderingStore.ts
//
// Factory function to create type-safe ordering stores
// Reduces ~600 lines of duplicate code across lab, imaging, and medication stores
// ============================================================

import { create, StateCreator } from 'zustand';
import { devtools, persist, PersistOptions } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { OrderPriority, PatientContext, AIRecommendation, RecommendationCategory } from '../catalogs/types';

// =============================================================================
// Generic Types
// =============================================================================

/**
 * Base interface for catalog items (labs, imaging, medications)
 */
export interface CatalogItem {
  code: string;
  name: string;
  category: string;
  cost: number;
  defaultPriority: OrderPriority;
}

/**
 * Base interface for selected items
 */
export interface SelectedItem<T extends CatalogItem> {
  item: T;
  priority: OrderPriority;
  aiRecommended: boolean;
  rationale?: string;
}

/**
 * Base interface for AI recommendations
 */
export interface BaseRecommendation extends AIRecommendation<string> {
  itemCode: string;
  itemName: string;
}

/**
 * Configuration for creating an ordering store
 */
export interface OrderingStoreConfig<
  TItem extends CatalogItem,
  TRecommendation extends BaseRecommendation
> {
  name: string;
  getCatalog: () => Record<string, TItem>;
  getItem: (code: string) => TItem | undefined;
  searchItems: (query: string) => TItem[];
  generateRecommendations: (patient: PatientContext) => Promise<TRecommendation[]>;
  submitEndpoint: string;
  buildSubmitPayload: (selectedItem: SelectedItem<TItem>, encounterId: string, indication: string) => Record<string, any>;
  persistKey?: string;
  categoryFilterKey?: string;
}

/**
 * Base state interface for ordering stores
 */
export interface OrderingStoreState<
  TItem extends CatalogItem,
  TRecommendation extends BaseRecommendation,
  TCategory extends string = string
> {
  // Patient context
  patientContext: PatientContext | null;
  
  // Selected items
  selectedItems: Map<string, SelectedItem<TItem>>;
  
  // Order settings
  priority: OrderPriority;
  clinicalIndication: string;
  specialInstructions: string;
  encounterId: string | null;
  
  // AI Recommendations
  aiRecommendations: TRecommendation[];
  isLoadingRecommendations: boolean;
  
  // Search & Filter
  searchQuery: string;
  categoryFilter: TCategory | 'all';
  
  // UI State
  loading: boolean;
  submitting: boolean;
  error: string | null;
  lastSubmittedOrderIds: string[];
  
  // Actions
  setPatientContext: (context: PatientContext) => void;
  addItem: (itemCode: string, options?: { priority?: OrderPriority; rationale?: string; aiRecommended?: boolean }) => void;
  removeItem: (itemCode: string) => void;
  updateItemPriority: (itemCode: string, priority: OrderPriority) => void;
  setGlobalPriority: (priority: OrderPriority) => void;
  setClinicalIndication: (indication: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: TCategory | 'all') => void;
  generateAIRecommendations: () => Promise<void>;
  addAIRecommendedItems: (category: RecommendationCategory) => void;
  submitOrder: (encounterId: string) => Promise<string[]>;
  clearOrder: () => void;
  
  // Computed getters
  getSelectedItemsArray: () => SelectedItem<TItem>[];
  getFilteredCatalog: () => TItem[];
  getTotalCost: () => number;
  getStatCount: () => number;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a fully-typed ordering store with common functionality
 */
export function createOrderingStore<
  TItem extends CatalogItem,
  TRecommendation extends BaseRecommendation,
  TCategory extends string = string
>(config: OrderingStoreConfig<TItem, TRecommendation>) {
  const {
    name,
    getCatalog,
    getItem,
    searchItems,
    generateRecommendations,
    submitEndpoint,
    buildSubmitPayload,
    persistKey,
  } = config;

  type StoreState = OrderingStoreState<TItem, TRecommendation, TCategory>;

  const storeCreator: StateCreator<
    StoreState,
    [['zustand/devtools', never], ['zustand/immer', never]],
    [],
    StoreState
  > = (set, get) => ({
    // Initial state
    patientContext: null,
    selectedItems: new Map(),
    priority: 'ROUTINE' as OrderPriority,
    clinicalIndication: '',
    specialInstructions: '',
    encounterId: null,
    aiRecommendations: [],
    isLoadingRecommendations: false,
    searchQuery: '',
    categoryFilter: 'all' as TCategory | 'all',
    loading: false,
    submitting: false,
    error: null,
    lastSubmittedOrderIds: [],

    // Patient Context
    setPatientContext: (context) => {
      set((state) => {
        state.patientContext = context;
        if (context.chiefComplaint) {
          state.clinicalIndication = `Evaluation for: ${context.chiefComplaint}`;
        }
      });
      get().generateAIRecommendations();
    },

    // Item Selection
    addItem: (itemCode, options = {}) => {
      const item = getItem(itemCode);
      if (!item) {
        console.warn(`${name}: Item ${itemCode} not found in catalog`);
        return;
      }

      set((state) => {
        state.selectedItems.set(itemCode, {
          item: item as any, // Cast to avoid Draft type issues with immer
          priority: options.priority || item.defaultPriority,
          aiRecommended: options.aiRecommended || false,
          rationale: options.rationale,
        });
      });
    },

    removeItem: (itemCode) => {
      set((state) => {
        state.selectedItems.delete(itemCode);
      });
    },

    updateItemPriority: (itemCode, priority) => {
      set((state) => {
        const selected = state.selectedItems.get(itemCode);
        if (selected) selected.priority = priority;
      });
    },

    setGlobalPriority: (priority) => {
      set((state) => {
        state.priority = priority;
        state.selectedItems.forEach((item) => {
          item.priority = priority;
        });
      });
    },

    setClinicalIndication: (indication) => set({ clinicalIndication: indication }),
    setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),

    // AI Recommendations
    generateAIRecommendations: async () => {
      const { patientContext } = get();
      if (!patientContext) return;

      set({ isLoadingRecommendations: true });

      try {
        const recommendations = await generateRecommendations(patientContext);
        set({
          aiRecommendations: recommendations,
          isLoadingRecommendations: false,
        });
      } catch (error) {
        console.error(`${name}: Failed to generate AI recommendations:`, error);
        set({
          isLoadingRecommendations: false,
          error: 'Failed to generate AI recommendations',
        });
      }
    },

    addAIRecommendedItems: (category) => {
      const { aiRecommendations, addItem } = get();
      aiRecommendations
        .filter((rec) => rec.category === category)
        .forEach((rec) => {
          addItem(rec.itemCode, {
            priority: rec.priority,
            rationale: rec.rationale,
            aiRecommended: true,
          });
        });
    },

    // Order Submission
    submitOrder: async (encounterId) => {
      const { selectedItems, clinicalIndication, specialInstructions } = get();

      if (selectedItems.size === 0) {
        throw new Error('No items selected');
      }

      set({ submitting: true, error: null });

      try {
        const orderIds: string[] = [];

        for (const [code, selectedItem] of selectedItems.entries()) {
          const payload = buildSubmitPayload(selectedItem, encounterId, clinicalIndication);
          
          const response = await fetch(submitEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to submit order for ${code}`);
          }

          const result = await response.json();
          orderIds.push(result.id);
        }

        set((state) => {
          state.submitting = false;
          state.lastSubmittedOrderIds = orderIds;
        });

        get().clearOrder();
        return orderIds;
      } catch (error) {
        set((state) => {
          state.submitting = false;
          state.error = error instanceof Error ? error.message : 'Failed to submit order';
        });
        throw error;
      }
    },

    clearOrder: () =>
      set((state) => {
        state.selectedItems = new Map();
        state.priority = 'ROUTINE';
        state.clinicalIndication = '';
        state.specialInstructions = '';
        state.error = null;
      }),

    // Computed Getters
    getSelectedItemsArray: () => Array.from(get().selectedItems.values()),

    getFilteredCatalog: () => {
      const { searchQuery, categoryFilter } = get();
      let results = searchQuery ? searchItems(searchQuery) : Object.values(getCatalog());
      if (categoryFilter !== 'all') {
        results = results.filter((item) => item.category === categoryFilter);
      }
      return results;
    },

    getTotalCost: () =>
      get()
        .getSelectedItemsArray()
        .reduce((sum, si) => sum + si.item.cost, 0),

    getStatCount: () =>
      get().getSelectedItemsArray().filter((si) => si.priority === 'STAT').length,
  });

  // Create the store with or without persistence
  if (persistKey) {
    return create<StoreState>()(
      devtools(
        persist(immer(storeCreator) as any, {
          name: persistKey,
          partialize: (state) => ({
            patientContext: state.patientContext,
            clinicalIndication: state.clinicalIndication,
          }),
        } as PersistOptions<StoreState, Partial<StoreState>>),
        { name }
      )
    );
  }

  return create<StoreState>()(devtools(immer(storeCreator) as any, { name }));
}

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Extract store type from factory result
 */
export type OrderingStore<
  TItem extends CatalogItem,
  TRecommendation extends BaseRecommendation,
  TCategory extends string = string
> = ReturnType<typeof createOrderingStore<TItem, TRecommendation, TCategory>>;

// =============================================================================
// Example Usage (for documentation)
// =============================================================================

/*
// Example: Creating a lab ordering store

import { createOrderingStore } from '@attending/shared/stores/createOrderingStore';
import { LAB_CATALOG, getLabTest, searchLabs, LabTest, LabCategory } from '@attending/shared/catalogs';
import { clinicalRecommendationService, LabRecommendation } from '@attending/shared/services/ClinicalRecommendationService';

export const useLabOrderingStore = createOrderingStore<LabTest, LabRecommendation, LabCategory>({
  name: 'lab-ordering-store',
  getCatalog: () => LAB_CATALOG,
  getItem: getLabTest,
  searchItems: searchLabs,
  generateRecommendations: (patient) => clinicalRecommendationService.generateLabRecommendations(patient),
  submitEndpoint: '/api/labs',
  buildSubmitPayload: (selectedItem, encounterId, indication) => ({
    encounterId,
    code: selectedItem.item.code,
    name: selectedItem.item.name,
    category: selectedItem.item.category,
    priority: selectedItem.priority,
    indication,
  }),
});
*/
