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
  type GeolocationConfig,
  type LocationCallback,
  type ErrorCallback,
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
// CLINICAL CATALOGS
// Export with explicit names to avoid conflicts
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
  // Types from catalogs
  type LabTest,
  type LabPanel,
  type ImagingStudy,
  type Medication as MedicationCatalogItem,
  type DrugInteraction,
  type PatientContext,
  type OrderPriority,
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
