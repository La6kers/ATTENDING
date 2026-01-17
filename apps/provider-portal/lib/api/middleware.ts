// =============================================================================
// ATTENDING AI - API Middleware
// apps/provider-portal/lib/api/middleware.ts
//
// Authentication and authorization middleware for API routes.
// Provides role-based access control and audit logging.
// =============================================================================

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions, type SessionUser } from '../auth';

// =============================================================================
// Types
// =============================================================================

export type ProviderRole = 'admin' | 'physician' | 'np' | 'pa' | 'rn' | 'ma' | 'staff';

export interface AuthenticatedRequest extends NextApiRequest {
  user: SessionUser;
  sessionId: string;
}

export type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => Promise<void> | void;

export interface MiddlewareOptions {
  roles?: ProviderRole[];
  requireAuth?: boolean;
  auditLog?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

// =============================================================================
// Role-based Permissions
// =============================================================================

const ROLE_PERMISSIONS: Record<ProviderRole, string[]> = {
  admin: ['*'], // All permissions
  physician: [
    'view_patients', 'edit_patients',
    'order_labs', 'order_imaging', 'order_medications',
    'prescribe', 'sign_orders',
    'create_referrals', 'view_referrals',
    'create_treatment_plans', 'sign_treatment_plans',
    'view_assessments', 'review_assessments',
    'chat_with_patients',
  ],
  np: [
    'view_patients', 'edit_patients',
    'order_labs', 'order_imaging', 'order_medications',
    'prescribe', 'sign_orders',
    'create_referrals', 'view_referrals',
    'create_treatment_plans', 'sign_treatment_plans',
    'view_assessments', 'review_assessments',
    'chat_with_patients',
  ],
  pa: [
    'view_patients', 'edit_patients',
    'order_labs', 'order_imaging', 'order_medications',
    'prescribe',
    'create_referrals', 'view_referrals',
    'create_treatment_plans',
    'view_assessments', 'review_assessments',
    'chat_with_patients',
  ],
  rn: [
    'view_patients',
    'order_labs', // With protocols
    'view_referrals',
    'view_assessments', 'triage_assessments',
    'chat_with_patients',
    'document_vitals',
  ],
  ma: [
    'view_patients',
    'view_assessments',
    'document_vitals',
    'room_patients',
  ],
  staff: [
    'view_patients',
    'view_assessments',
    'schedule_appointments',
  ],
};

// =============================================================================
// Rate Limiting (Simple in-memory)
// =============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// =============================================================================
// Audit Logging
// =============================================================================

interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  method: string;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  // In production, this would write to a database or audit service
  // For now, log to console in a structured format
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    }));
  }
  
  // TODO: Write to Prisma audit log table
  // await prisma.auditLog.create({ data: entry });
}

// =============================================================================
// Development Mode Auth Bypass
// =============================================================================

function getDevUser(): SessionUser {
  return {
    id: 'dev-user-001',
    name: 'Dr. Dev Provider',
    email: 'dev@attending.ai',
    role: 'provider',
  };
}

// =============================================================================
// Main Middleware Functions
// =============================================================================

/**
 * Wrap an API handler with authentication
 * In development mode, uses a mock user
 */
export function withAuth(handler: AuthenticatedHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = getDevUser();
      authenticatedReq.sessionId = 'dev-session-001';
      return handler(authenticatedReq, res);
    }
    
    // Get session from NextAuth
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    // Attach user to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = session.user as SessionUser;
    authenticatedReq.sessionId = (session as any).sessionId || 'unknown';
    
    return handler(authenticatedReq, res);
  };
}

/**
 * Wrap an API handler with role-based authorization
 */
export function withRoles(
  roles: ProviderRole[],
  handler: AuthenticatedHandler
): NextApiHandler {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const userRole = req.user.role as ProviderRole;
    
    // Admin has all permissions
    if (userRole === 'admin') {
      return handler(req, res);
    }
    
    // Check if user's role is in allowed roles
    if (!roles.includes(userRole)) {
      await logAuditEntry({
        timestamp: new Date(),
        userId: req.user.id,
        userRole,
        action: 'ACCESS_DENIED',
        resource: req.url || 'unknown',
        method: req.method || 'unknown',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        success: false,
        error: `Role ${userRole} not in allowed roles: ${roles.join(', ')}`,
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of these roles: ${roles.join(', ')}`,
      });
    }
    
    return handler(req, res);
  });
}

/**
 * Wrap an API handler with permission-based authorization
 */
export function withPermission(
  permission: string,
  handler: AuthenticatedHandler
): NextApiHandler {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const userRole = req.user.role as ProviderRole;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    // Check for wildcard or specific permission
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      await logAuditEntry({
        timestamp: new Date(),
        userId: req.user.id,
        userRole,
        action: 'PERMISSION_DENIED',
        resource: req.url || 'unknown',
        method: req.method || 'unknown',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        success: false,
        error: `Missing permission: ${permission}`,
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires the "${permission}" permission`,
      });
    }
    
    return handler(req, res);
  });
}

