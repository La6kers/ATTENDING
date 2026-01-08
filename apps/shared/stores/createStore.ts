// ============================================================
// Store Factory - @attending/shared
// apps/shared/stores/createStore.ts
//
// Factory function for creating Zustand stores with:
// - Immer for immutable updates
// - DevTools for debugging
// - Optional persistence
// ============================================================

import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { devtools, persist, PersistOptions } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================
// TYPES
// ============================================================

type ImmerStateCreator<T> = StateCreator<
  T,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  T
>;

export interface StoreConfig<T> {
  /** Store name (used for DevTools and persistence) */
  name: string;
  /** Enable persistence to localStorage */
  persist?: Partial<PersistOptions<T>> | boolean;
}

// ============================================================
// STORE FACTORY
// ============================================================

/**
 * Create a Zustand store with Immer and DevTools pre-configured
 * 
 * @param storeCreator - State creator function using Immer syntax
 * @param config - Store configuration
 * @returns Zustand store hook
 * 
 * @example
 * interface CounterState {
 *   count: number;
 *   increment: () => void;
 * }
 * 
 * const useCounterStore = createStore<CounterState>(
 *   (set) => ({
 *     count: 0,
 *     increment: () => set(state => { state.count += 1 }),
 *   }),
 *   { name: 'counter-store' }
 * );
 */
export function createStore<T>(
  storeCreator: ImmerStateCreator<T>,
  config: StoreConfig<T>
): UseBoundStore<StoreApi<T>> {
  // Apply middleware in order: immer -> devtools -> persist (optional)
  let store: any = immer(storeCreator);
  store = devtools(store, { name: config.name });
  
  if (config.persist) {
    const persistConfig: PersistOptions<T> = typeof config.persist === 'boolean'
      ? { name: config.name }
      : { name: config.name, ...config.persist };
    
    store = persist(store, persistConfig);
  }
  
  return create(store);
}

// ============================================================
// API HELPERS
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * Fetch wrapper with error handling and JSON parsing
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Response with data or error
 * 
 * @example
 * const { data, error } = await apiFetch<Assessment[]>('/api/assessments');
 * if (error) {
 *   console.error(error);
 * } else {
 *   setAssessments(data);
 * }
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const status = response.status;

    if (!response.ok) {
      let errorMessage = `HTTP ${status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Response wasn't JSON
      }
      return { data: null, error: errorMessage, status };
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return { data: null, error: null, status };
    }

    const data = JSON.parse(text) as T;
    return { data, error: null, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return { data: null, error: message, status: 0 };
  }
}

/**
 * POST helper
 */
export async function apiPost<T, R = any>(
  url: string,
  data: T
): Promise<ApiResponse<R>> {
  return apiFetch<R>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH helper
 */
export async function apiPatch<T, R = any>(
  url: string,
  data: T
): Promise<ApiResponse<R>> {
  return apiFetch<R>(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE helper
 */
export async function apiDelete<R = any>(url: string): Promise<ApiResponse<R>> {
  return apiFetch<R>(url, { method: 'DELETE' });
}

// ============================================================
// STORE UTILITIES
// ============================================================

/**
 * Create loading/error state helpers
 */
export interface AsyncState {
  loading: boolean;
  error: string | null;
}

export const initialAsyncState: AsyncState = {
  loading: false,
  error: null,
};

/**
 * Create async action wrapper for stores
 * 
 * @example
 * fetchData: async () => {
 *   await withAsync(set, get, async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   }, (data) => {
 *     set(state => { state.data = data });
 *   });
 * }
 */
export async function withAsync<T, S extends AsyncState>(
  set: (fn: (state: S) => void) => void,
  asyncFn: () => Promise<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): Promise<T | null> {
  set(state => {
    state.loading = true;
    state.error = null;
  });

  try {
    const result = await asyncFn();
    set(state => { state.loading = false; });
    onSuccess?.(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    set(state => {
      state.loading = false;
      state.error = message;
    });
    onError?.(message);
    return null;
  }
}
