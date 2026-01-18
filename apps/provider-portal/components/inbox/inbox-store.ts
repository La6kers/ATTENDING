// =============================================================================
// ATTENDING AI - Provider Inbox Zustand Store
// apps/provider-portal/components/inbox/inbox-store.ts
// =============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  CategoryType,
  InboxItem,
  InboxFilters,
  InboxSortOptions,
  CategoryCount,
  Provider,
  AuditLogEntry,
  InboxAction,
} from './types';

interface InboxState {
  items: InboxItem[];
  providers: Provider[];
  activeCategory: CategoryType;
  expandedItemId: string | null;
  selectedItemIds: Set<string>;
  filters: InboxFilters;
  sortOptions: InboxSortOptions;
  searchQuery: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  modalState: {
    type: 'forward' | 'reassign' | 'complete' | null;
    itemId: string | null;
  };
  toast: {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  recentActions: AuditLogEntry[];
}

interface InboxActions {
  setItems: (items: InboxItem[]) => void;
  addItem: (item: InboxItem) => void;
  updateItem: (id: string, updates: Partial<InboxItem>) => void;
  removeItem: (id: string) => void;
  setActiveCategory: (category: CategoryType) => void;
  getCategoryCounts: () => Record<CategoryType, CategoryCount>;
  setExpandedItem: (id: string | null) => void;
  toggleItemSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<InboxFilters>) => void;
  setSortOptions: (options: InboxSortOptions) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  completeItem: (id: string, response: string) => void;
  forwardItem: (id: string, toProviderId: string, note?: string) => void;
  reassignItem: (id: string, toProviderId: string, note?: string) => void;
  bulkMarkAsRead: (ids: string[]) => void;
  bulkComplete: (ids: string[]) => void;
  openModal: (type: 'forward' | 'reassign' | 'complete', itemId: string) => void;
  closeModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setError: (error: string | null) => void;
  fetchItems: () => Promise<void>;
  refreshItems: () => Promise<void>;
  logAction: (itemId: string, action: InboxAction, details?: Record<string, unknown>) => void;
  getFilteredItems: () => InboxItem[];
  getItemById: (id: string) => InboxItem | undefined;
}

const initialState: InboxState = {
  items: [],
  providers: [],
  activeCategory: 'encounters',
  expandedItemId: null,
  selectedItemIds: new Set(),
  filters: { category: 'encounters' },
  sortOptions: { field: 'timestamp', direction: 'desc' },
  searchQuery: '',
  isLoading: false,
  isRefreshing: false,
  error: null,
  modalState: { type: null, itemId: null },
  toast: { show: false, message: '', type: 'success' },
  recentActions: [],
};

