// ============================================================
// ATTENDING AI - Unified API Handler Factory
// apps/shared/lib/api/handler.ts
//
// THE single entry point for creating API route handlers.
// Auto-composes ALL enterprise middleware in the correct order:
//
//   CORS → Rate Limit → Timeout → Auth → CSRF → Injection Check
//   → Validation → Audit → Error Handler → YOUR CODE
//
// Replaces:
//   - createApiHandler.ts (basic wrapper)
//   - secureApiHandler.ts (secure wrapper v1)
//   - secureHandler.ts    (secure wrapper v2)
//
// Usage:
//   import { createHandler } from '@attending/shared/lib/api/handler';
//
//   export default createHandler({
//     methods: ['GET', 'POST'],
//     auth: 'provider',          // 'public' | 'authenticated' | 'provider' | 'admin' | 'clinical'
//     rateLimit: 'read',         // Rate limit tier name or custom config
//     timeout: 'standard',       // Timeout tier name or ms
//     body: CreateLabOrderSchema,
//     query: PaginationSchema,
//     audit: AuditActions.LAB_ORDER_CREATED,
//     handler: async (req, ctx) => {
//       const order = await createLabOrder(ctx.body);
//       ctx.success(201, order);
//     },
//   });
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken, JWT } from 'next-auth/jwt';
import { z } from 'zod';
import { cors } from '../cors';
import { RATE_LIMIT_TIERS, type RateLimitTier } from '../rateLimits';
import { TIMEOUT_TIERS, type TimeoutTier } from '../withTimeout';
import { withRequestId, logger } from '../logging';
import { ErrorCodes, sendSuccess, sendError, sendValidationError, sendPaginated } from './apiResponse';
import type { ErrorCode } from './apiResponse';
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
} from '../security';
import {
  auditLog,
  auditSecurityEvent,
  AuditActions,
  type AuditAction,
  type AuditResourceType,
} from '../audit';
import { recordRequest } from '../metrics';
import { getTraceContext, withTrace, setTraceHeaders, startSpan } from '../tracing';

// ============================================================
// AUTH PRESETS
// ============================================================

export type AuthLevel = 'public' | 'authenticated' | 'clinical' | 'provider' | 'admin' | 'apiKey';

const AUTH_ROLES: Record<AuthLevel, string[] | null> = {
  public: null,         // No auth required
  authenticated: [],    // Any authenticated user
  clinical: ['ADMIN', 'PROVIDER', 'NURSE'],
  provider: ['ADMIN', 'PROVIDER'],
  admin: ['ADMIN'],
  apiKey: null,         // Validated via X-API-Key header (see api-key middleware)
};

// ============================================================
// HANDLER CONTEXT
// ============================================================

export interface HandlerContext<TBody = unknown, TQuery = unknown> {
  /** Validated + typed request body */
  body: TBody;
  /** Validated + typed query params */
  query: TQuery;
  /** Authenticated user (null if public route) */
  user: {
    id: string;
    email?: string;
    role: string;
    name?: string;
    organizationId?: string;
  } | null;
  /** JWT token */
  token: JWT | null;
  /** Correlation ID (also on response X-Request-ID header) */
  requestId: string;
  /** Client IP */
  ip: string;
  /** User agent */
  userAgent: string;
  /** Request start time (for performance) */
  startTime: number;
  /** Scoped logger with requestId */
  log: ReturnType<typeof withRequestId>;
  /** Send success response (standardized envelope) */
  success: (statusOrData: number | unknown, data?: unknown) => void;
  /** Send paginated response */
  paginated: (data: unknown[], total: number, limit: number, offset: number) => void;
  /** Send error response */
  error: (status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) => void;
  /** Raw Next.js req/res (escape hatch) */
  raw: { req: NextApiRequest; res: NextApiResponse };
}

