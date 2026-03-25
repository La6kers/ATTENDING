// ============================================================
// API Route Authentication Wrapper
// apps/provider-portal/lib/auth/withApiAuth.ts
//
// Wraps API handlers with authentication, authorization, and audit logging.
// Use this for all protected API endpoints.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@attending/shared/auth';
import { auditLog, logSecurityEvent } from '../audit';

// ============================================================
// Types
// ============================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';
  providerId?: string;
  specialty?: string;
  npi?: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user: AuthenticatedUser;
}

type ApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

interface AuthOptions {
  /** Roles that can access this endpoint */
  allowedRoles?: ('ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT')[];
  /** Audit action to log (e.g., 'LAB_ORDER_CREATED') */
  auditAction?: string;
  /** Whether to skip audit logging for this endpoint */
  skipAudit?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

// ============================================================
// Main Wrapper
// ============================================================

/**
 * Wrap an API handler with authentication and authorization.
 * 
 * @example
 * // Basic auth required
 * export default withApiAuth(handler);
 * 
 * // With role restriction
 * export default withApiAuth(handler, { allowedRoles: ['PROVIDER', 'ADMIN'] });
 * 
 * // With audit logging
 * export default withApiAuth(handler, { 
 *   allowedRoles: ['PROVIDER'],
 *   auditAction: 'LAB_ORDER_CREATED'
 * });
 */
export function withApiAuth(
  handler: ApiHandler,
  options: AuthOptions = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();

    try {
      // Get session from NextAuth
      const session = await getServerSession(req, res, authOptions);

      // No session - unauthorized
      if (!session?.user) {
        await logSecurityEvent('anonymous', 'unauthorized', {
          path: req.url,
          method: req.method,
          ip: getClientIp(req),
        });

        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      const user: AuthenticatedUser = {
        id: session.user.id || session.user.providerId || '',
        email: session.user.email || '',
        name: session.user.name || '',
        role: session.user.role,
        providerId: session.user.providerId,
        specialty: session.user.specialty,
        npi: session.user.npi,
      };

      // Check role-based access
      if (options.allowedRoles && options.allowedRoles.length > 0) {
        if (!options.allowedRoles.includes(user.role)) {
          await logSecurityEvent(user.id, 'permission_denied', {
            path: req.url,
            method: req.method,
            userRole: user.role,
            requiredRoles: options.allowedRoles,
            ip: getClientIp(req),
          });

          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            code: 'ROLE_FORBIDDEN',
            requiredRoles: options.allowedRoles,
            yourRole: user.role,
          });
        }
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = user;

      // Execute handler
      await handler(req as AuthenticatedRequest, res);

      // Audit log successful access (unless skipped)
      if (!options.skipAudit) {
        const duration = Date.now() - startTime;
        await auditLog({
          action: (options.auditAction || 'API_ACCESS') as any,
          userId: user.id,
          resourceType: 'API',
          details: {
            path: req.url,
            method: req.method,
            statusCode: res.statusCode,
            duration,
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
          success: res.statusCode < 400,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[API Auth Error]', {
        path: req.url,
        method: req.method,
        error: errorMessage,
      });

      // Log error
      if (!options.skipAudit) {
        await auditLog({
          action: (options.auditAction || 'API_ACCESS') as any,
          userId: (req as AuthenticatedRequest).user?.id || 'unknown',
          resourceType: 'API',
          details: {
            path: req.url,
            method: req.method,
            error: errorMessage,
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
          success: false,
          errorMessage,
        });
      }

      // Don't expose internal errors
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  };
}

// ============================================================
// Convenience Wrappers
// ============================================================

/**
 * Require provider role (physicians, NPs, PAs)
 */
export function withProviderAuth(
  handler: ApiHandler,
  auditAction?: string
) {
  return withApiAuth(handler, {
    allowedRoles: ['PROVIDER', 'ADMIN'],
    auditAction,
  });
}

/**
 * Require clinical staff role (providers + nurses)
 */
export function withClinicalAuth(
  handler: ApiHandler,
  auditAction?: string
) {
  return withApiAuth(handler, {
    allowedRoles: ['PROVIDER', 'NURSE', 'ADMIN'],
    auditAction,
  });
}

/**
 * Require admin role
 */
export function withAdminAuth(
  handler: ApiHandler,
  auditAction?: string
) {
  return withApiAuth(handler, {
    allowedRoles: ['ADMIN'],
    auditAction,
  });
}

/**
 * Allow any authenticated user
 */
export function withAnyAuth(
  handler: ApiHandler,
  auditAction?: string
) {
  return withApiAuth(handler, {
    auditAction,
  });
}
