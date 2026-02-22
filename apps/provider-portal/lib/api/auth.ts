// ============================================================
// Authentication Utilities - Provider Portal
// apps/provider-portal/lib/api/auth.ts
//
// This file provides the portal-specific auth utilities that 60+ API
// routes depend on. It delegates to the canonical shared auth module.
//
// ARCHITECTURE:
//
//   Canonical config:  @attending/shared/auth/config.ts
//     └─ createProviderAuthOptions(prisma) → NextAuthOptions
//     └─ authOptions (default, no-prisma version)
//
//   Canonical middleware: @attending/shared/auth/middleware.ts  
//     └─ withAuth(), withRole(), withProvider(), withAuditLog()
//
//   NextAuth route:    pages/api/auth/[...nextauth].ts
//     └─ imports createProviderAuthOptions from shared
//
//   THIS FILE:         lib/api/auth.ts
//     └─ requireAuth(), requireRole(), createAuditLog()
//     └─ Used by 60+ API routes via `import { requireAuth } from '@/lib/api/auth'`
//     └─ Delegates to shared authOptions for session validation
//
//   Role helpers:      lib/auth.ts
//     └─ Re-exports this file + component-side role utilities
//
//   Client API:        @attending/shared/lib/auth/authApi.ts
//     └─ Fetch-based auth operations (login, MFA, tokens)
//
//   Session store:     @attending/shared/lib/auth/secureSession.ts
//     └─ Redis-backed HIPAA session lifecycle
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { createProviderAuthOptions } from '@attending/shared/auth';
import { prisma } from '@attending/shared/lib/prisma';

// Re-export types from shared for convenience
export type { AttendingUser, AttendingSession, AttendingJWT } from '@attending/shared/auth';

// ============================================================
// AUTH OPTIONS
// ============================================================

/**
 * Provider portal auth options — uses the shared factory with Prisma
 * for database-backed user lookups.
 *
 * This is the SAME config used by pages/api/auth/[...nextauth].ts,
 * ensuring session validation is consistent across all API routes.
 */
export const authOptions = createProviderAuthOptions(prisma);

// ============================================================
// SESSION HELPER
// ============================================================

/**
 * Get the current session from an API route.
 */
export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return getServerSession(req, res, authOptions);
}

// ============================================================
// MIDDLEWARE: requireAuth
// ============================================================

/**
 * Wrap an API handler to require authentication.
 * The session is passed as the third argument for backward compatibility
 * with existing API routes.
 *
 * @example
 * export default requireAuth(async (req, res, session) => {
 *   console.log(session.user.role);
 * });
 */
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return handler(req, res, session);
  };
}

// ============================================================
// MIDDLEWARE: requireRole
// ============================================================

/**
 * Wrap an API handler to require one of the specified roles.
 *
 * @example
 * export default requireRole(['PROVIDER', 'ADMIN'])(async (req, res, session) => {
 *   // Only providers and admins reach here
 * });
 */
export function requireRole(roles: string[]) {
  return (handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const session = await getSession(req, res);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!roles.includes(session.user.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }

      return handler(req, res, session);
    };
  };
}

// ============================================================
// AUDIT LOGGING
// ============================================================

/**
 * Create a HIPAA-compliant audit log entry.
 *
 * @example
 * await createAuditLog(session.user.id, 'READ_PATIENT', 'Patient', patientId, null, req);
 */
export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  changes?: any,
  req?: NextApiRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: changes ? (typeof changes === 'string' ? changes : JSON.stringify(changes)) : null,
        ipAddress: req?.headers['x-forwarded-for']?.toString() || req?.socket?.remoteAddress,
        userAgent: req?.headers['user-agent'],
        success: true,
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
  }
}
