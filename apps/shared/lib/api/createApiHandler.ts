/**
 * ATTENDING AI - Standardized API Handler Wrapper
 * apps/shared/lib/api/createApiHandler.ts
 * 
 * Wraps Next.js API route handlers with:
 * - Consistent error response format
 * - Audit logging for all requests
 * - Request timing metrics
 * - HIPAA-compliant error sanitization (no stack traces in production)
 * 
 * Usage:
 *   import { createApiHandler } from '@attending/shared/lib/api/createApiHandler';
 *   
 *   export default createApiHandler(async (req, res) => {
 *     const data = await fetchData();
 *     res.status(200).json({ success: true, data });
 *   });
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ============================================================================
// Types
// ============================================================================

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) => Promise<void>;

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Common Error Factories
// ============================================================================

export const errors = {
  badRequest: (message: string) => new ApiError(400, 'BAD_REQUEST', message),
  unauthorized: (message = 'Authentication required') => new ApiError(401, 'AUTH_REQUIRED', message),
  forbidden: (message = 'Insufficient permissions') => new ApiError(403, 'FORBIDDEN', message),
  notFound: (resource: string) => new ApiError(404, 'NOT_FOUND', `${resource} not found`),
  methodNotAllowed: (allowed: string[]) => new ApiError(405, 'METHOD_NOT_ALLOWED', `Allowed methods: ${allowed.join(', ')}`),
  conflict: (message: string) => new ApiError(409, 'CONFLICT', message),
  internal: (message = 'Internal server error') => new ApiError(500, 'INTERNAL_ERROR', message),
};

// ============================================================================
// Handler Wrapper
// ============================================================================

interface CreateApiHandlerOptions {
  /** Allowed HTTP methods. If not set, all methods are allowed. */
  methods?: string[];
  /** Whether to log request details (default: true) */
  audit?: boolean;
}

export function createApiHandler(
  handler: ApiHandler,
  options: CreateApiHandlerOptions = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const { methods, audit = true } = options;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // Set request ID header for tracing
    res.setHeader('x-request-id', requestId);

    try {
      // Method check
      if (methods && !methods.includes(req.method || '')) {
        throw errors.methodNotAllowed(methods);
      }

      // Execute the handler
      await handler(req, res);

      // Audit log successful requests
      if (audit) {
        const duration = Date.now() - startTime;
        console.info('[API]', {
          requestId,
          method: req.method,
          path: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          userId: req.headers['x-session-ref'] || 'unknown',
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ApiError) {
        // Known application errors
        if (audit) {
          console.warn('[API ERROR]', {
            requestId,
            method: req.method,
            path: req.url,
            code: error.code,
            status: error.statusCode,
            message: error.message,
            duration: `${duration}ms`,
          });
        }

        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            requestId,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        // Unexpected errors - log full details, return sanitized response
        console.error('[API UNEXPECTED ERROR]', {
          requestId,
          method: req.method,
          path: req.url,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV !== 'production' 
            ? (error instanceof Error ? error.stack : undefined)
            : undefined,
          duration: `${duration}ms`,
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : (error instanceof Error ? error.message : 'Unknown error'),
            requestId,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  };
}

export default createApiHandler;
