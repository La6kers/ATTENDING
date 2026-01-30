// ============================================================
// CSRF Token API Endpoint
// apps/provider-portal/pages/api/csrf-token.ts
//
// Generates and returns CSRF token for client-side forms
// Sets secure cookie with CSRF secret
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { setCsrfCookie } from '@attending/shared/lib/security';
import { setApiSecurityHeaders } from '@attending/shared/lib/security';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Set security headers
  setApiSecurityHeaders(res);

  try {
    // Generate and set CSRF token
    const token = setCsrfCookie(res);

    return res.status(200).json({
      success: true,
      data: {
        csrfToken: token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CSRF] Token generation error:', error);
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'CSRF_GENERATION_FAILED',
        message: 'Failed to generate CSRF token',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
