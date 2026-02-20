// ============================================================
// ATTENDING AI - Field-Level PHI Encryption
// apps/shared/lib/encryption.ts
//
// AES-256-GCM encryption for sensitive fields at rest.
// Protected fields: SSN, DOB, diagnosis, contact info, secrets.
//
// Key hierarchy:
//   Master Key (env: PHI_ENCRYPTION_KEY) → per-field derived keys
//   Key rotation: re-encrypt with new key, keep old for reads
//
// Usage:
//   import { encryptPHI, decryptPHI } from '@attending/shared/lib/encryption';
//   const encrypted = encryptPHI('123-45-6789', 'ssn');
//   const plain = decryptPHI(encrypted, 'ssn');
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'crypto';
import { logger } from './logging';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCODING = 'base64' as const;
const VERSION = 'v1';
const PREFIX = 'enc';

export const PHI_FIELDS = new Set([
  'ssn', 'socialSecurityNumber', 'driversLicense', 'insuranceNumber',
  'insuranceMemberId', 'dateOfBirth', 'diagnosis', 'diagnosisText',
  'clinicalNotes', 'noteContent', 'phone', 'homePhone', 'mobilePhone',
  'email', 'address', 'streetAddress', 'emergencyContactPhone',
  'emergencyContactName', 'clientSecret', 'refreshToken', 'webhookSecret', 'apiSecret',
]);

const DETERMINISTIC_FIELDS = new Set(['ssn', 'socialSecurityNumber', 'insuranceNumber', 'email']);

let masterKeyCache: Buffer | null = null;
let previousKeyCache: Buffer | null = null;

function getMasterKey(): Buffer {
  if (masterKeyCache) return masterKeyCache;
  const keyEnv = process.env.PHI_ENCRYPTION_KEY;
  if (!keyEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PHI_ENCRYPTION_KEY environment variable is required in production');
    }
    logger.warn('[Encryption] Using development fallback key — NOT SECURE');
    masterKeyCache = createHash('sha256').update('dev-only-fallback-key-not-secure').digest();
    return masterKeyCache;
  }
  masterKeyCache = keyEnv.length === 64 && /^[a-f0-9]+$/i.test(keyEnv)
    ? Buffer.from(keyEnv, 'hex')
    : Buffer.from(keyEnv, 'base64');
  if (masterKeyCache.length !== KEY_LENGTH) {
    throw new Error(`PHI_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${masterKeyCache.length})`);
  }
  return masterKeyCache;
}

function getPreviousKey(): Buffer | null {
  if (previousKeyCache !== undefined && previousKeyCache !== null) return previousKeyCache;
  const keyEnv = process.env.PHI_ENCRYPTION_KEY_PREVIOUS;
  if (!keyEnv) { previousKeyCache = null; return null; }
  previousKeyCache = keyEnv.length === 64 && /^[a-f0-9]+$/i.test(keyEnv)
    ? Buffer.from(keyEnv, 'hex')
    : Buffer.from(keyEnv, 'base64');
  return previousKeyCache;
}

function deriveFieldKey(masterKey: Buffer, fieldName: string): Buffer {
  return scryptSync(masterKey, `attending-phi-${fieldName}`, KEY_LENGTH);
}

export function encryptPHI(plaintext: string, fieldName: string): string {
  if (!plaintext || isEncrypted(plaintext)) return plaintext;
  const fieldKey = deriveFieldKey(getMasterKey(), fieldName);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, fieldKey, iv, { authTagLength: TAG_LENGTH });
  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  const tag = cipher.getAuthTag();
  return [PREFIX, VERSION, iv.toString(ENCODING), encrypted, tag.toString(ENCODING)].join(':');
}

export function encryptPHIDeterministic(plaintext: string, fieldName: string): string {
  if (!plaintext || isEncrypted(plaintext)) return plaintext;
  const fieldKey = deriveFieldKey(getMasterKey(), fieldName);
  const ivFull = createHash('sha256').update(fieldKey).update(plaintext).digest();
  const iv = ivFull.subarray(0, IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, fieldKey, iv, { authTagLength: TAG_LENGTH });
  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  const tag = cipher.getAuthTag();
  return [PREFIX, VERSION, iv.toString(ENCODING), encrypted, tag.toString(ENCODING)].join(':');
}

export function decryptPHI(ciphertext: string, fieldName: string): string {
  if (!ciphertext || !isEncrypted(ciphertext)) return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 5) throw new Error('Invalid encrypted value format');
  const [, version, ivB64, encryptedB64, tagB64] = parts;
  if (version !== VERSION) throw new Error(`Unsupported encryption version: ${version}`);
  const iv = Buffer.from(ivB64, ENCODING);
  const encrypted = Buffer.from(encryptedB64, ENCODING);
  const tag = Buffer.from(tagB64, ENCODING);

  try {
    return decryptWithKey(deriveFieldKey(getMasterKey(), fieldName), iv, encrypted, tag);
  } catch {
    const prevKey = getPreviousKey();
    if (prevKey) {
      try { return decryptWithKey(deriveFieldKey(prevKey, fieldName), iv, encrypted, tag); }
      catch { throw new Error('Decryption failed with both current and previous keys'); }
    }
    throw new Error('Decryption failed');
  }
}

function decryptWithKey(fieldKey: Buffer, iv: Buffer, encrypted: Buffer, tag: Buffer): string {
  const decipher = createDecipheriv(ALGORITHM, fieldKey, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:${VERSION}:`);
}

export function shouldEncrypt(fieldName: string): boolean {
  return PHI_FIELDS.has(fieldName);
}

export function isDeterministicField(fieldName: string): boolean {
  return DETERMINISTIC_FIELDS.has(fieldName);
}

export function encryptObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && shouldEncrypt(key)) {
      (result as any)[key] = isDeterministicField(key)
        ? encryptPHIDeterministic(value, key)
        : encryptPHI(value, key);
    }
  }
  return result;
}

export function decryptObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && isEncrypted(value) && shouldEncrypt(key)) {
      try { (result as any)[key] = decryptPHI(value, key); }
      catch (err) {
        logger.error(`[Encryption] Failed to decrypt field: ${key}`, err instanceof Error ? err : new Error(String(err)));
        (result as any)[key] = '[DECRYPTION_FAILED]';
      }
    }
  }
  return result;
}

export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

export function reEncrypt(ciphertext: string, fieldName: string): string {
  return encryptPHI(decryptPHI(ciphertext, fieldName), fieldName);
}

export default {
  encryptPHI, decryptPHI, encryptPHIDeterministic, encryptObject,
  decryptObject, isEncrypted, shouldEncrypt, generateEncryptionKey, reEncrypt, PHI_FIELDS,
};
