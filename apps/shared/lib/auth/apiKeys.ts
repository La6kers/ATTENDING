// ============================================================
// ATTENDING AI - API Key Authentication
// apps/shared/lib/auth/apiKeys.ts
//
// System-to-system authentication via API keys.
// Supports:
//   - Key generation (cryptographically secure)
//   - Key hashing (scrypt — never store plaintext)
//   - Scope-based permissions
//   - Rate limiting per key
//   - Expiration dates
//   - Usage tracking
//
// Database: Uses the ApiKey model (see migration below)
//
// Usage in routes:
//   import { createHandler } from '@attending/shared/lib/api';
//   export default createHandler({
//     auth: 'apiKey',
//     methods: ['GET'],
//     handler: async (req, ctx) => { ... }
//   });
//
// Management:
//   POST /api/admin/api-keys   — Create key (returns plaintext once)
//   GET  /api/admin/api-keys   — List keys (hashed, never plaintext)
//   DELETE /api/admin/api-keys/:id — Revoke key
// ============================================================

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { NextApiRequest } from 'next';

// ============================================================
// KEY GENERATION
// ============================================================

/** Prefix for all ATTENDING API keys */
const KEY_PREFIX = 'atnd_';

/** Generate a cryptographically secure API key */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawBytes = randomBytes(32);
  const key = KEY_PREFIX + rawBytes.toString('base64url');
  const hash = hashApiKey(key);
  const prefix = key.slice(0, 12); // Visible prefix for identification

  return { key, hash, prefix };
}

