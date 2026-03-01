// =============================================================================
// ATTENDING AI — Patient Portal Backend Proxy
// apps/patient-portal/lib/backendProxy.ts
//
// Mirrors the provider-portal's backendProxy.ts for consistency.
// Enables the patient portal BFF to route requests through the
// .NET backend (CQRS/MediatR) when available, falling back to
// direct Prisma when .NET is unavailable.
//
// This is critical for the core loop: patient assessment submission
// should flow through the .NET domain layer for validation, domain
// events (SignalR notifications to providers), and audit logging.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Configuration
// =============================================================================

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';
const BACKEND_TIMEOUT_MS = parseInt(process.env.BACKEND_TIMEOUT_MS || '5000', 10);

// Circuit breaker state
let backendHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

// =============================================================================
// Backend Fetch
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
    if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new BackendError(`Backend returned ${response.status}`, response.status, errorBody);
    }

    if (response.status === 204) return {} as T;

    backendHealthy = true;
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof BackendError) throw error;
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

export async function isBackendAvailable(): Promise<boolean> {
  if (backendHealthy) return true;
  if (Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${BACKEND_URL}/health/live`, { signal: controller.signal });
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

export async function proxyToBackend(
  req: NextApiRequest,
  res: NextApiResponse,
  backendPath: string,
  options: {
    transformRequest?: (body: any) => any;
    transformResponse?: (data: any) => any;
    token?: string;
  } = {}
): Promise<boolean> {
  if (!(await isBackendAvailable())) return false;

  try {
    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? options.transformRequest
          ? options.transformRequest(req.body)
          : req.body
        : undefined;

    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;

    const data = await backendFetch(fullPath, {
      method: req.method || 'GET',
      body,
      token: options.token,
    });

    const responseData = options.transformResponse ? options.transformResponse(data) : data;
    res.status(200).json(responseData);
    return true;
  } catch (error) {
    if (error instanceof BackendError && error.status >= 400 && error.status < 500) {
      res.status(error.status).json({ error: error.message, detail: error.detail });
      return true;
    }
    console.warn(`[PatientProxy] ${backendPath} failed, falling back:`, error);
    return false;
  }
}
