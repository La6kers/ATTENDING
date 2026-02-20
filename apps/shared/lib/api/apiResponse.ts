// ============================================================
// ATTENDING AI - Standardized API Response Utilities
// apps/shared/lib/api/apiResponse.ts
//
// Provides a consistent response envelope for ALL API routes.
// Ensures error codes, messages, and metadata are uniform
// across the platform for reliable client-side handling.
//
// RESPONSE ENVELOPE:
//
//   Success: {
//     success: true,
//     data: { ... },
//     meta?: { page, limit, total, apiVersion }
//   }
//
//   Error: {
//     success: false,
//     error: {
//       code: 'VALIDATION_ERROR',
//       message: 'Human-readable description',
//       details?: { ... }
//     },
//     meta: { timestamp, requestId?, apiVersion }
//   }
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { API_VERSION_FULL } from './apiVersion';

// ============================================================
// TYPES
// ============================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta: ResponseMeta;
}

export interface ApiError {
  /** Machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional details (validation errors, field-level issues) */
  details?: Record<string, unknown> | unknown[];
}

export interface ResponseMeta {
  timestamp: string;
  apiVersion: string;
  requestId?: string;
  /** Pagination info */
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================
// STANDARD ERROR CODES
// ============================================================

export const ErrorCodes = {
  // 400
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // 401
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // 403
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  CSRF_TOKEN_INVALID: 'CSRF_TOKEN_INVALID',

  // 404
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  ENCOUNTER_NOT_FOUND: 'ENCOUNTER_NOT_FOUND',

  // 405
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',

  // 409
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // 429
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================
// RESPONSE HELPERS
// ============================================================

function buildMeta(req?: NextApiRequest, extra?: Partial<ResponseMeta>): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION_FULL,
    requestId: req?.headers['x-request-id'] as string || crypto.randomUUID(),
    ...extra,
  };
}

/**
 * Send a successful API response.
 *
 * @example
 * return sendSuccess(res, { patients }, { total: 42, page: 1, limit: 20 });
 */
export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  meta?: Partial<ResponseMeta>,
  statusCode: number = 200
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: meta ? { timestamp: new Date().toISOString(), apiVersion: API_VERSION_FULL, ...meta } : undefined,
  };
  res.status(statusCode).json(response);
}

/**
 * Send an error API response.
 *
 * @example
 * return sendError(res, 404, 'PATIENT_NOT_FOUND', 'Patient not found');
 * return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid input', { fields: zodErrors });
 */
export function sendError(
  res: NextApiResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown> | unknown[],
  req?: NextApiRequest
): void {
  const response: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details && { details }) },
    meta: buildMeta(req),
  };
  res.status(statusCode).json(response);
}

// ============================================================
// COMMON ERROR SHORTCUTS
// ============================================================

/** 400 Bad Request */
export function sendBadRequest(
  res: NextApiResponse, message: string = 'Bad request', details?: any, req?: NextApiRequest
): void {
  sendError(res, 400, ErrorCodes.BAD_REQUEST, message, details, req);
}

/** 400 Validation Error (for Zod/schema validation failures) */
export function sendValidationError(
  res: NextApiResponse, errors: any, req?: NextApiRequest
): void {
  // Normalize Zod errors into a consistent format
  const details = Array.isArray(errors)
    ? errors
    : errors?.issues
      ? errors.issues.map((issue: any) => ({
          field: issue.path?.join('.'),
          message: issue.message,
          code: issue.code,
        }))
      : errors;

  sendError(res, 400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', details, req);
}

/** 401 Unauthorized */
export function sendUnauthorized(
  res: NextApiResponse, message: string = 'Authentication required', req?: NextApiRequest
): void {
  sendError(res, 401, ErrorCodes.UNAUTHORIZED, message, undefined, req);
}

/** 403 Forbidden */
export function sendForbidden(
  res: NextApiResponse, message: string = 'Insufficient permissions', req?: NextApiRequest
): void {
  sendError(res, 403, ErrorCodes.INSUFFICIENT_PERMISSIONS, message, undefined, req);
}

/** 404 Not Found */
export function sendNotFound(
  res: NextApiResponse, resource: string = 'Resource', req?: NextApiRequest
): void {
  sendError(res, 404, ErrorCodes.NOT_FOUND, `${resource} not found`, undefined, req);
}

/** 405 Method Not Allowed */
export function sendMethodNotAllowed(
  res: NextApiResponse, allowed: string[], req?: NextApiRequest
): void {
  res.setHeader('Allow', allowed);
  sendError(res, 405, ErrorCodes.METHOD_NOT_ALLOWED, `Method not allowed. Use: ${allowed.join(', ')}`, undefined, req);
}

/** 429 Rate Limited */
export function sendRateLimited(
  res: NextApiResponse, retryAfter?: number, req?: NextApiRequest
): void {
  if (retryAfter) res.setHeader('Retry-After', retryAfter);
  sendError(res, 429, ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many requests', { retryAfter }, req);
}

/** 500 Internal Error (masks sensitive details) */
export function sendInternalError(
  res: NextApiResponse, error?: unknown, req?: NextApiRequest
): void {
  // Log the real error server-side
  if (error) {
    console.error('[API Error]', error instanceof Error ? error.message : error);
  }
  // Return generic message to client (no PHI/stack traces)
  sendError(res, 500, ErrorCodes.INTERNAL_ERROR, 'An internal error occurred', undefined, req);
}

// ============================================================
// PAGINATION HELPER
// ============================================================

/**
 * Send a paginated success response.
 *
 * @example
 * return sendPaginated(res, patients, { page: 1, limit: 20, total: 142 });
 */
export function sendPaginated<T>(
  res: NextApiResponse,
  data: T,
  pagination: { page: number; limit: number; total: number },
): void {
  sendSuccess(res, data, {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: Math.ceil(pagination.total / pagination.limit),
  });
}

export default {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendMethodNotAllowed,
  sendRateLimited,
  sendInternalError,
  sendPaginated,
  ErrorCodes,
};
