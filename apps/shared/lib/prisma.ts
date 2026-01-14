// apps/shared/lib/prisma.ts
// Singleton Prisma Client for ATTENDING AI Platform
// This prevents multiple Prisma Client instances in development

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

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

// Re-export enums with Db prefix to avoid conflicts with app-level types
export { 
  UserRole as DbUserRole,
  UrgencyLevel as DbUrgencyLevel,
  AssessmentStatus as DbAssessmentStatus,
  OrderPriority as DbOrderPriority,
  OrderStatus as DbOrderStatus,
  EncounterStatus as DbEncounterStatus,
  VisitType as DbVisitType,
  AllergySeverity as DbAllergySeverity,
  AllergyType as DbAllergyType,
  NotificationType as DbNotificationType,
  NotificationPriority as DbNotificationPriority,
  ConditionStatus as DbConditionStatus,
  InteractionSeverity as DbInteractionSeverity,
  ReferralStatus as DbReferralStatus,
  EmergencySeverity as DbEmergencySeverity,
} from '@prisma/client';

// Type exports for database models with Db prefix to avoid conflicts
export type {
  User as DbUser,
  Patient as DbPatient,
  PatientAssessment as DbPatientAssessment,
  Encounter as DbEncounter,
  Allergy as DbAllergy,
  MedicalCondition as DbMedicalCondition,
  PatientMedication as DbPatientMedication,
  VitalSigns as DbVitalSigns,
  LabOrder as DbLabOrder,
  LabResult as DbLabResult,
  ImagingOrder as DbImagingOrder,
  MedicationOrder as DbMedicationOrder,
  Referral as DbReferral,
  Notification as DbNotification,
  AuditLog as DbAuditLog,
  EmergencyEvent as DbEmergencyEvent,
  ClinicalProtocol as DbClinicalProtocol,
} from '@prisma/client';
