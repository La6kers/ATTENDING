// ============================================================
// ATTENDING AI - Multi-Factor Authentication (MFA)
// apps/shared/lib/auth/mfa.ts
//
// TOTP-based MFA for provider accounts
// HIPAA Requirement: 164.312(d) - Person/entity authentication
//
// Implements:
// - TOTP (Time-based One-Time Password) generation and verification
// - Backup codes generation
// - MFA enforcement for clinical roles
// ============================================================

import crypto from 'crypto';
import { encryptData, decryptData } from '../security';

// ============================================================
// TYPES
// ============================================================

export interface MfaSetup {
  secret: string;
  encryptedSecret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface MfaVerification {
  valid: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
}

export interface MfaConfig {
  issuer: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  window: number; // Number of periods to check before/after current
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_CONFIG: MfaConfig = {
  issuer: 'ATTENDING AI',
  algorithm: 'sha1', // RFC 6238 default, most compatible
  digits: 6,
  period: 30, // seconds
  window: 1, // Accept tokens from previous and next period
};

// Roles that require MFA
const MFA_REQUIRED_ROLES = ['ADMIN', 'PROVIDER'];

// Maximum verification attempts before lockout
const MAX_VERIFICATION_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory attempt tracking (use Redis in production)
const verificationAttempts = new Map<string, { count: number; lockedUntil?: Date }>();

// ============================================================
// TOTP GENERATION
// ============================================================

/**
 * Generate a cryptographically secure secret for TOTP
 */
export function generateMfaSecret(): string {
  // Generate 20 bytes (160 bits) of random data
  const buffer = crypto.randomBytes(20);
  // Encode as base32 (standard for TOTP)
  return base32Encode(buffer);
}

/**
 * Generate TOTP code from secret
 */
export function generateTotp(
  secret: string,
  config: Partial<MfaConfig> = {}
): string {
  const { algorithm, digits, period } = { ...DEFAULT_CONFIG, ...config };
  
  // Get current time counter
  const counter = Math.floor(Date.now() / 1000 / period);
  
  return generateHotp(secret, counter, algorithm, digits);
}

/**
 * Generate HOTP (HMAC-based One-Time Password)
 */
function generateHotp(
  secret: string,
  counter: number,
  algorithm: string,
  digits: number
): string {
  // Decode base32 secret
  const key = base32Decode(secret);
  
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  
  // Generate HMAC
  const hmac = crypto.createHmac(algorithm, key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );
  
  // Generate digits
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

// ============================================================
// VERIFICATION
// ============================================================

/**
 * Verify TOTP code
 */
export function verifyTotp(
  secret: string,
  token: string,
  config: Partial<MfaConfig> = {}
): boolean {
  const { period, window } = { ...DEFAULT_CONFIG, ...config };
  
  // Get current time counter
  const counter = Math.floor(Date.now() / 1000 / period);
  
  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateHotp(secret, counter + i, config.algorithm || 'sha1', config.digits || 6);
    
    // Constant-time comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Verify MFA with rate limiting and lockout
 */
export async function verifyMfaWithRateLimit(
  userId: string,
  secret: string,
  token: string
): Promise<MfaVerification> {
  // Check if user is locked out
  const attempts = verificationAttempts.get(userId) || { count: 0 };
  
  if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
    return {
      valid: false,
      remainingAttempts: 0,
      lockedUntil: attempts.lockedUntil,
    };
  }
  
  // Verify token
  const valid = verifyTotp(secret, token);
  
  if (valid) {
    // Reset attempts on success
    verificationAttempts.delete(userId);
    return { valid: true };
  }
  
  // Increment failed attempts
  attempts.count++;
  
  if (attempts.count >= MAX_VERIFICATION_ATTEMPTS) {
    attempts.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }
  
  verificationAttempts.set(userId, attempts);
  
  return {
    valid: false,
    remainingAttempts: Math.max(0, MAX_VERIFICATION_ATTEMPTS - attempts.count),
    lockedUntil: attempts.lockedUntil,
  };
}

// ============================================================
// MFA SETUP
// ============================================================

/**
 * Generate complete MFA setup for a user
 */
export async function setupMfa(
  userId: string,
  userEmail: string,
  config: Partial<MfaConfig> = {}
): Promise<MfaSetup> {
  const { issuer, algorithm, digits, period } = { ...DEFAULT_CONFIG, ...config };
  
  // Generate secret
  const secret = generateMfaSecret();
  
  // Encrypt secret for storage
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  const encryptedSecret = encryptData(secret, encryptionKey);
  
  // Generate otpauth URL for QR code
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=${algorithm.toUpperCase()}&digits=${digits}&period=${period}`;
  
  // Generate QR code data URL
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);
  
  // Generate backup codes
  const backupCodes = generateBackupCodes();
  
  return {
    secret,
    encryptedSecret,
    otpauthUrl,
    qrCodeDataUrl,
    backupCodes,
  };
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const buffer = crypto.randomBytes(5);
    const code = base32Encode(buffer).slice(0, 8);
    codes.push(code);
  }
  
  return codes;
}

/**
 * Verify a backup code (one-time use)
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[],
  salt: string
): { valid: boolean; usedIndex: number } {
  const hashedInput = hashBackupCode(code, salt);
  
  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] && crypto.timingSafeEqual(
      Buffer.from(hashedInput),
      Buffer.from(hashedCodes[i])
    )) {
      return { valid: true, usedIndex: i };
    }
  }
  
  return { valid: false, usedIndex: -1 };
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string, salt: string): string {
  return crypto
    .pbkdf2Sync(code.toUpperCase(), salt, 10000, 32, 'sha256')
    .toString('hex');
}

/**
 * Hash all backup codes for storage
 */
export function hashBackupCodes(codes: string[], salt: string): string[] {
  return codes.map(code => hashBackupCode(code, salt));
}

// ============================================================
// MFA ENFORCEMENT
// ============================================================

/**
 * Check if MFA is required for a role
 */
export function isMfaRequired(role: string): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Get MFA enforcement status
 */
export function getMfaEnforcementStatus(role: string, mfaEnabled: boolean): {
  required: boolean;
  enabled: boolean;
  compliant: boolean;
} {
  const required = isMfaRequired(role);
  
  return {
    required,
    enabled: mfaEnabled,
    compliant: !required || mfaEnabled,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  
  return result;
}

/**
 * Base32 decoding
 */
function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of cleanStr) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    
    value = (value << 5) | index;
    bits += 5;
    
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  
  return Buffer.from(bytes);
}

/**
 * Generate QR code data URL
 * Note: In production, use a proper QR code library like 'qrcode'
 */
async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    // Try to use qrcode library if available
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 256,
      margin: 2,
    });
  } catch {
    // Fallback: return a placeholder indicating QR needs to be generated
    console.warn('[MFA] QRCode library not available, returning placeholder');
    return `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;
  }
}

/**
 * Decrypt stored MFA secret
 */
export function decryptMfaSecret(encryptedSecret: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  return decryptData(encryptedSecret, encryptionKey);
}

// ============================================================
// EXPORTS
// ============================================================

export const mfaConfig = DEFAULT_CONFIG;
export const MFA_REQUIRED_ROLES_LIST = MFA_REQUIRED_ROLES;

export default {
  generateMfaSecret,
  generateTotp,
  verifyTotp,
  verifyMfaWithRateLimit,
  setupMfa,
  generateBackupCodes,
  verifyBackupCode,
  hashBackupCode,
  hashBackupCodes,
  isMfaRequired,
  getMfaEnforcementStatus,
  decryptMfaSecret,
  mfaConfig,
};
