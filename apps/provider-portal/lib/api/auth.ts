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
// DEV/DEMO BYPASS
// ============================================================

const isDev = process.env.NODE_ENV === 'development';
const isDemo = process.env.DEMO_MODE === 'true';
// Set NEXTAUTH_ENFORCE=true (e.g. in playwright E2E) to disable the dev
// bypass entirely and get proper 401 responses without a running database.
const enforceInDev = process.env.NEXTAUTH_ENFORCE === 'true';

/**
 * Check if dev/demo bypass is allowed.
 * Bypass is enabled when:
 *   - In development mode (NODE_ENV=development), OR
 *   - Demo mode is enabled (DEMO_MODE=true)
 * AND:
 *   - NEXTAUTH_ENFORCE is NOT set to true
 */
function isDevOrDemoBypassAllowed(): boolean {
  if (enforceInDev) return false;
  return isDev || isDemo;
}

/**
 * In dev/demo mode without a session, return a mock session using
 * the first PROVIDER user in the database.
 *
 * Returns null (gracefully) when:
 *   - Not in development AND not in demo mode
 *   - NEXTAUTH_ENFORCE=true is set
 *   - Database is unavailable (prevents 500 errors during E2E runs)
 */
async function getDevSession(): Promise<AttendingSession | null> {
  if (!isDevOrDemoBypassAllowed()) return null;
  try {
    const user = await prisma.user.findFirst({
      where: { role: 'PROVIDER' },
    });
    if (!user) return null;

    // Log dev session usage for audit awareness (only in demo mode)
    if (isDemo && !isDev) {
      console.log('[AUTH] Demo mode session created for user:', user.email);
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        name: user.name ?? '',
        role: user.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    // Database unavailable — degrade gracefully to 401 instead of 500.
    return null;
  }
}

// ============================================================
// MIDDLEWARE: requireAuth
// ============================================================

export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: AttendingSession) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let session = await getSession(req, res);

    // Dev/Demo fallback: auto-authenticate as first provider
    if (!session && isDevOrDemoBypassAllowed()) {
      session = await getDevSession();
    }

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
      let session = await getSession(req, res);

      if (!session && isDevOrDemoBypassAllowed()) {
        session = await getDevSession();
      }

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
