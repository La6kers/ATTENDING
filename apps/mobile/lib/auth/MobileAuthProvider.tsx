// ============================================================
// ATTENDING AI — Mobile Auth Provider
// apps/mobile/lib/auth/MobileAuthProvider.tsx
//
// React Context for authentication state.
// Manages login, logout, MFA, session lifecycle.
// ============================================================

import React, { createContext, useContext, useEffect, useCallback, useReducer, useRef } from 'react';
import { router } from 'expo-router';
import { secureTokenStore } from './secureTokenStore';
import { sessionManager, SessionEvent } from './mobileSessionManager';
import api from '../api/mobileApiClient';

// ============================================================
// Types
// ============================================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  avatar?: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'mfa_required' | 'session_expired';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  isLoading: boolean;
  mfaToken: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; requiresMfa?: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  recordActivity: () => void;
}

type AuthAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_AUTHENTICATED'; user: User }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_MFA_REQUIRED'; mfaToken: string }
  | { type: 'SET_SESSION_EXPIRED' };

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextValue | null>(null);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true };
    case 'SET_AUTHENTICATED':
      return { status: 'authenticated', user: action.user, isLoading: false, mfaToken: null };
    case 'SET_UNAUTHENTICATED':
      return { status: 'unauthenticated', user: null, isLoading: false, mfaToken: null };
    case 'SET_MFA_REQUIRED':
      return { ...state, status: 'mfa_required', isLoading: false, mfaToken: action.mfaToken };
    case 'SET_SESSION_EXPIRED':
      return { status: 'session_expired', user: null, isLoading: false, mfaToken: null };
    default:
      return state;
  }
}

const initialState: AuthState = {
  status: 'loading',
  user: null,
  isLoading: true,
  mfaToken: null,
};

// ============================================================
// Provider
// ============================================================

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const sessionListenerRef = useRef<(() => void) | null>(null);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
    return () => {
      sessionListenerRef.current?.();
      sessionManager.stop();
    };
  }, []);

  async function restoreSession() {
    try {
      const token = await secureTokenStore.getAccessToken();
      if (!token) {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
        return;
      }

      // Verify with server
      const result = await api.get<{ user: User }>('/auth/me');
      if (result.ok && result.data?.user) {
        dispatch({ type: 'SET_AUTHENTICATED', user: result.data.user });
        startSessionManager();
      } else {
        // Try refresh
        const refreshTok = await secureTokenStore.getRefreshToken();
        if (refreshTok) {
          const refreshResult = await api.post<{ accessToken: string; user: User }>('/auth/refresh', { refreshToken: refreshTok });
          if (refreshResult.ok && refreshResult.data) {
            await secureTokenStore.setAccessToken(refreshResult.data.accessToken);
            dispatch({ type: 'SET_AUTHENTICATED', user: refreshResult.data.user });
            startSessionManager();
            return;
          }
        }
        await secureTokenStore.clearAll();
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    } catch {
      // Offline — try to use cached user
      const cachedUser = await secureTokenStore.getUserData();
      if (cachedUser) {
        dispatch({ type: 'SET_AUTHENTICATED', user: cachedUser as User });
        startSessionManager();
      } else {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    }
  }

  function startSessionManager() {
    sessionManager.start();
    sessionListenerRef.current = sessionManager.onEvent((event: SessionEvent) => {
      if (event.type === 'expired') {
        handleSessionExpired();
      }
    });
  }

  async function handleSessionExpired() {
    await secureTokenStore.clearAll();
    sessionManager.stop();
    dispatch({ type: 'SET_SESSION_EXPIRED' });
    router.replace('/(auth)/login');
  }

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING' });
    const result = await api.post<{
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      requiresMfa?: boolean;
      mfaToken?: string;
    }>('/auth/login', { email, password }, { noAuth: true });

    if (!result.ok) {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
      return { success: false, error: result.error?.message ?? 'Login failed' };
    }

    if (result.data?.requiresMfa && result.data.mfaToken) {
      dispatch({ type: 'SET_MFA_REQUIRED', mfaToken: result.data.mfaToken });
      return { success: true, requiresMfa: true };
    }

    if (result.data?.accessToken && result.data.user) {
      await secureTokenStore.setAccessToken(result.data.accessToken);
      if (result.data.refreshToken) {
        await secureTokenStore.setRefreshToken(result.data.refreshToken);
      }
      await secureTokenStore.setUserData(result.data.user as unknown as Record<string, unknown>);
      dispatch({ type: 'SET_AUTHENTICATED', user: result.data.user });
      startSessionManager();
      return { success: true };
    }

    dispatch({ type: 'SET_UNAUTHENTICATED' });
    return { success: false, error: 'Unexpected response' };
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    if (!state.mfaToken) return { success: false, error: 'No MFA session' };

    const result = await api.post<{
      accessToken: string;
      refreshToken?: string;
      user: User;
    }>('/auth/mfa/verify', { mfaToken: state.mfaToken, code }, { noAuth: true });

    if (!result.ok) {
      return { success: false, error: result.error?.message ?? 'Verification failed' };
    }

    if (result.data) {
      await secureTokenStore.setAccessToken(result.data.accessToken);
      if (result.data.refreshToken) {
        await secureTokenStore.setRefreshToken(result.data.refreshToken);
      }
      await secureTokenStore.setUserData(result.data.user as unknown as Record<string, unknown>);
      dispatch({ type: 'SET_AUTHENTICATED', user: result.data.user });
      startSessionManager();
      return { success: true };
    }

    return { success: false, error: 'Unexpected response' };
  }, [state.mfaToken]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* best-effort */ }
    await secureTokenStore.clearAll();
    sessionManager.stop();
    dispatch({ type: 'SET_UNAUTHENTICATED' });
    router.replace('/(auth)/login');
  }, []);

  const recordActivity = useCallback(() => {
    sessionManager.recordActivity();
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    verifyMfa,
    recordActivity,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within MobileAuthProvider');
  return ctx;
}
