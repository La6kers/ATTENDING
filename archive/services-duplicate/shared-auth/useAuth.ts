// ============================================================
// Authentication Hook - @attending/shared
// apps/shared/auth/useAuth.ts
//
// React hook for authentication state and actions
// ============================================================

import { useSession, signIn, signOut } from 'next-auth/react';
import type { AttendingSession, AttendingUser } from './config';

// ============================================================
// TYPES
// ============================================================

export interface UseAuthReturn {
  /** Current user or null if not authenticated */
  user: AttendingUser | null;
  /** Full session object */
  session: AttendingSession | null;
  /** Whether authentication is being verified */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** User role or null */
  role: AttendingUser['role'] | null;
  /** Sign in function */
  login: (email?: string, password?: string, callbackUrl?: string) => Promise<void>;
  /** Sign out function */
  logout: (callbackUrl?: string) => Promise<void>;
  /** Check if user has specific role */
  hasRole: (roles: AttendingUser['role'] | AttendingUser['role'][]) => boolean;
  /** Check if user is a provider */
  isProvider: boolean;
  /** Check if user is a patient */
  isPatient: boolean;
  /** Check if user is an admin */
  isAdmin: boolean;
}

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

/**
 * Authentication hook for ATTENDING AI
 * 
 * @example
 * function MyComponent() {
 *   const { user, isLoading, isAuthenticated, login, logout } = useAuth();
 *   
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *   
 *   return <div>Hello, {user.name}!</div>;
 * }
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const user = (session?.user as AttendingUser) || null;
  const role = user?.role || null;

  // Login function
  const login = async (
    email?: string,
    password?: string,
    callbackUrl?: string
  ): Promise<void> => {
    if (email && password) {
      // Credentials login
      await signIn('credentials', {
        email,
        password,
        callbackUrl: callbackUrl || '/',
      });
    } else {
      // Redirect to sign in page
      await signIn(undefined, { callbackUrl: callbackUrl || '/' });
    }
  };

  // Logout function
  const logout = async (callbackUrl?: string): Promise<void> => {
    await signOut({ callbackUrl: callbackUrl || '/auth/signin' });
  };

  // Role check function
  const hasRole = (roles: AttendingUser['role'] | AttendingUser['role'][]): boolean => {
    if (!role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(role);
  };

  return {
    user,
    session: session as AttendingSession | null,
    isLoading,
    isAuthenticated,
    role,
    login,
    logout,
    hasRole,
    isProvider: role === 'PROVIDER',
    isPatient: role === 'PATIENT',
    isAdmin: role === 'ADMIN',
  };
}

export default useAuth;
