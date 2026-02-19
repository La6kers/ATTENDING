// ============================================================
// ATTENDING AI - API Utilities Exports
// apps/shared/lib/api/index.ts
// ============================================================

export {
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
  
  // Types
  type ApiResponse,
  type ApiError,
  type ApiMeta,
  type ValidationError,
  type PaginationMeta,
  type TimingMeta,
  type ErrorCode,
  type ApiHandler,
} from './response';

export {
  // Standardized API handler wrapper
  createApiHandler,
  errors as apiErrors,
  ApiError as ApiHandlerError,
} from './createApiHandler';

export {
  // Secure handler factory
  createSecureHandler,
  createPHIHandler,
  createAuthHandler,
  createProviderHandler,
  createAdminHandler,
  createPublicHandler,
  
  // Rate limit configs
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
  AUTH_RATE_LIMIT,
  
  // Types
  type SecureHandlerOptions,
  type SecureRequest,
  type SecureHandler,
  type UserRole,
} from './secureHandler';