/** Hash an API key for storage (scrypt — computationally expensive, salted) */
export function hashApiKey(key: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(key, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** Verify an API key against a stored scrypt hash */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedHash = scryptSync(key, salt, 64);
  return timingSafeEqual(hashBuffer, derivedHash);
}

// ============================================================
// SCOPES
// ============================================================

/**
 * API key scopes control what a system integration can do.
 * Scopes are hierarchical: 'read' includes 'read:patients', etc.
 */
export const API_KEY_SCOPES = {
  // Read scopes
  'read': 'Read all clinical data',
  'read:patients': 'Read patient demographics',
  'read:encounters': 'Read encounter data',
  'read:labs': 'Read lab orders and results',
  'read:imaging': 'Read imaging orders and results',
  'read:medications': 'Read medication orders',
  'read:vitals': 'Read vital signs',

  // Write scopes
  'write': 'Write all clinical data',
  'write:patients': 'Create/update patients',
  'write:labs': 'Create lab orders',
  'write:imaging': 'Create imaging orders',
  'write:medications': 'Create medication orders',
  'write:vitals': 'Submit vital signs',
  'write:results': 'Submit lab/imaging results (inbound interface)',

  // Integration scopes
  'fhir': 'Full FHIR R4 access',
  'fhir:read': 'FHIR read-only',
  'hl7': 'HL7v2 message exchange',
  'webhooks': 'Manage webhook subscriptions',

  // Admin scopes
  'admin': 'Full administrative access',
  'admin:keys': 'Manage API keys',
  'admin:audit': 'Query audit logs',
} as const;

export type ApiKeyScope = keyof typeof API_KEY_SCOPES;

/**
 * Check if granted scopes satisfy a required scope.
 * 'read' satisfies 'read:patients', etc.
 */
export function hasScope(grantedScopes: string[], requiredScope: ApiKeyScope): boolean {
  if (grantedScopes.includes(requiredScope)) return true;

  // Check parent scope (e.g., 'read' covers 'read:patients')
  const parent = requiredScope.split(':')[0];
  if (parent && grantedScopes.includes(parent)) return true;

  return false;
}

// ============================================================
// API KEY DATA MODEL
// ============================================================

export interface ApiKeyRecord {
  id: string;
  name: string;
  description?: string;
  keyHash: string;
  keyPrefix: string;
  organizationId: string;
  scopes: string[];        // Array of ApiKeyScope
  rateLimit?: number;      // Custom requests/minute (null = default)
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// PRISMA MIGRATION SQL
// ============================================================

/**
 * Add this to your next Prisma migration:
 *
 * model ApiKey {
 *   id             String    @id @default(cuid())
 *   name           String
 *   description    String?
 *   keyHash        String    @unique
 *   keyPrefix      String
 *   organizationId String
 *   scopes         String    // JSON array of scope strings
 *   rateLimit      Int?      // Custom requests/minute
 *   expiresAt      DateTime?
 *   lastUsedAt     DateTime?
 *   usageCount     Int       @default(0)
 *   isActive       Boolean   @default(true)
 *   createdBy      String
 *   createdAt      DateTime  @default(now())
 *   updatedAt      DateTime  @updatedAt
 *
 *   @@index([keyHash])
 *   @@index([organizationId])
 *   @@index([isActive])
 * }
 */

// ============================================================
// VALIDATION MIDDLEWARE
// ============================================================

export interface ValidatedApiKey {
  id: string;
  name: string;
  organizationId: string;
  scopes: string[];
  rateLimit?: number;
}

/**
 * Validate an API key from the request.
 * Returns the key record if valid, null if invalid.
 *
 * @param req - Next.js request
 * @param prisma - Prisma client
 * @param requiredScope - Optional scope to check
 */
export async function validateApiKey(
  req: NextApiRequest,
  prisma: any,
  requiredScope?: ApiKeyScope
): Promise<ValidatedApiKey | null> {
  const rawKey = req.headers['x-api-key'] as string;
  if (!rawKey) return null;

  // Validate format
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const keyPrefix = rawKey.slice(0, 12);

  try {
    // With salted hashing, we can't look up by hash directly.
    // Find active keys matching the visible prefix, then verify.
    const candidates = await prisma.apiKey.findMany({
      where: { keyPrefix, isActive: true },
      select: {
        id: true,
        name: true,
        keyHash: true,
        organizationId: true,
        scopes: true,
        rateLimit: true,
        expiresAt: true,
        isActive: true,
      },
    });

    const record = candidates.find((r: any) => verifyApiKey(rawKey, r.keyHash));

    if (!record) return null;
    if (record.expiresAt && new Date() > record.expiresAt) return null;

    // Parse scopes
    const scopes: string[] = typeof record.scopes === 'string'
      ? JSON.parse(record.scopes)
      : record.scopes;

    // Check required scope
    if (requiredScope && !hasScope(scopes, requiredScope)) return null;

    // Update usage (fire-and-forget)
    prisma.apiKey.update({
      where: { id: record.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    }).catch(() => { /* non-critical */ });

    return {
      id: record.id,
      name: record.name,
      organizationId: record.organizationId,
      scopes,
      rateLimit: record.rateLimit,
    };
  } catch {
    return null;
  }
}

// ============================================================
// KEY MANAGEMENT (for admin endpoints)
// ============================================================

export interface CreateApiKeyInput {
  name: string;
  description?: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  rateLimit?: number;
  expiresAt?: Date;
  createdBy: string;
}

/**
 * Create a new API key.
 * Returns the plaintext key — this is the ONLY time it's available.
 */
export async function createApiKeyRecord(
  prisma: any,
  input: CreateApiKeyInput
): Promise<{ key: string; record: ApiKeyRecord }> {
  const { key, hash, prefix } = generateApiKey();

  const record = await prisma.apiKey.create({
    data: {
      name: input.name,
      description: input.description,
      keyHash: hash,
      keyPrefix: prefix,
      organizationId: input.organizationId,
      scopes: JSON.stringify(input.scopes),
      rateLimit: input.rateLimit,
      expiresAt: input.expiresAt,
      createdBy: input.createdBy,
    },
  });

  return { key, record };
}

/**
 * Revoke (deactivate) an API key.
 */
export async function revokeApiKey(prisma: any, keyId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });
}

/**
 * List API keys for an organization (never returns hashes).
 */
export async function listApiKeys(
  prisma: any,
  organizationId: string
): Promise<Omit<ApiKeyRecord, 'keyHash'>[]> {
  return prisma.apiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      organizationId: true,
      scopes: true,
      rateLimit: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export default {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  validateApiKey,
  createApiKeyRecord,
  revokeApiKey,
  listApiKeys,
  hasScope,
  API_KEY_SCOPES,
};
