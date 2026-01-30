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

// Secure Session (HIPAA-compliant session management)
export {
  createSecureSession,
  getSecureSession,
  getSessionById,
  getSecureUserId,
  validateSession as validateSecureSession,
  updateSessionActivity,
  extendSession as extendSecureSession,
  invalidateSession,
  invalidateUserSessions,
  getSessionInfo,
  getSessionActivityLog,
  createEncryptedSessionToken,
  decryptSessionToken,
  sessionConfig,
} from './secureSession';

export type {
  SecureSession,
  SessionValidation,
  SessionActivity,
} from './secureSession';

// MFA (Multi-Factor Authentication)
export {
  generateMfaSecret,
  generateTotp,
  verifyTotp,
  verifyMfaWithRateLimit,
  setupMfa,
  generateBackupCodes,
  verifyBackupCode,
  hashBackupCode,
  hashBackupCodes,
  isMfaRequired,
  getMfaEnforcementStatus,
  decryptMfaSecret,
  mfaConfig,
  MFA_REQUIRED_ROLES_LIST,
} from './mfa';

export type {
  MfaSetup,
  MfaVerification,
  MfaConfig,
} from './mfa';
