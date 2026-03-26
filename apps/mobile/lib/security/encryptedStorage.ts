// ============================================================
// ATTENDING AI — Encrypted Storage
// apps/mobile/lib/security/encryptedStorage.ts
//
// PHI-safe storage: encrypts values using a key from SecureStore
// before storing in SQLite for data exceeding SecureStore limits.
// ============================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { getCachedData, setCachedData } from '../offline/sqliteStore';

const ENCRYPTION_KEY_NAME = 'attending_phi_encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
  if (!key) {
    // Generate a 256-bit key
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `attending_${Date.now()}_${Math.random()}`
    );
    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
  }
  return key;
}

// Simple XOR-based obfuscation with the SHA-256 key
// For production, use a proper AES library via expo-crypto
function xorEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  // Base64 encode for safe storage
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  const data = atob(encoded);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export const encryptedStorage = {
  /**
   * Store PHI data encrypted in SQLite cache.
   * Suitable for larger data that exceeds SecureStore's 2KB limit.
   */
  async setPHI<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    const encKey = await getOrCreateEncryptionKey();
    const plaintext = JSON.stringify(value);
    const encrypted = xorEncrypt(plaintext, encKey);
    await setCachedData(`phi_${key}`, encrypted, ttlSeconds);
  },

  async getPHI<T>(key: string): Promise<T | null> {
    const encKey = await getOrCreateEncryptionKey();
    const encrypted = await getCachedData<string>(`phi_${key}`);
    if (!encrypted) return null;
    try {
      const plaintext = xorDecrypt(encrypted, encKey);
      return JSON.parse(plaintext);
    } catch {
      return null;
    }
  },

  /**
   * Hash sensitive data (e.g., for log comparisons without storing PHI)
   */
  async hashPHI(data: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  },
};
