// ============================================================
// @attending/shared - Main Entry Point
// apps/shared/index.ts
//
// Central export for all shared utilities, types, hooks, and components
// ============================================================

// =============================================================================
// TYPES (Primary source of truth)
// =============================================================================
export * from './types';

// =============================================================================
// CLINICAL TYPES - Explicit exports for common usage
// =============================================================================
export {
  // Allergy types and helpers
  type AllergyInfo,
  isAllergyInfo,
  normalizeAllergy,
  getAllergenName,
  normalizeAllergies,
  getAllergenNames,
  
  // Patient context (canonical definition)
  type PatientContext,
  
  // Priority types
  type OrderPriority,
  PRIORITY_CONFIG,
  
  // Recommendation types
  type RecommendationCategory,
  RECOMMENDATION_CATEGORY_CONFIGS,
  groupRecommendationsByCategory,
  isActionableCategory,
  
  // Base types for creating catalog-specific types
  type BaseCatalogItem,
  type BaseSelectedItem,
  type BaseAIRecommendation,
} from './types/clinical.types';

// Re-export UrgencyLevel from chat.types (canonical source)
export { type UrgencyLevel, URGENCY_CONFIG } from './types/chat.types';

// =============================================================================
// SERVICES
// =============================================================================
export {
  AssessmentSubmissionService,
  assessmentSubmissionService,
  submitCompassAssessment,
} from './services/assessmentSubmission';

export {
  CompassBridge,
  type AssessmentEventType,
  type AssessmentEvent as CompassAssessmentEvent,
  type AssessmentEventCallback,
  type CompassBridgeConfig,
} from './services/CompassBridge';

export {
  NotificationService,
  type NotificationType,
  type NotificationOptions,
  type CompassNotificationOptions,
  type NotificationCallback,
  type NotificationServiceConfig,
} from './services/NotificationService';

export {
  GeolocationService,
  calculateDistance,
  type Coordinates,
  type EmergencyFacility,
  type NurseHotline,
  type LocationResult,
  type FacilitySearchResult,
} from './services/GeolocationService';

// =============================================================================
// STATE MACHINES
// =============================================================================
export {
  assessmentMachine,
  type AssessmentContext,
  type AssessmentEvent as MachineAssessmentEvent,
  // Note: RedFlag is exported from types/chat.types.ts
} from './machines/assessmentMachine';

// =============================================================================
// DATABASE UTILITIES
// =============================================================================
// eslint-disable-next-line no-restricted-imports
export * from './lib/prisma';

// =============================================================================
// GENERAL UTILITIES
// Export specific utilities to avoid conflicts with types
// =============================================================================
// eslint-disable-next-line no-restricted-imports
export {
  cn,
  formatDate,
  formatCurrency,
  truncateText,
  debounce,
  throttle,
  deepClone,
  isEmptyObject,
  sleep,
  retry,
  // Note: generateMessageId and generateSessionId are exported from types/chat.types.ts
} from './lib/utils';

// =============================================================================
// REACT HOOKS
// =============================================================================
export * from './hooks';

// =============================================================================
// ZUSTAND STORES
// =============================================================================
export * from './stores';

// =============================================================================
// AUTHENTICATION
// =============================================================================
export * from './auth';

// =============================================================================
// AUDIT LOGGING (HIPAA Compliant)
// =============================================================================
export {
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
  type AuditLogEntry,
  type AuditContext,
  type AuditQueryOptions,
  type AuditAction,
} from './lib/audit';

// =============================================================================
// API AUTH WRAPPERS
// =============================================================================
export {
  withApiAuth,
  withProviderAuth,
  withClinicalAuth,
  withAdminAuth,
  withPatientAuth,
  type AuthenticatedUser,
  type AuthenticatedRequest,
  type AuthenticatedApiHandler,
  type WithApiAuthOptions,
  type UserRole,
} from './lib/auth/withApiAuth';

// =============================================================================
// CLINICAL CATALOGS
// Export with explicit names to avoid conflicts
// Note: PatientContext and OrderPriority are already exported from types/clinical.types
// =============================================================================
export {
  // Lab catalog
  LAB_CATALOG,
  LAB_PANELS,
  getLabTest,
  getLabPanel,
  searchLabs,
  getLabsByCategory,
  getAllLabTests,
  getAllLabPanels,
  // Imaging catalog
  IMAGING_CATALOG,
  getImagingStudy,
  searchImaging,
  getImagingByModality,
  getImagingByBodyPart,
  getAllImagingStudies,
  getContrastStudies,
  getNonContrastAlternative,
  // Medication catalog (use MedicationCatalogItem to avoid conflict with MedicationRecord type)
  MEDICATION_CATALOG,
  DRUG_INTERACTIONS,
  getMedication,
  searchMedications,
  getMedicationsByCategory,
  getControlledMedications,
  getAllMedications,
  checkDrugInteractions,
  // Referral catalog
  SPECIALTY_CATALOG,
  PROVIDER_DIRECTORY,
  getSpecialty,
  getAllSpecialties,
  searchSpecialties,
  getSpecialtiesByCategory,
  getProvidersBySpecialty,
  getPreferredProviders,
  generateReferralRecommendations,
  // Types from catalogs (excluding PatientContext and OrderPriority - already exported above)
  type LabTest,
  type LabPanel,
  type ImagingStudy,
  type Medication as MedicationCatalogItem,
  type DrugInteraction,
  type Specialty,
  type SpecialtyCategory,
  type ReferralProvider,
  type ReferralRecommendation,
  type ReferralUrgency,
  type PatientReferralContext,
} from './catalogs';

// =============================================================================
// CLINICAL RECOMMENDATION SERVICE
// =============================================================================
export {
  ClinicalRecommendationService,
  clinicalRecommendationService,
  type LabRecommendation,
  type ImagingRecommendation,
  type MedicationRecommendation,
  type RecommendationResult,
} from './services/ClinicalRecommendationService';

// =============================================================================
// UI COMPONENTS
// Import UI components from their specific path:
// import { Button, Card } from '@attending/shared/components/ui';
// =============================================================================
