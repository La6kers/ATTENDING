// Re-export all medical types from shared package
// This file maintains backward compatibility with existing imports
// Eventually, imports should be updated to use @attending/shared directly

export type {
  AssessmentPhase,
  AssessmentStatus,
  UrgencyLevel,
  HistoryOfPresentIllness,
  ReviewOfSystems,
  PastMedicalHistory,
  Medication,
  Allergy,
  SocialHistory,
  FamilyHistory,
  ClinicalData,
  ClinicalExtraction,
  BioMistralResponse,
  Diagnosis,
  ClinicalSummary,
  PatientAssessment,
  SubmitAssessmentRequest,
  SubmitAssessmentResponse,
  AssessmentListResponse,
  EmergencyFacility,
  UserLocation,
  Notification,
} from '@attending/shared';

// Legacy alias for backward compatibility
export type { EmergencyFacility as EmergencyContact } from '@attending/shared';
