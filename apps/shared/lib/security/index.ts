// ============================================================
// ATTENDING AI - Security Utilities Exports
// apps/shared/lib/security/index.ts
// ============================================================

// Re-export everything from the main security module
export {
  // Input sanitization
  sanitizeInput,
  sanitizeForDatabase,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  
  // Rate limiting
  rateLimit,
  rateLimitMemory,
  rateLimitRedis,
  rateLimitMiddleware,
  setRedisClient,
  
  // CSRF
  csrf,
  generateCsrfToken,
  generateCsrfPair,
  verifyCsrfToken,
  csrfMiddleware,
  setCsrfCookie,
  
  // PHI handling
  maskPHI,
  safeErrorMessage,
  
  // Security headers
  setSecurityHeaders,
  setApiSecurityHeaders,
  
  // Client identification
  getClientIp,
  getClientUserAgent,
  getClientIdentifier,
  createSecurityContext,
  
  // Request validation
  validateOrigin,
  validateContentType,
  
  // Encryption
  encryptData,
  decryptData,
  generateEncryptionKey,
  hashData,
  verifyHash,
  
  // Types
  type RateLimitConfig,
  type RateLimitResult,
  type CSRFConfig,
  type SecurityContext,
  type RedisClient,
} from './security';

// Default export for convenience
export { default } from './security';
