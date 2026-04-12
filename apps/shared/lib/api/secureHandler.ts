// ============================================================
// ATTENDING AI - Secure API Handler Wrapper
// apps/shared/lib/api/secureHandler.ts
//
// Combines all security measures into a single wrapper:
// - Authentication verification
// - CSRF protection
// - Rate limiting
// - Input validation/sanitization
// - Audit logging
// - Security headers
// - Error handling with PHI masking
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
  rateLimit,
  csrf,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  setApiSecurityHeaders,
  getClientIp,
  getClientUserAgent,
  maskPHI,
  type RateLimitConfig,
} from '../security';
import {
  sendError,
  sendValidationError,
  ErrorCodes,
  fromZodError,
  generateRequestId,
  type ValidationError,
} from './response';
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

export interface SecureHandlerOptions {
  /** HTTP methods allowed for this endpoint */
  methods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  
  /** Roles allowed to access this endpoint */
  allowedRoles?: UserRole[];
  
  /** Whether to check CSRF token (default: true for state-changing methods) */
  checkCsrf?: boolean;
  
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;
  
  /** Zod schema for request body validation */
  bodySchema?: z.ZodSchema;
  
  /** Zod schema for query parameter validation */
  querySchema?: z.ZodSchema;
  
  /** Audit action to log for this endpoint */
  auditAction?: AuditAction;
  
  /** Resource type for audit logging */
  auditResourceType?: string;
  
  /** Whether this endpoint accesses PHI (adds extra audit) */
  accessesPHI?: boolean;
  
  /** Whether to sanitize input (default: true) */
  sanitizeInput?: boolean;
  
  /** Custom security checks */
  customSecurityCheck?: (req: NextApiRequest, token: JWT | null) => Promise<boolean | string>;
}

export interface SecureRequest extends NextApiRequest {
  /** Validated and typed request body */
  validatedBody?: unknown;
  
  /** Validated and typed query parameters */
  validatedQuery?: unknown;
  
  /** Authenticated user information */
  user?: {
    id: string;
    email?: string;
    role: UserRole;
    name?: string;
  };
  
  /** Request ID for tracing */
  requestId: string;
  
  /** Client IP address */
  clientIp: string;
  
  /** Client user agent */
  clientUserAgent: string;
}

