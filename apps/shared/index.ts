// ============================================================
// @attending/shared - Main Entry Point
// apps/shared/index.ts
//
// Central export for all shared utilities, types, hooks, and components
// ============================================================

// =============================================================================
// TYPES
// =============================================================================
export * from './types';

// =============================================================================
// SERVICES
// =============================================================================
// Export with explicit names to avoid conflicts
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
  type RedFlag,
} from './machines/assessmentMachine';

// =============================================================================
// DATABASE UTILITIES
// =============================================================================
export * from './lib/prisma';

// =============================================================================
// GENERAL UTILITIES
// =============================================================================
export * from './lib/utils';

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
// UI COMPONENTS
// Import UI components from their specific path:
// import { Button, Card } from '@attending/shared/components/ui';
// =============================================================================
