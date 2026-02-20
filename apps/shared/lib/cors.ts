// ============================================================
// ATTENDING AI - CORS Middleware
// apps/shared/lib/cors.ts
//
// Multi-portal CORS configuration for:
//   - Provider Portal (port 3000)
//   - Patient Portal  (port 3001)
//   - WebSocket        (port 3003)
//
// In production, CORS_ALLOWED_ORIGINS env var controls the
// allowed origins. In development, localhost ports are allowed.
//
// Usage in API routes:
//   import { cors, withCors } from '@attending/shared/lib/cors';
//
//   // Option A: Wrap handler
//   export default withCors(handler);
//
//   // Option B: Call in handler
//   async function handler(req, res) {
//     if (await cors(req, res)) return; // Handled preflight
//     // ... your logic
//   }
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// ============================================================
// CONFIGURATION
// ============================================================

/** Default allowed origins per environment */
function getAllowedOrigins(): string[] {
  // Production: use explicit env var
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }

  // Development: allow all local portals
  if (process.env.NODE_ENV === 'development') {
    return [
      'http://localhost:3000',  // Provider portal
      'http://localhost:3001',  // Patient portal
      'http://localhost:3003',  // WebSocket service
    ];
  }

  // Fallback: same-origin only (empty = no cross-origin allowed)
  return [];
}

/** Methods allowed for cross-origin requests */
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/** Headers allowed in cross-origin requests */
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-CSRF-Token',
  'X-Request-ID',
  'X-Health-Secret',
  'Accept',
];

/** Headers exposed to the browser */
const EXPOSED_HEADERS = [
  'X-Request-ID',
  'X-API-Version',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];

/** Preflight cache duration in seconds (1 hour) */
const MAX_AGE = 3600;

// ============================================================
// CORS HANDLER
// ============================================================

export interface CorsOptions {
  /** Override allowed origins (default: from env/config) */
  origins?: string[];
  /** Allow credentials (cookies, auth headers). Default: true */
  credentials?: boolean;
  /** Override allowed methods */
  methods?: string[];
  /** Override allowed headers */
  headers?: string[];
  /** Override max age for preflight cache (seconds) */
  maxAge?: number;
}

/**
 * Apply CORS headers to a response.
 * Returns `true` if the request was a preflight (OPTIONS) and has been handled.
 *
 * @example
 * export default async function handler(req, res) {
 *   if (await cors(req, res)) return;
 *   // ... handle request
 * }
 */
export function cors(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: CorsOptions
): boolean {
  const allowedOrigins = options?.origins ?? getAllowedOrigins();
  const credentials = options?.credentials ?? true;
  const methods = options?.methods ?? ALLOWED_METHODS;
  const headers = options?.headers ?? ALLOWED_HEADERS;
  const maxAge = options?.maxAge ?? MAX_AGE;

  const origin = req.headers.origin;

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    // Reflect the specific origin (required when credentials: true)
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (allowedOrigins.length === 0 && !origin) {
    // Same-origin request, no CORS headers needed
  } else {
    // Origin not allowed — don't set CORS headers
    // The browser will block the response on its end
    if (req.method === 'OPTIONS') {
      res.status(403).end();
      return true;
    }
    // For non-preflight, let the request through but without CORS headers
    return false;
  }

  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS.join(', '));

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
    res.setHeader('Access-Control-Max-Age', String(maxAge));
    res.status(204).end();
    return true;
  }

  return false;
}

/**
 * Wrap an API handler with CORS support.
 *
 * @example
 * export default withCors(async (req, res) => {
 *   res.json({ data: 'hello' });
 * });
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options?: CorsOptions
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (cors(req, res, options)) return;
    return handler(req, res);
  };
}

export default { cors, withCors };
