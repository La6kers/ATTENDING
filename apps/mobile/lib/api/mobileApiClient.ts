// ============================================================
// ATTENDING AI — Mobile API Client
// apps/mobile/lib/api/mobileApiClient.ts
//
// Adapted from apps/patient-portal/lib/api/client.ts
// Replaces sessionStorage with expo-secure-store,
// replaces window.location redirect with expo-router navigation.
// ============================================================

import { router } from 'expo-router';
import { secureTokenStore } from '../auth/secureTokenStore';
import { API_CONFIG } from '../constants';

// ============================================================
// Types (same as web client)
// ============================================================

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
  ok: boolean;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  target?: 'next' | 'backend';
  noAuth?: boolean;
  offlineQueue?: boolean;
  timeout?: number;
  idempotencyKey?: string;
}

// ============================================================
// Token refresh dedup
// ============================================================

let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshTok = await secureTokenStore.getRefreshToken();
      if (!refreshTok) return null;

      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTok }),
      });
      if (res.ok) {
        const data = await res.json();
        await secureTokenStore.setAccessToken(data.accessToken);
        if (data.refreshToken) {
          await secureTokenStore.setRefreshToken(data.refreshToken);
        }
        return data.accessToken as string;
      }
      await secureTokenStore.clearAll();
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============================================================
// Offline queue stub — wired in Phase 3 (mobileSyncManager)
// ============================================================

let offlineQueueFn: ((req: { url: string; method: string; body: unknown }) => Promise<void>) | null = null;

export function setOfflineQueueHandler(
  handler: (req: { url: string; method: string; body: unknown }) => Promise<void>
) {
  offlineQueueFn = handler;
}

// ============================================================
// Core fetch
// ============================================================

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    target = 'next',
    noAuth = false,
    offlineQueue = false,
    timeout = API_CONFIG.TIMEOUT,
    idempotencyKey,
    body,
    headers: extraHeaders,
    ...fetchOptions
  } = options;

  const baseUrl = target === 'backend'
    ? `${API_CONFIG.BACKEND_URL}/api/v1`
    : API_CONFIG.BASE_URL;
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (!noAuth) {
    const token = await secureTokenStore.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 401 — try refresh
    if (response.status === 401 && !noAuth) {
      const newToken = await refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        return parseResponse<T>(retryResponse);
      }
      // Refresh failed — navigate to login
      router.replace('/(auth)/login');
      return {
        data: null,
        error: { status: 401, code: 'UNAUTHORIZED', message: 'Session expired' },
        ok: false,
      };
    }

    return parseResponse<T>(response);
  } catch (err: any) {
    clearTimeout(timer);

    // Queue for offline sync
    if (offlineQueue && body && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) {
      try {
        await offlineQueueFn?.({ url: path, method: fetchOptions.method!, body });
      } catch { /* queue unavailable */ }
      return {
        data: null,
        error: { status: 0, code: 'OFFLINE_QUEUED', message: 'Request queued for when you\'re back online' },
        ok: false,
      };
    }

    const message = err.name === 'AbortError' ? 'Request timed out' : 'Network error';
    return {
      data: null,
      error: { status: 0, code: 'NETWORK_ERROR', message },
      ok: false,
    };
  }
}

// ============================================================
// Response parser
// ============================================================

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  if (response.status === 204) {
    return { data: null as T, error: null, ok: true };
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try { data = await response.json(); } catch { data = null; }
  }

  if (response.ok) {
    return { data: data as T, error: null, ok: true };
  }

  const error: ApiError = {
    status: response.status,
    code: data?.title ?? data?.code ?? `HTTP_${response.status}`,
    message: data?.detail ?? data?.message ?? response.statusText,
    details: data?.errors,
  };

  return { data: null, error, ok: false };
}

// ============================================================
// Convenience methods
// ============================================================

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};

export default api;