export const useInboxStore = create<InboxState & InboxActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        setItems: (items) => set((state) => {
          state.items = items;
        }),

        addItem: (item) => set((state) => {
          state.items.unshift(item);
        }),

        updateItem: (id, updates) => set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = { ...state.items[index], ...updates };
          }
        }),

        removeItem: (id) => set((state) => {
          state.items = state.items.filter((item) => item.id !== id);
        }),

        setActiveCategory: (category) => set((state) => {
          state.activeCategory = category;
          state.filters.category = category;
          state.expandedItemId = null;
          state.selectedItemIds = new Set();
        }),

        getCategoryCounts: () => {
          const { items } = get();
          const categories: CategoryType[] = [
            'encounters', 'phone', 'charts', 'messages',
            'refills', 'labs', 'imaging', 'incomplete',
          ];

          const counts: Record<CategoryType, CategoryCount> = {} as Record<CategoryType, CategoryCount>;

          categories.forEach((cat) => {
            const categoryItems = items.filter((item) => item.category === cat);
            counts[cat] = {
              total: categoryItems.length,
              unread: categoryItems.filter((item) => item.status === 'unread').length,
              urgent: categoryItems.filter((item) => item.priority === 'urgent').length,
            };
          });

          return counts;
        },

        setExpandedItem: (id) => set((state) => {
          state.expandedItemId = id;
          if (id) {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1 && state.items[index].status === 'unread') {
              state.items[index].status = 'read';
            }
          }
        }),

        toggleItemSelection: (id) => set((state) => {
          if (state.selectedItemIds.has(id)) {
            state.selectedItemIds.delete(id);
          } else {
            state.selectedItemIds.add(id);
          }
        }),

        selectAll: () => set((state) => {
          const filteredItems = get().getFilteredItems();
          state.selectedItemIds = new Set(filteredItems.map((item) => item.id));
        }),

        clearSelection: () => set((state) => {
          state.selectedItemIds = new Set();
        }),

        setFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters };
        }),

        setSortOptions: (options) => set((state) => {
          state.sortOptions = options;
        }),

        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query;
        }),

        clearFilters: () => set((state) => {
          state.filters = { category: state.activeCategory };
          state.searchQuery = '';
        }),

        markAsRead: (id) => set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index].status = 'read';
            state.items[index].updatedAt = new Date();
          }
        }),

        markAsUnread: (id) => set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index].status = 'unread';
            state.items[index].updatedAt = new Date();
          }
        }),

        completeItem: (id, response) => {
          set((state) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = 'completed';
              state.items[index].completedAt = new Date();
              state.items[index].updatedAt = new Date();
            }
            state.expandedItemId = null;
          });
          get().logAction(id, 'complete', { response });
          get().showToast('Item completed successfully', 'success');
        },

        forwardItem: (id, toProviderId, note) => {
          const provider = get().providers.find((p) => p.id === toProviderId);
          set((state) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = 'forwarded';
              state.items[index].forwardedTo = toProviderId;
              state.items[index].updatedAt = new Date();
            }
            state.expandedItemId = null;
            state.modalState = { type: null, itemId: null };
          });
          get().logAction(id, 'forward', { toProviderId, note });
          get().showToast(`Forwarded to ${provider?.name || 'provider'}`, 'success');
        },

        reassignItem: (id, toProviderId, note) => {
          const provider = get().providers.find((p) => p.id === toProviderId);
          set((state) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = 'reassigned';
              state.items[index].reassignedTo = toProviderId;
              state.items[index].updatedAt = new Date();
            }
            state.expandedItemId = null;
            state.modalState = { type: null, itemId: null };
          });
          get().logAction(id, 'reassign', { toProviderId, note });
          get().showToast(`Reassigned to ${provider?.name || 'provider'}`, 'success');
        },

        bulkMarkAsRead: (ids) => set((state) => {
          ids.forEach((id) => {
            const index = state.items.findIndex((item) => item.id === id);
            if (index !== -1) {
              state.items[index].status = 'read';
              state.items[index].updatedAt = new Date();
            }
          });
          state.selectedItemIds = new Set();
        }),

        bulkComplete: (ids) => {
          set((state) => {
            ids.forEach((id) => {
              const index = state.items.findIndex((item) => item.id === id);
              if (index !== -1) {
                state.items[index].status = 'completed';
                state.items[index].completedAt = new Date();
                state.items[index].updatedAt = new Date();
              }
            });
            state.selectedItemIds = new Set();
          });
          get().showToast(`${ids.length} items completed`, 'success');
        },

        openModal: (type, itemId) => set((state) => {
          state.modalState = { type, itemId };
        }),

        closeModal: () => set((state) => {
          state.modalState = { type: null, itemId: null };
        }),

        showToast: (message, type = 'success') => {
          set((state) => {
            state.toast = { show: true, message, type };
          });
          setTimeout(() => {
            get().hideToast();
          }, 3000);
        },

        hideToast: () => set((state) => {
          state.toast = { ...state.toast, show: false };
        }),

        setLoading: (loading) => set((state) => {
          state.isLoading = loading;
        }),

        setRefreshing: (refreshing) => set((state) => {
          state.isRefreshing = refreshing;
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        fetchItems: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          try {
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to fetch items';
            });
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        refreshItems: async () => {
          set((state) => {
            state.isRefreshing = true;
          });
          try {
            await get().fetchItems();
          } finally {
            set((state) => {
              state.isRefreshing = false;
            });
          }
        },

        logAction: (itemId, action, details) => set((state) => {
          const entry: AuditLogEntry = {
            id: `audit-${Date.now()}`,
            itemId,
            action,
            performedBy: 'current-user',
            performedAt: new Date(),
            details,
          };
          state.recentActions.unshift(entry);
          if (state.recentActions.length > 100) {
            state.recentActions = state.recentActions.slice(0, 100);
          }
        }),

        getFilteredItems: () => {
          const { items, activeCategory, searchQuery, sortOptions } = get();

          let filtered = items.filter((item) => item.category === activeCategory);

          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
              (item) =>
                item.patientName.toLowerCase().includes(query) ||
                item.subject.toLowerCase().includes(query) ||
                item.chiefComplaint?.toLowerCase().includes(query) ||
                item.mrn.toLowerCase().includes(query)
            );
          }

          filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortOptions.field) {
              case 'timestamp': {
                comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                break;
              }
              case 'priority': {
                const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
                break;
              }
              case 'patientName': {
                comparison = a.patientName.localeCompare(b.patientName);
                break;
              }
              case 'status': {
                comparison = a.status.localeCompare(b.status);
                break;
              }
            }
            return sortOptions.direction === 'desc' ? -comparison : comparison;
          });

          return filtered;
        },

        getItemById: (id) => {
          return get().items.find((item) => item.id === id);
        },
      })),
      {
        name: 'attending-inbox-store',
        partialize: (state) => ({
          activeCategory: state.activeCategory,
          sortOptions: state.sortOptions,
        }),
      }
    ),
    { name: 'InboxStore' }
  )
);

export const selectActiveCategory = (state: InboxState) => state.activeCategory;
export const selectExpandedItemId = (state: InboxState) => state.expandedItemId;
export const selectIsLoading = (state: InboxState) => state.isLoading;
export const selectSearchQuery = (state: InboxState) => state.searchQuery;
export const selectToast = (state: InboxState) => state.toast;
export const selectModalState = (state: InboxState) => state.modalState;
