// ============================================================
// ATTENDING AI — API Service Index
// apps/patient-portal/lib/api/index.ts
// ============================================================

export { default as api, setAccessToken, getAccessToken } from './client';
export type { ApiError, ApiResult } from './client';

export { default as patientApi } from './patient';
export type { PatientProfile, MedicalID, HealthSummary, VitalSigns, Allergy, MedicalCondition, Medication, LabResult, Appointment } from './patient';

export { default as assessmentsApi } from './assessments';
export type { Assessment, AssessmentSummary, HpiData, RedFlag } from './assessments';

export { default as messagesApi } from './messages';
export type { Conversation, Message as ChatMessage, SendMessagePayload } from './messages';

export { default as emergencyApi } from './emergency';
export type { EmergencyContact, AccessSettings, CrashDetectionSettings, AccessEvent, QuickAccessData, FacesheetData } from './emergency';

export { default as notificationsApi } from './notifications';
export type { Notification, NotificationType, NotificationPreferences } from './notifications';
