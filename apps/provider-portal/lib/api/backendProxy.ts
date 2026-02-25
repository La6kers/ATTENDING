// =============================================================================
// ATTENDING AI - Backend Proxy Utility
// apps/provider-portal/lib/api/backendProxy.ts
//
// Utility for BFF (Next.js) routes to proxy requests to the .NET backend API.
// Falls back to direct Prisma access when the .NET backend is unavailable.
//
// This enables the architectural transition from Prisma-direct BFF routes
// to proper BFF-to-.NET proxying without breaking existing functionality.
//
// Usage in API routes:
//   import { proxyToBackend, isBackendAvailable } from '@/lib/api/backendProxy';
//
//   // Option A: proxy entire request
//   export default async function handler(req, res) {
//     const proxied = await proxyToBackend(req, res, '/api/v1/laborders');
//     if (proxied) return; // .NET handled it
//     // Fallback to Prisma...
//   }
//
//   // Option B: check and call
//   if (await isBackendAvailable()) {
//     const data = await backendFetch('/api/v1/laborders/pending');
//   }
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Configuration
// =============================================================================

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';
const BACKEND_TIMEOUT_MS = parseInt(process.env.BACKEND_TIMEOUT_MS || '5000', 10);

// Simple circuit breaker state (in-process; fine for single-instance BFF)
let backendHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 30_000; // Re-check every 30s after failure

// =============================================================================
// Core: Fetch from .NET backend
// =============================================================================

/**
 * Make a typed fetch call to the .NET backend.
 * Throws on non-2xx responses or network errors.
 */
export async function backendFetch<T = any>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    token?: string;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, token, timeout = BACKEND_TIMEOUT_MS } = options;

  const url = `${BACKEND_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      fetchHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new BackendError(
        `Backend returned ${response.status}`,
        response.status,
        errorBody
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    backendHealthy = true;
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof BackendError) {
      throw error;
    }

    // Network error or timeout — mark backend as unhealthy
    backendHealthy = false;
    lastHealthCheck = Date.now();

    throw new BackendError(
      error instanceof Error ? error.message : 'Backend unavailable',
      503,
      ''
    );
  }
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check if the .NET backend is reachable.
 * Uses a simple circuit breaker: if recently failed, returns false
 * without making a request until the cooldown period expires.
 */
export async function isBackendAvailable(): Promise<boolean> {
  // If we know it's healthy, return true
  if (backendHealthy) return true;

  // If we recently checked and it was down, don't spam health checks
  if (Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${BACKEND_URL}/health/live`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    backendHealthy = response.ok;
    lastHealthCheck = Date.now();
    return backendHealthy;
  } catch {
    backendHealthy = false;
    lastHealthCheck = Date.now();
    return false;
  }
}

// =============================================================================
// Full Request Proxy
// =============================================================================

/**
 * Proxy an entire Next.js API request to the .NET backend.
 * Returns true if the backend handled the request, false if caller should fallback.
 *
 * @param req  Next.js request
 * @param res  Next.js response
 * @param backendPath  The .NET API path (e.g., '/api/v1/laborders')
 * @param options  Additional options
 * @returns true if proxied successfully, false if backend unavailable
 */
export async function proxyToBackend(
  req: NextApiRequest,
  res: NextApiResponse,
  backendPath: string,
  options: {
    /** Transform the request body before sending to backend */
    transformRequest?: (body: any) => any;
    /** Transform the response data before sending to client */
    transformResponse?: (data: any) => any;
    /** Extract bearer token from session/request */
    token?: string;
  } = {}
): Promise<boolean> {
  // Check backend availability
  if (!(await isBackendAvailable())) {
    return false;
  }

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? (options.transformRequest ? options.transformRequest(req.body) : req.body)
      : undefined;

    // Forward query params
    const queryString = new URLSearchParams(
      req.query as Record<string, string>
    ).toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;

    const data = await backendFetch(fullPath, {
      method: req.method || 'GET',
      body,
      token: options.token,
    });

    const responseData = options.transformResponse
      ? options.transformResponse(data)
      : data;

    res.status(200).json(responseData);
    return true;
  } catch (error) {
    if (error instanceof BackendError && error.status >= 400 && error.status < 500) {
      // Client errors (400, 404, 409, etc.) — forward to client
      res.status(error.status).json({
        error: error.message,
        detail: error.detail,
      });
      return true;
    }

    // Server errors or network failures — let caller fallback to Prisma
    console.warn(`[BackendProxy] ${backendPath} failed, falling back:`, error);
    return false;
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class BackendError extends Error {
  status: number;
  detail: string;

  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.detail = detail;
  }
}

// =============================================================================
// Utility: Map BFF paths to .NET backend paths
// =============================================================================

/**
 * Common path mappings from BFF API routes to .NET backend endpoints.
 * Used by the generic proxy route.
 */
export const BACKEND_PATH_MAP: Record<string, string> = {
  // Assessments
  '/api/assessments': '/api/v1/assessments',
  // Lab Orders
  '/api/labs': '/api/v1/laborders',
  // Imaging Orders
  '/api/imaging': '/api/v1/imagingorders',
  // Medications
  '/api/prescriptions': '/api/v1/medications',
  // Referrals
  '/api/referrals': '/api/v1/referrals',
  // Patients
  '/api/patients': '/api/v1/patients',
  // Encounters
  '/api/encounters': '/api/v1/encounters',
};