/**
 * Comprehensive middleware with all options
 */
export function withApiMiddleware(
  options: MiddlewareOptions,
  handler: AuthenticatedHandler
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const _startTime = Date.now();
    
    // Rate limiting
    if (options.rateLimit) {
      const identifier = getClientIp(req);
      const allowed = checkRateLimit(
        identifier,
        options.rateLimit.maxRequests,
        options.rateLimit.windowMs
      );
      
      if (!allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        });
      }
    }
    
    // Authentication (if required)
    if (options.requireAuth !== false) {
      // Development mode bypass
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = getDevUser();
        authenticatedReq.sessionId = 'dev-session-001';
      } else {
        const session = await getServerSession(req, res, authOptions);
        
        if (!session || !session.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }
        
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = session.user as SessionUser;
        authenticatedReq.sessionId = (session as any).sessionId || 'unknown';
      }
    }
    
    const authenticatedReq = req as AuthenticatedRequest;
    
    // Role-based authorization
    if (options.roles && options.roles.length > 0) {
      const userRole = authenticatedReq.user?.role as ProviderRole;
      
      if (userRole !== 'admin' && !options.roles.includes(userRole)) {
        if (options.auditLog) {
          await logAuditEntry({
            timestamp: new Date(),
            userId: authenticatedReq.user?.id || 'unknown',
            userRole: userRole || 'unknown',
            action: 'ACCESS_DENIED',
            resource: req.url || 'unknown',
            method: req.method || 'unknown',
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            success: false,
            error: `Role ${userRole} not authorized`,
          });
        }
        
        return res.status(403).json({
          error: 'Forbidden',
          message: `This action requires one of these roles: ${options.roles.join(', ')}`,
        });
      }
    }
    
    // Execute handler
    try {
      await handler(authenticatedReq, res);
      
      // Audit log on success
      if (options.auditLog) {
        await logAuditEntry({
          timestamp: new Date(),
          userId: authenticatedReq.user?.id || 'anonymous',
          userRole: authenticatedReq.user?.role || 'none',
          action: 'API_CALL',
          resource: req.url || 'unknown',
          method: req.method || 'unknown',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          success: true,
        });
      }
    } catch (error) {
      // Audit log on error
      if (options.auditLog) {
        await logAuditEntry({
          timestamp: new Date(),
          userId: authenticatedReq.user?.id || 'anonymous',
          userRole: authenticatedReq.user?.role || 'none',
          action: 'API_ERROR',
          resource: req.url || 'unknown',
          method: req.method || 'unknown',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      console.error('API Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An unexpected error occurred',
      });
    }
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: SessionUser, permission: string): boolean {
  const userRole = user.role as ProviderRole;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: ProviderRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

// =============================================================================
// Pre-configured middleware for common use cases
// =============================================================================

/**
 * Middleware for provider-only routes
 */
export const providerOnly = (handler: AuthenticatedHandler) => 
  withRoles(['physician', 'np', 'pa'], handler);

/**
 * Middleware for clinical staff routes
 */
export const clinicalStaff = (handler: AuthenticatedHandler) => 
  withRoles(['physician', 'np', 'pa', 'rn'], handler);

/**
 * Middleware for any authenticated staff
 */
export const anyStaff = (handler: AuthenticatedHandler) => 
  withAuth(handler);

/**
 * Middleware for admin-only routes
 */
export const adminOnly = (handler: AuthenticatedHandler) => 
  withRoles(['admin'], handler);

/**
 * Middleware for prescribing routes
 */
export const canPrescribe = (handler: AuthenticatedHandler) => 
  withPermission('prescribe', handler);

/**
 * Middleware for signing orders
 */
export const canSignOrders = (handler: AuthenticatedHandler) => 
  withPermission('sign_orders', handler);

export default withApiMiddleware;
