// =============================================================================
// Generic .NET Backend Proxy Route
// pages/api/backend/[...path].ts
//
// Catches requests to /api/backend/* and forwards them to the .NET backend.
// This enables the provider portal to talk to the .NET API without CORS issues
// while keeping the BFF pattern intact.
//
// Examples:
//   GET  /api/backend/v1/patients       → GET  http://localhost:5000/api/v1/patients
//   POST /api/backend/v1/laborders      → POST http://localhost:5000/api/v1/laborders
//   GET  /api/backend/health            → GET  http://localhost:5000/health
//
// If the .NET backend is unavailable, returns 503 with a clear error message.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { backendFetch, isBackendAvailable, BackendError } from '@/lib/api/backendProxy';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Reconstruct the backend path from the catch-all segments
  const { path } = req.query;
  const segments = Array.isArray(path) ? path : [path];
  const backendPath = '/' + segments.filter(Boolean).join('/');

  // Quick availability check
  if (!(await isBackendAvailable())) {
    return res.status(503).json({
      error: 'Backend service unavailable',
      message: 'The .NET backend API is not reachable. Ensure it is running on the configured port.',
    });
  }

  try {
    // Forward query params (exclude the catch-all `path` param)
    const queryParams = { ...req.query };
    delete queryParams.path;
    const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;

    // Extract bearer token from the request if present
    const token = req.headers.authorization?.replace('Bearer ', '') || undefined;

    const body = req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined;

    const data = await backendFetch(fullPath, {
      method: req.method || 'GET',
      body,
      token,
    });

    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof BackendError) {
      return res.status(error.status).json({
        error: error.message,
        detail: error.detail,
      });
    }

    console.error('[BackendProxy] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
