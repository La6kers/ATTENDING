// ============================================================
// Authentication Utilities - Provider Portal
// apps/provider-portal/lib/api/auth.ts
//
// Provides requireAuth(), requireRole(), createAuditLog()
// Used by 60+ API routes via `import { requireAuth } from '@/lib/api/auth'`
//
// Phase 3: Removed phantom @attending/shared/auth import.
// Uses authOptions from pages/api/auth/[...nextauth].ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';

// ============================================================
// Types (inline — shared/auth types don't exist yet)
// ============================================================

export interface AttendingUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AttendingSession {
  user: AttendingUser;
  expires: string;
}

export type AttendingJWT = {
  id: string;
  role: string;
  email: string;
};

// ============================================================
// SESSION HELPER
// ============================================================

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return getServerSession(req, res, authOptions);
}

// ============================================================
// AUTH BYPASS REMOVED — Phase 0 Security Hardening
// ============================================================
// DEMO_MODE and dev session bypass have been removed.
// All environments now require real NextAuth authentication.
// Use the sign-in page at /auth/signin to authenticate.
// In development, the CredentialsProvider allows email-based
// login against seeded database users (password required).
// ============================================================

// ============================================================
// MIDDLEWARE: requireAuth
// ============================================================

export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: AttendingSession) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return handler(req, res, session as AttendingSession);
  };
}

// ============================================================
// MIDDLEWARE: requireRole
// ============================================================

export function requireRole(roles: string[]) {
  return (handler: (req: NextApiRequest, res: NextApiResponse, session: AttendingSession) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const session = await getSession(req, res);

      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!roles.includes(session.user.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }

      return handler(req, res, session as AttendingSession);
    };
  };
}

// ============================================================
// AUDIT LOGGING
// ============================================================

export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  changes?: Record<string, unknown>,
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
