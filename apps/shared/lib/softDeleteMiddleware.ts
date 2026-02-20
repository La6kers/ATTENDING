// ============================================================
// ATTENDING AI - Prisma Soft-Delete Middleware
// apps/shared/lib/softDeleteMiddleware.ts
//
// HIPAA Requirement: 164.530(j) — 6-year minimum retention
// of all records relating to policies, procedures, and actions.
//
// This middleware:
// 1. Intercepts delete operations and converts to soft-delete
//    (sets deletedAt + deletedBy instead of removing the row)
// 2. Automatically filters soft-deleted records from queries
//    unless explicitly requested via { where: { deletedAt: ... } }
//
// USAGE:
//   Automatically applied in apps/shared/lib/prisma.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

// ============================================================
// Models that have soft-delete columns (deletedAt, deletedBy)
// Keep this in sync with prisma/schema.prisma
// ============================================================

const SOFT_DELETE_MODELS = new Set([
  'Patient',
  'Encounter',
  'Allergy',
  'Condition',
  'Medication',
  'VitalSign',
  'LabOrder',
  'LabResult',
  'ImagingOrder',
  'ImagingResult',
  'MedicationOrder',
  'Referral',
  'PatientAssessment',
  'EmergencyEvent',
  'TreatmentPlan',
  'ClinicalNote',
]);

/**
 * Check if a model supports soft-delete
 */
function isSoftDeleteModel(model?: string): boolean {
  return model ? SOFT_DELETE_MODELS.has(model) : false;
}

/**
 * Check if a query explicitly requests deleted records
 */
function includesDeletedFilter(args: any): boolean {
  if (!args?.where) return false;
  if ('deletedAt' in args.where) return true;

  if (args.where.AND) {
    const andArray = Array.isArray(args.where.AND) ? args.where.AND : [args.where.AND];
    if (andArray.some((clause: any) => 'deletedAt' in clause)) return true;
  }
  if (args.where.OR) {
    const orArray = Array.isArray(args.where.OR) ? args.where.OR : [args.where.OR];
    if (orArray.some((clause: any) => 'deletedAt' in clause)) return true;
  }

  return false;
}

/**
 * Apply soft-delete middleware to a PrismaClient instance.
 */
export function applySoftDeleteMiddleware(
  prisma: PrismaClient,
  options?: { debug?: boolean }
): void {
  const debug = options?.debug ?? false;

  prisma.$use(async (params, next) => {
    if (!isSoftDeleteModel(params.model)) {
      return next(params);
    }

    // ---- READ: Auto-filter soft-deleted records ----
    const readActions = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];

    if (readActions.includes(params.action)) {
      if (includesDeletedFilter(params.args)) {
        if (debug) console.log(`[SoftDelete] ${params.model}.${params.action}: explicit deletedAt filter, skipping`);
        return next(params);
      }

      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      params.args.where.deletedAt = null;

      if (debug) console.log(`[SoftDelete] ${params.model}.${params.action}: auto-filtered deletedAt: null`);
    }

    // ---- DELETE: Convert to soft-delete ----
    if (params.action === 'delete') {
      if (debug) console.log(`[SoftDelete] ${params.model}.delete → update with deletedAt`);
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
      return next(params);
    }

    if (params.action === 'deleteMany') {
      if (debug) console.log(`[SoftDelete] ${params.model}.deleteMany → updateMany with deletedAt`);
      params.action = 'updateMany';
      if (!params.args) params.args = {};
      if (!params.args.data) params.args.data = {};
      params.args.data.deletedAt = new Date();
      return next(params);
    }

    return next(params);
  });
}

// ============================================================
// HELPERS: Explicit soft-delete with user tracking
// ============================================================

/**
 * Soft-delete a record with userId tracking.
 * Prefer this over prisma.model.delete() when you have the userId.
 */
export async function softDelete(
  prisma: PrismaClient,
  model: string,
  id: string,
  deletedBy: string
): Promise<void> {
  if (!SOFT_DELETE_MODELS.has(model)) {
    throw new Error(`Model "${model}" does not support soft-delete.`);
  }
  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  await (prisma as any)[modelKey].update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
  });
}

/**
 * Restore a soft-deleted record.
 */
export async function restoreSoftDeleted(
  prisma: PrismaClient,
  model: string,
  id: string
): Promise<void> {
  if (!SOFT_DELETE_MODELS.has(model)) {
    throw new Error(`Model "${model}" does not support soft-delete.`);
  }
  const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
  await (prisma as any)[modelKey].update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
  });
}

/**
 * Hard-delete — ONLY for data past HIPAA retention period (6+ years).
 * Bypasses the soft-delete middleware via raw SQL.
 */
export async function hardDelete(
  prisma: PrismaClient,
  model: string,
  id: string
): Promise<void> {
  console.warn(`[SoftDelete] HARD DELETE: ${model}#${id} — ensure HIPAA retention period has elapsed`);
  const tableName = `"${model}"`;
  await prisma.$executeRawUnsafe(`DELETE FROM ${tableName} WHERE id = $1`, id);
}

export default { applySoftDeleteMiddleware, softDelete, restoreSoftDeleted, hardDelete };
