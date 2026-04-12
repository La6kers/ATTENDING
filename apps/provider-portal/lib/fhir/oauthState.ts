// =============================================================================
// Stub: FHIR OAuth State Management
// Placeholder until SMART on FHIR OAuth flow is fully implemented.
// =============================================================================

import crypto from 'crypto';

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function storeOAuthState(_state: string, _data?: Record<string, unknown>): Promise<void> {
  // No-op stub
}

export async function retrieveOAuthState(_state: string): Promise<Record<string, unknown> | null> {
  return null;
}

export async function deleteOAuthState(_state: string): Promise<void> {
  // No-op stub
}
