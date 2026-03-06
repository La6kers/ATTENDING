// =============================================================================
// ATTENDING AI — Shared Backend Proxy
// apps/shared/lib/api/backendProxy.ts
//
// Single canonical implementation used by both provider-portal and
// patient-portal BFF layers. Both portals import from this module.
//
// Pattern:
//   1. Attempt to proxy the request to the .NET backend (CQRS pipeline).
//   2. If unavailable, return false → caller falls back to direct Prisma.
//
// The circuit breaker prevents health-check spam after a failure:
// after the first failure it waits 30 s before re-probing.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Configuration
// =============================================================================

const BACKEND_URL        = process.env.BACKEND_API_URL || 'http://localhost:5080';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.BACKEND_TIMEOUT_MS || '5000', 10);
const HEALTH_COOLDOWN_MS = 30_000;

// Circuit-breaker state (module-level singleton, reset on process restart)
let backendHealthy   = true;
let lastFailureAt    = 0;

// =============================================================================
// Error class
// =============================================================================

export class BackendError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(message: string, status: number, detail = '') {
    super(message);
    this.name   = 'BackendError';
    this.status = status;
    this.detail = detail;
  }
}

// =============================================================================
// Core typed fetch
// =============================================================================

export async function backendFetch<T = unknown>(
  path: string,
  options: {
    method?:  string;
    body?:    unknown;
    headers?: Record<string, string>;
    token?:   string;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, token, timeout = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), timeout);

  try {
    const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timerId);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new BackendError(`Backend ${response.status}`, response.status, detail);
    }

    backendHealthy = true;

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timerId);
    if (err instanceof BackendError) throw err;

    backendHealthy = false;
    lastFailureAt  = Date.now();

    throw new BackendError(
      err instanceof Error ? err.message : 'Backend unreachable',
      503
    );
  }
}

// =============================================================================
// Health check (with circuit-breaker cooldown)
// =============================================================================

export async function isBackendAvailable(): Promise<boolean> {
  if (backendHealthy) return true;
  if (Date.now() - lastFailureAt < HEALTH_COOLDOWN_MS) return false;

  try {
    const controller = new AbortController();
    const timerId    = setTimeout(() => controller.abort(), 2_000);
    const res = await fetch(`${BACKEND_URL}/health/live`, { signal: controller.signal });
    clearTimeout(timerId);
    backendHealthy = res.ok;
    lastFailureAt  = Date.now();
    return backendHealthy;
  } catch {
    backendHealthy = false;
    lastFailureAt  = Date.now();
    return false;
  }
}

// =============================================================================
// Full request proxy
// =============================================================================

/**
 * Proxy a Next.js API request to the .NET backend.
 *
 * Returns true  → backend handled the request (caller should return).
 * Returns false → backend unavailable; caller should fall back to Prisma.
 */
export async function proxyToBackend(
  req: NextApiRequest,
  res: NextApiResponse,
  backendPath: string,
  options: {
    transformRequest?:  (body: unknown)   => unknown;
    transformResponse?: (data: unknown)   => unknown;
    token?:             string;
  } = {}
): Promise<boolean> {
  if (!(await isBackendAvailable())) return false;

  try {
    const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
    const body    = isWrite
      ? (options.transformRequest ? options.transformRequest(req.body) : req.body)
      : undefined;

    const qs       = new URLSearchParams(req.query as Record<string, string>).toString();
    const fullPath = qs ? `${backendPath}?${qs}` : backendPath;

    const data = await backendFetch(fullPath, {
      method: req.method ?? 'GET',
      body,
      token: options.token,
    });

    const payload = options.transformResponse ? options.transformResponse(data) : data;
    res.status(200).json(payload);
    return true;
  } catch (err) {
    if (err instanceof BackendError && err.status >= 400 && err.status < 500) {
      // Client errors (400, 401, 403, 404, 409, 422) — forward directly
      res.status(err.status).json({ error: err.message, detail: err.detail });
      return true;
    }
    // Server / network errors — caller falls back to Prisma
    console.warn(`[BackendProxy] ${backendPath} unavailable, falling back to Prisma:`, err);
    // Attach staleness header so clients know data comes from the Prisma
    // fallback path and may lack CQRS-side enrichments (domain events,
    // real-time SignalR notifications, etc.).
    res.setHeader('X-Data-Source', 'prisma-fallback');
    res.setHeader('X-Backend-Status', 'unavailable');
    return false;
  }
}

// =============================================================================
// BFF → .NET path map
// =============================================================================

/** Standard path mappings used by generic proxy routes. */
export const BACKEND_PATH_MAP: Record<string, string> = {
  '/api/assessments': '/api/v1/assessments',
  '/api/labs':        '/api/v1/laborders',
  '/api/imaging':     '/api/v1/imagingorders',
  '/api/prescriptions': '/api/v1/medications',
  '/api/referrals':   '/api/v1/referrals',
  '/api/patients':    '/api/v1/patients',
  '/api/encounters':  '/api/v1/encounters',
};