// ============================================================
// HANDLER CONFIG
// ============================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HandlerConfig<TBody = unknown, TQuery = unknown> {
  /** Allowed HTTP methods */
  methods: HttpMethod[];

  /** Auth level preset */
  auth?: AuthLevel;

  /** Rate limit tier or custom { windowMs, maxRequests } */
  rateLimit?: RateLimitTier | 'auto' | { windowMs: number; maxRequests: number; keyPrefix?: string };

  /** Timeout tier or ms */
  timeout?: TimeoutTier | 'auto' | number;

  /** Zod schema for request body (POST/PUT/PATCH) */
  body?: z.ZodSchema<TBody>;

  /** Zod schema for query params */
  query?: z.ZodSchema<TQuery>;

  /** Audit action to log */
  audit?: AuditAction;

  /** Resource type for audit trail */
  auditResource?: AuditResourceType;

  /** Whether this endpoint accesses PHI (extra audit detail) */
  phi?: boolean;

  /** CORS override (defaults to env-based config) */
  cors?: boolean;

  /** CSRF check override (defaults to true for state-changing methods) */
  csrf?: boolean;

  /** Injection detection override (defaults to true) */
  injection?: boolean;

  /** Input sanitization override (defaults to true) */
  sanitize?: boolean;

  /** The actual handler */
  handler: (req: NextApiRequest, ctx: HandlerContext<TBody, TQuery>) => Promise<void> | void;
}

// ============================================================
// FACTORY
// ============================================================

