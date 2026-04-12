// ============================================================
// ATTENDING AI - Secure API Middleware
// apps/shared/lib/api/secureApiHandler.ts
//
// Comprehensive middleware wrapper for API routes that provides:
// - Authentication verification
// - CSRF protection
// - Rate limiting
// - Input validation (Zod)
// - Security headers
// - Audit logging
// - Error handling
//
// HIPAA Requirements Addressed:
// - 164.312(a)(1) - Access control
// - 164.312(b) - Audit controls
// - 164.312(c)(1) - Integrity
// - 164.312(e)(1) - Transmission security
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken, JWT } from 'next-auth/jwt';
import { z } from 'zod';
import {
  sendError,
  sendValidationError,
  handleError,
  fromZodError,
  generateRequestId,
  ErrorCodes,
  type ValidationError,
} from './response';
import {
  rateLimit,
  csrf,
  setApiSecurityHeaders,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  getClientIp,
  getClientUserAgent,
  type RateLimitConfig,
} from '../security';
import {
  auditLog,
  auditSecurityEvent,
  AuditActions,
  type AuditAction,
} from '../audit';

// ============================================================
// TYPES
// ============================================================

export type UserRole = 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';

export interface SecureApiConfig {
  /** HTTP methods allowed for this endpoint */
  methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Roles allowed to access this endpoint (empty = all authenticated users) */
  allowedRoles?: UserRole[];
  /** Whether CSRF protection is required for state-changing methods (default: true) */
  requireCsrf?: boolean;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Zod schema for request body validation */
  bodySchema?: z.ZodSchema;
  /** Zod schema for query params validation */
  querySchema?: z.ZodSchema;
  /** Audit action to log */
  auditAction?: AuditAction;
  /** Resource type for audit logging */
  auditResourceType?: string;
  /** Whether to sanitize input (default: true) */
  sanitizeInput?: boolean;
  /** Whether to check for injection attacks (default: true) */
  checkInjection?: boolean;
}

export interface SecureApiContext {
  /** Authenticated user info */
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null;
  /** JWT token */
  token: JWT | null;
  /** Request ID for tracing */
  requestId: string;
  /** Client IP address */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Validated request body (if bodySchema provided) */
  body: unknown;
  /** Validated query params (if querySchema provided) */
  query: unknown;
  /** Start time for performance tracking */
  startTime: number;
}

export type SecureApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  context: SecureApiContext
) => Promise<void> | void;

// ============================================================
// DEFAULT CONFIGURATIONS
// ============================================================

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyPrefix: 'api',
};

const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 20, // 20 requests per minute for sensitive endpoints
  keyPrefix: 'api-strict',
};

const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 300000, // 5 minutes
  maxRequests: 10, // 10 attempts per 5 minutes
  keyPrefix: 'auth',
};

// ============================================================
// MIDDLEWARE WRAPPER
// ============================================================

/**
 * Create a secure API handler with comprehensive protection
 */
