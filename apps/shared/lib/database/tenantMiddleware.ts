// ============================================================
// ATTENDING AI - Multi-Tenant Prisma Middleware
// apps/shared/lib/database/tenantMiddleware.ts
//
// Ensures all Prisma queries include organizationId context
// for application-level tenant isolation (SQL Server compatible).
//
// Usage:
//   import { withTenantContext } from './tenantMiddleware';
//   const prisma = withTenantContext(basePrisma, organizationId);
// ============================================================

import { PrismaClient } from '@prisma/client';

// All tables that require tenant isolation via organizationId
const TENANT_TABLES = new Set([
  'Patient',
  'Encounter',
  'LabOrder',
  'LabResult',
  'ImagingOrder',
  'ImagingResult',
  'MedicationOrder',
  'Referral',
  'PatientAssessment',
  'AuditLog',
  'ClinicalNote',
  'TreatmentPlan',
  'Allergy',
  'Condition',
  'Medication',
  'VitalSign',
  'EmergencyEvent',
  'ClinicalImage',
  'PatientPopulationFlag',
  'IntegrationConnection',
  'ApiKey',
  'WebhookSubscription',
  'EmergencyAccessProfile',
  'ClinicEnvironment',
  'UsageRecord',
]);

/**
 * Creates a Prisma client extension that automatically injects
 * organizationId into where clauses (reads) and data (writes)
 * for all tenant-scoped models.
 */
export function withTenantContext(
  prisma: PrismaClient,
  organizationId: string
): PrismaClient {
  return prisma.$extends({
    query: {
      $allOperations: async ({ args, query, operation, model }) => {
        if (!model || !TENANT_TABLES.has(model)) {
          return query(args);
        }

        const a = args as any;

        switch (operation) {
          case 'findMany':
          case 'findFirst':
          case 'findFirstOrThrow':
          case 'count':
          case 'aggregate':
          case 'groupBy':
            a.where = { ...a.where, organizationId };
            break;

          case 'findUnique':
          case 'findUniqueOrThrow':
            // findUnique uses unique keys; wrap with AND to add tenant scope
            a.where = { ...a.where, AND: [{ organizationId }] };
            break;

          case 'create':
            if (a.data && !a.data.organizationId) {
              a.data.organizationId = organizationId;
            }
            break;

          case 'createMany':
            if (Array.isArray(a.data)) {
              a.data = a.data.map((d: any) => ({
                ...d,
                organizationId: d.organizationId || organizationId,
              }));
            } else if (a.data && !a.data.organizationId) {
              a.data.organizationId = organizationId;
            }
            break;

          case 'update':
          case 'delete':
            a.where = { ...a.where, AND: [{ organizationId }] };
            break;

          case 'updateMany':
          case 'deleteMany':
            a.where = { ...a.where, organizationId };
            break;

          case 'upsert':
            a.where = { ...a.where, AND: [{ organizationId }] };
            if (a.create && !a.create.organizationId) {
              a.create.organizationId = organizationId;
            }
            break;
        }

        return query(a);
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * Get a tenant-scoped Prisma client from the request context.
 * Used in API route handlers.
 */
export function getTenantPrisma(
  prisma: PrismaClient,
  req: { session?: { user?: { organizationId?: string } } }
): PrismaClient {
  const orgId = req.session?.user?.organizationId;

  if (!orgId) {
    throw new Error('[TENANT] No organizationId in session — refusing to return unscoped client');
  }

  return withTenantContext(prisma, orgId);
}

/**
 * Middleware for Next.js API routes that injects tenant context.
 */
export function withTenantIsolation(prisma: PrismaClient) {
  return async function tenantMiddleware(
    req: any,
    res: any,
    next: () => Promise<void>
  ) {
    const orgId = req.session?.user?.organizationId;

    if (!orgId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'TENANT_CONTEXT_MISSING',
      });
    }

    // Attach tenant-scoped prisma to request
    req.tenantPrisma = withTenantContext(prisma, orgId);
    req.organizationId = orgId;

    await next();
  };
}

export default withTenantContext;
