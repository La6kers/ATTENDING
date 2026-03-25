// ============================================================
// ATTENDING AI - Standardized API Response Utilities
// apps/shared/lib/api/response.ts
//
// Consistent API response format across all endpoints
// Includes success/error wrappers, pagination, and validation
//
// Response Format:
// {
//   success: boolean;
//   data?: T;
//   error?: { code: string; message: string; details?: any };
//   meta?: { pagination, timing, etc. };
//   timestamp: string;
// }
// ============================================================

import type { NextApiResponse } from 'next';

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiMeta {
  pagination?: PaginationMeta;
  timing?: TimingMeta;
  requestId?: string;
  version?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TimingMeta {
  startTime: number;
  endTime: number;
  durationMs: number;
}

// Common error codes
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
  PROVIDER_REQUIRED: 'PROVIDER_REQUIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Security
  CSRF_INVALID: 'CSRF_INVALID',
  XSS_DETECTED: 'XSS_DETECTED',
  SQL_INJECTION_DETECTED: 'SQL_INJECTION_DETECTED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Clinical-specific
  CLINICAL_SAFETY_ERROR: 'CLINICAL_SAFETY_ERROR',
  DRUG_INTERACTION_DETECTED: 'DRUG_INTERACTION_DETECTED',
  RED_FLAG_DETECTED: 'RED_FLAG_DETECTED',
  ORDER_VALIDATION_FAILED: 'ORDER_VALIDATION_FAILED',
  
  // FHIR/EHR
  FHIR_ERROR: 'FHIR_ERROR',
  EHR_SYNC_ERROR: 'EHR_SYNC_ERROR',
  EHR_CONNECTION_FAILED: 'EHR_CONNECTION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// HTTP status code mapping
const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.SESSION_EXPIRED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.PERMISSION_DENIED]: 403,
  [ErrorCodes.ROLE_FORBIDDEN]: 403,
  [ErrorCodes.PROVIDER_REQUIRED]: 403,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_FORMAT]: 400,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.GONE]: 410,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.CSRF_INVALID]: 403,
  [ErrorCodes.XSS_DETECTED]: 400,
  [ErrorCodes.SQL_INJECTION_DETECTED]: 400,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.CLINICAL_SAFETY_ERROR]: 422,
  [ErrorCodes.DRUG_INTERACTION_DETECTED]: 422,
  [ErrorCodes.RED_FLAG_DETECTED]: 422,
  [ErrorCodes.ORDER_VALIDATION_FAILED]: 422,
  [ErrorCodes.FHIR_ERROR]: 502,
  [ErrorCodes.EHR_SYNC_ERROR]: 502,
  [ErrorCodes.EHR_CONNECTION_FAILED]: 503,
};

// ============================================================
// RESPONSE BUILDERS
// ============================================================

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<ApiMeta>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: meta as ApiMeta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: ValidationError[],
  message = 'Validation failed'
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      validationErrors: errors,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  },
  additionalMeta?: Partial<ApiMeta>
): ApiResponse<T[]> {
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
  
  return {
    success: true,
    data,
    meta: {
      pagination: {
        ...pagination,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
      ...additionalMeta,
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// RESPONSE SENDERS (for Next.js API routes)
// ============================================================

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: NextApiResponse,
  data: T,
  statusCode = 200,
  meta?: Partial<ApiMeta>
): void {
  res.status(statusCode).json(successResponse(data, meta));
}

/**
 * Send an error response
 */
export function sendError(
  res: NextApiResponse,
  code: ErrorCode,
  message: string,
  details?: unknown,
  statusCode?: number
): void {
  const status = statusCode ?? ERROR_STATUS_CODES[code] ?? 500;
  res.status(status).json(errorResponse(code, message, details));
}

/**
 * Send a validation error response
 */
export function sendValidationError(
  res: NextApiResponse,
  errors: ValidationError[],
  message = 'Validation failed'
): void {
  res.status(400).json(validationErrorResponse(errors, message));
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: NextApiResponse,
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  },
  meta?: Partial<ApiMeta>
): void {
  res.status(200).json(paginatedResponse(data, pagination, meta));
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(
  res: NextApiResponse,
  data: T,
  meta?: Partial<ApiMeta>
): void {
  sendSuccess(res, data, 201, meta);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: NextApiResponse): void {
  res.status(204).end();
}

/**
 * Send accepted response (202) for async operations
 */
export function sendAccepted<T>(
  res: NextApiResponse,
  data: T,
  meta?: Partial<ApiMeta>
): void {
  sendSuccess(res, data, 202, meta);
}

// ============================================================
// ERROR HANDLING UTILITIES
// ============================================================

/**
 * Handle unknown errors safely
 */
export function handleError(
  res: NextApiResponse,
  error: unknown,
  context?: string
): void {
  // Log the error for debugging
  console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);

  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;
    
    sendError(res, ErrorCodes.INTERNAL_ERROR, message);
  } else {
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred');
  }
}

/**
 * Create error from Zod validation
 */
export function fromZodError(zodError: { issues: Array<{ path: (string | number)[]; message: string; code: string }> }): ValidationError[] {
  return zodError.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

// ============================================================
// TIMING UTILITIES
// ============================================================

/**
 * Create timing meta
 */
export function createTimingMeta(startTime: number): TimingMeta {
  const endTime = Date.now();
  return {
    startTime,
    endTime,
    durationMs: endTime - startTime,
  };
}

/**
 * Wrapper to add timing to response
 */
export function withTiming<T>(
  startTime: number,
  response: ApiResponse<T>
): ApiResponse<T> {
  return {
    ...response,
    meta: {
      ...response.meta,
      timing: createTimingMeta(startTime),
    },
  };
}

// ============================================================
// REQUEST ID UTILITIES
// ============================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Add request ID to response
 */
export function withRequestId<T>(
  requestId: string,
  response: ApiResponse<T>
): ApiResponse<T> {
  return {
    ...response,
    meta: {
      ...response.meta,
      requestId,
    },
  };
}

// ============================================================
// API HANDLER WRAPPER
// ============================================================

export type ApiHandler = (
  req: import('next').NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Wrap an API handler with standard error handling and timing
 */
export function withApiHandler(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to response headers
    res.setHeader('X-Request-Id', requestId);
    
    try {
      await handler(req, res);
    } catch (error) {
      handleError(res, error, `[${requestId}]`);
    }
  };
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  // Response builders
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  
  // Response senders
  sendSuccess,
  sendError,
  sendValidationError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendAccepted,
  
  // Error handling
  handleError,
  fromZodError,
  
  // Utilities
  createTimingMeta,
  withTiming,
  generateRequestId,
  withRequestId,
  withApiHandler,
  
  // Constants
  ErrorCodes,
};
