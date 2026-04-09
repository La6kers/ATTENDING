// =============================================================================
// ATTENDING AI - IAL2 Verification Middleware
// packages/identity/src/middleware/ial2-verify.ts
//
// Middleware to enforce IAL2 identity verification for CMS HTE endpoints
// =============================================================================

import type { VerifiedIdentity, IdentityAssuranceLevel } from '../types';

// =============================================================================
// IAL2 Verification Check
// =============================================================================

export interface IAL2VerificationContext {
  identity: VerifiedIdentity | null;
  isVerified: boolean;
  ialLevel: IdentityAssuranceLevel | null;
  provider: string | null;
}

/**
 * Check if a verified identity meets IAL2 requirements.
 * Used by API route handlers to gate CMS HTE data access.
 */
export function checkIAL2(identity: VerifiedIdentity | null): IAL2VerificationContext {
  if (!identity) {
    return { identity: null, isVerified: false, ialLevel: null, provider: null };
  }

  const meetsIAL2 = identity.ialLevel === 'IAL2' || identity.ialLevel === 'IAL3';

  // Check if verification has expired
  const isExpired = identity.expiresAt
    ? new Date() > identity.expiresAt
    : false;

  return {
    identity,
    isVerified: meetsIAL2 && !isExpired,
    ialLevel: identity.ialLevel,
    provider: identity.provider,
  };
}

/**
 * Create an API error response for insufficient identity verification.
 */
export function createIAL2ErrorResponse(context: IAL2VerificationContext): {
  status: number;
  body: {
    error: string;
    code: string;
    required: string;
    current: string | null;
    verificationUrl?: string;
  };
} {
  if (!context.identity) {
    return {
      status: 401,
      body: {
        error: 'Identity verification required',
        code: 'IAL2_REQUIRED',
        required: 'IAL2',
        current: null,
        verificationUrl: '/auth/verify-identity',
      },
    };
  }

  return {
    status: 403,
    body: {
      error: `Identity assurance level ${context.ialLevel} does not meet IAL2 requirement`,
      code: 'IAL_INSUFFICIENT',
      required: 'IAL2',
      current: context.ialLevel,
      verificationUrl: '/auth/verify-identity',
    },
  };
}

// =============================================================================
// Next.js API Route Helper
// =============================================================================

/**
 * Higher-order function that wraps a Next.js API handler to require IAL2.
 * Extracts identity from session and validates IAL level.
 *
 * Usage:
 * ```ts
 * export default requireIAL2(async (req, res, identity) => {
 *   // identity is guaranteed to be IAL2+ here
 *   const data = await fetchFhirData(identity);
 *   res.json(data);
 * });
 * ```
 */
export function requireIAL2<TReq, TRes>(
  handler: (req: TReq, res: TRes, identity: VerifiedIdentity) => Promise<void>,
  getIdentity: (req: TReq) => Promise<VerifiedIdentity | null>,
) {
  return async (req: TReq, res: TRes & { status: (code: number) => any; json: (body: any) => any }) => {
    const identity = await getIdentity(req);
    const context = checkIAL2(identity);

    if (!context.isVerified) {
      const error = createIAL2ErrorResponse(context);
      return res.status(error.status).json(error.body);
    }

    return handler(req, res, identity!);
  };
}

// =============================================================================
// Session Identity Extractor
// =============================================================================

/**
 * Extract verified identity from a NextAuth session.
 * The identity is stored in the session when the user authenticates via ID.me.
 */
export function extractIdentityFromSession(session: {
  user?: {
    identityVerification?: VerifiedIdentity;
  };
} | null): VerifiedIdentity | null {
  return session?.user?.identityVerification ?? null;
}
