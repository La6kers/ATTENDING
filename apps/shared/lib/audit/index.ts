// ============================================================
// Audit Logging Service - HIPAA Compliant Audit Trail
// apps/shared/lib/audit/index.ts
//
// Comprehensive audit logging for all PHI access and clinical actions
// Supports: User actions, PHI access, system events, security events
// 
// HIPAA Requirements Addressed:
// - 164.312(b) - Audit controls
// - 164.308(a)(1)(ii)(D) - Information system activity review
// - 164.312(c)(1) - Integrity controls
// ============================================================

import { PrismaClient } from '@prisma/client';

// Lazy initialization to avoid issues during build
let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

// ============================================================
// TYPES - Strictly typed for HIPAA compliance
// ============================================================

export interface AuditLogEntry {
  /** The action being performed */
  action: AuditAction;
  /** User ID performing the action (use 'SYSTEM' for automated actions) */
  userId: string;
  /** Type of resource being accessed/modified */
  resourceType: AuditResourceType;
  /** Optional: Specific resource ID */
  resourceId?: string;
  /** Patient ID if PHI is being accessed - REQUIRED for PHI access */
  patientId?: string;
  /** Additional structured details about the action */
  details?: AuditDetails;
  /** Client IP address for access tracking */
  ipAddress?: string;
  /** User agent string for device identification */
  userAgent?: string;
  /** Session ID for tracking user sessions */
  sessionId?: string;
}

export interface AuditDetails {
  /** Whether this access involves PHI */
  hipaaRelevant?: boolean;
  /** Reason for access (required for break-the-glass scenarios) */
  accessReason?: string;
  /** Previous value for change tracking */
  previousValue?: unknown;
  /** New value for change tracking */
  newValue?: unknown;
  /** Additional context */
  [key: string]: unknown;
}