export function createHandler<TBody = unknown, TQuery = unknown>(
  config: HandlerConfig<TBody, TQuery>
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  const {
    methods,
    auth = 'authenticated',
    rateLimit: rateLimitConfig = 'auto',
    timeout: timeoutConfig = 'auto',
    body: bodySchema,
    query: querySchema,
    audit: auditAction,
    auditResource,
    phi = false,
    cors: enableCors = true,
    csrf: enableCsrf = true,
    injection: enableInjection = true,
    sanitize: enableSanitize = true,
    handler,
  } = config;

  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const startTime = performance.now();
    const log = withRequestId(req);
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    const ip = getClientIp(req);
    const userAgent = getClientUserAgent(req);

    // Create trace context and set response headers
    const trace = getTraceContext(req);
    trace.userId = undefined; // Set after auth
    res.setHeader('X-Request-ID', trace.requestId);
    res.setHeader('X-Trace-ID', trace.traceId);
    setApiSecurityHeaders(res);

    try {
      // ---- 1. CORS ----
      if (enableCors) {
        const preflightHandled = await cors(req, res);
        if (preflightHandled) return; // OPTIONS handled
      }

      // ---- 2. METHOD CHECK ----
      if (!methods.includes(req.method as HttpMethod)) {
        res.setHeader('Allow', methods.join(', '));
        return sendError(res, ErrorCodes.VALIDATION_ERROR, `Method ${req.method} not allowed`, undefined, 405);
      }

      // ---- 3. RATE LIMITING ----
      const rlConfig = resolveRateLimit(rateLimitConfig, req.url || '');
      const rlKey = `${rlConfig.keyPrefix}:${ip}`;
      const rlResult = await rateLimit(rlKey, rlConfig);

      res.setHeader('X-RateLimit-Limit', rlConfig.maxRequests);
      res.setHeader('X-RateLimit-Remaining', rlResult.remaining);
      res.setHeader('X-RateLimit-Reset', rlResult.resetTime);

      if (!rlResult.allowed) {
        log.warn('Rate limit exceeded', { ip, path: req.url });
        res.setHeader('Retry-After', rlResult.retryAfter || 60);
        return sendError(res, ErrorCodes.RATE_LIMIT_EXCEEDED, 'Too many requests', { retryAfter: rlResult.retryAfter }, 429);
      }

      // ---- 4. TIMEOUT SETUP ----
      const timeoutMs = resolveTimeout(timeoutConfig, req.url || '');
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!res.headersSent) {
          sendError(res, 'REQUEST_TIMEOUT' as ErrorCode, 'Request timed out', { timeoutMs }, 504);
        }
      }, timeoutMs);

      try {
        // ---- 5. AUTHENTICATION ----
        let token: JWT | null = null;
        let user: HandlerContext['user'] = null;

        if (auth !== 'public') {
          // Check for API key first
          const apiKey = req.headers['x-api-key'] as string;
          if (auth === 'apiKey' && apiKey) {
            // API key validation delegated to the handler or separate middleware
            // Here we just set a minimal user context
            user = { id: `apikey:${apiKey.slice(0, 8)}`, role: 'SYSTEM' };
          } else {
            token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

            if (!token) {
              await auditSecurityEvent(AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT, 'anonymous', { path: req.url }, ip);
              return sendError(res, ErrorCodes.AUTH_REQUIRED, 'Authentication required', undefined, 401);
            }

            // Session expiry
            const now = Math.floor(Date.now() / 1000);
            if (token.exp && now > (token.exp as number)) {
              return sendError(res, ErrorCodes.SESSION_EXPIRED, 'Session expired', undefined, 401);
            }

            user = {
              id: token.sub || '',
              email: token.email as string | undefined,
              role: (token.role as string) || 'STAFF',
              name: token.name as string | undefined,
              organizationId: token.organizationId as string | undefined,
            };

            // Role check
            const allowedRoles = AUTH_ROLES[auth];
            if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
              await auditSecurityEvent(AuditActions.PERMISSION_DENIED, user.id, {
                path: req.url, userRole: user.role, requiredRoles: allowedRoles,
              }, ip);
              return sendError(res, ErrorCodes.ROLE_FORBIDDEN, 'Insufficient permissions', { requiredRoles: allowedRoles }, 403);
            }
          }
        }

        // Set trace context with authenticated user
        if (user) {
          trace.userId = user.id;
          trace.organizationId = user.organizationId;
        }

        // ---- 6. CSRF ----
        const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '');
        if (enableCsrf && stateChanging && auth !== 'public' && auth !== 'apiKey') {
          const csrfSecret = req.cookies['__Host-csrf-token'];
          const csrfToken = req.headers['x-csrf-token'] as string;
          if (!csrfSecret || !csrfToken || !csrf.verify(csrfSecret, csrfToken)) {
            await auditSecurityEvent(AuditActions.CSRF_VIOLATION, user?.id || 'anonymous', { path: req.url }, ip);
            return sendError(res, ErrorCodes.CSRF_INVALID, 'Invalid CSRF token', undefined, 403);
          }
        }

        // ---- 7. INJECTION DETECTION ----
        if (enableInjection) {
          const bodyStr = JSON.stringify(req.body);
          const queryStr = JSON.stringify(req.query);
          if (detectSqlInjection(bodyStr) || detectSqlInjection(queryStr)) {
            await auditSecurityEvent(AuditActions.SQL_INJECTION_ATTEMPT, user?.id || 'anonymous', { path: req.url }, ip);
            return sendError(res, ErrorCodes.SQL_INJECTION_DETECTED, 'Invalid input detected', undefined, 400);
          }
          if (detectXss(bodyStr) || detectXss(queryStr)) {
            await auditSecurityEvent(AuditActions.XSS_ATTEMPT, user?.id || 'anonymous', { path: req.url }, ip);
            return sendError(res, ErrorCodes.XSS_DETECTED, 'Invalid content detected', undefined, 400);
          }
        }

        // ---- 8. SANITIZATION ----
        let sanitizedBody = req.body;
        if (enableSanitize && req.body && typeof req.body === 'object') {
          sanitizedBody = sanitizeObject(req.body);
        }

        // ---- 9. VALIDATION ----
        let validatedBody: TBody = sanitizedBody;
        let validatedQuery: TQuery = req.query as unknown as TQuery;

        if (bodySchema && stateChanging) {
          const result = bodySchema.safeParse(sanitizedBody);
          if (!result.success) {
            const errors = result.error.issues.map(i => ({
              field: i.path.join('.'),
              message: i.message,
              code: i.code,
            }));
            return sendValidationError(res, errors, 'Request body validation failed');
          }
          validatedBody = result.data;
        }

        if (querySchema) {
          const result = querySchema.safeParse(req.query);
          if (!result.success) {
            const errors = result.error.issues.map(i => ({
              field: i.path.join('.'),
              message: i.message,
              code: i.code,
            }));
            return sendValidationError(res, errors, 'Query parameter validation failed');
          }
          validatedQuery = result.data;
        }

        // ---- 10. AUDIT (pre-execution) ----
        if (auditAction && user) {
          // Fire-and-forget so it doesn't block the request
          auditLog({
            action: auditAction,
            userId: user.id,
            resourceType: auditResource || 'API',
            details: {
              method: req.method,
              path: req.url,
              hipaaRelevant: phi,
              requestId,
            },
            ipAddress: ip,
            userAgent,
          }).catch(err => log.error('Audit log failed', err));
        }

        // ---- 11. BUILD CONTEXT & EXECUTE ----
        const ctx: HandlerContext<TBody, TQuery> = {
          body: validatedBody,
          query: validatedQuery,
          user,
          token,
          requestId,
          ip,
          userAgent,
          startTime,
          log,
          success: (statusOrData: number | unknown, data?: unknown) => {
            if (typeof statusOrData === 'number') {
              sendSuccess(res, data, statusOrData);
            } else {
              sendSuccess(res, statusOrData);
            }
          },
          paginated: (data, total, limit, offset) => {
            sendPaginated(res, data, total, limit, offset);
          },
          error: (status, code, message, details) => {
            sendError(res, code, message, details, status);
          },
          raw: { req, res },
        };

        if (!timedOut) {
          await handler(req, ctx);
        }

        // Log request completion + record metrics
        const durationMs = Math.round(performance.now() - startTime);
        log.info(`${req.method} ${req.url} ${res.statusCode}`, {
          durationMs,
          statusCode: res.statusCode,
          userId: user?.id,
        });
        recordRequest(req.method || 'GET', req.url || '/', res.statusCode, durationMs);

      } finally {
        clearTimeout(timer);
      }

    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const err = error instanceof Error ? error : new Error(String(error));

      log.error(`${req.method} ${req.url} FAILED`, err, { durationMs });

      if (!res.headersSent) {
        const message = process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message;
        sendError(res, ErrorCodes.INTERNAL_ERROR, message, undefined, 500);
      }
    }
  };
}

