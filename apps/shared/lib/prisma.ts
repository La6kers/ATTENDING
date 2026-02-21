// apps/shared/lib/prisma.ts
// Singleton Prisma Client for ATTENDING AI Platform
// This prevents multiple Prisma Client instances in development

import { PrismaClient } from '@prisma/client';
import { applySoftDeleteMiddleware } from './softDeleteMiddleware';
import { applyTenantMiddleware } from './multiTenant';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  // HIPAA 164.530(j): Soft-delete middleware ensures clinical records
  // are never hard-deleted. Queries auto-filter deleted records.
  applySoftDeleteMiddleware(client, {
    debug: process.env.NODE_ENV === 'development' && process.env.DEBUG_SOFT_DELETE === 'true',
  });

  // Multi-tenant row-level security: auto-injects organizationId
  // on all queries for tenant-scoped models
  applyTenantMiddleware(client, {
    strict: process.env.NODE_ENV === 'production',
    debug: process.env.DEBUG_TENANT === 'true',
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper for API routes to handle Prisma connection
export async function withPrisma<T>(
  handler: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    return await handler(prisma);
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Re-export PrismaClient type
export { PrismaClient };

// Re-export soft-delete helpers for HIPAA-compliant record management
export { softDelete, restoreSoftDeleted, hardDelete } from './softDeleteMiddleware';

// Re-export Prisma enums (must match schema.prisma enum declarations)
export {
  UserRole as DbUserRole,
  OrderStatus as DbOrderStatus,
  OrderPriority as DbOrderPriority,
  EncounterStatus as DbEncounterStatus,
  AssessmentStatus as DbAssessmentStatus,
  EncounterType as DbEncounterType,
} from '@prisma/client';

// Type exports for database models (must match schema.prisma model names)
export type {
  Organization as DbOrganization,
  User as DbUser,
  Patient as DbPatient,
  Encounter as DbEncounter,
  Allergy as DbAllergy,
  Condition as DbCondition,
  Medication as DbMedication,
  VitalSign as DbVitalSign,
  LabOrder as DbLabOrder,
  LabResult as DbLabResult,
  ImagingOrder as DbImagingOrder,
  ImagingResult as DbImagingResult,
  MedicationOrder as DbMedicationOrder,
  Referral as DbReferral,
  PatientAssessment as DbPatientAssessment,
  EmergencyEvent as DbEmergencyEvent,
  TreatmentPlan as DbTreatmentPlan,
  ClinicalNote as DbClinicalNote,
  Notification as DbNotification,
  AuditLog as DbAuditLog,
  ApiKey as DbApiKey,
  WebhookSubscription as DbWebhookSubscription,
  IntegrationConnection as DbIntegrationConnection,
  ClinicalProtocol as DbClinicalProtocol,
  RedFlagRule as DbRedFlagRule,
} from '@prisma/client';
