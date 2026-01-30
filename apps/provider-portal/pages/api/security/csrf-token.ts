// ============================================================
// CSRF Token API Endpoint
// apps/provider-portal/pages/api/security/csrf-token.ts
//
// Returns a CSRF token for use in subsequent state-changing requests
// The token is tied to a secret stored in an HTTP-only cookie
//
// Usage:
// 1. Client calls GET /api/security/csrf-token
// 2. Server sets HTTP-only cookie with secret, returns token
// 3. Client includes token in X-CSRF-Token header on POST/PUT/DELETE
// 4. Server validates token against cookie secret
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { csrf, setApiSecurityHeaders } from '@attending/shared/lib/security';
import { 
  sendSuccess, 
  sendError, 
  ErrorCodes,
  generateRequestId,
} from '@attending/shared/lib/api/response';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set security headers
  setApiSecurityHeaders(res);
  
  // Add request ID for tracing
  const requestId = generateRequestId();
  res.setHeader('X-Request-Id', requestId);

  // Only allow GET requests
  if (req.method !== 'GET') {
    return sendError(
      res,
      ErrorCodes.INVALID_INPUT,
      'Method not allowed. Use GET to obtain CSRF token.',
      { allowedMethods: ['GET'] },
      405
    );
  }

  try {
    // Generate CSRF token and set cookie
    const token = csrf.setCookie(res, {
      cookieName: '__Host-csrf-token',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400, // 24 hours
      },
    });

    return sendSuccess(res, {
      csrfToken: token,
      expiresIn: 86400,
      headerName: 'X-CSRF-Token',
    });

  } catch (error) {
    console.error('[CSRF] Token generation error:', error);
    return sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate CSRF token'
    );
  }
}
