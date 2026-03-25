// ============================================================
// ATTENDING AI - Shared Frontend API Client
// apps/shared/lib/api/apiClient.ts
//
// Lightweight fetch wrapper for all frontend -> Next.js API calls.
// Handles the standardized response envelope, errors, and headers.
//
// Usage:
//   import { apiFetch } from '@attending/shared/lib/api/apiClient';
//
//   // GET
//   const labs = await apiFetch<LabOrder[]>('/api/labs?status=PENDING');
//
//   // POST
//   const result = await apiFetch<CreateResponse>('/api/labs', {
//     method: 'POST',
//     body: { patientId, testCode, ... },
//   });
//
//   // In Zustand stores:
//   const { data, error } = await apiFetch.safe('/api/labs');
//   if (error) { set({ error: error.message }); return; }
//   set({ labs: data });
// ============================================================

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeout?: number;
}

/**
 * Typed fetch wrapper that handles the ATTENDING API response envelope.
 * Throws ApiClientError on failure, returns typed data on success.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, timeout = 30000, headers: extraHeaders, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // Handle non-JSON responses (204, etc.)
    if (response.status === 204) {
      return {} as T;
    }

    const json: ApiEnvelope<T> = await response.json().catch(() => ({
      success: false,
      error: { code: 'PARSE_ERROR', message: 'Invalid JSON response' },
    }));

    if (!response.ok || !json.success) {
      throw new ApiClientError(
        json.error?.message || `Request failed with status ${response.status}`,
        json.error?.code || 'UNKNOWN_ERROR',
        response.status,
        json.error?.details,
      );
    }

    return json.data as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('Request timed out', 'TIMEOUT', 408);
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network error',
      'NETWORK_ERROR',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safe version that never throws - returns { data, error } tuple.
 * Ideal for Zustand stores and places where you handle errors inline.
 */
apiFetch.safe = async function<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T | null; error: ApiClientError | null }> {
  try {
    const data = await apiFetch<T>(url, options);
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof ApiClientError
        ? err
        : new ApiClientError(String(err), 'UNKNOWN', 0),
    };
  }
};

/**
 * Convenience methods matching common HTTP verbs.
 */
apiFetch.get = <T>(url: string, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(url, { ...opts, method: 'GET' });

apiFetch.post = <T>(url: string, body?: unknown, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(url, { ...opts, method: 'POST', body });

apiFetch.put = <T>(url: string, body?: unknown, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(url, { ...opts, method: 'PUT', body });

apiFetch.patch = <T>(url: string, body?: unknown, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(url, { ...opts, method: 'PATCH', body });

apiFetch.del = <T>(url: string, opts?: Omit<ApiFetchOptions, 'method' | 'body'>) =>
  apiFetch<T>(url, { ...opts, method: 'DELETE' });

/**
 * Raw fetch that returns the full envelope (data + meta) for paginated endpoints.
 */
apiFetch.paginated = async function<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<{ data: T; meta: ApiEnvelope['meta'] }> {
  const { body, timeout = 30000, headers: extraHeaders, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json: ApiEnvelope<T> = await response.json();

    if (!response.ok || !json.success) {
      throw new ApiClientError(
        json.error?.message || 'Request failed',
        json.error?.code || 'UNKNOWN_ERROR',
        response.status,
      );
    }

    return { data: json.data as T, meta: json.meta };
  } finally {
    clearTimeout(timer);
  }
};
