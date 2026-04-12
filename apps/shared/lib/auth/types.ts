// =============================================================================
// ATTENDING AI - Authentication & Authorization Types
// apps/shared/lib/auth/types.ts
//
// Type definitions for healthcare-specific authentication and authorization
// =============================================================================

// =============================================================================
// User Roles
// =============================================================================

/**
 * Clinical roles with prescribing capabilities
 */
export type ClinicalRole =
  | 'physician'           // MD/DO - Full prescribing authority
  | 'nurse_practitioner'  // NP - Prescribing with/without supervision
  | 'physician_assistant' // PA - Prescribing under physician supervision
  | 'nurse'               // RN/LPN - No prescribing, clinical care
  | 'medical_assistant';  // MA - Limited clinical tasks

/**
 * Administrative roles
 */
export type AdministrativeRole =
  | 'administrator'       // Full system access
  | 'office_manager'      // Practice management
  | 'billing_specialist'  // Billing/coding access
  | 'receptionist';       // Front desk, scheduling

/**
 * All user roles
 */
export type UserRole = ClinicalRole | AdministrativeRole;

/**
 * Role hierarchy for permission inheritance
 * Higher number = more privileges
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  physician: 100,
  administrator: 95,
  nurse_practitioner: 80,
  physician_assistant: 75,
  office_manager: 60,
  nurse: 50,
  medical_assistant: 40,
  billing_specialist: 30,
  receptionist: 20,
};

// =============================================================================
// Permissions
// =============================================================================

/**
 * Permission categories
 */
export type PermissionCategory =
  | 'assessments'
  | 'patients'
  | 'orders'
  | 'medications'
  | 'labs'
  | 'imaging'
  | 'referrals'
  | 'documents'
  | 'messaging'
  | 'scheduling'
  | 'billing'
  | 'reports'
  | 'admin'
  | 'system';

/**
 * Permission actions
 */
export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'sign'
  | 'prescribe'
  | 'approve'
  | 'export'
  | 'manage';

/**
 * Individual permission string format: "category:action"
 */
export type Permission = `${PermissionCategory}:${PermissionAction}`;

/**
 * Special permissions for controlled substances
 */
export type ControlledSubstanceSchedule = 'II' | 'III' | 'IV' | 'V';

export interface PrescribingPrivileges {
  canPrescribe: boolean;
  canPrescribeControlled: boolean;
  controlledSchedules: ControlledSubstanceSchedule[];
  requiresSupervision: boolean;
  supervisingPhysicianId?: string;
  deaNumber?: string;
  deaExpiration?: string;
  stateLicense?: string;
  stateLicenseExpiration?: string;
}

// =============================================================================
// User Types
// =============================================================================

export interface UserCredentials {
  npi?: string;              // National Provider Identifier
  dea?: string;              // DEA number for controlled substances
  stateLicenses: StateLicense[];
  boardCertifications: BoardCertification[];
}

export interface StateLicense {
  state: string;
  licenseNumber: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
}

export interface BoardCertification {
  board: string;
  specialty: string;
  certificationDate: string;
  expirationDate?: string;
  status: 'active' | 'expired';
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  title?: string;
  department?: string;
  specialty?: string;
  avatar?: string;
  phone?: string;
  
  // Organization
  organizationId: string;
  organizationName: string;
  facilities: string[];  // Facility IDs user has access to
  
  // Credentials
  credentials?: UserCredentials;
  prescribingPrivileges?: PrescribingPrivileges;
  
  // Permissions
  permissions: Permission[];
  
  // Status
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  mfaEnabled: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Session configuration for clinical environments
 */
export interface SessionConfig {
  /** Maximum session duration (default: 8 hours for clinical shifts) */
  maxDuration: number;
  /** Idle timeout before requiring re-authentication (default: 15 minutes) */
  idleTimeout: number;
  /** Warning before session expires (default: 5 minutes) */
  expirationWarning: number;
  /** Allow session extension */
  allowExtension: boolean;
  /** Maximum extensions allowed */
  maxExtensions: number;
  /** Require MFA for sensitive operations */
  requireMfaForSensitive: boolean;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxDuration: 8 * 60 * 60 * 1000,      // 8 hours
  idleTimeout: 15 * 60 * 1000,           // 15 minutes
  expirationWarning: 5 * 60 * 1000,      // 5 minutes
  allowExtension: true,
  maxExtensions: 2,
  requireMfaForSensitive: true,
};

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  
  // Timing
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  
  // Extension tracking
  extensionCount: number;
  
  // Context
  facilityId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // MFA
  mfaVerified: boolean;
  mfaVerifiedAt?: Date;
}

export type SessionStatus = 
  | 'active'
  | 'idle'
  | 'expiring'
  | 'expired'
  | 'locked';

// =============================================================================
// Authentication Types
// =============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  facilityId?: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  session?: Session;
  requiresMfa?: boolean;
  mfaToken?: string;
  error?: string;
  errorCode?: string;
}

export interface MfaVerification {
  mfaToken: string;
  code: string;
  method: 'totp' | 'sms' | 'email';
}

export interface MfaResult {
  success: boolean;
  session?: Session;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// Authorization Types
// =============================================================================

export interface AuthorizationContext {
  user: User;
  session: Session;
  facilityId?: string;
  patientId?: string;
  encounterId?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  missingPermissions?: Permission[];
}

/**
 * Resource-based access control
 */
export interface ResourceAccess {
  resourceType: 'patient' | 'encounter' | 'order' | 'document';
  resourceId: string;
  actions: PermissionAction[];
}

// =============================================================================
// Audit Types
// =============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  facilityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'denied';
  reason?: string;
}

// =============================================================================
// Auth State Types (for React context)
// =============================================================================

export type AuthStatus = 
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'mfa_required'
  | 'session_expired'
  | 'error';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  sessionStatus: SessionStatus;
  error: Error | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => Promise<void>;
  verifyMfa: (verification: MfaVerification) => Promise<MfaResult>;
  refreshSession: () => Promise<TokenRefreshResult>;
  extendSession: () => Promise<boolean>;
  updateActivity: () => void;
  requestPasswordReset: (request: PasswordResetRequest) => Promise<boolean>;
  resetPassword: (reset: PasswordReset) => Promise<boolean>;
}

// =============================================================================
// Provider Types (for Azure AD B2C, etc.)
// =============================================================================

export type AuthProvider = 'azure_ad_b2c' | 'okta' | 'auth0' | 'cognito' | 'local';

export interface AuthProviderConfig {
  provider: AuthProvider;
  clientId: string;
  authority?: string;
  redirectUri: string;
  scopes: string[];
  postLogoutRedirectUri?: string;
}

export interface AzureADB2CConfig extends AuthProviderConfig {
  provider: 'azure_ad_b2c';
  tenantId: string;
  userFlows: {
    signIn: string;
    signUp: string;
    passwordReset: string;
    profileEdit: string;
  };
}
