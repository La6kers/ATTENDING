// ============================================================
// Shared Stores - @attending/shared
// apps/shared/stores/index.ts
//
// Export store utilities and factories
// ============================================================

// Store factory
export { createStore, type StoreConfig } from './createStore';

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
