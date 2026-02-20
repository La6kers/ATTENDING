// ============================================================
// ATTENDING AI - API Utilities Barrel Export
// apps/shared/lib/api/index.ts
// ============================================================

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
