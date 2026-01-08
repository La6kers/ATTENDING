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

// Type re-exports for convenience
export { 
  PrismaClient,
  UserRole,
  UrgencyLevel,
  AssessmentStatus,
  OrderPriority,
  OrderStatus,
  EncounterStatus,
  VisitType,
  AllergySeverity,
  AllergyType,
  NotificationType,
  NotificationPriority,
  ConditionStatus,
  InteractionSeverity,
  ReferralStatus,
  EmergencySeverity,
} from '@prisma/client';

// Type exports for database models
export type {
  User,
  Patient,
  PatientAssessment,
  Encounter,
  Allergy,
  MedicalCondition,
  PatientMedication,
  VitalSigns,
  LabOrder,
  LabResult,
  ImagingOrder,
  MedicationOrder,
  Referral,
  Notification,
  AuditLog,
  EmergencyEvent,
  ClinicalProtocol,
} from '@prisma/client';
