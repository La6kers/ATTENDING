// apps/shared/services/index.ts
// Shared Services for ATTENDING AI Platform

// Assessment Submission
export * from './assessmentSubmission';

// COMPASS Bridge - Real-time communication between portals
export { 
  CompassBridge,
  type AssessmentEventType,
  type AssessmentEvent,
  type AssessmentEventCallback,
  type CompassBridgeConfig,
} from './CompassBridge';

// Notification Service
export { 
  NotificationService,
  type NotificationType,
  type NotificationOptions,
  type CompassNotificationOptions,
  type NotificationCallback,
  type NotificationServiceConfig,
} from './NotificationService';

// Geolocation Service
export { 
  GeolocationService,
  type GeolocationConfig,
  type LocationCallback,
  type ErrorCallback,
} from './GeolocationService';

// Clinical Recommendation Service - AI-powered recommendations
export {
  ClinicalRecommendationService,
  clinicalRecommendationService,
  type LabRecommendation,
  type ImagingRecommendation,
  type MedicationRecommendation,
  type RecommendationResult,
} from './ClinicalRecommendationService';
