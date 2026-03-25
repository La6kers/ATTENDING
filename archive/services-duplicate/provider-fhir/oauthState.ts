// =============================================================================
// ATTENDING AI - OAuth State Management
// apps/provider-portal/lib/fhir/oauthState.ts
//
// Secure state parameter generation and verification for OAuth2 CSRF protection
// =============================================================================

import { randomBytes } from 'crypto';
import { prisma } from '../prisma';

// =============================================================================
// Types
// =============================================================================

export interface OAuthStateContext {
  vendor: string;
  patientId?: string;
  providerId?: string;
  launch?: string;
  initiatedAt: string;
  redirectTo?: string;
}

// =============================================================================
// State Generation
// =============================================================================

/**
 * Generate a cryptographically secure state parameter
 */
export function generateState(): string {
  return randomBytes(32).toString('hex');
}

// =============================================================================
// State Storage (Database-backed for production)
// =============================================================================

/**
 * Store OAuth state with associated context
 * Uses database for distributed systems / serverless
 */
export async function storeOAuthState(state: string, context: OAuthStateContext): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oAuthState.upsert({
    where: { state },
    update: {
      context: JSON.stringify(context),
      expiresAt,
    },
    create: {
      state,
      context: JSON.stringify(context),
      expiresAt,
    },
  });
}

/**
 * Verify and retrieve OAuth state
 * Returns null if state is invalid or expired
 */
export async function verifyOAuthState(state: string): Promise<OAuthStateContext | null> {
  const record = await prisma.oAuthState.findUnique({
    where: { state },
  });

  if (!record) {
    return null;
  }

  // Check expiration
  if (record.expiresAt < new Date()) {
    // Clean up expired state
    await prisma.oAuthState.delete({ where: { state } }).catch(() => {});
    return null;
  }

  try {
    return JSON.parse(record.context);
  } catch {
    return null;
  }
}

/**
 * Clear OAuth state after successful use
 */
export async function clearOAuthState(state: string): Promise<void> {
  await prisma.oAuthState.delete({
    where: { state },
  }).catch(() => {
    // Ignore if already deleted
  });
}

/**
 * Clean up expired OAuth states (call periodically)
 */
export async function cleanupExpiredStates(): Promise<number> {
  const result = await prisma.oAuthState.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

// =============================================================================
// In-Memory Fallback (for development without DB)
// =============================================================================

const memoryStore = new Map<string, { context: OAuthStateContext; expiresAt: Date }>();

export async function storeOAuthStateMemory(state: string, context: OAuthStateContext): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  memoryStore.set(state, { context, expiresAt });
  
  // Cleanup old entries
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt < new Date()) {
      memoryStore.delete(key);
    }
  }
}

export async function verifyOAuthStateMemory(state: string): Promise<OAuthStateContext | null> {
  const record = memoryStore.get(state);
  
  if (!record || record.expiresAt < new Date()) {
    memoryStore.delete(state);
    return null;
  }
  
  return record.context;
}

export async function clearOAuthStateMemory(state: string): Promise<void> {
  memoryStore.delete(state);
}