export type SecureHandler = (
  req: SecureRequest,
  res: NextApiResponse
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
// SECURE HANDLER FACTORY
// ============================================================

/**
 * Create a secure API handler with all security measures applied
 */
export function createSecureHandler(
  handler: SecureHandler,
  options: SecureHandlerOptions = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const {
    methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    requireAuth = true,
    allowedRoles,
    checkCsrf = true,
    rateLimit: rateLimitConfig = DEFAULT_RATE_LIMIT,
    bodySchema,
    querySchema,
    auditAction,
    auditResourceType = 'API',
    accessesPHI = false,
    sanitizeInput = true,
    customSecurityCheck,
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const requestId = generateRequestId();
    const clientIp = getClientIp(req);
    const clientUserAgent = getClientUserAgent(req);
    const startTime = Date.now();

    // Set request ID header
    res.setHeader('X-Request-Id', requestId);

    // Set security headers
    setApiSecurityHeaders(res);

    try {
      // --------------------------------------------------------
      // 1. METHOD CHECK
      // --------------------------------------------------------
      if (!methods.includes(req.method as typeof methods[number])) {
        res.setHeader('Allow', methods);
        return sendError(
          res,
          ErrorCodes.VALIDATION_ERROR,
          `Method ${req.method} not allowed`,
          undefined,
          405
        );
      }

      // --------------------------------------------------------
      // 2. RATE LIMITING
      // --------------------------------------------------------
      const rateLimitKey = requireAuth ? `user:${req.headers['x-session-ref'] || clientIp}` : `ip:${clientIp}`;
      const rateLimitResult = await rateLimit(rateLimitKey, rateLimitConfig);

      res.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime);

      if (!rateLimitResult.allowed) {
        await auditSecurityEvent(
          AuditActions.API_RATE_LIMIT_EXCEEDED,
          req.headers['x-session-ref'] as string || 'anonymous',
          { path: req.url, clientIp },
          clientIp
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
      
      if (requireAuth) {
        token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
          await auditSecurityEvent(
            AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT,
            'anonymous',
            { path: req.url, clientIp },
            clientIp
          );

          return sendError(res, ErrorCodes.AUTH_REQUIRED, 'Authentication required');
        }

        // Check session expiry
        const now = Math.floor(Date.now() / 1000);
        if (token.exp && now > (token.exp as number)) {
          return sendError(res, ErrorCodes.SESSION_EXPIRED, 'Session has expired');
        }

        // Check role-based access
        const userRole = (token.role as UserRole) || 'STAFF';
        
        if (allowedRoles && !allowedRoles.includes(userRole)) {
          await auditSecurityEvent(
            AuditActions.PERMISSION_DENIED,
            token.sub || 'unknown',
            { path: req.url, userRole, requiredRoles: allowedRoles },
            clientIp
          );

          return sendError(
            res,
            ErrorCodes.ROLE_FORBIDDEN,
            'Insufficient permissions',
            { requiredRoles: allowedRoles }
          );
        }
      }

      // --------------------------------------------------------
      // 4. CSRF PROTECTION
      // --------------------------------------------------------
      const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      
      if (checkCsrf && stateChangingMethods.includes(req.method || '')) {
        const csrfSecret = req.cookies['__Host-csrf-token'];
        const csrfToken = req.headers['x-csrf-token'] as string;

        if (!csrfSecret || !csrfToken || !csrf.verify(csrfSecret, csrfToken)) {
          await auditSecurityEvent(
            AuditActions.CSRF_VIOLATION,
            token?.sub || 'anonymous',
            { path: req.url },
            clientIp
          );

          return sendError(res, ErrorCodes.CSRF_INVALID, 'Invalid CSRF token');
        }
      }

      // --------------------------------------------------------
      // 5. INPUT SANITIZATION & SECURITY CHECKS
      // --------------------------------------------------------
      let sanitizedBody = req.body;
      let sanitizedQuery = req.query;

      if (sanitizeInput) {
        // Check for SQL injection attempts
        const bodyStr = JSON.stringify(req.body);
        const queryStr = JSON.stringify(req.query);
        
        if (detectSqlInjection(bodyStr) || detectSqlInjection(queryStr)) {
          await auditSecurityEvent(
            AuditActions.SQL_INJECTION_ATTEMPT,
            token?.sub || 'anonymous',
            { path: req.url, body: maskPHI(bodyStr.slice(0, 500)) },
            clientIp
          );

          return sendError(
            res,
            ErrorCodes.SQL_INJECTION_DETECTED,
            'Invalid characters detected in request'
          );
        }

        // Check for XSS attempts
        if (detectXss(bodyStr) || detectXss(queryStr)) {
          await auditSecurityEvent(
            AuditActions.XSS_ATTEMPT,
            token?.sub || 'anonymous',
            { path: req.url },
            clientIp
          );

          return sendError(
            res,
            ErrorCodes.XSS_DETECTED,
            'Invalid content detected in request'
          );
        }

        // Sanitize objects
        if (req.body && typeof req.body === 'object') {
          sanitizedBody = sanitizeObject(req.body);
        }
        if (req.query && typeof req.query === 'object') {
          sanitizedQuery = sanitizeObject(req.query as Record<string, unknown>);
        }
      }

      // --------------------------------------------------------
      // 6. SCHEMA VALIDATION
      // --------------------------------------------------------
      let validatedBody: unknown;
      let validatedQuery: unknown;

      if (bodySchema && req.body) {
        const result = bodySchema.safeParse(sanitizedBody);
        
        if (!result.success) {
          const errors = fromZodError(result.error);
          return sendValidationError(res, errors, 'Request body validation failed');
        }
        
        validatedBody = result.data;
      }

      if (querySchema) {
        const result = querySchema.safeParse(sanitizedQuery);
        
        if (!result.success) {
          const errors = fromZodError(result.error);
          return sendValidationError(res, errors, 'Query parameter validation failed');
        }
        
        validatedQuery = result.data;
      }

      // --------------------------------------------------------
      // 7. CUSTOM SECURITY CHECK
      // --------------------------------------------------------
      if (customSecurityCheck) {
        const checkResult = await customSecurityCheck(req, token);
        
        if (checkResult !== true) {
          const message = typeof checkResult === 'string' ? checkResult : 'Security check failed';
          return sendError(res, ErrorCodes.PERMISSION_DENIED, message);
        }
      }

      // --------------------------------------------------------
      // 8. AUDIT LOGGING
      // --------------------------------------------------------
      if (auditAction) {
        await auditLog({
          action: auditAction,
          userId: token?.sub || 'anonymous',
          resourceType: auditResourceType as any,
          details: {
            method: req.method,
            path: req.url,
            hipaaRelevant: accessesPHI,
            requestId,
          },
          ipAddress: clientIp,
          userAgent: clientUserAgent,
        });
      }

      // --------------------------------------------------------
      // 9. BUILD SECURE REQUEST OBJECT
      // --------------------------------------------------------
      const secureReq: SecureRequest = Object.assign(req, {
        validatedBody,
        validatedQuery,
        user: token ? {
          id: token.sub || '',
          email: token.email as string | undefined,
          role: (token.role as UserRole) || 'STAFF',
          name: token.name as string | undefined,
        } : undefined,
        requestId,
        clientIp,
        clientUserAgent,
        body: validatedBody || sanitizedBody,
        query: validatedQuery || sanitizedQuery,
      });

      // --------------------------------------------------------
      // 10. EXECUTE HANDLER
      // --------------------------------------------------------
      await handler(secureReq, res);

    } catch (error) {
      // Log error with masked PHI
      console.error(`[API Error] ${requestId}:`, {
        error: error instanceof Error ? maskPHI(error.message) : 'Unknown error',
        path: req.url,
        method: req.method,
        duration: Date.now() - startTime,
      });

      // Don't expose internal errors in production
      const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : (error instanceof Error ? error.message : 'Unknown error');

      return sendError(res, ErrorCodes.INTERNAL_ERROR, message);
    }
  };
}

// ============================================================
// CONVENIENCE WRAPPERS
// ============================================================

/**
 * Create a secure handler for PHI-accessing endpoints
 */
export function createPHIHandler(
  handler: SecureHandler,
  options: Omit<SecureHandlerOptions, 'accessesPHI'> = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return createSecureHandler(handler, {
    ...options,
    accessesPHI: true,
    rateLimit: options.rateLimit || STRICT_RATE_LIMIT,
  });
}

/**
 * Create a secure handler for authentication endpoints
 */
export function createAuthHandler(
  handler: SecureHandler,
  options: Omit<SecureHandlerOptions, 'requireAuth' | 'checkCsrf'> = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return createSecureHandler(handler, {
    ...options,
    requireAuth: false,
    checkCsrf: false, // Auth endpoints handle their own CSRF
    rateLimit: options.rateLimit || AUTH_RATE_LIMIT,
  });
}

/**
 * Create a secure handler for provider-only endpoints
 */
export function createProviderHandler(
  handler: SecureHandler,
  options: Omit<SecureHandlerOptions, 'allowedRoles'> = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return createSecureHandler(handler, {
    ...options,
    allowedRoles: ['ADMIN', 'PROVIDER'],
  });
}

/**
 * Create a secure handler for admin-only endpoints
 */
export function createAdminHandler(
  handler: SecureHandler,
  options: Omit<SecureHandlerOptions, 'allowedRoles'> = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return createSecureHandler(handler, {
    ...options,
    allowedRoles: ['ADMIN'],
  });
}

/**
 * Create a secure handler for public endpoints (still has rate limiting)
 */
export function createPublicHandler(
  handler: SecureHandler,
  options: Omit<SecureHandlerOptions, 'requireAuth'> = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return createSecureHandler(handler, {
    ...options,
    requireAuth: false,
    checkCsrf: false,
  });
}

// ============================================================
// EXPORTS
// ============================================================

export {
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
  AUTH_RATE_LIMIT,
};
