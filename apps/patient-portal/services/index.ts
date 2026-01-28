// =============================================================================
// ATTENDING AI - Patient Portal Services Index
// apps/patient-portal/services/index.ts
// =============================================================================

export { crashDetectionService } from './CrashDetectionService';
export type { CrashEvent, CrashDetectionConfig } from './CrashDetectionService';

export { pushNotificationService } from './PushNotificationService';
export type { 
  PushNotificationPayload, 
  PushToken, 
  NotificationResult 
} from './PushNotificationService';