export function createSecureApiHandler(
  config: SecureApiConfig,
  handler: SecureApiHandler
) {
  const {
    methods,
    requireAuth = true,
    allowedRoles = [],
    requireCsrf = true,
    rateLimit: rateLimitConfig = DEFAULT_RATE_LIMIT,
    bodySchema,
    querySchema,
    auditAction,
    auditResourceType,
    sanitizeInput = true,
    checkInjection = true,
  } = config;

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const ipAddress = getClientIp(req);
    const userAgent = getClientUserAgent(req);

    // Set security headers and request ID
    setApiSecurityHeaders(res);
    res.setHeader('X-Request-Id', requestId);

    try {
      // --------------------------------------------------------
      // 1. METHOD CHECK
      // --------------------------------------------------------
      if (!methods.includes(req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')) {
        res.setHeader('Allow', methods.join(', '));
        return sendError(
          res,
          ErrorCodes.INVALID_INPUT,
          `Method ${req.method} not allowed`,
          { allowedMethods: methods },
          405
        );
      }

      // --------------------------------------------------------
      // 2. RATE LIMITING
      // --------------------------------------------------------
      const rateLimitKey = `${rateLimitConfig.keyPrefix}:${ipAddress}`;
      const rateLimitResult = await rateLimit(rateLimitKey, rateLimitConfig);

      res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);

      if (!rateLimitResult.allowed) {
        // Log rate limit event
        await auditSecurityEvent(
          AuditActions.API_RATE_LIMIT_EXCEEDED,
          'anonymous',
          { ipAddress, endpoint: req.url, requestId },
          ipAddress
        );

        res.setHeader('Retry-After', rateLimitResult.retryAfter || 60);
        return sendError(
          res,
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          'Too many requests. Please try again later.',
          { retryAfter: rateLimitResult.retryAfter },
          429
        );
      }

      // --------------------------------------------------------
      // 3. AUTHENTICATION
      // --------------------------------------------------------
      let token: JWT | null = null;
      let user: SecureApiContext['user'] = null;

      if (requireAuth) {
        token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
          await auditSecurityEvent(
            AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT,
            'anonymous',
            { endpoint: req.url, requestId },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.AUTH_REQUIRED,
            'Authentication required',
            undefined,
            401
          );
        }

        // Check session expiry
        const sessionExpiry = token.exp as number;
        const now = Math.floor(Date.now() / 1000);

        if (sessionExpiry && now > sessionExpiry) {
          return sendError(
            res,
            ErrorCodes.SESSION_EXPIRED,
            'Session has expired. Please sign in again.',
            undefined,
            401
          );
        }

        user = {
          id: token.sub || '',
          email: token.email as string || '',
          role: (token.role as UserRole) || 'STAFF',
          name: token.name as string | undefined,
        };

        // Check role authorization
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          await auditSecurityEvent(
            AuditActions.PERMISSION_DENIED,
            user.id,
            { 
              endpoint: req.url, 
              userRole: user.role, 
              requiredRoles: allowedRoles,
              requestId,
            },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.ROLE_FORBIDDEN,
            'Insufficient permissions for this resource',
            { requiredRoles: allowedRoles },
            403
          );
        }
      }

      // --------------------------------------------------------
      // 4. CSRF PROTECTION (for state-changing methods)
      // --------------------------------------------------------
      if (requireCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
        const csrfSecret = req.cookies['__Host-csrf-token'];
        const csrfToken = req.headers['x-csrf-token'] as string;

        if (!csrfSecret || !csrfToken) {
          await auditSecurityEvent(
            AuditActions.CSRF_VIOLATION,
            user?.id || 'anonymous',
            { endpoint: req.url, reason: 'missing_token', requestId },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.CSRF_INVALID,
            'CSRF token missing. Please refresh and try again.',
            undefined,
            403
          );
        }

        if (!csrf.verify(csrfSecret, csrfToken)) {
          await auditSecurityEvent(
            AuditActions.CSRF_VIOLATION,
            user?.id || 'anonymous',
            { endpoint: req.url, reason: 'invalid_token', requestId },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.CSRF_INVALID,
            'Invalid CSRF token. Please refresh and try again.',
            undefined,
            403
          );
        }
      }

      // --------------------------------------------------------
      // 5. INPUT VALIDATION & SANITIZATION
      // --------------------------------------------------------
      let validatedBody: unknown = req.body;
      let validatedQuery: unknown = req.query;

      // Check for injection attacks
      if (checkInjection) {
        const bodyStr = JSON.stringify(req.body);
        const queryStr = JSON.stringify(req.query);

        if (detectSqlInjection(bodyStr) || detectSqlInjection(queryStr)) {
          await auditSecurityEvent(
            AuditActions.SQL_INJECTION_ATTEMPT,
            user?.id || 'anonymous',
            { endpoint: req.url, requestId },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.SQL_INJECTION_DETECTED,
            'Invalid input detected',
            undefined,
            400
          );
        }

        if (detectXss(bodyStr) || detectXss(queryStr)) {
          await auditSecurityEvent(
            AuditActions.XSS_ATTEMPT,
            user?.id || 'anonymous',
            { endpoint: req.url, requestId },
            ipAddress
          );

          return sendError(
            res,
            ErrorCodes.XSS_DETECTED,
            'Invalid input detected',
            undefined,
            400
          );
        }
      }

      // Sanitize input
      if (sanitizeInput && req.body && typeof req.body === 'object') {
        validatedBody = sanitizeObject(req.body);
      }

      // Validate body schema
      if (bodySchema && req.body) {
        const result = bodySchema.safeParse(validatedBody);
        if (!result.success) {
          const errors = fromZodError(result.error);
          return sendValidationError(res, errors, 'Request body validation failed');
        }
        validatedBody = result.data;
      }

      // Validate query schema
      if (querySchema) {
        const result = querySchema.safeParse(req.query);
        if (!result.success) {
          const errors = fromZodError(result.error);
          return sendValidationError(res, errors, 'Query parameters validation failed');
        }
        validatedQuery = result.data;
      }

      // --------------------------------------------------------
      // 6. AUDIT LOGGING (if configured)
      // --------------------------------------------------------
      if (auditAction && user) {
        await auditLog({
          action: auditAction,
          userId: user.id,
          resourceType: (auditResourceType as 'API') || 'API',
          details: {
            endpoint: req.url,
            method: req.method,
            requestId,
          },
          ipAddress,
          userAgent,
        });
      }

      // --------------------------------------------------------
      // 7. EXECUTE HANDLER
      // --------------------------------------------------------
      const context: SecureApiContext = {
        user,
        token,
        requestId,
        ipAddress,
        userAgent,
        body: validatedBody,
        query: validatedQuery,
        startTime,
      };

      await handler(req, res, context);

    } catch (error) {
      // Log error
      console.error(`[API Error] ${requestId}:`, error);

      // Handle error
      handleError(res, error, requestId);
    }
  };
}

