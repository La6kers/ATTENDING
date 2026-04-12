// ============================================================
// ATTENDING AI - Secure Session Management
// apps/shared/lib/auth/secureSession.ts
//
// HIPAA-compliant session management that:
// - Never exposes PII in headers or logs
// - Uses pluggable storage (Redis in production, in-memory for dev)
// - Enforces clinical shift-aligned timeouts (8 hours)
// - Tracks session activity for audit
//
// HIPAA Requirements:
// - 164.312(d) - Person/entity authentication
// - 164.312(a)(2)(iii) - Automatic logoff
// - 164.308(a)(5)(ii)(C) - Login monitoring
// ============================================================

import { getToken, JWT } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import crypto from 'crypto';
import { encryptData, decryptData, hashData } from '../security';
import { getSessionStore } from './sessionStoreAdapter';

// ============================================================
// TYPES
// ============================================================

export interface SecureSession {
  /** Unique session identifier (not the user ID) */
  sessionId: string;
  /** User ID (never exposed in headers) */
  userId: string;
  /** User role for authorization */
  role: UserRole;
  /** Session creation time */
  createdAt: Date;
  /** Session expiry time */
  expiresAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Whether session is still valid */
  isValid: boolean;
  /** Session fingerprint for validation */
  fingerprint: string;
}

export type UserRole = 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';

export interface SessionValidation {
  valid: boolean;
  reason?: 'expired' | 'invalid_fingerprint' | 'not_found' | 'inactive';
  session?: SecureSession;
}

export interface SessionActivity {
  timestamp: Date;
  action: string;
  resourceType?: string;
  resourceId?: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

// Clinical shift-aligned session duration (8 hours)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Inactivity timeout (30 minutes)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Session extension threshold (extend if less than 1 hour remaining)
const SESSION_EXTENSION_THRESHOLD_MS = 60 * 60 * 1000;

// Maximum session duration (cannot extend beyond 12 hours)
const MAX_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

// TTL for session data in store (max session + 1 hour buffer for audit trail)
const SESSION_TTL_SECONDS = Math.ceil((MAX_SESSION_DURATION_MS + 60 * 60 * 1000) / 1000);

// ============================================================
// SESSION CREATION
// ============================================================

/**
 * Create a new secure session from JWT token
 */
export async function createSecureSession(
  token: JWT,
  userAgent?: string,
  ipAddress?: string
): Promise<SecureSession> {
  const now = new Date();
  const sessionId = generateSessionId();
  const fingerprint = generateFingerprint(token.sub || '', userAgent, ipAddress);
  
  const session: SecureSession = {
    sessionId,
    userId: token.sub || '',
    role: (token.role as UserRole) || 'STAFF',
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    lastActivityAt: now,
    isValid: true,
    fingerprint,
  };
  
  const store = getSessionStore();
  await store.setSession(sessionId, session, SESSION_TTL_SECONDS);
  await store.setActivity(sessionId, [], SESSION_TTL_SECONDS);
  
  return session;
}

/**
 * Generate a cryptographically secure session ID
 * Uses crypto.randomBytes instead of Math.random() for HIPAA compliance
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(18).toString('hex');
  return `sess_${timestamp}_${random}`;
}

/**
 * Generate a fingerprint for session validation
 */
function generateFingerprint(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): string {
  const data = `${userId}:${userAgent || 'unknown'}:${ipAddress || 'unknown'}`;
  return hashData(data, 'session-fingerprint-salt');
}

// ============================================================
// SESSION RETRIEVAL
// ============================================================

/**
 * Get session from request (without exposing PII)
 */
export async function getSecureSession(
  req: NextApiRequest
): Promise<SecureSession | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token) {
    return null;
  }
  
  const store = getSessionStore();
  const userId = token.sub || '';
  
  // Look for existing valid session
  const existing = await store.findSessionByUserId(userId);
  if (existing) {
    return existing;
  }
  
  // Create new session if none exists
  const userAgent = req.headers['user-agent'];
  const ipAddress = getClientIp(req);
  
  return createSecureSession(token, userAgent, ipAddress);
}

