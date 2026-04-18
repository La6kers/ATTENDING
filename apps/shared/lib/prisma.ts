// apps/shared/lib/prisma.ts
// Singleton Prisma Client for ATTENDING AI Platform
// This prevents multiple Prisma Client instances in development

// TODO(AZURE-KEY-VAULT): The DATABASE_URL environment variable (consumed by
// Prisma at startup) must be sourced from Azure Key Vault in production — never
// from a committed .env file. Recommended approach:
//   Option A (preferred): Azure App Service Key Vault reference —
//     Set DATABASE_URL in App Service Configuration as:
//     "@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/database-url/)"
//     Azure resolves the reference automatically before Node.js starts.
//   Option B: Use @azure/keyvault-secrets + DefaultAzureCredential in an
//     instrumentation.ts startup hook to populate process.env.DATABASE_URL
//     before the first Prisma import.
// See: https://learn.microsoft.com/azure/app-service/app-service-key-vault-references

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

// Prisma does not generate native enums for SQL Server.
// Use these string literal types for type-safe enum-like values.
export const DbUserRole = { ADMIN: 'ADMIN', PROVIDER: 'PROVIDER', NURSE: 'NURSE', STAFF: 'STAFF', PATIENT: 'PATIENT', SYSTEM: 'SYSTEM' } as const;
export const DbOrderStatus = { PENDING: 'PENDING', COLLECTED: 'COLLECTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED', ACTIVE: 'ACTIVE', ON_HOLD: 'ON_HOLD', SCHEDULED: 'SCHEDULED', SENT: 'SENT', DISCONTINUED: 'DISCONTINUED' } as const;
export const DbOrderPriority = { STAT: 'STAT', ASAP: 'ASAP', URGENT: 'URGENT', ROUTINE: 'ROUTINE', TIMED: 'TIMED', ELECTIVE: 'ELECTIVE' } as const;
export const DbEncounterStatus = { SCHEDULED: 'SCHEDULED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' } as const;
export const DbAssessmentStatus = { IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', ABANDONED: 'ABANDONED', EMERGENCY: 'EMERGENCY' } as const;
export const DbEncounterType = { OFFICE: 'OFFICE', TELEHEALTH: 'TELEHEALTH', EMERGENCY: 'EMERGENCY', INPATIENT: 'INPATIENT' } as const;

export type DbUserRoleType = typeof DbUserRole[keyof typeof DbUserRole];
export type DbOrderStatusType = typeof DbOrderStatus[keyof typeof DbOrderStatus];
export type DbOrderPriorityType = typeof DbOrderPriority[keyof typeof DbOrderPriority];
export type DbEncounterStatusType = typeof DbEncounterStatus[keyof typeof DbEncounterStatus];
export type DbAssessmentStatusType = typeof DbAssessmentStatus[keyof typeof DbAssessmentStatus];
export type DbEncounterTypeType = typeof DbEncounterType[keyof typeof DbEncounterType];

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
  DiagnosticOutcome as DbDiagnosticOutcome,
} from '@prisma/client';
