// =============================================================================
// ATTENDING AI - Auth Provider
// apps/shared/lib/auth/AuthProvider.tsx
//
// React context provider for authentication and authorization
// =============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, AuthState, AuthActions, AuthStatus, SessionStatus, LoginCredentials, LoginResult, MfaVerification, MfaResult, TokenRefreshResult, PasswordResetRequest, PasswordReset, SessionConfig, DEFAULT_SESSION_CONFIG } from './types';
import { SessionManager, getSessionManager, SessionEvent, persistSession, retrieveSession, clearSession } from './sessionManager';
import { login as apiLogin, logout as apiLogout, verifyMfa as apiVerifyMfa, refreshToken as apiRefreshToken, getCurrentUser as apiGetCurrentUser, extendSession as apiExtendSession, requestPasswordReset as apiRequestPasswordReset, resetPassword as apiResetPassword } from './authApi';

interface AuthContextValue extends AuthState, AuthActions {
  hasPermission: (permission: string) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  canPrescribe: boolean;
  canPrescribeControlled: boolean;
  sessionTimeRemaining: number;
  sessionTimeRemainingFormatted: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  sessionConfig?: Partial<SessionConfig>;
  onSessionExpired?: () => void;
  onSessionExpiring?: (remainingMs: number) => void;
  onAuthStateChange?: (state: AuthState) => void;
}

