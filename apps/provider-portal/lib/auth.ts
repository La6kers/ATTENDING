// ============================================================
// Authentication - Re-export & Role Helpers
// apps/provider-portal/lib/auth.ts
//
// This file re-exports the canonical auth config from lib/api/auth.ts
// and provides lightweight role-checking utilities for components.
//
// See lib/api/auth.ts header for the full auth architecture map.
// ============================================================

// Re-export canonical auth utilities (used by API routes)
export { authOptions, getSession, requireAuth, requireRole, createAuditLog } from './api/auth';

// Re-export types from our local auth module
export type { AttendingUser, AttendingSession, AttendingJWT } from './api/auth';

// ============================================================
// Role Checking Utilities (for components & pages)
// ============================================================

/** User roles matching the shared auth module */
type UserRole = 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Check if user has one of the required roles */
export function hasRole(user: SessionUser | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/** Check if user has provider-level access (PROVIDER or ADMIN) */
export function isProvider(user: SessionUser | null | undefined): boolean {
  return hasRole(user, ['PROVIDER', 'ADMIN']);
}

/** Check if user has admin access */
export function isAdmin(user: SessionUser | null | undefined): boolean {
  return hasRole(user, ['ADMIN']);
}

/** Check if user has clinical access (PROVIDER, NURSE, or ADMIN) */
export function isClinicalStaff(user: SessionUser | null | undefined): boolean {
  return hasRole(user, ['PROVIDER', 'NURSE', 'ADMIN']);
}

export default { hasRole, isProvider, isAdmin, isClinicalStaff };
