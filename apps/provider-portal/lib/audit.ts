// ============================================================
// HIPAA-Compliant Audit Logging
// apps/provider-portal/lib/audit.ts
//
// Centralized audit logging for all PHI access and clinical operations.
// Writes to database for compliance retention requirements.
// ============================================================

import { prisma } from './prisma';

// ============================================================
// Types
// ============================================================

export interface AuditLogEntry {
  action: AuditAction;
  userId: string;
  resourceType: ResourceType;
  resourceId?: string;
  patientId?: string;
  encounterId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export type AuditAction =
  // Authentication
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'LOGIN_FAILED'
  | 'SESSION_REFRESH'
  | 'PASSWORD_CHANGE'
  // Patient Data Access
  | 'PATIENT_VIEW'
  | 'PATIENT_CREATE'
  | 'PATIENT_UPDATE'
  | 'PATIENT_SEARCH'
  | 'PHI_ACCESS'
  | 'PHI_EXPORT'
  // Assessments
  | 'ASSESSMENT_VIEWED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_UPDATED'
  | 'ASSESSMENT_COMPLETED'
  | 'ASSESSMENT_REVIEWED'
  // Orders
  | 'LAB_ORDER_CREATED'
  | 'LAB_ORDER_MODIFIED'
  | 'LAB_ORDER_CANCELLED'
  | 'LAB_RESULT_VIEWED'
  | 'IMAGING_ORDER_CREATED'
  | 'IMAGING_ORDER_MODIFIED'
  | 'IMAGING_ORDER_CANCELLED'
  | 'IMAGING_RESULT_VIEWED'
  | 'MEDICATION_PRESCRIBED'
  | 'MEDICATION_MODIFIED'
  | 'MEDICATION_DISCONTINUED'
  | 'CONTROLLED_SUBSTANCE_PRESCRIBED'
  | 'REFERRAL_CREATED'
  | 'REFERRAL_UPDATED'
  // Clinical Decisions
  | 'DIFFERENTIAL_GENERATED'
  | 'AI_RECOMMENDATION_VIEWED'
  | 'AI_RECOMMENDATION_ACCEPTED'
  | 'AI_RECOMMENDATION_REJECTED'
  | 'DRUG_INTERACTION_ALERT'
  | 'ALLERGY_ALERT'
  // Emergency
  | 'EMERGENCY_TRIGGERED'
  | 'RED_FLAG_DETECTED'
  | 'STAT_ORDER_CREATED'
  | 'EMERGENCY_OVERRIDE'
  // EHR Integration
  | 'FHIR_PATIENT_FETCH'
  | 'FHIR_ORDER_SUBMITTED'
  | 'FHIR_DATA_SYNC'
  | 'EHR_CONNECTION_FAILED'
  // Security
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'PERMISSION_DENIED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_EXCEEDED'
  // Admin
  | 'USER_CREATED'
  | 'USER_MODIFIED'
  | 'USER_DEACTIVATED'
  | 'ROLE_CHANGED'
  | 'SETTINGS_MODIFIED';

export type ResourceType =
  | 'Session'
  | 'User'
  | 'Patient'
  | 'Encounter'
  | 'Assessment'
  | 'LabOrder'
  | 'LabResult'
  | 'ImagingOrder'
  | 'ImagingResult'
  | 'MedicationOrder'
  | 'Referral'
  | 'TreatmentPlan'
  | 'Notification'
  | 'API'
  | 'FHIR'
  | 'System';

// ============================================================
// Audit Logger
// ============================================================

/**
 * Create an audit log entry in the database.
 * Non-blocking - failures are logged but don't affect the main operation.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        patientId: entry.patientId,
        encounterId: entry.encounterId,
        details: entry.details as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success ?? true,
        errorMessage: entry.errorMessage,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the application
    // But do log to console for monitoring
    console.error('[AUDIT ERROR] Failed to write audit log:', {
      entry,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create audit log entry with request context
 */
export async function auditLogWithRequest(
  req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } },
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const ipAddress = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown';

  await auditLog({
    ...entry,
    ipAddress,
    userAgent,
  });
}

