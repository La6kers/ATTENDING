// =============================================================================
// ATTENDING AI - Auth Module Exports
// apps/shared/lib/auth/index.ts
// =============================================================================

// Types
export * from './types';

// Permissions
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_PRESCRIBING_PRIVILEGES,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getMissingPermissions,
  canPrescribeSchedule,
  requiresSupervision,
  getPermissionsForRole,
  hasHigherPrivilege,
  getPermissionDisplayName,
  groupPermissionsByCategory,
} from './permissions';

// Session Management
export {
  SessionManager,
  getSessionManager,
  resetSessionManager,
  persistSession,
  retrieveSession,
  clearSession,
  isSessionValid,
  sessionNeedsRefresh,
} from './sessionManager';

export type { SessionEventType, SessionEvent, SessionEventListener } from './sessionManager';

// Auth API
export {
  login,
  logout,
  verifyMfa,
  refreshToken,
  getCurrentUser,
  extendSession,
  validateSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
  setupMfa,
  confirmMfaSetup,
  disableMfa,
  logAuditEvent,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
} from './authApi';

// Auth Provider
export { AuthProvider, useAuth, AuthContext } from './AuthProvider';
export type { AuthContextValue, AuthProviderProps } from './AuthProvider';

// Auth Hooks
export {
  usePermission, usePermissions, useRequireAllPermissions, useRequireAnyPermission,
  useRole, useHasRole, useHasAnyRole, useIsClinicalProvider, useIsPrescriber,
  usePrescribingPrivileges, useCanPrescribe, useCanPrescribeControlled, useCanPrescribeSchedule, useRequiresSupervision, useSupervisingPhysician,
  useSession, useSessionWarning,
  useCurrentUser, useUserName, useOrganization, useFacilities,
  useAuthorize, useAuthorizationCheck,
  useNPI, useDEA, useHasValidCredentials,
} from './hooks';

// Protected Components
export {
  ProtectedRoute, RequirePermission, RequireRole, RequirePrescribing, SessionWarning, AuthStatusIndicator,
  withAuth, withPermission, withRole, withPrescribing,
} from './ProtectedRoute';
