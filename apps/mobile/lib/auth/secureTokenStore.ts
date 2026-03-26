// ============================================================
// ATTENDING AI — Secure Token Store
// apps/mobile/lib/auth/secureTokenStore.ts
//
// Wraps expo-secure-store for OS-level encrypted token storage.
// iOS Keychain / Android Keystore — HIPAA 164.312(a)(2)(iv).
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// expo-secure-store has a 2048-byte limit per value.
// For larger payloads we chunk into multiple keys.
const CHUNK_SIZE = 2000;

async function setLargeValue(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value, SECURE_OPTS);
    await SecureStore.deleteItemAsync(`${key}_chunks`, SECURE_OPTS);
    return;
  }
  const chunks = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks), SECURE_OPTS);
  for (let i = 0; i < chunks; i++) {
    await SecureStore.setItemAsync(
      `${key}_${i}`,
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      SECURE_OPTS
    );
  }
}

async function getLargeValue(key: string): Promise<string | null> {
  const chunksStr = await SecureStore.getItemAsync(`${key}_chunks`, SECURE_OPTS);
  if (!chunksStr) {
    return SecureStore.getItemAsync(key, SECURE_OPTS);
  }
  const chunks = parseInt(chunksStr, 10);
  let value = '';
  for (let i = 0; i < chunks; i++) {
    const chunk = await SecureStore.getItemAsync(`${key}_${i}`, SECURE_OPTS);
    if (chunk === null) return null;
    value += chunk;
  }
  return value;
}

async function deleteLargeValue(key: string): Promise<void> {
  const chunksStr = await SecureStore.getItemAsync(`${key}_chunks`, SECURE_OPTS);
  if (chunksStr) {
    const chunks = parseInt(chunksStr, 10);
    for (let i = 0; i < chunks; i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`, SECURE_OPTS);
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`, SECURE_OPTS);
  }
  await SecureStore.deleteItemAsync(key, SECURE_OPTS);
}

export const secureTokenStore = {
  getAccessToken: () =>
    SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN, SECURE_OPTS),

  setAccessToken: (token: string) =>
    SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token, SECURE_OPTS),

  getRefreshToken: () =>
    SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN, SECURE_OPTS),

  setRefreshToken: (token: string) =>
    SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token, SECURE_OPTS),

  getSessionData: async () => {
    const raw = await getLargeValue(STORAGE_KEYS.SESSION_DATA);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setSessionData: (data: Record<string, unknown>) =>
    setLargeValue(STORAGE_KEYS.SESSION_DATA, JSON.stringify(data)),

  getUserData: async () => {
    const raw = await getLargeValue(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setUserData: (data: Record<string, unknown>) =>
    setLargeValue(STORAGE_KEYS.USER_DATA, JSON.stringify(data)),

  clearAll: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN, SECURE_OPTS),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN, SECURE_OPTS),
      deleteLargeValue(STORAGE_KEYS.SESSION_DATA),
      deleteLargeValue(STORAGE_KEYS.USER_DATA),
    ]);
  },
};
