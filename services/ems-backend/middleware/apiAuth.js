// =============================================================================
// ATTENDING AI - EMS Backend API Authentication Middleware
// services/ems-backend/middleware/apiAuth.js
//
// Provides API key authentication for the EMS backend.
// In production, requests must include a valid API key in the
// Authorization header (Bearer token) or X-API-Key header.
//
// Configuration:
//   EMS_API_KEY       — Required API key for production
//   NODE_ENV          — When 'development', allows unauthenticated access
//   EMS_AUTH_ENABLED  — Set to 'true' to enforce auth even in development
// =============================================================================

/**
 * API key authentication middleware.
 *
 * Validates requests against the configured EMS_API_KEY.
 * Development mode allows unauthenticated access unless EMS_AUTH_ENABLED=true.
 */
export function apiAuth(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const authEnabled = isProduction || process.env.EMS_AUTH_ENABLED === 'true';

  if (!authEnabled) {
    return next();
  }

  const apiKey = process.env.EMS_API_KEY;
  if (!apiKey) {
    console.error('[AUTH] EMS_API_KEY not configured — rejecting all requests');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'API authentication is not configured',
    });
  }

  // Extract key from Authorization: Bearer <key> or X-API-Key header
  const authHeader = req.headers.authorization;
  const xApiKey = req.headers['x-api-key'];

  let providedKey = null;
  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  } else if (xApiKey) {
    providedKey = xApiKey;
  }

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide via Authorization: Bearer <key> or X-API-Key header.',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (providedKey.length !== apiKey.length || !timingSafeEqual(providedKey, apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  next();
}

/**
 * Constant-time string comparison (prevents timing attacks).
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default apiAuth;
