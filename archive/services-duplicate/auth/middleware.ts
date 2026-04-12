// =============================================================================
// ATTENDING AI - Authentication Middleware
// services/auth/middleware.ts
//
// Next.js API route middleware for JWT validation and RBAC.
// Ensures all clinical endpoints are properly secured.
// =============================================================================

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { tokenValidator, type HealthcareUser, type Permission } from './azure-ad-b2c';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedRequest extends NextApiRequest {
  user: HealthcareUser;
}

interface AuthMiddlewareOptions {
  requiredPermissions?: Permission[];
  requireAllPermissions?: boolean; // Default: false (any permission passes)
  allowedRoles?: string[];
  auditAction?: string;
}

interface AuditLogEntry {
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  resource: string;
  method: string;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

// ============================================================================
// Audit Logging
// ============================================================================

function logAuditEntry(entry: AuditLogEntry) {
  // In production, this would go to a proper audit service (HIPAA requirement)
  console.log('[AUDIT]', JSON.stringify(entry));
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

// ============================================================================
// Authentication Middleware
// ============================================================================

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void,
  options: AuthMiddlewareOptions = {}
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logAuditEntry({
        timestamp: new Date().toISOString(),
        userId: 'anonymous',
        userName: 'anonymous',
        role: 'none',
        action: options.auditAction || 'api_access',
        resource: req.url || '',
        method: req.method || '',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        success: false,
        errorMessage: 'Missing or invalid Authorization header',
      });
      
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Validate token
    const user = await tokenValidator.validateToken(token);
    
    if (!user) {
      logAuditEntry({
        timestamp: new Date().toISOString(),
        userId: 'invalid_token',
        userName: 'unknown',
        role: 'none',
        action: options.auditAction || 'api_access',
        resource: req.url || '',
        method: req.method || '',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        success: false,
        errorMessage: 'Invalid or expired token',
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
    }

    // Check session expiry
    if (user.sessionExpiry < new Date()) {
      logAuditEntry({
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: options.auditAction || 'api_access',
        resource: req.url || '',
        method: req.method || '',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        success: false,
        errorMessage: 'Session expired',
      });
      
      return res.status(401).json({
        success: false,
        error: 'Session expired',
        code: 'SESSION_EXPIRED',
      });
    }

    // Check role-based access
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role)) {
        logAuditEntry({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: options.auditAction || 'api_access',
          resource: req.url || '',
          method: req.method || '',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
          success: false,
          errorMessage: `Role ${user.role} not allowed`,
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient role privileges',
          code: 'ROLE_FORBIDDEN',
        });
      }
    }

    // Check permission-based access
    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasPermission = options.requireAllPermissions
        ? options.requiredPermissions.every(p => user.permissions.includes(p))
        : options.requiredPermissions.some(p => user.permissions.includes(p));

      if (!hasPermission) {
        logAuditEntry({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: options.auditAction || 'api_access',
          resource: req.url || '',
          method: req.method || '',
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'] || '',
          success: false,
          errorMessage: `Missing required permissions: ${options.requiredPermissions.join(', ')}`,
        });
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermissions: options.requiredPermissions,
        });
      }
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    // Execute handler
    try {
      await handler(req as AuthenticatedRequest, res);
      
      // Log successful access
      logAuditEntry({
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: options.auditAction || 'api_access',
        resource: req.url || '',
        method: req.method || '',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        success: true,
      });
      
    } catch (error) {
      logAuditEntry({
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: options.auditAction || 'api_access',
        resource: req.url || '',
        method: req.method || '',
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || '',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Require user to be authenticated (any valid token)
 */
export function requireAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return withAuth(handler);
}

/**
 * Require user to be a physician or higher
 */
export function requirePhysician(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return withAuth(handler, {
    allowedRoles: ['physician', 'superadmin'],
    auditAction: 'physician_access',
  });
}

/**
 * Require user to have prescribing privileges
 */
export function requirePrescribingPrivileges(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return withAuth(handler, {
    requiredPermissions: ['order_medications', 'prescribe_controlled'],
    requireAllPermissions: true,
    auditAction: 'prescribing_access',
  });
}

/**
 * Require user to have ordering privileges
 */
export function requireOrderingPrivileges(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return withAuth(handler, {
    requiredPermissions: ['order_labs', 'order_imaging'],
    requireAllPermissions: false,
    auditAction: 'ordering_access',
  });
}

/**
 * Require user to have admin privileges
 */
export function requireAdmin(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
): NextApiHandler {
  return withAuth(handler, {
    allowedRoles: ['admin', 'superadmin'],
    auditAction: 'admin_access',
  });
}

/**
 * Require specific permissions
 */
export function requirePermissions(
  permissions: Permission[],
  requireAll: boolean = false
) {
  return (
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
  ): NextApiHandler => {
    return withAuth(handler, {
      requiredPermissions: permissions,
      requireAllPermissions: requireAll,
      auditAction: `permission_check:${permissions.join(',')}`,
    });
  };
}

// ============================================================================
// Emergency Override
// ============================================================================

/**
 * Allow access with emergency override (for critical patient care situations)
 * Logs extensively for compliance review
 */
export function withEmergencyOverride(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void,
  options: AuthMiddlewareOptions = {}
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const emergencyOverride = req.headers['x-emergency-override'] === 'true';
    
    if (emergencyOverride) {
      // Extract token even for emergency override (still need identity)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = await tokenValidator.validateToken(token);
        
        if (user && user.permissions.includes('emergency_override')) {
          // Log emergency override
          console.warn('[EMERGENCY OVERRIDE]', {
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            role: user.role,
            resource: req.url,
            method: req.method,
            reason: req.headers['x-emergency-reason'] || 'Not specified',
            patientId: req.headers['x-patient-id'] || 'Not specified',
          });
          
          (req as AuthenticatedRequest).user = user;
          return handler(req as AuthenticatedRequest, res);
        }
      }
    }
    
    // Fall back to normal auth
    return withAuth(handler, options)(req, res);
  };
}
