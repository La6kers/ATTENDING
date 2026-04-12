// ATTENDING AI - API Middleware Stack
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

type Middleware = (req: NextApiRequest, res: NextApiResponse, next: () => Promise<void>) => Promise<void>;

export function withMiddleware(...middlewares: Middleware[]) {
  return (handler: NextApiHandler): NextApiHandler => {
    return async (req, res) => {
      let index = 0;
      const next = async (): Promise<void> => {
        if (index < middlewares.length) await middlewares[index++](req, res, next);
        else await handler(req, res);
      };
      try { await next(); }
      catch (error) {
        console.error('[API Error]', error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
      }
    };
  };
}

export const loggingMiddleware: Middleware = async (req, res, next) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', requestId);
  console.log(`[${requestId}] ${req.method} ${req.url}`);
  await next();
  console.log(`[${requestId}] ${res.statusCode} - ${Date.now() - start}ms`);
};

export const securityMiddleware: Middleware = async (req, res, next) => {
  // Apply the full security header suite from the shared security library.
  // setApiSecurityHeaders checks for an existing CSP (set by Edge middleware)
  // and avoids overwriting it; otherwise it applies all OWASP-recommended
  // headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  // Permissions-Policy, HSTS (prod), Cache-Control, and CSP.
  const { setApiSecurityHeaders } = await import('@attending/shared/lib/security/security');
  setApiSecurityHeaders(res);
  await next();
};

export const publicApiMiddleware = withMiddleware(loggingMiddleware, securityMiddleware);
