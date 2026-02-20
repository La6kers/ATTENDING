// ============================================================
// ATTENDING AI - Multi-Tenant Prisma Middleware
// apps/shared/lib/database/tenantMiddleware.ts
//
// Ensures all Prisma queries include organization_id context
// for row-level security enforcement in PostgreSQL.
//
// Usage:
//   import { withTenantContext } from './tenantMiddleware';
//   const prisma = withTenantContext(basePrisma, organizationId);
// ============================================================

import { PrismaClient, Prisma } from '@prisma/client';

// Tables that require tenant isolation
const TENANT_TABLES = [
  'Patient',
  'Encounter',
  'LabOrder',
  'ImagingOrder',
  'MedicationOrder',
  'Referral',
  'PatientAssessment',
  'AuditLog',
] as const;

type TenantTable = typeof TENANT_TABLES[number];

/**
 * Creates a Prisma client extension that automatically sets
 * the PostgreSQL session variable for RLS enforcement.
 */
export function withTenantContext(
  prisma: PrismaClient,
  organizationId: string
): PrismaClient {
  return prisma.$extends({
    query: {
      $allOperations: async ({ args, query, operation, model }) => {
        // Set the org context for RLS before every query
        await prisma.$executeRawUnsafe(
          `SET app.current_org_id = '${organizationId.replace(/'/g, "''")}'`
        );
        
        // For write operations on tenant tables, auto-inject organizationId
        if (model && TENANT_TABLES.includes(model as TenantTable)) {
          if (operation === 'create' || operation === 'createMany') {
            const data = (args as any).data;
            if (Array.isArray(data)) {
              (args as any).data = data.map((d: any) => ({
                ...d,
                organizationId: d.organizationId || organizationId,
              }));
            } else if (data && !data.organizationId) {
              data.organizationId = organizationId;
            }
          }
        }
        
        try {
          return await query(args);
        } finally {
          // Reset org context after query
          await prisma.$executeRawUnsafe(`RESET app.current_org_id`);
        }
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
    console.warn('[TENANT] No organizationId in session, queries will be unscoped');
    return prisma;
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
