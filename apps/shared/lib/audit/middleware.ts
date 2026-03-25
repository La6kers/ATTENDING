// ============================================================
// ATTENDING AI - Audit Middleware
// apps/shared/lib/audit/middleware.ts
//
// Composable middleware that automatically logs API access.
// Captures request method, path, status code, duration, and user.
//
// Usage:
//   import { withAudit } from '@attending/shared/lib/audit/middleware';
//
//   // Auto-detect action from method + path
//   export default withAudit(handler);
//
//   // Explicit action
//   export default withAudit(handler, {
//     action: AuditActions.LAB_ORDER_CREATED,
//     resourceType: 'LabOrder',
//   });
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  auditLog,
  createAuditContext,
  AuditActions,
  type AuditAction,
  type AuditResourceType,
} from './index';

// ============================================================
// TYPES
// ============================================================

export interface AuditMiddlewareOptions {
  /** Explicit audit action. If omitted, auto-detects from HTTP method. */
  action?: AuditAction;
  /** Resource type being accessed */
  resourceType?: AuditResourceType;
  /** Extract resource ID from request (e.g., from query params) */
  getResourceId?: (req: NextApiRequest) => string | undefined;
  /** Extract patient ID from request */
  getPatientId?: (req: NextApiRequest) => string | undefined;
  /** Skip audit for certain requests (e.g., OPTIONS) */
  skip?: (req: NextApiRequest) => boolean;
}

// ============================================================
// AUTO-DETECTION MAPS
// ============================================================

/** Map HTTP method to a generic audit action */
const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  GET: AuditActions.PATIENT_VIEW,
  POST: AuditActions.PATIENT_CREATE,
  PUT: AuditActions.PATIENT_UPDATE,
  PATCH: AuditActions.PATIENT_UPDATE,
  DELETE: AuditActions.PATIENT_DELETE,
};

/** Map path patterns to resource types */
const PATH_RESOURCE_MAP: [RegExp, AuditResourceType][] = [
  [/\/api\/patients/, 'Patient'],
  [/\/api\/encounters/, 'Encounter'],
  [/\/api\/labs/, 'LabOrder'],
  [/\/api\/imaging/, 'ImagingOrder'],
  [/\/api\/prescriptions/, 'MedicationOrder'],
  [/\/api\/medications/, 'MedicationOrder'],
  [/\/api\/referrals/, 'Referral'],
  [/\/api\/treatment-plans/, 'TreatmentPlan'],
  [/\/api\/assessments/, 'Assessment'],
  [/\/api\/clinical/, 'PHI'],
  [/\/api\/ai\//, 'PHI'],
  [/\/api\/alerts/, 'EmergencyEvent'],
  [/\/api\/emergency/, 'EmergencyEvent'],
  [/\/api\/fhir/, 'FHIR'],
  [/\/api\/auth/, 'Session'],
  [/\/api\/admin/, 'System'],
];

function detectResourceType(pathname: string): AuditResourceType {
  for (const [pattern, type] of PATH_RESOURCE_MAP) {
    if (pattern.test(pathname)) return type;
  }
  return 'API';
}

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Wrap an API handler with automatic audit logging.
 *
 * Logs: action, user, resource, IP, duration, status code.
 * Non-blocking: audit failures don't affect the response.
 */
export function withAudit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: AuditMiddlewareOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip conditions
    if (req.method === 'OPTIONS') return handler(req, res);
    if (options.skip?.(req)) return handler(req, res);

    const startTime = performance.now();
    const pathname = req.url?.split('?')[0] || '';

    // Capture the original end/json to intercept status code
    const originalJson = res.json.bind(res);
    let responseStatus = 200;
    let responseBody: any = null;

    res.json = (body: any) => {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalJson(body);
    };

    try {
      await handler(req, res);
    } finally {
      // Log audit asynchronously — don't block the response
      const durationMs = Math.round(performance.now() - startTime);
      responseStatus = res.statusCode || responseStatus;

      // Fire-and-forget audit log
      setImmediate(async () => {
        try {
          const context = createAuditContext(req);
          const action = options.action || METHOD_ACTION_MAP[req.method || 'GET'] || AuditActions.PATIENT_VIEW;
          const resourceType = options.resourceType || detectResourceType(pathname);
          const resourceId = options.getResourceId?.(req) || (req.query?.id as string);
          const patientId = options.getPatientId?.(req) || (req.query?.patientId as string);

          // Extract user ID from session headers set by middleware
          const userId = (req.headers['x-user-id'] as string) ||
                         (req.headers['x-session-ref'] as string) ||
                         'anonymous';

          await auditLog({
            action,
            userId,
            resourceType,
            resourceId,
            patientId,
            details: {
              method: req.method,
              path: pathname,
              statusCode: responseStatus,
              durationMs,
              success: responseStatus < 400,
              // Don't log response body (may contain PHI)
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            sessionId: req.cookies?.['session-id'],
          });
        } catch (err) {
          // Audit logging should never crash the app
          console.error('[AUDIT:MIDDLEWARE] Failed to log:', err);
        }
      });
    }
  };
}

export default withAudit;