/**
 * Extract client IP from request
 */
function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket?.remoteAddress || 'unknown';
}

// ============================================================
// Convenience Functions for Common Actions
// ============================================================

export async function logPatientAccess(
  userId: string,
  patientId: string,
  action: 'view' | 'update' | 'create' = 'view',
  details?: Record<string, any>
): Promise<void> {
  const actionMap = {
    view: 'PATIENT_VIEW' as const,
    update: 'PATIENT_UPDATE' as const,
    create: 'PATIENT_CREATE' as const,
  };

  await auditLog({
    action: actionMap[action],
    userId,
    resourceType: 'Patient',
    resourceId: patientId,
    patientId,
    details,
  });
}

export async function logOrderCreation(
  userId: string,
  orderType: 'lab' | 'imaging' | 'medication' | 'referral',
  orderId: string,
  patientId: string,
  details?: Record<string, any>
): Promise<void> {
  const actionMap = {
    lab: 'LAB_ORDER_CREATED' as const,
    imaging: 'IMAGING_ORDER_CREATED' as const,
    medication: 'MEDICATION_PRESCRIBED' as const,
    referral: 'REFERRAL_CREATED' as const,
  };

  const resourceMap = {
    lab: 'LabOrder' as const,
    imaging: 'ImagingOrder' as const,
    medication: 'MedicationOrder' as const,
    referral: 'Referral' as const,
  };

  await auditLog({
    action: actionMap[orderType],
    userId,
    resourceType: resourceMap[orderType],
    resourceId: orderId,
    patientId,
    details,
  });
}

export async function logEmergency(
  userId: string,
  patientId: string,
  emergencyType: 'red_flag' | 'stat_order' | 'emergency_override',
  details: Record<string, any>
): Promise<void> {
  const actionMap = {
    red_flag: 'RED_FLAG_DETECTED' as const,
    stat_order: 'STAT_ORDER_CREATED' as const,
    emergency_override: 'EMERGENCY_OVERRIDE' as const,
  };

  await auditLog({
    action: actionMap[emergencyType],
    userId,
    resourceType: 'Patient',
    patientId,
    details: {
      ...details,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logSecurityEvent(
  userId: string,
  event: 'unauthorized' | 'permission_denied' | 'suspicious' | 'rate_limit',
  details: Record<string, any>
): Promise<void> {
  const actionMap = {
    unauthorized: 'UNAUTHORIZED_ACCESS_ATTEMPT' as const,
    permission_denied: 'PERMISSION_DENIED' as const,
    suspicious: 'SUSPICIOUS_ACTIVITY' as const,
    rate_limit: 'RATE_LIMIT_EXCEEDED' as const,
  };

  await auditLog({
    action: actionMap[event],
    userId,
    resourceType: 'System',
    details: {
      ...details,
      severity: event === 'suspicious' ? 'HIGH' : 'MEDIUM',
      timestamp: new Date().toISOString(),
    },
    success: false,
  });
}

// ============================================================
// Export Constants for Convenience
// ============================================================

export const AuditActions = {
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  // Patient
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PHI_ACCESS: 'PHI_ACCESS',
  PHI_EXPORT: 'PHI_EXPORT',
  // Assessment
  ASSESSMENT_VIEWED: 'ASSESSMENT_VIEWED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
  // Orders
  LAB_ORDER_CREATED: 'LAB_ORDER_CREATED',
  IMAGING_ORDER_CREATED: 'IMAGING_ORDER_CREATED',
  MEDICATION_PRESCRIBED: 'MEDICATION_PRESCRIBED',
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  // Emergency
  RED_FLAG_DETECTED: 'RED_FLAG_DETECTED',
  EMERGENCY_TRIGGERED: 'EMERGENCY_TRIGGERED',
  // Security
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
} as const;
