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
  MedicationRecord,
  AllergyRecord,
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
  AppNotification,
} from '@attending/shared';

// Type aliases for backward compatibility with legacy code
import type { MedicationRecord, AllergyRecord, AppNotification } from '@attending/shared';
export type Medication = MedicationRecord;
export type Allergy = AllergyRecord;
export type Notification = AppNotification;

// Legacy alias for backward compatibility
export type { EmergencyFacility as EmergencyContact } from '@attending/shared';