// ============================================================
// RESOLVERS
// ============================================================

function resolveRateLimit(
  config: HandlerConfig['rateLimit'],
  url: string
): { windowMs: number; maxRequests: number; keyPrefix: string } {
  if (!config || config === 'auto') {
    // Auto-detect from URL
    if (url.includes('/auth')) return { windowMs: 900_000, maxRequests: 10, keyPrefix: 'auth' };
    if (url.includes('/ai/') || url.includes('/differential')) return { windowMs: 60_000, maxRequests: 20, keyPrefix: 'ai' };
    if (url.includes('/emergency') || url.includes('/alerts')) return { windowMs: 60_000, maxRequests: 300, keyPrefix: 'emergency' };
    return { windowMs: 60_000, maxRequests: 60, keyPrefix: 'default' };
  }
  if (typeof config === 'string') {
    const tier = RATE_LIMIT_TIERS[config];
    return { windowMs: tier.windowMs, maxRequests: tier.maxRequests, keyPrefix: config };
  }
  return { windowMs: config.windowMs, maxRequests: config.maxRequests, keyPrefix: config.keyPrefix || 'custom' };
}

function resolveTimeout(config: HandlerConfig['timeout'], url: string): number {
  if (!config || config === 'auto') {
    if (url.includes('/ai/') || url.includes('/scribe/')) return TIMEOUT_TIERS.ai;
    if (url.includes('/fhir/')) return TIMEOUT_TIERS.external;
    if (url.includes('/emergency/') || url.includes('/alerts/')) return TIMEOUT_TIERS.emergency;
    return TIMEOUT_TIERS.standard;
  }
  if (typeof config === 'number') return config;
  return TIMEOUT_TIERS[config];
}

// ============================================================
// CONVENIENCE ALIASES
// ============================================================

/** Public endpoint (no auth, rate limited) */
export function publicHandler<B = unknown, Q = unknown>(
  config: Omit<HandlerConfig<B, Q>, 'auth'> & { auth?: never }
) {
  return createHandler<B, Q>({ ...config, auth: 'public' });
}

/** Provider-only endpoint */
export function providerHandler<B = unknown, Q = unknown>(
  config: Omit<HandlerConfig<B, Q>, 'auth'> & { auth?: never }
) {
  return createHandler<B, Q>({ ...config, auth: 'provider' });
}

/** Admin-only endpoint */
export function adminHandler<B = unknown, Q = unknown>(
  config: Omit<HandlerConfig<B, Q>, 'auth'> & { auth?: never }
) {
  return createHandler<B, Q>({ ...config, auth: 'admin' });
}

/** Clinical staff endpoint (provider + nurse + admin) */
export function clinicalHandler<B = unknown, Q = unknown>(
  config: Omit<HandlerConfig<B, Q>, 'auth'> & { auth?: never }
) {
  return createHandler<B, Q>({ ...config, auth: 'clinical' });
}

/** API key authenticated endpoint (system-to-system) */
export function apiKeyHandler<B = unknown, Q = unknown>(
  config: Omit<HandlerConfig<B, Q>, 'auth'> & { auth?: never }
) {
  return createHandler<B, Q>({ ...config, auth: 'apiKey', csrf: false });
}

export default createHandler;
