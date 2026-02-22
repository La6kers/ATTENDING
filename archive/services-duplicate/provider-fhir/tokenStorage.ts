// =============================================================================
// ATTENDING AI - FHIR Token Storage
// apps/provider-portal/lib/fhir/tokenStorage.ts
//
// Secure storage and retrieval of FHIR OAuth tokens
// =============================================================================

import { prisma } from '../prisma';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface FhirTokenData {
  providerId: string;
  vendor: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  patientId?: string;
  encounterId?: string;
  scope?: string;
}

export interface StoredFhirToken {
  id: string;
  providerId: string;
  vendor: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  patientId?: string;
  encounterId?: string;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Encryption (for token security at rest)
// =============================================================================

const ENCRYPTION_KEY = process.env.FHIR_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    console.warn('[TokenStorage] No encryption key configured, tokens stored in plaintext');
    return Buffer.alloc(32); // Dummy key for dev
  }
  // Derive 32-byte key from secret
  const key = Buffer.alloc(32);
  Buffer.from(ENCRYPTION_KEY).copy(key);
  return key;
}

function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) return token; // Skip encryption in dev without key
  
  try {
    const iv = randomBytes(16);
    const key = getEncryptionKey();
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[TokenStorage] Encryption failed:', error);
    return token;
  }
}

function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY || !encryptedToken.includes(':')) return encryptedToken;
  
  try {
    const parts = encryptedToken.split(':');
    if (parts.length !== 3) return encryptedToken;
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[TokenStorage] Decryption failed:', error);
    return encryptedToken;
  }
}

// =============================================================================
// Token Storage Operations
// =============================================================================

/**
 * Store FHIR tokens securely
 */
export async function storeFhirTokens(data: FhirTokenData): Promise<StoredFhirToken> {
  const encryptedAccessToken = encryptToken(data.accessToken);
  const encryptedRefreshToken = data.refreshToken ? encryptToken(data.refreshToken) : null;

  const result = await prisma.fhirConnection.upsert({
    where: {
      providerId_vendor: {
        providerId: data.providerId,
        vendor: data.vendor,
      },
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: data.expiresAt,
      patientId: data.patientId,
      encounterId: data.encounterId,
      scope: data.scope,
      updatedAt: new Date(),
    },
    create: {
      providerId: data.providerId,
      vendor: data.vendor,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: data.expiresAt,
      patientId: data.patientId,
      encounterId: data.encounterId,
      scope: data.scope,
    },
  });

  return {
    ...result,
    accessToken: data.accessToken, // Return unencrypted for immediate use
    refreshToken: data.refreshToken,
  };
}

/**
 * Retrieve FHIR tokens for a provider
 */
export async function getFhirTokens(providerId: string, vendor: string): Promise<StoredFhirToken | null> {
  const record = await prisma.fhirConnection.findUnique({
    where: {
      providerId_vendor: {
        providerId,
        vendor,
      },
    },
  });

  if (!record) return null;

  return {
    ...record,
    accessToken: decryptToken(record.accessToken),
    refreshToken: record.refreshToken ? decryptToken(record.refreshToken) : undefined,
  };
}

/**
 * Get all FHIR connections for a provider
 */
export async function getProviderFhirConnections(providerId: string): Promise<StoredFhirToken[]> {
  const records = await prisma.fhirConnection.findMany({
    where: { providerId },
  });

  return records.map(record => ({
    ...record,
    accessToken: decryptToken(record.accessToken),
    refreshToken: record.refreshToken ? decryptToken(record.refreshToken) : undefined,
  }));
}

/**
 * Update tokens after refresh
 */
export async function updateFhirTokens(
  providerId: string,
  vendor: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  await prisma.fhirConnection.update({
    where: {
      providerId_vendor: {
        providerId,
        vendor,
      },
    },
    data: {
      accessToken: encryptToken(accessToken),
      ...(refreshToken && { refreshToken: encryptToken(refreshToken) }),
      ...(expiresAt && { expiresAt }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete FHIR connection
 */
export async function deleteFhirConnection(providerId: string, vendor: string): Promise<void> {
  await prisma.fhirConnection.delete({
    where: {
      providerId_vendor: {
        providerId,
        vendor,
      },
    },
  });
}

/**
 * Check if a provider has a valid (non-expired) FHIR connection
 */
export async function hasValidFhirConnection(providerId: string, vendor: string): Promise<boolean> {
  const record = await prisma.fhirConnection.findUnique({
    where: {
      providerId_vendor: {
        providerId,
        vendor,
      },
    },
    select: {
      expiresAt: true,
      refreshToken: true,
    },
  });

  if (!record) return false;

  // Valid if not expired OR has refresh token
  return record.expiresAt > new Date() || !!record.refreshToken;
}

/**
 * Get connection status for display
 */
export async function getFhirConnectionStatus(providerId: string, vendor: string): Promise<{
  connected: boolean;
  expiresAt?: Date;
  patientId?: string;
  scope?: string;
  needsRefresh: boolean;
}> {
  const record = await prisma.fhirConnection.findUnique({
    where: {
      providerId_vendor: {
        providerId,
        vendor,
      },
    },
  });

  if (!record) {
    return { connected: false, needsRefresh: false };
  }

  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  return {
    connected: true,
    expiresAt: record.expiresAt,
    patientId: record.patientId || undefined,
    scope: record.scope || undefined,
    needsRefresh: record.expiresAt < fiveMinutesFromNow,
  };
}
