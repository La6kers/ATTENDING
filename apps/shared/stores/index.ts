// ============================================================
// Shared Stores - @attending/shared
// apps/shared/stores/index.ts
//
// Export store utilities and factories
// ============================================================

// Generic store factory
export { createStore, type StoreConfig } from './createStore';

// Clinical ordering store factory
export {
  createOrderingStore,
  type CatalogItem,
  type SelectedItem,
  type BaseRecommendation,
  type OrderingStoreConfig,
  type OrderingStoreState,
  type OrderingStore,
} from './createOrderingStore';

// API helpers
export { 
  apiFetch, 
  apiPost, 
  apiPatch, 
  apiDelete,
  type ApiResponse,
} from './createStore';

// Async utilities
export {
  withAsync,
  initialAsyncState,
  type AsyncState,
} from './createStore';