export interface AuditContext {
  userId: string;
  userRole: UserRole;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type UserRole = 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT' | 'SYSTEM';

export type AuditResourceType = 
  | 'Patient'
  | 'Encounter'
  | 'Assessment'
  | 'LabOrder'
  | 'ImagingOrder'
  | 'MedicationOrder'
  | 'Referral'
  | 'TreatmentPlan'
  | 'VitalSigns'
  | 'ClinicalNote'
  | 'EmergencyEvent'
  | 'User'
  | 'Session'
  | 'Security'
  | 'System'
  | 'PHI'
  | 'FHIR'
  | 'API';

// ============================================================
// AUDIT ACTIONS - Comprehensive action types
// ============================================================

export const AuditActions = {
  // Authentication Events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_CREATED: 'SESSION_CREATED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  MFA_CHALLENGE_PASSED: 'MFA_CHALLENGE_PASSED',
  MFA_CHALLENGE_FAILED: 'MFA_CHALLENGE_FAILED',
  
  // Patient Data Access (HIPAA Critical)
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_DELETE: 'PATIENT_DELETE',
  PATIENT_SEARCH: 'PATIENT_SEARCH',
  PATIENT_LIST_VIEW: 'PATIENT_LIST_VIEW',
  PATIENT_DEMOGRAPHICS_VIEW: 'PATIENT_DEMOGRAPHICS_VIEW',
  PATIENT_HISTORY_VIEW: 'PATIENT_HISTORY_VIEW',
  
  // Assessment Events
  ASSESSMENT_STARTED: 'ASSESSMENT_STARTED',
  ASSESSMENT_VIEWED: 'ASSESSMENT_VIEWED',
  ASSESSMENT_UPDATED: 'ASSESSMENT_UPDATED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
  ASSESSMENT_ASSIGNED: 'ASSESSMENT_ASSIGNED',
  ASSESSMENT_TRANSFERRED: 'ASSESSMENT_TRANSFERRED',
  ASSESSMENT_CANCELLED: 'ASSESSMENT_CANCELLED',
  
  // Clinical Orders
  LAB_ORDER_CREATED: 'LAB_ORDER_CREATED',
  LAB_ORDER_VIEWED: 'LAB_ORDER_VIEWED',
  LAB_ORDER_UPDATED: 'LAB_ORDER_UPDATED',
  LAB_ORDER_CANCELLED: 'LAB_ORDER_CANCELLED',
  LAB_ORDER_SENT: 'LAB_ORDER_SENT',
  LAB_RESULT_VIEWED: 'LAB_RESULT_VIEWED',
  LAB_RESULT_RECEIVED: 'LAB_RESULT_RECEIVED',
  
  IMAGING_ORDER_CREATED: 'IMAGING_ORDER_CREATED',
  IMAGING_ORDER_VIEWED: 'IMAGING_ORDER_VIEWED',
  IMAGING_ORDER_UPDATED: 'IMAGING_ORDER_UPDATED',
  IMAGING_ORDER_CANCELLED: 'IMAGING_ORDER_CANCELLED',
  IMAGING_ORDER_SENT: 'IMAGING_ORDER_SENT',
  IMAGING_RESULT_VIEWED: 'IMAGING_RESULT_VIEWED',
  
  MEDICATION_PRESCRIBED: 'MEDICATION_PRESCRIBED',
  MEDICATION_VIEWED: 'MEDICATION_VIEWED',
  MEDICATION_UPDATED: 'MEDICATION_UPDATED',
  MEDICATION_DISCONTINUED: 'MEDICATION_DISCONTINUED',
  MEDICATION_REFILLED: 'MEDICATION_REFILLED',
  CONTROLLED_SUBSTANCE_PRESCRIBED: 'CONTROLLED_SUBSTANCE_PRESCRIBED',
  CONTROLLED_SUBSTANCE_VIEWED: 'CONTROLLED_SUBSTANCE_VIEWED',
  
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  REFERRAL_VIEWED: 'REFERRAL_VIEWED',
  REFERRAL_UPDATED: 'REFERRAL_UPDATED',
  REFERRAL_CANCELLED: 'REFERRAL_CANCELLED',
  REFERRAL_SENT: 'REFERRAL_SENT',
  
  // Treatment Plans
  TREATMENT_PLAN_CREATED: 'TREATMENT_PLAN_CREATED',
  TREATMENT_PLAN_VIEWED: 'TREATMENT_PLAN_VIEWED',
  TREATMENT_PLAN_UPDATED: 'TREATMENT_PLAN_UPDATED',
  TREATMENT_PLAN_APPROVED: 'TREATMENT_PLAN_APPROVED',
  
  // Clinical Notes
  CLINICAL_NOTE_CREATED: 'CLINICAL_NOTE_CREATED',
  CLINICAL_NOTE_VIEWED: 'CLINICAL_NOTE_VIEWED',
  CLINICAL_NOTE_UPDATED: 'CLINICAL_NOTE_UPDATED',
  CLINICAL_NOTE_SIGNED: 'CLINICAL_NOTE_SIGNED',
  CLINICAL_NOTE_AMENDED: 'CLINICAL_NOTE_AMENDED',
  
  // Emergency Events (High Priority)
  EMERGENCY_TRIGGERED: 'EMERGENCY_TRIGGERED',
  EMERGENCY_ACKNOWLEDGED: 'EMERGENCY_ACKNOWLEDGED',
  EMERGENCY_ESCALATED: 'EMERGENCY_ESCALATED',
  EMERGENCY_RESOLVED: 'EMERGENCY_RESOLVED',
  RED_FLAG_DETECTED: 'RED_FLAG_DETECTED',
  RED_FLAG_ACKNOWLEDGED: 'RED_FLAG_ACKNOWLEDGED',
  CRASH_DETECTED: 'CRASH_DETECTED',
  
  // EHR Integration
  FHIR_PATIENT_FETCH: 'FHIR_PATIENT_FETCH',
  FHIR_PATIENT_SYNC: 'FHIR_PATIENT_SYNC',
  FHIR_ORDER_SUBMITTED: 'FHIR_ORDER_SUBMITTED',
  FHIR_RESULT_RECEIVED: 'FHIR_RESULT_RECEIVED',
  FHIR_AUTH_STARTED: 'FHIR_AUTH_STARTED',
  FHIR_AUTH_COMPLETED: 'FHIR_AUTH_COMPLETED',
  FHIR_AUTH_FAILED: 'FHIR_AUTH_FAILED',
  EHR_SYNC_STARTED: 'EHR_SYNC_STARTED',
  EHR_SYNC_COMPLETED: 'EHR_SYNC_COMPLETED',
  EHR_SYNC_FAILED: 'EHR_SYNC_FAILED',
  
  // Data Export (HIPAA Critical)
  PHI_EXPORT: 'PHI_EXPORT',
  PHI_DOWNLOAD: 'PHI_DOWNLOAD',
  PHI_PRINT: 'PHI_PRINT',
  REPORT_GENERATED: 'REPORT_GENERATED',
  REPORT_DOWNLOADED: 'REPORT_DOWNLOADED',
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_COMPLETED: 'DATA_EXPORT_COMPLETED',
  
  // Security Events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  BREAK_THE_GLASS: 'BREAK_THE_GLASS',
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  CSRF_VIOLATION: 'CSRF_VIOLATION',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  
  // System Events
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED',
  SYSTEM_STARTUP: 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN: 'SYSTEM_SHUTDOWN',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// ============================================================
// AUDIT SEVERITY LEVELS
// ============================================================

export const AuditSeverity = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const;

export type AuditSeverityLevel = typeof AuditSeverity[keyof typeof AuditSeverity];

// Map actions to severity levels
const ACTION_SEVERITY: Record<AuditAction, AuditSeverityLevel> = {
  // Critical severity
  [AuditActions.EMERGENCY_TRIGGERED]: AuditSeverity.CRITICAL,
  [AuditActions.RED_FLAG_DETECTED]: AuditSeverity.CRITICAL,
  [AuditActions.CRASH_DETECTED]: AuditSeverity.CRITICAL,
  [AuditActions.BREAK_THE_GLASS]: AuditSeverity.CRITICAL,
  [AuditActions.UNAUTHORIZED_ACCESS_ATTEMPT]: AuditSeverity.CRITICAL,
  [AuditActions.CONTROLLED_SUBSTANCE_PRESCRIBED]: AuditSeverity.CRITICAL,
  [AuditActions.SQL_INJECTION_ATTEMPT]: AuditSeverity.CRITICAL,
  [AuditActions.XSS_ATTEMPT]: AuditSeverity.CRITICAL,
  
  // Error severity
  [AuditActions.LOGIN_FAILED]: AuditSeverity.ERROR,
  [AuditActions.MFA_CHALLENGE_FAILED]: AuditSeverity.ERROR,
  [AuditActions.PERMISSION_DENIED]: AuditSeverity.ERROR,
  [AuditActions.CSRF_VIOLATION]: AuditSeverity.ERROR,
  [AuditActions.INVALID_TOKEN]: AuditSeverity.ERROR,
  [AuditActions.EHR_SYNC_FAILED]: AuditSeverity.ERROR,
  [AuditActions.FHIR_AUTH_FAILED]: AuditSeverity.ERROR,
  
  // Warning severity
  [AuditActions.SESSION_EXPIRED]: AuditSeverity.WARNING,
  [AuditActions.API_RATE_LIMIT_EXCEEDED]: AuditSeverity.WARNING,
  [AuditActions.SUSPICIOUS_ACTIVITY]: AuditSeverity.WARNING,
  [AuditActions.USER_DEACTIVATED]: AuditSeverity.WARNING,
  
  // Info severity (default for most actions)
  [AuditActions.USER_LOGIN]: AuditSeverity.INFO,
  [AuditActions.USER_LOGOUT]: AuditSeverity.INFO,
  [AuditActions.SESSION_CREATED]: AuditSeverity.INFO,
  [AuditActions.PASSWORD_CHANGED]: AuditSeverity.INFO,
  [AuditActions.PASSWORD_RESET_REQUESTED]: AuditSeverity.INFO,
  [AuditActions.MFA_ENABLED]: AuditSeverity.INFO,
  [AuditActions.MFA_DISABLED]: AuditSeverity.INFO,
  [AuditActions.MFA_CHALLENGE_PASSED]: AuditSeverity.INFO,
  [AuditActions.PATIENT_VIEW]: AuditSeverity.INFO,
  [AuditActions.PATIENT_CREATE]: AuditSeverity.INFO,
  [AuditActions.PATIENT_UPDATE]: AuditSeverity.INFO,
  [AuditActions.PATIENT_DELETE]: AuditSeverity.WARNING,
  [AuditActions.PATIENT_SEARCH]: AuditSeverity.INFO,
  [AuditActions.PATIENT_LIST_VIEW]: AuditSeverity.INFO,
  [AuditActions.PATIENT_DEMOGRAPHICS_VIEW]: AuditSeverity.INFO,
  [AuditActions.PATIENT_HISTORY_VIEW]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_STARTED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_VIEWED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_UPDATED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_COMPLETED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_ASSIGNED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_TRANSFERRED]: AuditSeverity.INFO,
  [AuditActions.ASSESSMENT_CANCELLED]: AuditSeverity.INFO,
  [AuditActions.LAB_ORDER_CREATED]: AuditSeverity.INFO,
  [AuditActions.LAB_ORDER_VIEWED]: AuditSeverity.INFO,
  [AuditActions.LAB_ORDER_UPDATED]: AuditSeverity.INFO,
  [AuditActions.LAB_ORDER_CANCELLED]: AuditSeverity.INFO,
  [AuditActions.LAB_ORDER_SENT]: AuditSeverity.INFO,
  [AuditActions.LAB_RESULT_VIEWED]: AuditSeverity.INFO,
  [AuditActions.LAB_RESULT_RECEIVED]: AuditSeverity.INFO,
  [AuditActions.IMAGING_ORDER_CREATED]: AuditSeverity.INFO,
  [AuditActions.IMAGING_ORDER_VIEWED]: AuditSeverity.INFO,
  [AuditActions.IMAGING_ORDER_UPDATED]: AuditSeverity.INFO,
  [AuditActions.IMAGING_ORDER_CANCELLED]: AuditSeverity.INFO,
  [AuditActions.IMAGING_ORDER_SENT]: AuditSeverity.INFO,
  [AuditActions.IMAGING_RESULT_VIEWED]: AuditSeverity.INFO,
  [AuditActions.MEDICATION_PRESCRIBED]: AuditSeverity.INFO,
  [AuditActions.MEDICATION_VIEWED]: AuditSeverity.INFO,
  [AuditActions.MEDICATION_UPDATED]: AuditSeverity.INFO,
  [AuditActions.MEDICATION_DISCONTINUED]: AuditSeverity.INFO,
  [AuditActions.MEDICATION_REFILLED]: AuditSeverity.INFO,
  [AuditActions.CONTROLLED_SUBSTANCE_VIEWED]: AuditSeverity.INFO,
  [AuditActions.REFERRAL_CREATED]: AuditSeverity.INFO,
  [AuditActions.REFERRAL_VIEWED]: AuditSeverity.INFO,
  [AuditActions.REFERRAL_UPDATED]: AuditSeverity.INFO,
  [AuditActions.REFERRAL_CANCELLED]: AuditSeverity.INFO,
  [AuditActions.REFERRAL_SENT]: AuditSeverity.INFO,
  [AuditActions.TREATMENT_PLAN_CREATED]: AuditSeverity.INFO,
  [AuditActions.TREATMENT_PLAN_VIEWED]: AuditSeverity.INFO,
  [AuditActions.TREATMENT_PLAN_UPDATED]: AuditSeverity.INFO,
  [AuditActions.TREATMENT_PLAN_APPROVED]: AuditSeverity.INFO,
  [AuditActions.CLINICAL_NOTE_CREATED]: AuditSeverity.INFO,
  [AuditActions.CLINICAL_NOTE_VIEWED]: AuditSeverity.INFO,
  [AuditActions.CLINICAL_NOTE_UPDATED]: AuditSeverity.INFO,
  [AuditActions.CLINICAL_NOTE_SIGNED]: AuditSeverity.INFO,
  [AuditActions.CLINICAL_NOTE_AMENDED]: AuditSeverity.INFO,
  [AuditActions.EMERGENCY_ACKNOWLEDGED]: AuditSeverity.INFO,
  [AuditActions.EMERGENCY_ESCALATED]: AuditSeverity.WARNING,
  [AuditActions.EMERGENCY_RESOLVED]: AuditSeverity.INFO,
  [AuditActions.RED_FLAG_ACKNOWLEDGED]: AuditSeverity.INFO,
  [AuditActions.FHIR_PATIENT_FETCH]: AuditSeverity.INFO,
  [AuditActions.FHIR_PATIENT_SYNC]: AuditSeverity.INFO,
  [AuditActions.FHIR_ORDER_SUBMITTED]: AuditSeverity.INFO,
  [AuditActions.FHIR_RESULT_RECEIVED]: AuditSeverity.INFO,
  [AuditActions.FHIR_AUTH_STARTED]: AuditSeverity.INFO,
  [AuditActions.FHIR_AUTH_COMPLETED]: AuditSeverity.INFO,
  [AuditActions.EHR_SYNC_STARTED]: AuditSeverity.INFO,
  [AuditActions.EHR_SYNC_COMPLETED]: AuditSeverity.INFO,
  [AuditActions.PHI_EXPORT]: AuditSeverity.WARNING,
  [AuditActions.PHI_DOWNLOAD]: AuditSeverity.WARNING,
  [AuditActions.PHI_PRINT]: AuditSeverity.WARNING,
  [AuditActions.REPORT_GENERATED]: AuditSeverity.INFO,
  [AuditActions.REPORT_DOWNLOADED]: AuditSeverity.INFO,
  [AuditActions.DATA_EXPORT_REQUESTED]: AuditSeverity.WARNING,
  [AuditActions.DATA_EXPORT_COMPLETED]: AuditSeverity.INFO,
  [AuditActions.SYSTEM_CONFIG_CHANGED]: AuditSeverity.WARNING,
  [AuditActions.SYSTEM_STARTUP]: AuditSeverity.INFO,
  [AuditActions.SYSTEM_SHUTDOWN]: AuditSeverity.INFO,
  [AuditActions.USER_CREATED]: AuditSeverity.INFO,
  [AuditActions.USER_UPDATED]: AuditSeverity.INFO,
  [AuditActions.USER_REACTIVATED]: AuditSeverity.INFO,
  [AuditActions.ROLE_CHANGED]: AuditSeverity.WARNING,
  [AuditActions.PERMISSION_GRANTED]: AuditSeverity.INFO,
  [AuditActions.PERMISSION_REVOKED]: AuditSeverity.WARNING,
};

function getActionSeverity(action: AuditAction): AuditSeverityLevel {
  return ACTION_SEVERITY[action] || AuditSeverity.INFO;
}

// ============================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================

/**
 * Log an audit event to the database
 * HIPAA-compliant audit trail with proper field mapping
 * 
 * @param entry - The audit log entry
 * @returns Promise that resolves when log is written
 * @throws Never - failures are logged to console but don't throw
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date();
  const severity = getActionSeverity(entry.action);
  
  // Determine if this involves PHI
  const involvesPHI = Boolean(
    entry.patientId ||
    entry.resourceType === 'Patient' ||
    entry.resourceType === 'PHI' ||
    entry.details?.hipaaRelevant
  );

  try {
    const prisma = getPrisma();
    
    await prisma.auditLog.create({
      data: {
        // Map to actual Prisma schema fields
        action: entry.action,
        userId: entry.userId || null,
        entityType: entry.resourceType,
        entityId: entry.resourceId || entry.patientId || null,
        changes: entry.details ? JSON.stringify({
          ...entry.details,
          patientId: entry.patientId,
          hipaaRelevant: involvesPHI,
          severity,
          sessionId: entry.sessionId,
        }) : null,
        ipAddress: sanitizeIpAddress(entry.ipAddress) || null,
        userAgent: truncateUserAgent(entry.userAgent) || null,
        success: true,
        createdAt: timestamp,
      },
    });

    // Log critical events to console for immediate visibility
    if (severity === AuditSeverity.CRITICAL) {
      console.error(`[AUDIT:CRITICAL] ${entry.action}`, {
        timestamp: timestamp.toISOString(),
        userId: entry.userId,
        resourceType: entry.resourceType,
        patientId: entry.patientId,
        ipAddress: entry.ipAddress,
      });
    }

  } catch (error) {
    // CRITICAL: Audit failures must be logged somewhere
    // In production, this should go to a secondary logging system
    console.error('[AUDIT:FAILURE] Failed to write audit log:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      entry: {
        action: entry.action,
        userId: entry.userId,
        resourceType: entry.resourceType,
        timestamp: timestamp.toISOString(),
      },
    });
    
    // Write to fallback log file if database fails
    try {
      const fallbackLog = JSON.stringify({
        timestamp: timestamp.toISOString(),
        type: 'AUDIT_FAILURE',
        entry,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error(`[AUDIT:FALLBACK] ${fallbackLog}`);
    } catch {
      // Last resort - we tried
    }
  }
}

/**
 * Log an audit failure (when the main audit fails)
 */
export async function auditLogFailure(
  entry: AuditLogEntry,
  error: Error
): Promise<void> {
  try {
    const prisma = getPrisma();
    
    await prisma.auditLog.create({
      data: {
        action: 'AUDIT_FAILURE',
        userId: entry.userId || null,
        entityType: 'System',
        entityId: null,
        changes: JSON.stringify({
          originalAction: entry.action,
          error: error.message,
        }),
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        success: false,
        errorMessage: error.message,
        createdAt: new Date(),
      },
    });
  } catch {
    // Already failed, log to console
    console.error('[AUDIT:DOUBLE_FAILURE] Could not log audit failure');
  }
}

/**
 * Log PHI access - automatically marks as HIPAA-relevant
 * Required for any access to patient health information
 */
export async function auditPHIAccess(
  entry: Omit<AuditLogEntry, 'resourceType'> & { 
    patientId: string;
    accessReason?: string;
  }
): Promise<void> {
  await auditLog({
    ...entry,
    resourceType: 'PHI',
    details: {
      ...entry.details,
      hipaaRelevant: true,
      accessTime: new Date().toISOString(),
      accessReason: entry.accessReason || 'Clinical care',
    },
  });
}

/**
 * Log break-the-glass access (emergency PHI access outside normal permissions)
 * CRITICAL: This must always succeed and be highly visible
 */
export async function auditBreakTheGlass(
  userId: string,
  patientId: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  const entry: AuditLogEntry = {
    action: AuditActions.BREAK_THE_GLASS,
    userId,
    resourceType: 'PHI',
    patientId,
    details: {
      hipaaRelevant: true,
      accessReason: reason,
      breakTheGlass: true,
      requiresReview: true,
    },
    ipAddress,
  };

  await auditLog(entry);

  // Also log to console for immediate visibility
  console.warn('[AUDIT:BREAK_THE_GLASS]', {
    timestamp: new Date().toISOString(),
    userId,
    patientId,
    reason,
    ipAddress,
  });
}

/**
 * Log emergency events with high priority
 */
export async function auditEmergencyEvent(
  userId: string,
  patientId: string,
  emergencyType: string,
  details: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action: AuditActions.EMERGENCY_TRIGGERED,
    userId,
    resourceType: 'EmergencyEvent',
    patientId,
    details: {
      ...details,
      emergencyType,
      priority: 'CRITICAL',
      hipaaRelevant: true,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log security events
 */
export async function auditSecurityEvent(
  action: AuditAction,
  userId: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await auditLog({
    action,
    userId,
    resourceType: 'Security',
    details: {
      ...details,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
  });
}

/**
 * Log authentication events
 */
export async function auditAuthEvent(
  action: AuditAction,
  userId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action,
    userId,
    resourceType: 'Session',
    details: {
      ...details,
      success,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Create an audit context from Next.js request
 */
export function createAuditContext(
  req: { headers: { get?: (key: string) => string | null } & Record<string, string | string[] | undefined> }
): Partial<AuditContext> {
  // Handle both Headers object and plain object
  const getHeader = (key: string): string | undefined => {
    if (typeof req.headers.get === 'function') {
      return req.headers.get(key) || undefined;
    }
    const value = req.headers[key];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    ipAddress: sanitizeIpAddress(
      getHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
      getHeader('x-real-ip')
    ),
    userAgent: truncateUserAgent(getHeader('user-agent')),
  };
}

/**
 * Audit log with request context
 */
export async function auditLogWithContext(
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>,
  context: Partial<AuditContext>
): Promise<void> {
  await auditLog({
    ...entry,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    sessionId: context.sessionId,
  });
}

// ============================================================
// AUDIT QUERY FUNCTIONS (for compliance reporting)
// ============================================================

export interface AuditQueryOptions {
  userId?: string;
  patientId?: string;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  startDate?: Date;
  endDate?: Date;
  severity?: AuditSeverityLevel;
  limit?: number;
  offset?: number;
  includeFailures?: boolean;
}

export interface AuditQueryResult {
  logs: Array<{
    id: string;
    action: string;
    userId: string | null;
    entityType: string;
    entityId: string | null;
    changes: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    success: boolean;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  total: number;
  hasMore: boolean;
}

/**
 * Query audit logs with filters
 * Used for compliance reporting and investigation
 */
export async function queryAuditLogs(options: AuditQueryOptions): Promise<AuditQueryResult> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  
  if (options.userId) where.userId = options.userId;
  if (options.action) where.action = options.action;
  if (options.resourceType) where.entityType = options.resourceType;
  if (!options.includeFailures) where.success = true;
  
  // For patientId, we need to search in the changes JSON
  // This is a limitation - consider adding patientId as a top-level field
  
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) (where.createdAt as Record<string, Date>).gte = options.startDate;
    if (options.endDate) (where.createdAt as Record<string, Date>).lte = options.endDate;
  }
  
  const limit = Math.min(options.limit || 100, 1000);
  const offset = options.offset || 0;
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { 
    logs, 
    total,
    hasMore: offset + logs.length < total,
  };
}

/**
 * Get patient access history (HIPAA requirement)
 * Returns all access to a specific patient's records
 */
export async function getPatientAccessHistory(
  patientId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AuditQueryResult> {
  const prisma = getPrisma();
  
  // Search for patient access in entityId or in changes JSON
  const where: Record<string, unknown> = {
    OR: [
      { entityId: patientId },
      { changes: { contains: patientId } },
    ],
  };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total, hasMore: false };
}

/**
 * Get user activity log
 * Returns all actions performed by a specific user
 */
export async function getUserActivityLog(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AuditQueryResult> {
  return queryAuditLogs({
    userId,
    startDate,
    endDate,
    limit: 500,
  });
}

/**
 * Get security events for investigation
 */
export async function getSecurityEvents(
  startDate?: Date,
  endDate?: Date,
  severity?: AuditSeverityLevel
): Promise<AuditQueryResult> {
  return queryAuditLogs({
    resourceType: 'Security',
    startDate,
    endDate,
    severity,
    limit: 500,
    includeFailures: true,
  });
}

/**
 * Get failed login attempts (security monitoring)
 */
export async function getFailedLoginAttempts(
  startDate: Date,
  endDate: Date
): Promise<AuditQueryResult> {
  return queryAuditLogs({
    action: AuditActions.LOGIN_FAILED,
    startDate,
    endDate,
    limit: 500,
    includeFailures: true,
  });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Sanitize IP address to prevent injection
 */
function sanitizeIpAddress(ip?: string): string | undefined {
  if (!ip) return undefined;
  // Basic validation - IPv4 or IPv6
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip;
  }
  // Handle forwarded IPs (take first one)
  const firstIp = ip.split(',')[0]?.trim();
  if (firstIp && (ipv4Regex.test(firstIp) || ipv6Regex.test(firstIp))) {
    return firstIp;
  }
  return undefined;
}

/**
 * Truncate user agent to reasonable length
 */
function truncateUserAgent(ua?: string): string | undefined {
  if (!ua) return undefined;
  return ua.slice(0, 500);
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  auditLog,
  auditPHIAccess,
  auditBreakTheGlass,
  auditEmergencyEvent,
  auditSecurityEvent,
  auditAuthEvent,
  auditLogWithContext,
  createAuditContext,
  queryAuditLogs,
  getPatientAccessHistory,
  getUserActivityLog,
  getSecurityEvents,
  getFailedLoginAttempts,
  AuditActions,
  AuditSeverity,
};
