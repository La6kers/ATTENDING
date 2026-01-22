// =============================================================================
// ATTENDING AI - Protected Components
// apps/shared/lib/auth/ProtectedRoute.tsx
//
// Components and HOCs for route and component-level authorization
// =============================================================================

import React, { ComponentType, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { useAuthorizationCheck } from './hooks';
import { Permission, UserRole, ControlledSubstanceSchedule } from './types';

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: Permission[];
  roles?: UserRole[];
  requirePrescribing?: boolean;
  requireControlled?: boolean;
  schedule?: ControlledSubstanceSchedule;
  loadingComponent?: ReactNode;
  unauthorizedComponent?: ReactNode;
  unauthenticatedComponent?: ReactNode;
  onUnauthorized?: (reason: string) => void;
}

export function ProtectedRoute({
  children, permissions, roles, requirePrescribing, requireControlled, schedule,
  loadingComponent, unauthorizedComponent, unauthenticatedComponent, onUnauthorized,
}: ProtectedRouteProps): JSX.Element {
  const { isLoading, isAuthenticated, status } = useAuth();
  const { authorized, reason } = useAuthorizationCheck({ permissions, roles, requirePrescribing, requireControlled, schedule });

  if (isLoading || status === 'loading') {
    return <>{loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )}</>;
  }

  if (!isAuthenticated) {
    return <>{unauthenticatedComponent || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-4">Please log in to access this page.</p>
        <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Log In</a>
      </div>
    )}</>;
  }

  if (!authorized) {
    if (onUnauthorized) onUnauthorized(reason || 'Unauthorized');
    return <>{unauthorizedComponent || (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p className="text-gray-600 mb-4">{reason || 'You do not have permission to access this page.'}</p>
        <a href="/" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Go to Dashboard</a>
      </div>
    )}</>;
  }

  return <>{children}</>;
}

interface RequirePermissionProps { children: ReactNode; permission: Permission; fallback?: ReactNode; }
export function RequirePermission({ children, permission, fallback = null }: RequirePermissionProps): JSX.Element {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

interface RequireRoleProps { children: ReactNode; roles: UserRole[]; fallback?: ReactNode; }
export function RequireRole({ children, roles, fallback = null }: RequireRoleProps): JSX.Element {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}

interface RequirePrescribingProps { children: ReactNode; controlled?: boolean; schedule?: ControlledSubstanceSchedule; fallback?: ReactNode; }
export function RequirePrescribing({ children, controlled, schedule, fallback = null }: RequirePrescribingProps): JSX.Element {
  const { canPrescribe, canPrescribeControlled, user } = useAuth();
  if (!canPrescribe) return <>{fallback}</>;
  if (controlled && !canPrescribeControlled) return <>{fallback}</>;
  if (schedule && !user?.prescribingPrivileges?.controlledSchedules.includes(schedule)) return <>{fallback}</>;
  return <>{children}</>;
}

// Higher-Order Components
export function withAuth<P extends object>(Component: ComponentType<P>, options?: Omit<ProtectedRouteProps, 'children'>): ComponentType<P> {
  const WithAuth = (props: P) => <ProtectedRoute {...options}><Component {...props} /></ProtectedRoute>;
  WithAuth.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;
  return WithAuth;
}

export function withPermission<P extends object>(Component: ComponentType<P>, permission: Permission, FallbackComponent?: ComponentType<P>): ComponentType<P> {
  const WithPermission = (props: P) => {
    const { hasPermission } = useAuth();
    if (!hasPermission(permission)) return FallbackComponent ? <FallbackComponent {...props} /> : null;
    return <Component {...props} />;
  };
  WithPermission.displayName = `withPermission(${Component.displayName || Component.name || 'Component'})`;
  return WithPermission;
}

export function withRole<P extends object>(Component: ComponentType<P>, roles: UserRole[], FallbackComponent?: ComponentType<P>): ComponentType<P> {
  const WithRole = (props: P) => {
    const { user } = useAuth();
    if (!user || !roles.includes(user.role)) return FallbackComponent ? <FallbackComponent {...props} /> : null;
    return <Component {...props} />;
  };
  WithRole.displayName = `withRole(${Component.displayName || Component.name || 'Component'})`;
  return WithRole;
}

export function withPrescribing<P extends object>(Component: ComponentType<P>, options?: { controlled?: boolean; schedule?: ControlledSubstanceSchedule }, FallbackComponent?: ComponentType<P>): ComponentType<P> {
  const WithPrescribing = (props: P) => (
    <RequirePrescribing controlled={options?.controlled} schedule={options?.schedule} fallback={FallbackComponent ? <FallbackComponent {...props} /> : null}>
      <Component {...props} />
    </RequirePrescribing>
  );
  WithPrescribing.displayName = `withPrescribing(${Component.displayName || Component.name || 'Component'})`;
  return WithPrescribing;
}

// Session Warning Component
interface SessionWarningProps {
  warningThreshold?: number;
  children?: (props: { timeRemaining: number; timeRemainingFormatted: string; extendSession: () => Promise<boolean>; canExtend: boolean }) => ReactNode;
}

export function SessionWarning({ warningThreshold = 5 * 60 * 1000, children }: SessionWarningProps): JSX.Element | null {
  const { sessionStatus, sessionTimeRemaining, sessionTimeRemainingFormatted, extendSession } = useAuth();
  const canExtend = sessionStatus === 'active' || sessionStatus === 'expiring';
  const shouldShow = sessionStatus === 'expiring' || (sessionStatus === 'active' && sessionTimeRemaining <= warningThreshold);
  if (!shouldShow) return null;

  if (children) return <>{children({ timeRemaining: sessionTimeRemaining, timeRemainingFormatted: sessionTimeRemainingFormatted, extendSession, canExtend })}</>;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-center gap-3">
        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="font-medium text-yellow-800">Session expires in {sessionTimeRemainingFormatted}</p>
          <button onClick={extendSession} className="text-sm text-yellow-700 underline hover:text-yellow-900">Extend Session</button>
        </div>
      </div>
    </div>
  );
}

export function AuthStatusIndicator(): JSX.Element {
  const { status, user, sessionStatus, sessionTimeRemainingFormatted } = useAuth();
  return (
    <div className="text-xs text-gray-500">
      <div>Auth: {status}</div>
      <div>Session: {sessionStatus}</div>
      {user && <><div>User: {user.fullName}</div><div>Role: {user.role}</div></>}
      {sessionTimeRemainingFormatted && <div>Time: {sessionTimeRemainingFormatted}</div>}
    </div>
  );
}
