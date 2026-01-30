// ============================================================
// ATTENDING AI - Production Security Utilities
// apps/shared/lib/security/index.ts
//
// HIPAA-compliant security utilities including:
// - CSRF protection
// - Rate limiting (with Redis support)
// - Input sanitization
// - PHI masking
// - Security headers
// - Request validation
//
// HIPAA Requirements Addressed:
// - 164.312(a)(1) - Access control
// - 164.312(c)(1) - Integrity
// - 164.312(e)(1) - Transmission security
// ============================================================

import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface CSRFConfig {
  cookieName?: string;
  headerName?: string;
  secretLength?: number;
  tokenLength?: number;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    maxAge?: number;
  };
}

export interface SecurityContext {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

// ============================================================
// INPUT SANITIZATION
// ============================================================

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /('|")\s*(OR|AND)\s*('|"|\d)/gi,
  /;\s*(DROP|DELETE|UPDATE|INSERT)/gi,
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//g,
];

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for rendering
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // HTML entity encoding
  return sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize input for database queries (defense in depth - use parameterized queries!)
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeForDatabase(input: string): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Escape single quotes
  return sanitized.replace(/'/g, "''");
}

/**
 * Check if input contains potential SQL injection
 * @param input - The input to check
 * @returns True if potential injection detected
 */
export function detectSqlInjection(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
  }
  
  return false;
}

/**
 * Check if input contains potential XSS
 * @param input - The input to check
 * @returns True if potential XSS detected
 */
export function detectXss(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
    pattern.lastIndex = 0;
  }
  
  return false;
}

/**
 * Recursively sanitize all string values in an object
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : 
        typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============================================================
// RATE LIMITING
// ============================================================

// In-memory store for development/single-instance
// For production, use Redis adapter below
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * In-memory rate limiter for development/single-instance deployments
 * @param key - Unique key for rate limiting (usually IP or user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimitMemory(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const fullKey = `${config.keyPrefix || 'rl'}:${key}`;
  
  const entry = memoryStore.get(fullKey);
  
  if (!entry || now > entry.resetTime) {
    // New window
    memoryStore.set(fullKey, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  entry.count++;
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Redis-based rate limiter for distributed deployments
 * Requires REDIS_URL environment variable
 */
export interface RedisClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
}

let redisClient: RedisClient | null = null;

/**
 * Set Redis client for distributed rate limiting
 */
export function setRedisClient(client: RedisClient): void {
  redisClient = client;
}

/**
 * Rate limit using Redis (for distributed deployments)
 */
export async function rateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redisClient) {
    console.warn('[Security] Redis client not set, falling back to memory rate limiting');
    return rateLimitMemory(key, config);
  }
  
  const fullKey = `${config.keyPrefix || 'rl'}:${key}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);
  
  try {
    const count = await redisClient.incr(fullKey);
    
    if (count === 1) {
      await redisClient.expire(fullKey, windowSeconds);
    }
    
    const ttl = await redisClient.ttl(fullKey);
    const resetTime = Date.now() + (ttl * 1000);
    
    if (count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: ttl,
      };
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - count,
      resetTime,
    };
  } catch (error) {
    console.error('[Security] Redis rate limit error:', error);
    // Fallback to memory on Redis failure
    return rateLimitMemory(key, config);
  }
}

/**
 * Rate limit function that auto-selects implementation
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (redisClient) {
    return rateLimitRedis(key, config);
  }
  return rateLimitMemory(key, config);
}

/**
 * Express/Next.js middleware for rate limiting
 */
export function rateLimitMiddleware(config: RateLimitConfig = {
  windowMs: 60000,
  maxRequests: 100,
}) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) => {
    const key = getClientIdentifier(req);
    const result = await rateLimit(key, config);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter || 60);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    return next();
  };
}

// ============================================================
// CSRF PROTECTION
// ============================================================

const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  cookieName: '__Host-csrf-token',
  headerName: 'x-csrf-token',
  secretLength: 32,
  tokenLength: 32,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  },
};

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF secret and token pair
 */
export function generateCsrfPair(): { secret: string; token: string } {
  const secret = crypto.randomBytes(32).toString('hex');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Create signed token
  const signature = crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');
  
  return {
    secret,
    token: `${token}.${signature}`,
  };
}

/**
 * Verify CSRF token against secret
 */
export function verifyCsrfToken(
  secret: string,
  token: string
): boolean {
  if (!secret || !token) return false;
  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [tokenValue, signature] = parts;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(tokenValue)
    .digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * CSRF protection middleware
 */
export function csrfMiddleware(config: CSRFConfig = {}) {
  const options = { ...DEFAULT_CSRF_CONFIG, ...config };
  
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) => {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
      return next();
    }
    
    const cookieSecret = req.cookies[options.cookieName!];
    const headerToken = req.headers[options.headerName!] as string;
    
    if (!cookieSecret || !headerToken) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token missing',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    if (!verifyCsrfToken(cookieSecret, headerToken)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    return next();
  };
}

/**
 * Set CSRF cookie and return token for client
 */
export function setCsrfCookie(
  res: NextApiResponse,
  config: CSRFConfig = {}
): string {
  const options = { ...DEFAULT_CSRF_CONFIG, ...config };
  const { secret, token } = generateCsrfPair();
  
  const cookieValue = [
    `${options.cookieName}=${secret}`,
    `Path=${options.cookieOptions?.path || '/'}`,
    `Max-Age=${options.cookieOptions?.maxAge || 86400}`,
    options.cookieOptions?.httpOnly ? 'HttpOnly' : '',
    options.cookieOptions?.secure ? 'Secure' : '',
    `SameSite=${options.cookieOptions?.sameSite || 'Strict'}`,
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieValue);
  
  return token;
}

// ============================================================
// PHI MASKING
// ============================================================

/**
 * Mask PHI (Protected Health Information) in text
 * Used for logging and error messages
 */
export function maskPHI(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    // SSN
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    .replace(/\b\d{9}\b/g, '*********')
    // Phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****')
    .replace(/\(\d{3}\)\s*\d{3}[-.]?\d{4}/g, '(***) ***-****')
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
    // Credit card numbers
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****')
    // Dates of birth (various formats)
    .replace(/\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g, '**/**/**')
    // MRN patterns (6+ digit numbers that might be MRNs)
    .replace(/\bMRN[:\s]*\d{6,}\b/gi, 'MRN: ******')
    // ZIP codes
    .replace(/\b\d{5}(-\d{4})?\b/g, '*****');
}

/**
 * Create a safe error message that doesn't leak PHI
 */
export function safeErrorMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    return maskPHI(error.message);
  }
  return 'An unexpected error occurred';
}

// ============================================================
// SECURITY HEADERS
// ============================================================

/**
 * Set comprehensive security headers on response
 */
export function setSecurityHeaders(res: NextApiResponse): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (basic - customize per page)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );
  
  // Permissions Policy (disable dangerous features)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Cache control for sensitive content
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/**
 * Set security headers for API responses
 */
export function setApiSecurityHeaders(res: NextApiResponse): void {
  setSecurityHeaders(res);
  
  // Additional API-specific headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Surrogate-Control', 'no-store');
}

// ============================================================
// CLIENT IDENTIFICATION
// ============================================================

/**
 * Get client IP address from request
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Get client user agent from request
 */
export function getClientUserAgent(req: NextApiRequest): string {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 500) : 'unknown';
}

/**
 * Get unique client identifier for rate limiting
 */
export function getClientIdentifier(req: NextApiRequest): string {
  const ip = getClientIp(req);
  const userId = req.headers['x-user-id'];
  
  // Prefer user ID if authenticated
  if (typeof userId === 'string' && userId) {
    return `user:${userId}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Create security context from request
 */
