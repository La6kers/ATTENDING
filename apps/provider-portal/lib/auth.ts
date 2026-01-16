// ============================================================
// Authentication Configuration
// apps/provider-portal/lib/auth.ts
//
// NextAuth.js configuration for provider portal authentication
// TODO: Wire up Azure AD B2C provider in Phase 7
// ============================================================

import type { NextAuthOptions } from 'next-auth';

/**
 * NextAuth configuration options
 * Currently set up as a stub for development
 */
export const authOptions: NextAuthOptions = {
  // TODO: Add Azure AD B2C provider
  providers: [],
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  
  callbacks: {
    async session({ session, token }) {
      // Add custom session data
      if (token.sub) {
        (session as any).userId = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Add user data to JWT
      if (user) {
        token.role = (user as any).role || 'provider';
      }
      return token;
    },
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours - aligned with clinical shifts
  },
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Type for session user with role
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'provider' | 'nurse' | 'staff';
}

/**
 * Type for JWT payload
 */
export interface JWTPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Helper to check if user has required role
 */
export function hasRole(user: SessionUser | null | undefined, roles: SessionUser['role'][]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Helper to check if user is provider or higher
 */
export function isProvider(user: SessionUser | null | undefined): boolean {
  return hasRole(user, ['provider', 'admin']);
}

/**
 * Helper to check if user is admin
 */
export function isAdmin(user: SessionUser | null | undefined): boolean {
  return hasRole(user, ['admin']);
}

export default authOptions;