export function AuthProvider({ children, sessionConfig, onSessionExpired, onSessionExpiring, onAuthStateChange }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('expired');
  const [error, setError] = useState<Error | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const sessionManagerRef = useRef<SessionManager | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const handleSessionEvent = useCallback((event: SessionEvent) => {
    switch (event.type) {
      case 'session_idle': setSessionStatus('idle'); break;
      case 'session_expiring':
        setSessionStatus('expiring');
        if (onSessionExpiring && event.details?.remainingMs) onSessionExpiring(event.details.remainingMs as number);
        break;
      case 'session_expired':
        setSessionStatus('expired'); setUser(null); setSession(null); setStatus('session_expired');
        clearSession(); clearTimers();
        if (onSessionExpired) onSessionExpired();
        break;
      case 'session_locked': setSessionStatus('locked'); break;
      case 'session_extended':
        setSessionStatus('active');
        if (event.session) { setSession(event.session); persistSession(event.session); }
        break;
      case 'session_activity': setSessionStatus('active'); break;
    }
  }, [onSessionExpiring, onSessionExpired]);

  const clearTimers = useCallback(() => {
    if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
    if (timeUpdateRef.current) { clearInterval(timeUpdateRef.current); timeUpdateRef.current = null; }
  }, []);

  const scheduleTokenRefresh = useCallback((currentSession: Session) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const expiresAt = currentSession.expiresAt instanceof Date ? currentSession.expiresAt.getTime() : new Date(currentSession.expiresAt).getTime();
    const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
    if (refreshTime > 0) {
      refreshTimerRef.current = setTimeout(async () => { await refreshSession(); }, refreshTime);
    }
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      const storedSession = retrieveSession();
      if (storedSession?.accessToken) {
        const currentUser = await apiGetCurrentUser(storedSession.accessToken);
        if (currentUser) {
          const fullSession: Session = {
            id: storedSession.id || '', userId: currentUser.id, accessToken: storedSession.accessToken,
            createdAt: new Date(), expiresAt: storedSession.expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000),
            lastActivityAt: new Date(), extensionCount: storedSession.extensionCount || 0, mfaVerified: true,
          };
          setUser(currentUser); setSession(fullSession); setStatus('authenticated');
          sessionManagerRef.current?.startSession(fullSession);
          scheduleTokenRefresh(fullSession);
          return;
        }
      }
      setStatus('unauthenticated');
    } catch { setStatus('unauthenticated'); }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    const config = { ...DEFAULT_SESSION_CONFIG, ...sessionConfig };
    sessionManagerRef.current = getSessionManager(config);
    const unsubscribe = sessionManagerRef.current.addEventListener(handleSessionEvent);
    initializeSession();
    return () => { unsubscribe(); clearTimers(); };
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const updateTime = () => { setTimeRemaining(sessionManagerRef.current?.getRemainingTime() || 0); };
      updateTime();
      timeUpdateRef.current = setInterval(updateTime, 1000);
      return () => { if (timeUpdateRef.current) clearInterval(timeUpdateRef.current); };
    }
  }, [status, session]);

  useEffect(() => {
    if (onAuthStateChange) {
      onAuthStateChange({ status, user, session, sessionStatus, error, isLoading: status === 'loading', isAuthenticated: status === 'authenticated' });
    }
  }, [status, user, session, sessionStatus, error, onAuthStateChange]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    setStatus('loading'); setError(null);
    try {
      const result = await apiLogin(credentials);
      if (result.success && result.user && result.session) {
        setUser(result.user); setSession(result.session); setStatus('authenticated'); setSessionStatus('active');
        sessionManagerRef.current?.startSession(result.session);
        persistSession(result.session); scheduleTokenRefresh(result.session);
        return result;
      }
      if (result.requiresMfa) { setStatus('mfa_required'); return result; }
      setStatus('unauthenticated'); setError(new Error(result.error || 'Login failed'));
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error); setStatus('error');
      return { success: false, error: error.message };
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async (): Promise<void> => {
    try { if (session?.accessToken) await apiLogout(session.accessToken); } catch {}
    finally {
      sessionManagerRef.current?.endSession('user_logout');
      clearSession(); clearTimers();
      setUser(null); setSession(null); setStatus('unauthenticated'); setSessionStatus('expired'); setError(null);
    }
  }, [session, clearTimers]);

  const verifyMfa = useCallback(async (verification: MfaVerification): Promise<MfaResult> => {
    setStatus('loading');
    try {
      const result = await apiVerifyMfa(verification);
      if (result.success && result.session) {
        const currentUser = await apiGetCurrentUser(result.session.accessToken);
        if (currentUser) {
          setUser(currentUser); setSession(result.session); setStatus('authenticated'); setSessionStatus('active');
          sessionManagerRef.current?.startSession(result.session);
          persistSession(result.session); scheduleTokenRefresh(result.session);
        }
        return result;
      }
      setStatus('mfa_required'); return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('MFA verification failed');
      setError(error);
      return { success: false, error: error.message };
    }
  }, [scheduleTokenRefresh]);

  const refreshSession = useCallback(async (): Promise<TokenRefreshResult> => {
    if (!session?.refreshToken) return { success: false, error: 'No refresh token' };
    try {
      const result = await apiRefreshToken(session.refreshToken);
      if (result.success && result.accessToken && result.expiresAt) {
        const updatedSession: Session = { ...session, accessToken: result.accessToken, expiresAt: result.expiresAt };
        setSession(updatedSession); persistSession(updatedSession); scheduleTokenRefresh(updatedSession);
        return result;
      }
      setSessionStatus('expired'); setUser(null); setSession(null); setStatus('session_expired');
      clearSession(); clearTimers();
      if (onSessionExpired) onSessionExpired();
      return result;
    } catch {
      setSessionStatus('expired'); setUser(null); setSession(null); setStatus('session_expired');
      clearSession(); clearTimers();
      if (onSessionExpired) onSessionExpired();
      return { success: false, error: 'Token refresh failed' };
    }
  }, [session, scheduleTokenRefresh, clearTimers, onSessionExpired]);

  const extendSession = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken) return false;
    try {
      const result = await apiExtendSession(session.accessToken);
      if (result.success) return sessionManagerRef.current?.extendSession() ?? false;
      return false;
    } catch { return false; }
  }, [session]);

  const updateActivity = useCallback(() => { sessionManagerRef.current?.recordActivity(); }, []);
  const requestPasswordReset = useCallback(async (request: PasswordResetRequest): Promise<boolean> => {
    try { return (await apiRequestPasswordReset(request)).success; } catch { return false; }
  }, []);
  const resetPassword = useCallback(async (reset: PasswordReset): Promise<boolean> => {
    try { return (await apiResetPassword(reset)).success; } catch { return false; }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => user?.permissions?.includes(permission as any) ?? false, [user]);
  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissions.every((p) => user.permissions.includes(p as any));
  }, [user]);
  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    return permissions.some((p) => user.permissions.includes(p as any));
  }, [user]);

  const contextValue: AuthContextValue = {
    status, user, session, sessionStatus, error, isLoading: status === 'loading', isAuthenticated: status === 'authenticated',
    login, logout, verifyMfa, refreshSession, extendSession, updateActivity, requestPasswordReset, resetPassword,
    hasPermission, hasAllPermissions, hasAnyPermission,
    canPrescribe: user?.prescribingPrivileges?.canPrescribe ?? false,
    canPrescribeControlled: user?.prescribingPrivileges?.canPrescribeControlled ?? false,
    sessionTimeRemaining: timeRemaining,
    sessionTimeRemainingFormatted: sessionManagerRef.current?.formatRemainingTime() ?? '',
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export { AuthContext };
export type { AuthContextValue, AuthProviderProps };
