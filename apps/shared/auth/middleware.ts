// ============================================================
// Authentication Middleware - @attending/shared
// apps/shared/auth/middleware.ts
//
// API route protection and role-based access control
// ============================================================

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import type { AttendingSession, AttendingUser } from './config';

// ============================================================
// TYPES
// ============================================================

export interface AuthenticatedRequest extends NextApiRequest {
  session: AttendingSession;
  user: AttendingUser;
}

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

// ============================================================
// WITH AUTH MIDDLEWARE
// ============================================================

/**
 * Wrap an API handler to require authentication
 * 
 * @param handler - The API handler function
 * @param authOptions - NextAuth options for the portal
 * @returns Protected handler that checks for valid session
 * 
 * @example
 * export default withAuth(async (req, res) => {
 *   // req.user is guaranteed to exist
 *   console.log(req.user.name);
 * }, authOptions);
 */
export function withAuth(
  handler: AuthenticatedHandler,
  authOptions: NextAuthOptions
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Check for dev bypass
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      // Create a mock session for development
      const mockSession: AttendingSession = {
        user: {
          id: 'dev-provider-001',
          email: 'provider@attending.dev',
          name: 'Dr. Sarah Chen (Dev)',
          role: 'PROVIDER',
          providerId: 'dev-provider-001',
        },
        expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      };
      (req as AuthenticatedRequest).session = mockSession;
      (req as AuthenticatedRequest).user = mockSession.user;
      return handler(req as AuthenticatedRequest, res);
    }

    try {
      const session = await getServerSession(req, res, authOptions) as AttendingSession | null;

      if (!session?.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource',
        });
      }

      // Attach session and user to request
      (req as AuthenticatedRequest).session = session;
      (req as AuthenticatedRequest).user = session.user;

      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred while verifying your session',
      });
    }
  };
}

// ============================================================
// WITH ROLE MIDDLEWARE
// ============================================================

type UserRole = AttendingUser['role'];

/**
 * Wrap an API handler to require specific role(s)
 * 
 * @param roles - Array of allowed roles
 * @param handler - The API handler function
 * @param authOptions - NextAuth options for the portal
 * @returns Protected handler that checks for valid session and role
 * 
 * @example
 * export default withRole(['PROVIDER', 'ADMIN'], async (req, res) => {
 *   // Only providers and admins can access
 * }, authOptions);
 */
export function withRole(
  roles: UserRole[],
  handler: AuthenticatedHandler,
  authOptions: NextAuthOptions
): NextApiHandler {
  return withAuth(async (req, res) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    return handler(req, res);
  }, authOptions);
}

// ============================================================
// PROVIDER ONLY MIDDLEWARE
// ============================================================

/**
 * Shorthand for provider-only routes
 */
export function withProvider(
  handler: AuthenticatedHandler,
  authOptions: NextAuthOptions
): NextApiHandler {
  return withRole(['PROVIDER', 'ADMIN'], handler, authOptions);
}

// ============================================================
// PATIENT ONLY MIDDLEWARE
// ============================================================

/**
 * Shorthand for patient-only routes
 */
export function withPatient(
  handler: AuthenticatedHandler,
  authOptions: NextAuthOptions
): NextApiHandler {
  return withRole(['PATIENT'], handler, authOptions);
}

// ============================================================
// AUDIT LOGGING MIDDLEWARE
// ============================================================

/**
 * Wrap handler with audit logging
 */
export function withAuditLog(
  handler: AuthenticatedHandler,
  authOptions: NextAuthOptions,
  action: string,
  prisma?: any
): NextApiHandler {
  return withAuth(async (req, res) => {
    const startTime = Date.now();

    // Create a wrapper to capture the response
    const originalJson = res.json.bind(res);
    let responseData: any;
    let responseStatus: number = 500; // Default to error, updated by res.json override

    res.json = (body: any) => {
      responseData = body;
      responseStatus = res.statusCode;
      return originalJson(body);
    };

    try {
      await handler(req, res);
    } finally {
      // Log the action
      if (prisma) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user.id,
              action,
              entityType: req.url?.split('/')[2] || 'unknown',
              entityId: req.query.id as string || null,
              changes: {
                method: req.method,
                body: req.method !== 'GET' ? req.body : undefined,
                responseStatus,
                duration: Date.now() - startTime,
              },
              ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress,
              userAgent: req.headers['user-agent'],
              success: responseStatus >= 200 && responseStatus < 300,
            },
          });
        } catch (error) {
          console.error('Audit log error:', error);
        }
      }
    }
  }, authOptions);
}