// ============================================================
// CONVENIENCE WRAPPERS
// ============================================================

/**
 * Create a public API handler (no authentication required)
 */
export function createPublicApiHandler(
  config: Omit<SecureApiConfig, 'requireAuth' | 'allowedRoles'>,
  handler: SecureApiHandler
) {
  return createSecureApiHandler(
    { ...config, requireAuth: false, requireCsrf: false },
    handler
  );
}

/**
 * Create an admin-only API handler
 */
export function createAdminApiHandler(
  config: Omit<SecureApiConfig, 'allowedRoles'>,
  handler: SecureApiHandler
) {
  return createSecureApiHandler(
    { 
      ...config, 
      allowedRoles: ['ADMIN'],
      rateLimit: config.rateLimit || STRICT_RATE_LIMIT,
    },
    handler
  );
}

/**
 * Create a provider-only API handler
 */
export function createProviderApiHandler(
  config: Omit<SecureApiConfig, 'allowedRoles'>,
  handler: SecureApiHandler
) {
  return createSecureApiHandler(
    { 
      ...config, 
      allowedRoles: ['ADMIN', 'PROVIDER'],
    },
    handler
  );
}

/**
 * Create a clinical staff API handler (provider, nurse, admin)
 */
export function createClinicalApiHandler(
  config: Omit<SecureApiConfig, 'allowedRoles'>,
  handler: SecureApiHandler
) {
  return createSecureApiHandler(
    { 
      ...config, 
      allowedRoles: ['ADMIN', 'PROVIDER', 'NURSE'],
    },
    handler
  );
}

/**
 * Create an authentication endpoint handler with strict rate limiting
 */
export function createAuthApiHandler(
  config: Omit<SecureApiConfig, 'requireAuth' | 'rateLimit'>,
  handler: SecureApiHandler
) {
  return createSecureApiHandler(
    { 
      ...config, 
      requireAuth: false,
      requireCsrf: true,
      rateLimit: AUTH_RATE_LIMIT,
    },
    handler
  );
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
  AUTH_RATE_LIMIT,
};