/**
 * Get session by ID
 */
export async function getSessionById(sessionId: string): Promise<SecureSession | null> {
  const store = getSessionStore();
  return store.getSession(sessionId);
}

/**
 * Get user ID from request securely (never expose in headers)
 */
export async function getSecureUserId(req: NextApiRequest): Promise<string | null> {
  const session = await getSecureSession(req);
  return session?.userId || null;
}

// ============================================================
// SESSION VALIDATION
// ============================================================

/**
 * Validate a session
 */
export async function validateSession(
  sessionId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<SessionValidation> {
  const store = getSessionStore();
  const session = await store.getSession(sessionId);
  
  if (!session) {
    return { valid: false, reason: 'not_found' };
  }
  
  const now = new Date();
  
  // Check expiry
  if (session.expiresAt < now) {
    await invalidateSession(sessionId);
    return { valid: false, reason: 'expired' };
  }
  
  // Check inactivity
  const inactivityTime = now.getTime() - session.lastActivityAt.getTime();
  if (inactivityTime > INACTIVITY_TIMEOUT_MS) {
    await invalidateSession(sessionId);
    return { valid: false, reason: 'inactive' };
  }
  
  // Validate fingerprint
  if (userAgent || ipAddress) {
    const expectedFingerprint = generateFingerprint(session.userId, userAgent, ipAddress);
    if (session.fingerprint !== expectedFingerprint) {
      console.warn('[Session] Fingerprint mismatch — rejecting session:', {
        sessionId,
        expected: session.fingerprint.slice(0, 10) + '...',
        received: expectedFingerprint.slice(0, 10) + '...',
      });
      await invalidateSession(sessionId);
      return { valid: false, reason: 'invalid_fingerprint' };
    }
  }

  return { valid: true, session };
}

// ============================================================
// SESSION LIFECYCLE
// ============================================================

/**
 * Update session activity (called on each request)
 */
export async function updateSessionActivity(
  sessionId: string,
  action: string,
  resourceType?: string,
  resourceId?: string
): Promise<void> {
  const store = getSessionStore();
  const session = await store.getSession(sessionId);
  
  if (!session) {
    return;
  }
  
  const now = new Date();
  session.lastActivityAt = now;
  
  // Record activity
  const activities = await store.getActivity(sessionId);
  activities.push({
    timestamp: now,
    action,
    resourceType,
    resourceId,
  });
  
  // Keep only last 100 activities
  if (activities.length > 100) {
    activities.splice(0, activities.length - 100);
  }
  
  // Calculate remaining TTL based on session expiry
  const remainingMs = session.expiresAt.getTime() - Date.now();
  const ttl = Math.max(Math.ceil(remainingMs / 1000) + 3600, 3600); // At least 1h buffer
  
  // Extend session if near expiry
  const timeToExpiry = session.expiresAt.getTime() - now.getTime();
  if (timeToExpiry < SESSION_EXTENSION_THRESHOLD_MS) {
    await extendSession(sessionId);
    // Re-read session after extension for correct TTL
    const extended = await store.getSession(sessionId);
    if (extended) {
      const newTtl = Math.ceil((extended.expiresAt.getTime() - Date.now()) / 1000) + 3600;
      await store.setSession(sessionId, extended, newTtl);
      await store.setActivity(sessionId, activities, newTtl);
      return;
    }
  }
  
  await store.setSession(sessionId, session, ttl);
  await store.setActivity(sessionId, activities, ttl);
}

/**
 * Extend session duration
 */
export async function extendSession(sessionId: string): Promise<boolean> {
  const store = getSessionStore();
  const session = await store.getSession(sessionId);
  
  if (!session || !session.isValid) {
    return false;
  }
  
  const now = new Date();
  const sessionAge = now.getTime() - session.createdAt.getTime();
  
  // Don't extend beyond max duration
  if (sessionAge >= MAX_SESSION_DURATION_MS) {
    return false;
  }
  
  // Calculate new expiry (min of standard duration and max remaining)
  const maxRemaining = MAX_SESSION_DURATION_MS - sessionAge;
  const extension = Math.min(SESSION_DURATION_MS, maxRemaining);
  
  session.expiresAt = new Date(now.getTime() + extension);
  
  const ttl = Math.ceil(extension / 1000) + 3600; // extension + 1h buffer
  await store.setSession(sessionId, session, ttl);
  
  return true;
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const store = getSessionStore();
  const session = await store.getSession(sessionId);
  
  if (session) {
    session.isValid = false;
    
    // Keep for audit trail with short TTL (5 minutes)
    await store.setSession(sessionId, session, 300);
    
    // Schedule full deletion after audit window
    setTimeout(async () => {
      try {
        await store.deleteSession(sessionId);
        await store.deleteActivity(sessionId);
      } catch (error) {
        console.error('[Session] Failed to cleanup invalidated session:', error);
      }
    }, 300000); // 5 minutes
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateUserSessions(userId: string): Promise<number> {
  const store = getSessionStore();
  const sessionIds = await store.getSessionIdsByUserId(userId);
  let count = 0;
  
  for (const sessionId of sessionIds) {
    await invalidateSession(sessionId);
    count++;
  }
  
  return count;
}

// ============================================================
// SESSION INFO (Safe to expose)
// ============================================================

/**
 * Get session info safe for client exposure
 */
export function getSessionInfo(session: SecureSession): {
  sessionId: string;
  role: UserRole;
  expiresAt: string;
  lastActivityAt: string;
  remainingMs: number;
} {
  const now = Date.now();
  
  return {
    sessionId: session.sessionId,
    role: session.role,
    expiresAt: session.expiresAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    remainingMs: Math.max(0, session.expiresAt.getTime() - now),
  };
}

/**
 * Get session activity for audit
 */
export async function getSessionActivityLog(sessionId: string): Promise<SessionActivity[]> {
  const store = getSessionStore();
  return store.getActivity(sessionId);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get client IP from request
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket?.remoteAddress || 'unknown';
}

// ============================================================
// ENCRYPTED SESSION TOKEN (for cookies)
// ============================================================

/**
 * Create an encrypted session token for cookie storage
 */
export function createEncryptedSessionToken(session: SecureSession): string {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('SESSION_ENCRYPTION_KEY not configured');
  }
  
  const payload = JSON.stringify({
    sessionId: session.sessionId,
    userId: session.userId,
    role: session.role,
    expiresAt: session.expiresAt.toISOString(),
  });
  
  return encryptData(payload, key);
}

/**
 * Decrypt and validate session token from cookie
 */
export function decryptSessionToken(token: string): {
  sessionId: string;
  userId: string;
  role: UserRole;
  expiresAt: Date;
} | null {
  const key = process.env.SESSION_ENCRYPTION_KEY;
  
  if (!key) {
    console.error('SESSION_ENCRYPTION_KEY not configured');
    return null;
  }
  
  try {
    const payload = decryptData(token, key);
    const data = JSON.parse(payload);
    
    return {
      sessionId: data.sessionId,
      userId: data.userId,
      role: data.role as UserRole,
      expiresAt: new Date(data.expiresAt),
    };
  } catch (error) {
    console.error('Failed to decrypt session token:', error);
    return null;
  }
}

// ============================================================
// EXPORTS
// ============================================================

export const sessionConfig = {
  SESSION_DURATION_MS,
  INACTIVITY_TIMEOUT_MS,
  SESSION_EXTENSION_THRESHOLD_MS,
  MAX_SESSION_DURATION_MS,
};

export default {
  createSecureSession,
  getSecureSession,
  getSessionById,
  getSecureUserId,
  validateSession,
  updateSessionActivity,
  extendSession,
  invalidateSession,
  invalidateUserSessions,
  getSessionInfo,
  getSessionActivityLog,
  createEncryptedSessionToken,
  decryptSessionToken,
  sessionConfig,
};
