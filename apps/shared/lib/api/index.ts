// ============================================================
// ATTENDING AI - API Utilities Barrel Export
// apps/shared/lib/api/index.ts
// ============================================================

// Unified handler factory (preferred entry point for all new routes)
export {
  createHandler,
  publicHandler,
  providerHandler,
  adminHandler,
  clinicalHandler,
  apiKeyHandler,
} from './handler';

export type {
  HandlerConfig,
  HandlerContext,
  AuthLevel,
} from './handler';

export {
  API_VERSION,
  API_VERSION_FULL,
  setApiVersionHeaders,
  withApiVersion,
  parseApiVersion,
} from './apiVersion';

export {
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
} from './apiResponse';

export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiError,
  ApiResponse,
  ResponseMeta,
  ErrorCode,
} from './apiResponse';