export function createSecurityContext(req: NextApiRequest): SecurityContext {
  return {
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
    userId: req.headers['x-user-id'] as string | undefined,
    sessionId: req.cookies['session-id'],
  };
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

/**
 * Validate request origin for CORS
 */
export function validateOrigin(
  req: NextApiRequest,
  allowedOrigins: string[]
): boolean {
  const origin = req.headers.origin;
  
  if (!origin) {
    // Same-origin request
    return true;
  }
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain);
    }
    return origin === allowed;
  });
}

/**
 * Validate content type
 */
export function validateContentType(
  req: NextApiRequest,
  allowedTypes: string[] = ['application/json']
): boolean {
  const contentType = req.headers['content-type'];
  
  if (!contentType) return false;
  
  return allowedTypes.some(type => contentType.includes(type));
}

// ============================================================
// ENCRYPTION UTILITIES
// ============================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data
 * @param data - Data to encrypt
 * @param key - 32-byte encryption key (use process.env.ENCRYPTION_KEY)
 * @returns Encrypted data as base64 string
 */
export function encryptData(data: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + authTag + encrypted data
  return Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]).toString('base64');
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted data as base64 string
 * @param key - 32-byte encryption key
 * @returns Decrypted string
 */
export function decryptData(encryptedData: string, key: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }
  
  const combined = Buffer.from(encryptedData, 'base64');
  
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a new encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): string {
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(data, effectiveSalt, 100000, 64, 'sha512')
    .toString('hex');
  
  return `${effectiveSalt}:${hash}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  const [salt, originalHash] = hashedData.split(':');
  if (!salt || !originalHash) return false;
  
  const hash = crypto
    .pbkdf2Sync(data, salt, 100000, 64, 'sha512')
    .toString('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(originalHash)
  );
}

// ============================================================
// EXPORTS
// ============================================================

export const csrf = {
  generate: generateCsrfToken,
  generatePair: generateCsrfPair,
  verify: verifyCsrfToken,
  middleware: csrfMiddleware,
  setCookie: setCsrfCookie,
};

export const security = {
  sanitizeInput,
  sanitizeForDatabase,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  maskPHI,
  safeErrorMessage,
  setSecurityHeaders,
  setApiSecurityHeaders,
  getClientIp,
  getClientUserAgent,
  getClientIdentifier,
  createSecurityContext,
  validateOrigin,
  validateContentType,
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  verifyHash,
};

export default {
  // Rate limiting
  rateLimit,
  rateLimitMemory,
  rateLimitRedis,
  rateLimitMiddleware,
  setRedisClient,
  
  // CSRF
  csrf,
  
  // Security utilities
  ...security,
};
