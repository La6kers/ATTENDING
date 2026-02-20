// ============================================================
// API Version Middleware
// apps/shared/lib/api/apiVersion.ts
//
// Injects API version headers into responses.
//
// Usage in any API route:
//   import { withApiVersion } from '@attending/shared/lib/api/apiVersion';
//   export default withApiVersion(handler);
//
// Or manually:
//   import { setApiVersionHeaders } from '@attending/shared/lib/api/apiVersion';
//   setApiVersionHeaders(res);
// ============================================================

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

/** Current API version */
export const API_VERSION = '1';

/** Full semver for detailed version tracking */
export const API_VERSION_FULL = '1.0.0';

/**
 * Set API version headers on response.
 */
export function setApiVersionHeaders(res: NextApiResponse): void {
  res.setHeader('X-API-Version', API_VERSION_FULL);
  res.setHeader('X-Powered-By', 'ATTENDING AI');
}

/**
 * Middleware wrapper that adds API version headers to every response.
 */
export function withApiVersion(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    setApiVersionHeaders(res);
    return handler(req, res);
  };
}

/**
 * Parse the API version from a request path.
 * Returns null if no version prefix found.
 *
 * @example
 * parseApiVersion('/api/v1/patients') // '1'
 * parseApiVersion('/api/v2/patients') // '2'
 * parseApiVersion('/api/patients')    // null
 */
export function parseApiVersion(path: string): string | null {
  const match = path.match(/^\/api\/v(\d+)\//);
  return match ? match[1] : null;
}

export default { API_VERSION, API_VERSION_FULL, setApiVersionHeaders, withApiVersion, parseApiVersion };
