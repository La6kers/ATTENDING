// ============================================================
// ATTENDING AI - Standardized API Error Responses
// apps/shared/lib/apiErrors.ts
//
// All API routes should use these helpers for consistent error
// responses. Format follows RFC 7807 (Problem Details for HTTP APIs)
// adapted for healthcare compliance.
//
// Standard response envelope:
// {
//   success: boolean,
//   data?: T,                      // on success
//   error?: {                      // on failure
//     code: string,                // Machine-readable error code
//     message: string,             // Human-readable description
//     details?: Record<string, unknown>,
//     validationErrors?: { field: string, message: string }[],
//   },
//   meta?: {
//     requestId?: string,
//     timestamp: string,
//     apiVersion: string,
//   }
// }
// ============================================================

import type { NextApiResponse } from 'next';

// ============================================================
// TYPES
// ============================================================

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
  meta: {
    requestId?: string;
    timestamp: string;
    apiVersion: string;
  };
}

// ============================================================
// ERROR CODES (machine-readable, consistent across all routes)
// ============================================================

export const ErrorCodes = {
  // Authentication (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MFA_REQUIRED: 'MFA_REQUIRED',

  // Authorization (403)
  FORBIDDEN: 'FORBIDDEN',
  ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
  PROVIDER_REQUIRED: 'PROVIDER_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Client errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Not found (404)
  NOT_FOUND: 'NOT_FOUND',
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  ENCOUNTER_NOT_FOUND: 'ENCOUNTER_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',

  // Conflict (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  STALE_DATA: 'STALE_DATA',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Security
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  CSRF_INVALID: 'CSRF_INVALID',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================
// API ERROR CLASS
// ============================================================

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly validationErrors?: ValidationError[];

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options?: {
      details?: Record<string, unknown>;
      validationErrors?: ValidationError[];
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.validationErrors = options?.validationErrors;
    if (options?.cause) this.cause = options.cause;
  }

  // ---- Factory methods for common errors ----

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new ApiError(400, ErrorCodes.BAD_REQUEST, message, { details });
  }

  static validation(errors: ValidationError[]) {
    return new ApiError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
      validationErrors: errors,
    });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, ErrorCodes.AUTH_REQUIRED, message);
  }

  static sessionExpired() {
    return new ApiError(401, ErrorCodes.SESSION_EXPIRED, 'Session has expired. Please sign in again.');
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, ErrorCodes.FORBIDDEN, message);
  }

  static roleForbidden(requiredRoles: string[], userRole: string) {
    return new ApiError(403, ErrorCodes.ROLE_FORBIDDEN, 'Insufficient permissions for this resource', {
      details: { requiredRoles, userRole },
    });
  }

  static notFound(entity: string, id?: string) {
    const message = id ? `${entity} not found: ${id}` : `${entity} not found`;
    return new ApiError(404, ErrorCodes.NOT_FOUND, message, {
      details: { entity, id },
    });
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new ApiError(409, ErrorCodes.CONFLICT, message, { details });
  }

  static rateLimited(retryAfterMs?: number) {
    return new ApiError(429, ErrorCodes.RATE_LIMITED, 'Rate limit exceeded. Please try again later.', {
      details: retryAfterMs ? { retryAfterMs } : undefined,
    });
  }

  static internal(message = 'An unexpected error occurred', cause?: unknown) {
    return new ApiError(500, ErrorCodes.INTERNAL_ERROR, message, { cause });
  }

  static database(message = 'A database error occurred', cause?: unknown) {
    return new ApiError(500, ErrorCodes.DATABASE_ERROR, message, { cause });
  }

  static aiService(message = 'AI service is temporarily unavailable', cause?: unknown) {
    return new ApiError(500, ErrorCodes.AI_SERVICE_ERROR, message, { cause });
  }
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

const API_VERSION = '1.0.0';

function buildMeta(requestId?: string) {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION,
  };
}

/**
 * Send a successful API response.
 */
export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  statusCode = 200,
  requestId?: string
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: buildMeta(requestId),
  };
  res.status(statusCode).json(response);
}

/**
 * Send an error API response.
 */
export function sendError(
  res: NextApiResponse,
  error: ApiError | Error | unknown,
  requestId?: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (error instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        validationErrors: error.validationErrors,
      },
      meta: buildMeta(requestId),
    };
    res.status(error.statusCode).json(response);
    return;
  }

  // Unexpected errors — hide details in production
  const message = isProduction
    ? 'An unexpected error occurred'
    : error instanceof Error
      ? error.message
      : 'Unknown error';

  console.error('[API Error]', error);

  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
    },
    meta: buildMeta(requestId),
  };
  res.status(500).json(response);
}

/**
 * Wrap an API handler with automatic error handling.
 * Catches thrown ApiErrors and sends proper responses.
 */
export function withErrorHandler(
  handler: (req: any, res: NextApiResponse) => Promise<void>
) {
  return async (req: any, res: NextApiResponse) => {
    const requestId = req.headers?.['x-request-id'] as string | undefined;
    try {
      await handler(req, res);
    } catch (error) {
      sendError(res, error, requestId);
    }
  };
}

export default {
  ApiError,
  ErrorCodes,
  sendSuccess,
  sendError,
  withErrorHandler,
};
