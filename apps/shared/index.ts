// ============================================================
// @attending/shared - Main Entry Point
// apps/shared/index.ts
//
// Central export for all shared utilities, types, hooks, and components
// 
// NOTE: Use explicit exports to avoid naming conflicts
// ============================================================

// =============================================================================
// TYPES - Export from types folder
// =============================================================================
export * from './types';

// =============================================================================
// CHAT TYPES - Explicit re-export to avoid conflicts
// NOTE: generateMessageId and generateSessionId are in both chat.types.ts and lib/utils.ts
// We export from chat.types.ts as the canonical source for chat-related functions
// =============================================================================
export {
  // Types
  type DetailedAssessmentPhase,
  type HighLevelAssessmentPhase,
  type UrgencyLevel,
  type QuickReply,
  type MessageRole,
  type MessageMetadata,
  type ChatMessage,
  type RedFlag,
  type RedFlagSeverity,
  type HPIData,
  type AssessmentData,
  type ChatSession,
  // Constants
  PHASE_CATEGORY_MAP,
  PHASE_PROGRESS,
  URGENCY_CONFIG,
  // Helper functions - from chat.types.ts
  createMessage,
  generateMessageId,
  createRedFlag,
  createAssessmentData,
  generateSessionId,
  calculateUrgencyScore,
  determineUrgencyLevel,
  formatMessageTime,
  getPhaseProgress,
  getPhaseCategory,
} from './types/chat.types';

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

export {
  ClinicalRecommendationService,
  clinicalRecommendationService,
  type LabRecommendation,
  type ImagingRecommendation,
  type MedicationRecommendation,
  type RecommendationResult,
} from './services/ClinicalRecommendationService';

// =============================================================================
// STATE MACHINES
// =============================================================================
export { 
  assessmentMachine,
  type AssessmentContext,
  type AssessmentEvent as MachineAssessmentEvent,
  type RedFlag as MachineRedFlag,
} from './machines/assessmentMachine';

// =============================================================================
// DATABASE UTILITIES
// =============================================================================
export * from './lib/prisma';

// =============================================================================
// GENERAL UTILITIES (excluding functions that conflict with chat.types)
// =============================================================================
export {
  cn,
  calculateAge,
  formatDate,
  getRelativeTime,
  generateId,
  capitalize,
  truncate,
  toTitleCase,
  slugify,
  debounce,
  throttle,
  safeJsonParse,
  deepClone,
  isEmpty,
  groupBy,
  formatPatientName,
  formatMRN,
  calculateBMI,
  getBMICategory,
  formatPhone,
  getUrgencyColor,
  getStatusColor,
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
// Export with explicit names to avoid Medication conflict
// =============================================================================
export {
  // Lab Catalog
  LAB_CATALOG,
  LAB_PANELS,
  getLabTest,
  getLabPanel,
  searchLabs,
  getLabsByCategory,
  type LabTest,
  type LabPanel,
  type LabCategory,
  
  // Imaging Catalog
  IMAGING_CATALOG,
  getImagingStudy,
  searchImaging,
  getImagingByModality,
  getNonContrastAlternative,
  type ImagingStudy,
  type ImagingModality,
  type ImagingCategory,
  
  // Medication Catalog - renamed to avoid conflict with Medication type
  MEDICATION_CATALOG,
  getMedication,
  searchMedications,
  getMedicationsByCategory,
  checkDrugInteractions,
  type Medication as CatalogMedication,
  type MedicationCategory,
  type DrugInteraction,
  
  // Shared types
  type OrderPriority,
  type PatientContext,
  type AIRecommendation,
  type RecommendationCategory,
  RECOMMENDATION_CATEGORY_CONFIGS,
} from './catalogs';

// =============================================================================
// SCHEMAS (Zod validation)
// =============================================================================
export * from './schemas';

// =============================================================================
// UI COMPONENTS
// Import UI components from their specific path:
// import { Button, Card } from '@attending/shared/components/ui';
// import { MessageBubble } from '@attending/shared/components/chat';
// =============================================================================
