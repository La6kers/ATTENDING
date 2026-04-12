// =============================================================================
// ATTENDING AI - Auth Hooks
// apps/shared/lib/auth/hooks.ts
//
// Specialized React hooks for authentication and authorization
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import { Permission, UserRole, ControlledSubstanceSchedule, PrescribingPrivileges } from './types';
import { hasPermission, hasAllPermissions, hasAnyPermission, canPrescribeSchedule, ROLE_PRESCRIBING_PRIVILEGES } from './permissions';

// Permission Hooks
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return useMemo(() => hasPermission(user?.permissions || [], permission), [user?.permissions, permission]);
}

export function usePermissions(permissions: Permission[]): Record<Permission, boolean> {
  const { user } = useAuth();
  return useMemo(() => {
    const userPermissions = user?.permissions || [];
    const result: Record<string, boolean> = {};
    for (const permission of permissions) result[permission] = hasPermission(userPermissions, permission);
    return result as Record<Permission, boolean>;
  }, [user?.permissions, permissions]);
}

export function useRequireAllPermissions(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return useMemo(() => hasAllPermissions(user?.permissions || [], permissions), [user?.permissions, permissions]);
}

export function useRequireAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth();
  return useMemo(() => hasAnyPermission(user?.permissions || [], permissions), [user?.permissions, permissions]);
}

// Role Hooks
export function useRole(): UserRole | null {
  const { user } = useAuth();
  return user?.role ?? null;
}

export function useHasRole(role: UserRole): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

export function useHasAnyRole(roles: UserRole[]): boolean {
  const { user } = useAuth();
  return user?.role ? roles.includes(user.role) : false;
}

export function useIsClinicalProvider(): boolean {
  const { user } = useAuth();
  const clinicalRoles: UserRole[] = ['physician', 'nurse_practitioner', 'physician_assistant', 'nurse', 'medical_assistant'];
  return user?.role ? clinicalRoles.includes(user.role) : false;
}

export function useIsPrescriber(): boolean {
  const { user } = useAuth();
  const prescriberRoles: UserRole[] = ['physician', 'nurse_practitioner', 'physician_assistant'];
  return user?.role ? prescriberRoles.includes(user.role) : false;
}

// Prescribing Hooks
export function usePrescribingPrivileges(): PrescribingPrivileges | null {
  const { user } = useAuth();
  return user?.prescribingPrivileges ?? null;
}

export function useCanPrescribe(): boolean {
  const { canPrescribe } = useAuth();
  return canPrescribe;
}

export function useCanPrescribeControlled(): boolean {
  const { canPrescribeControlled } = useAuth();
  return canPrescribeControlled;
}

export function useCanPrescribeSchedule(schedule: ControlledSubstanceSchedule): boolean {
  const privileges = usePrescribingPrivileges();
  return useMemo(() => {
    if (!privileges) return false;
    return canPrescribeSchedule(privileges, schedule);
  }, [privileges, schedule]);
}

export function useRequiresSupervision(): boolean {
  const { user } = useAuth();
  return user?.prescribingPrivileges?.requiresSupervision ?? false;
}

export function useSupervisingPhysician(): string | null {
  const { user } = useAuth();
  return user?.prescribingPrivileges?.supervisingPhysicianId ?? null;
}

// Session Hooks
export function useSession(): {
  isActive: boolean; isIdle: boolean; isExpiring: boolean; isLocked: boolean;
  timeRemaining: number; timeRemainingFormatted: string; canExtend: boolean;
  extendSession: () => Promise<boolean>; recordActivity: () => void;
} {
  const { sessionStatus, sessionTimeRemaining, sessionTimeRemainingFormatted, extendSession, updateActivity } = useAuth();
  const canExtend = sessionStatus === 'expiring' || sessionStatus === 'active';
  return {
    isActive: sessionStatus === 'active', isIdle: sessionStatus === 'idle',
    isExpiring: sessionStatus === 'expiring', isLocked: sessionStatus === 'locked',
    timeRemaining: sessionTimeRemaining, timeRemainingFormatted: sessionTimeRemainingFormatted,
    canExtend, extendSession, recordActivity: updateActivity,
  };
}

export function useSessionWarning(onWarning: (timeRemaining: number) => void, warningThreshold = 5 * 60 * 1000): void {
  const { sessionStatus, sessionTimeRemaining } = useAuth();
  useMemo(() => {
    if (sessionStatus === 'expiring' || (sessionStatus === 'active' && sessionTimeRemaining <= warningThreshold)) {
      onWarning(sessionTimeRemaining);
    }
  }, [sessionStatus, sessionTimeRemaining, warningThreshold, onWarning]);
}

// User Hooks
export function useCurrentUser() { const { user } = useAuth(); return user; }
export function useUserName(): string { const { user } = useAuth(); return user?.fullName ?? ''; }
export function useOrganization(): { id: string; name: string } | null {
  const { user } = useAuth();
  if (!user) return null;
  return { id: user.organizationId, name: user.organizationName };
}
export function useFacilities(): string[] { const { user } = useAuth(); return user?.facilities ?? []; }

// Authorization Check Hook
export function useAuthorize(): (permissions: Permission[]) => { allowed: boolean; missing: Permission[] } {
  const { user } = useAuth();
  return useCallback((requiredPermissions: Permission[]) => {
    const userPermissions = user?.permissions || [];
    const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));
    return { allowed: missing.length === 0, missing };
  }, [user?.permissions]);
}

export function useAuthorizationCheck(options: {
  permissions?: Permission[]; roles?: UserRole[]; requirePrescribing?: boolean;
  requireControlled?: boolean; schedule?: ControlledSubstanceSchedule;
}): { authorized: boolean; reason?: string } {
  const { user, canPrescribe, canPrescribeControlled } = useAuth();
  const canPrescribeSched = useCanPrescribeSchedule(options.schedule || 'V');

  return useMemo(() => {
    if (!user) return { authorized: false, reason: 'Not authenticated' };
    if (options.roles && !options.roles.includes(user.role)) {
      return { authorized: false, reason: `Role '${user.role}' is not authorized for this action` };
    }
    if (options.permissions) {
      const missing = options.permissions.filter((p) => !user.permissions.includes(p));
      if (missing.length > 0) return { authorized: false, reason: `Missing permissions: ${missing.join(', ')}` };
    }
    if (options.requirePrescribing && !canPrescribe) return { authorized: false, reason: 'Prescribing privileges required' };
    if (options.requireControlled && !canPrescribeControlled) return { authorized: false, reason: 'Controlled substance prescribing privileges required' };
    if (options.schedule && !canPrescribeSched) return { authorized: false, reason: `Schedule ${options.schedule} prescribing privileges required` };
    return { authorized: true };
  }, [user, options, canPrescribe, canPrescribeControlled, canPrescribeSched]);
}

// Credential Hooks
export function useNPI(): string | null { const { user } = useAuth(); return user?.credentials?.npi ?? null; }
export function useDEA(): string | null { const { user } = useAuth(); return user?.credentials?.dea ?? null; }
export function useHasValidCredentials(): boolean {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user?.credentials) return false;
    return user.credentials.stateLicenses?.some((license) => license.status === 'active') ?? false;
  }, [user?.credentials]);
}
