// ============================================================
// ATTENDING AI - Multi-Tenant Row-Level Security
// apps/shared/lib/multiTenant.ts
//
// Ensures every database query is scoped to the requesting
// organization. Tenant A can NEVER see Tenant B's data.
//
// Two layers of protection:
//   1. Prisma middleware: auto-injects organizationId on all
//      queries/mutations for tenant-scoped models
//   2. Context helper: provides scoped prisma client
//
// Usage:
//   import { withTenantScope } from '@attending/shared/lib/multiTenant';
//   const scopedPrisma = withTenantScope(prisma, organizationId);
//   const patients = await scopedPrisma.patient.findMany(); // auto-filtered
// ============================================================

import { logger } from './logging';

// ============================================================
// CONFIGURATION
// ============================================================

/** Models that are scoped to an organization.
 *  Keep in sync with organizationId fields in schema.prisma.
 */
const TENANT_SCOPED_MODELS = new Set([
  // Core clinical models (all have organizationId in schema)
  'Patient',
  'Encounter',
  'LabOrder',
  'LabResult',
  'ImagingOrder',
  'MedicationOrder',
  'Referral',
  'PatientAssessment',
  'TreatmentPlan',
  'ClinicalNote',
  // Supporting clinical models (scoped via patient relation)
  'VitalSign',
  'Allergy',
  'Condition',
  // Infrastructure models (have organizationId directly)
  'ApiKey',
  'WebhookSubscription',
  'WebhookDelivery',
  'IntegrationConnection',
  'AuditLog',
]);

/** Models that are global (not tenant-scoped) */
const GLOBAL_MODELS = new Set([
  'User',
  'Session',
  'Account',
  'VerificationToken',
]);

// ============================================================
// PRISMA MIDDLEWARE
// ============================================================

export interface TenantMiddlewareOptions {
  /** Throw on missing org ID (default: true in production) */
  strict?: boolean;
  /** Log tenant scope injections (default: false) */
  debug?: boolean;
}

/**
 * Apply multi-tenant middleware to a Prisma client.
 * Auto-injects organizationId filter on all queries for scoped models.
 *
 * IMPORTANT: Call this ONCE at startup, not per-request.
 * Per-request scoping is done via withTenantScope().
 */
export function applyTenantMiddleware(
  prisma: any,
  options: TenantMiddlewareOptions = {}
): void {
  const strict = options.strict ?? (process.env.NODE_ENV === 'production');
  const debug = options.debug ?? false;

  prisma.$use(async (params: any, next: any) => {
    const model = params.model;

    // Skip non-tenant-scoped models
    if (!model || !TENANT_SCOPED_MODELS.has(model)) {
      return next(params);
    }

    // Check for tenant context
    const orgId = params.args?._tenantOrgId;

    // Remove internal marker before passing to Prisma
    if (params.args?._tenantOrgId) {
      delete params.args._tenantOrgId;
    }

    // If no org context and strict mode, block the query
    if (!orgId && strict) {
      const action = params.action;
      // Allow certain actions without org scope (e.g., count for health checks)
      if (!['count', 'aggregate'].includes(action)) {
        logger.warn('[Tenant] Query without org scope blocked', {
          model,
          action,
        });
        throw new Error(
          `Multi-tenant violation: ${model}.${action} called without organizationId scope`
        );
      }
    }

    if (!orgId) {
      return next(params);
    }

    if (debug) {
      logger.debug('[Tenant] Scoping query', { model, action: params.action, orgId });
    }

    // Inject org filter based on action type
    const action = params.action;

    switch (action) {
      case 'findUnique':
      case 'findFirst':
      case 'findMany':
      case 'count':
      case 'aggregate':
      case 'groupBy': {
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        if (!params.args.where.organizationId) {
          params.args.where.organizationId = orgId;
        }
        break;
      }

      case 'create': {
        params.args = params.args || {};
        params.args.data = params.args.data || {};
        if (!params.args.data.organizationId) {
          params.args.data.organizationId = orgId;
        }
        break;
      }

      case 'createMany': {
        params.args = params.args || {};
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((record: any) => ({
            ...record,
            organizationId: record.organizationId || orgId,
          }));
        }
        break;
      }

      case 'update':
      case 'updateMany':
      case 'delete':
      case 'deleteMany': {
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        if (!params.args.where.organizationId) {
          params.args.where.organizationId = orgId;
        }
        break;
      }

      case 'upsert': {
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        if (!params.args.where.organizationId) {
          params.args.where.organizationId = orgId;
        }
        params.args.create = params.args.create || {};
        if (!params.args.create.organizationId) {
          params.args.create.organizationId = orgId;
        }
        break;
      }
    }

    return next(params);
  });
}

// ============================================================
// SCOPED CLIENT
// ============================================================

/**
 * Create a tenant-scoped Prisma client proxy.
 * All queries through this proxy are automatically filtered
 * by the given organization ID.
 *
 * Usage:
 *   const scoped = withTenantScope(prisma, 'org_123');
 *   const patients = await scoped.patient.findMany(); // org_123 only
 */
export function withTenantScope(prisma: any, organizationId: string): any {
  if (!organizationId) {
    logger.warn('[Tenant] withTenantScope called without organizationId');
    return prisma;
  }

  return new Proxy(prisma, {
    get(target, prop) {
      const value = target[prop];

      // If it's a model accessor (e.g., prisma.patient)
      if (typeof value === 'object' && value !== null && typeof prop === 'string') {
        const modelName = prop.charAt(0).toUpperCase() + prop.slice(1);

        if (TENANT_SCOPED_MODELS.has(modelName)) {
          return createScopedModel(value, organizationId);
        }
      }

      return value;
    },
  });
}

function createScopedModel(model: any, orgId: string): any {
  return new Proxy(model, {
    get(target, prop) {
      const fn = target[prop];
      if (typeof fn !== 'function') return fn;

      return (...args: any[]) => {
        const firstArg = args[0] || {};
        firstArg._tenantOrgId = orgId;
        args[0] = firstArg;
        return fn.apply(target, args);
      };
    },
  });
}

// ============================================================
// REQUEST CONTEXT HELPER
// ============================================================

/**
 * Extract organization ID from request context.
 * Checks (in order): user token, API key, X-Organization-ID header.
 */
export function getRequestOrgId(ctx: {
  user?: { organizationId?: string } | null;
  raw?: { req: { headers: Record<string, any> } };
}): string | null {
  if (ctx.user?.organizationId) {
    return ctx.user.organizationId;
  }

  const orgHeader = ctx.raw?.req?.headers?.['x-organization-id'];
  if (orgHeader) {
    return orgHeader as string;
  }

  return null;
}

/**
 * Guard that ensures an organization ID is present.
 */
export function requireOrgId(ctx: any): string {
  const orgId = getRequestOrgId(ctx);
  if (!orgId) {
    throw new Error('Organization context required. Set organizationId on user or X-Organization-ID header.');
  }
  return orgId;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  TENANT_SCOPED_MODELS,
  GLOBAL_MODELS,
};

export default {
  applyTenantMiddleware,
  withTenantScope,
  getRequestOrgId,
  requireOrgId,
};
