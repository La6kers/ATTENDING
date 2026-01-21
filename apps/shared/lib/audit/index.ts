// ============================================================
// Audit Logging Service - HIPAA Compliant Audit Trail
// apps/shared/lib/audit/index.ts
//
// Comprehensive audit logging for all PHI access and clinical actions
// Supports: User actions, PHI access, system events, security events
// ============================================================

import { prisma } from '../prisma';

// ============================================================
// TYPES
// ============================================================

export interface AuditLogEntry {
  action: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  patientId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditContext {
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ============================================================
// AUDIT ACTIONS
// ============================================================

export const AuditActions = {
  // Authentication Events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  
  // Patient Data Access (HIPAA Critical)
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_SEARCH: 'PATIENT_SEARCH',
  PATIENT_LIST_VIEW: 'PATIENT_LIST_VIEW',
  
  // Assessment Events
  ASSESSMENT_STARTED: 'ASSESSMENT_STARTED',
  ASSESSMENT_VIEWED: 'ASSESSMENT_VIEWED',
  ASSESSMENT_UPDATED: 'ASSESSMENT_UPDATED',
  ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
  ASSESSMENT_ASSIGNED: 'ASSESSMENT_ASSIGNED',
  ASSESSMENT_TRANSFERRED: 'ASSESSMENT_TRANSFERRED',
  
  // Clinical Orders
  LAB_ORDER_CREATED: 'LAB_ORDER_CREATED',
  LAB_ORDER_VIEWED: 'LAB_ORDER_VIEWED',
  LAB_ORDER_UPDATED: 'LAB_ORDER_UPDATED',
  LAB_ORDER_CANCELLED: 'LAB_ORDER_CANCELLED',
  LAB_RESULT_VIEWED: 'LAB_RESULT_VIEWED',
  
  IMAGING_ORDER_CREATED: 'IMAGING_ORDER_CREATED',
  IMAGING_ORDER_VIEWED: 'IMAGING_ORDER_VIEWED',
  IMAGING_ORDER_UPDATED: 'IMAGING_ORDER_UPDATED',
  IMAGING_ORDER_CANCELLED: 'IMAGING_ORDER_CANCELLED',
  IMAGING_RESULT_VIEWED: 'IMAGING_RESULT_VIEWED',
  
  MEDICATION_PRESCRIBED: 'MEDICATION_PRESCRIBED',
  MEDICATION_VIEWED: 'MEDICATION_VIEWED',
  MEDICATION_UPDATED: 'MEDICATION_UPDATED',
  MEDICATION_DISCONTINUED: 'MEDICATION_DISCONTINUED',
  CONTROLLED_SUBSTANCE_PRESCRIBED: 'CONTROLLED_SUBSTANCE_PRESCRIBED',
  
  REFERRAL_CREATED: 'REFERRAL_CREATED',
  REFERRAL_VIEWED: 'REFERRAL_VIEWED',
  REFERRAL_UPDATED: 'REFERRAL_UPDATED',
  REFERRAL_CANCELLED: 'REFERRAL_CANCELLED',
  
  // Treatment Plans
  TREATMENT_PLAN_CREATED: 'TREATMENT_PLAN_CREATED',
  TREATMENT_PLAN_VIEWED: 'TREATMENT_PLAN_VIEWED',
  TREATMENT_PLAN_UPDATED: 'TREATMENT_PLAN_UPDATED',
  
  // Emergency Events
  EMERGENCY_TRIGGERED: 'EMERGENCY_TRIGGERED',
  EMERGENCY_ACKNOWLEDGED: 'EMERGENCY_ACKNOWLEDGED',
  EMERGENCY_ESCALATED: 'EMERGENCY_ESCALATED',
  RED_FLAG_DETECTED: 'RED_FLAG_DETECTED',
  
  // EHR Integration
  FHIR_PATIENT_FETCH: 'FHIR_PATIENT_FETCH',
  FHIR_ORDER_SUBMITTED: 'FHIR_ORDER_SUBMITTED',
  FHIR_RESULT_RECEIVED: 'FHIR_RESULT_RECEIVED',
  EHR_SYNC_STARTED: 'EHR_SYNC_STARTED',
  EHR_SYNC_COMPLETED: 'EHR_SYNC_COMPLETED',
  EHR_SYNC_FAILED: 'EHR_SYNC_FAILED',
  
  // Data Export (HIPAA Critical)
  PHI_EXPORT: 'PHI_EXPORT',
  REPORT_GENERATED: 'REPORT_GENERATED',
  DATA_DOWNLOADED: 'DATA_DOWNLOADED',
  
  // Security Events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  
  // System Events
  SYSTEM_CONFIG_CHANGED: 'SYSTEM_CONFIG_CHANGED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// ============================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================

/**
 * Log an audit event to the database
 * Non-blocking - failures are logged but don't affect the main operation
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId || null,
        patientId: entry.patientId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Log to console but don't fail the main operation
    console.error('[AUDIT] Failed to write audit log:', error);
    console.error('[AUDIT] Entry:', JSON.stringify(entry));
  }
}

/**
 * Log PHI access - automatically marks as HIPAA-relevant
 */
export async function auditPHIAccess(
  entry: Omit<AuditLogEntry, 'resourceType'> & { patientId: string }
): Promise<void> {
  await auditLog({
    ...entry,
    resourceType: 'PHI',
    details: {
      ...entry.details,
      hipaaRelevant: true,
      accessTime: new Date().toISOString(),
    },
  });
}

/**
 * Log emergency events with high priority
 */
export async function auditEmergencyEvent(
  userId: string,
  patientId: string,
  emergencyType: string,
  details: Record<string, any>
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
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log security events
 */
export async function auditSecurityEvent(
  action: string,
  userId: string,
  details: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await auditLog({
    action,
    userId,
    resourceType: 'Security',
    details: {
      ...details,
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
    },
    ipAddress,
  });
}

/**
 * Create an audit context from Next.js request headers
 */
export function createAuditContext(headers: Headers): Partial<AuditContext> {
  return {
    ipAddress: headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || headers.get('x-real-ip') 
      || undefined,
    userAgent: headers.get('user-agent') || undefined,
    userId: headers.get('x-user-id') || undefined,
    userRole: headers.get('x-user-role') || undefined,
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
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(options: AuditQueryOptions) {
  const where: any = {};
  
  if (options.userId) where.userId = options.userId;
  if (options.patientId) where.patientId = options.patientId;
  if (options.action) where.action = options.action;
  if (options.resourceType) where.resourceType = options.resourceType;
  
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) where.timestamp.gte = options.startDate;
    if (options.endDate) where.timestamp.lte = options.endDate;
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: options.limit || 100,
      skip: options.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}

/**
 * Get patient access history (HIPAA requirement)
 */
export async function getPatientAccessHistory(
  patientId: string,
  startDate?: Date,
  endDate?: Date
) {
  return queryAuditLogs({
    patientId,
    startDate,
    endDate,
    limit: 1000,
  });
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  return queryAuditLogs({
    userId,
    startDate,
    endDate,
    limit: 500,
  });
}

// Export default
export default {
  auditLog,
  auditPHIAccess,
  auditEmergencyEvent,
  auditSecurityEvent,
  auditLogWithContext,
  createAuditContext,
  queryAuditLogs,
  getPatientAccessHistory,
  getUserActivityLog,
  AuditActions,
};
