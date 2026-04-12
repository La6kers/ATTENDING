// =============================================================================
// ATTENDING AI - Auth API Client
// apps/shared/lib/auth/authApi.ts
//
// API client for authentication operations
// =============================================================================

import { User, Session, LoginCredentials, LoginResult, MfaVerification, MfaResult, TokenRefreshResult, PasswordResetRequest, PasswordReset } from './types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL || '/api/auth';

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

async function authFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${AUTH_API_BASE}${endpoint}`;
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
  try {
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      return { error: { code: data.code || 'UNKNOWN_ERROR', message: data.message || 'An error occurred', details: data.details } };
    }
    return { data };
  } catch (error) {
    return { error: { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network error' } };
  }
}

function getAuthHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await authFetch<{ user: User; session: Session; requiresMfa?: boolean; mfaToken?: string }>('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (response.error) return { success: false, error: response.error.message, errorCode: response.error.code };
  if (response.data?.requiresMfa) return { success: false, requiresMfa: true, mfaToken: response.data.mfaToken };
  return {
    success: true,
    user: response.data?.user,
    session: response.data?.session ? {
      ...response.data.session,
      createdAt: new Date(response.data.session.createdAt),
      expiresAt: new Date(response.data.session.expiresAt),
      lastActivityAt: new Date(response.data.session.lastActivityAt),
    } : undefined,
  };
}

export async function logout(accessToken?: string): Promise<boolean> {
  const headers: HeadersInit = accessToken ? getAuthHeader(accessToken) : {};
  const response = await authFetch<{ success: boolean }>('/logout', { method: 'POST', headers });
  return response.data?.success ?? false;
}

export async function verifyMfa(verification: MfaVerification): Promise<MfaResult> {
  const response = await authFetch<{ session: Session }>('/mfa/verify', {
    method: 'POST',
    body: JSON.stringify(verification),
  });
  if (response.error) return { success: false, error: response.error.message };
  return {
    success: true,
    session: response.data?.session ? {
      ...response.data.session,
      createdAt: new Date(response.data.session.createdAt),
      expiresAt: new Date(response.data.session.expiresAt),
      lastActivityAt: new Date(response.data.session.lastActivityAt),
    } : undefined,
  };
}

export async function refreshToken(refreshTokenValue?: string): Promise<TokenRefreshResult> {
  const response = await authFetch<{ accessToken: string; expiresAt: string }>('/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });
  if (response.error) return { success: false, error: response.error.message };
  return {
    success: true,
    accessToken: response.data?.accessToken,
    expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
  };
}

export async function getCurrentUser(accessToken: string): Promise<User | null> {
  const response = await authFetch<{ user: User }>('/me', { method: 'GET', headers: getAuthHeader(accessToken) });
  return response.data?.user ?? null;
}

export async function extendSession(accessToken: string): Promise<{ success: boolean; newExpiresAt?: Date }> {
  const response = await authFetch<{ success: boolean; expiresAt: string }>('/session/extend', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
  });
  return {
    success: response.data?.success ?? false,
    newExpiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
  };
}

export async function validateSession(accessToken: string): Promise<{ valid: boolean; expiresAt?: Date }> {
  const response = await authFetch<{ valid: boolean; expiresAt: string }>('/session/validate', {
    method: 'GET',
    headers: getAuthHeader(accessToken),
  });
  return {
    valid: response.data?.valid ?? false,
    expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
  };
}

export async function requestPasswordReset(request: PasswordResetRequest): Promise<{ success: boolean; message?: string }> {
  const response = await authFetch<{ success: boolean; message: string }>('/password/reset-request', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return { success: response.data?.success ?? false, message: response.data?.message || response.error?.message };
}

export async function resetPassword(reset: PasswordReset): Promise<{ success: boolean; message?: string }> {
  const response = await authFetch<{ success: boolean; message: string }>('/password/reset', {
    method: 'POST',
    body: JSON.stringify(reset),
  });
  return { success: response.data?.success ?? false, message: response.data?.message || response.error?.message };
}

export async function changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
  const response = await authFetch<{ success: boolean; message: string }>('/password/change', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return { success: response.data?.success ?? false, message: response.data?.message || response.error?.message };
}

export async function setupMfa(accessToken: string, method: 'totp' | 'sms' | 'email'): Promise<{ success: boolean; secret?: string; qrCode?: string; backupCodes?: string[] }> {
  const response = await authFetch<{ success: boolean; secret: string; qrCode: string; backupCodes: string[] }>('/mfa/setup', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
    body: JSON.stringify({ method }),
  });
  return {
    success: response.data?.success ?? false,
    secret: response.data?.secret,
    qrCode: response.data?.qrCode,
    backupCodes: response.data?.backupCodes,
  };
}

export async function confirmMfaSetup(accessToken: string, code: string): Promise<{ success: boolean; message?: string }> {
  const response = await authFetch<{ success: boolean; message: string }>('/mfa/confirm', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
    body: JSON.stringify({ code }),
  });
  return { success: response.data?.success ?? false, message: response.data?.message || response.error?.message };
}

export async function disableMfa(accessToken: string, code: string): Promise<{ success: boolean; message?: string }> {
  const response = await authFetch<{ success: boolean; message: string }>('/mfa/disable', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
    body: JSON.stringify({ code }),
  });
  return { success: response.data?.success ?? false, message: response.data?.message || response.error?.message };
}

export async function logAuditEvent(accessToken: string, action: string, details?: Record<string, unknown>): Promise<void> {
  await authFetch('/audit/log', {
    method: 'POST',
    headers: getAuthHeader(accessToken),
    body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
  });
}

export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch { return null; }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || typeof decoded.exp !== 'number') return true;
  return Date.now() >= decoded.exp * 1000;
}

export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || typeof decoded.exp !== 'number') return null;
  return new Date(decoded.exp * 1000);
}
