// ============================================================
// ATTENDING AI — API Client
// apps/patient-portal/lib/api/client.ts
//
// Base HTTP client for patient portal → .NET backend.
// Handles auth tokens, error mapping, retry, and offline queue.
// ============================================================

import { offlineSync } from '../offline';

// ============================================================
// Config
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:5000';

export type ApiTarget = 'next' | 'backend';

// ============================================================
// Types
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
  target?: ApiTarget;
  /** Skip auth header (public endpoints) */
  noAuth?: boolean;
  /** Queue for offline sync if request fails */
  offlineQueue?: boolean;
  /** Timeout in ms (default 15000) */
  timeout?: number;
  /** Idempotency key for POST/PUT */
  idempotencyKey?: string;
}

// ============================================================
// Token management
// ============================================================

// Token storage using sessionStorage (client-side only) to prevent
// cross-request token leakage in SSR environments.
// In SSR context, tokens are passed via httpOnly cookies (credentials: 'include').

const TOKEN_STORAGE_KEY = 'attending_access_token';

// Track in-flight refresh to prevent duplicate requests (client-side only)
let refreshPromise: Promise<string | null> | null = null;

function isClientSide(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function setAccessToken(token: string | null): void {
  if (!isClientSide()) return; // No-op in SSR

  if (token) {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAccessToken(): string | null {
  if (!isClientSide()) return null; // SSR uses httpOnly cookies
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearAccessToken(): void {
  if (!isClientSide()) return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function refreshToken(): Promise<string | null> {
  // Only allow refresh on client-side
  if (!isClientSide()) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      clearAccessToken();
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
// Core fetch wrapper
// ============================================================

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    target = 'next',
    noAuth = false,
    offlineQueue = false,
    timeout = 15000,
    idempotencyKey,
    body,
    headers: extraHeaders,
    ...fetchOptions
  } = options;

  const baseUrl = target === 'backend' ? `${BACKEND_URL}/api/v1` : API_BASE;
  const url = `${baseUrl}${path}`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  const token = getAccessToken();
  if (!noAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  // Abort controller for timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timer);

    // Handle 401 — try refresh
    if (response.status === 401 && !noAuth) {
      const newToken = await refreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
        return parseResponse<T>(retryResponse);
      }
      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return { data: null, error: { status: 401, code: 'UNAUTHORIZED', message: 'Session expired' }, ok: false };
    }

    return parseResponse<T>(response);
  } catch (err: any) {
    clearTimeout(timer);

    // Network error — queue for offline sync
    if (offlineQueue && body && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) {
      try {
        await offlineSync?.queueRequest?.({ url: path, method: fetchOptions.method, body });
      } catch {
        // Offline queue unavailable
      }
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
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (response.ok) {
    return { data: data as T, error: null, ok: true };
  }

  // Map ProblemDetails or generic error
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
