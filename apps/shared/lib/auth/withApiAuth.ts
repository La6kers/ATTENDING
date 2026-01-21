// ============================================================
// API Route Auth Wrapper with Audit Logging
// apps/shared/lib/auth/withApiAuth.ts
//
// Provides authentication, authorization, and audit logging
// for all API routes in the ATTENDING AI platform
// ============================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import type { NextAuthOptions } from 'next-auth';
import { auditLog, auditSecurityEvent, AuditActions } from '../audit';

// ============================================================
// TYPES
// ============================================================

export type UserRole = 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  providerId?: string;
  patientId?: string;
  specialty?: string;
  npi?: string;
}

export interface AuthenticatedRequest extends NextApiRequest {
  user: AuthenticatedUser;
  auditContext: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export type AuthenticatedApiHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

export interface WithApiAuthOptions {
  /** Roles allowed to access this endpoint */
  allowedRoles?: UserRole[];
  /** Audit action to log (optional) */
  auditAction?: string;
  /** Resource type for audit logging */
  resourceType?: string;
  /** Whether this endpoint accesses PHI */
  accessesPHI?: boolean;
  /** Skip authentication (for public endpoints) */
  public?: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getClientIp(req: NextApiRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  return req.socket?.remoteAddress;
}

function getUserAgent(req: NextApiRequest): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
}

// ============================================================
// MAIN WRAPPER
// ============================================================

/**
 * Wrap an API route handler with authentication, authorization, and audit logging
 * 
 * @example
 * ```typescript
 * // Basic usage
 * export default withApiAuth(async (req, res) => {
 *   // req.user is available here
 *   res.json({ user: req.user });
 * });
 * 
 * // With role restriction
 * export default withApiAuth(handler, {
 *   allowedRoles: ['ADMIN', 'PROVIDER'],
 *   auditAction: 'LAB_ORDER_CREATED',
 *   resourceType: 'LabOrder',
 * });
 * ```
 */
export function withApiAuth(
  handler: AuthenticatedApiHandler,
  options: WithApiAuthOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    
    try {
      // Skip auth for public endpoints
      if (options.public) {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.auditContext = { ipAddress, userAgent };
        return handler(authenticatedReq, res);
      }
      
      // Get auth options - try to import dynamically to avoid circular deps
      let authOptions: NextAuthOptions;
      try {
        const authModule = await import('@attending/shared/auth');
        authOptions = authModule.authOptions;
      } catch {
        // Fallback for provider portal
        const authModule = await import('../../../provider-portal/pages/api/auth/[...nextauth]');
        authOptions = authModule.authOptions;
      }
      
      // Get session
      const session = await getServerSession(req, res, authOptions);
      
      if (!session?.user) {
        // Log unauthorized access attempt
        await auditSecurityEvent(
          AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT,
          'anonymous',
          {
            path: req.url,
            method: req.method,
            reason: 'No session',
          },
          ipAddress
        );
        
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }
      
      const user = session.user as AuthenticatedUser;
      
      // Check role permissions
      if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
        await auditSecurityEvent(
          AuditActions.PERMISSION_DENIED,
          user.id,
          {
            path: req.url,
            method: req.method,
            requiredRoles: options.allowedRoles,
            userRole: user.role,
          },
          ipAddress
        );
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredRoles: options.allowedRoles,
        });
      }
      
      // Prepare authenticated request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = user;
      authenticatedReq.auditContext = { ipAddress, userAgent };
      
      // Log the audit action if specified
      if (options.auditAction) {
        await auditLog({
          action: options.auditAction,
          userId: user.id,
          resourceType: options.resourceType || 'API',
          details: {
            path: req.url,
            method: req.method,
            accessesPHI: options.accessesPHI || false,
          },
          ipAddress,
          userAgent,
        });
      }
      
      // Call the actual handler
      return handler(authenticatedReq, res);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[API Error] ${req.method} ${req.url} (${duration}ms):`, error);
      
      // Don't expose internal errors
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Shorthand for provider-only routes
 */
export function withProviderAuth(
  handler: AuthenticatedApiHandler,
  options: Omit<WithApiAuthOptions, 'allowedRoles'> = {}
) {
  return withApiAuth(handler, {
    ...options,
    allowedRoles: ['ADMIN', 'PROVIDER'],
  });
}

/**
 * Shorthand for clinical staff routes (provider, nurse, admin)
 */
export function withClinicalAuth(
  handler: AuthenticatedApiHandler,
  options: Omit<WithApiAuthOptions, 'allowedRoles'> = {}
) {
  return withApiAuth(handler, {
    ...options,
    allowedRoles: ['ADMIN', 'PROVIDER', 'NURSE'],
  });
}

/**
 * Shorthand for admin-only routes
 */
export function withAdminAuth(
  handler: AuthenticatedApiHandler,
  options: Omit<WithApiAuthOptions, 'allowedRoles'> = {}
) {
  return withApiAuth(handler, {
    ...options,
    allowedRoles: ['ADMIN'],
  });
}

/**
 * Shorthand for patient routes
 */
export function withPatientAuth(
  handler: AuthenticatedApiHandler,
  options: Omit<WithApiAuthOptions, 'allowedRoles'> = {}
) {
  return withApiAuth(handler, {
    ...options,
    allowedRoles: ['PATIENT'],
  });
}

// Export default
export default withApiAuth;
