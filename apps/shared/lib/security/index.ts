// ATTENDING AI - Production Security Utilities
import { NextApiRequest, NextApiResponse } from 'next';

const DANGEROUS_PATTERNS = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi];

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  let sanitized = input.trim();
  for (const pattern of DANGEROUS_PATTERNS) sanitized = sanitized.replace(pattern, '');
  return sanitized.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(windowMs = 60000, maxRequests = 100) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
    const key = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    entry.count++;
    return next();
  };
}

export function maskPHI(text: string): string {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');
}

export function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}
