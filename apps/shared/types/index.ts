// Shared Type Definitions for ATTENDING AI Platform
// Used by both Provider Portal and Patient Portal (COMPASS)

// =============================================================================
// Re-export Chat Types (Single Source of Truth for Chat/Assessment)
// =============================================================================

export * from './chat.types';

// =============================================================================
// Assessment Phases & Status
// =============================================================================

// High-level phases for provider view (re-exported from chat.types as HighLevelAssessmentPhase)
export type AssessmentPhase =
  | 'chief-complaint'
  | 'hpi-development'
  | 'review-of-systems'
  | 'medical-history'
  | 'risk-stratification'
  | 'clinical-summary';

export type AssessmentStatus =
  | 'in_progress' // Patient still completing COMPASS
  | 'pending' // Submitted, awaiting provider review
  | 'urgent' // High priority, needs immediate attention
  | 'in_review' // Provider currently reviewing
  | 'completed' // Review finished
  | 'follow_up'; // Requires follow-up action

// =============================================================================
// Clinical Data Structures
// =============================================================================

export interface HistoryOfPresentIllness {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  aggravatingFactors?: string[];
  relievingFactors?: string[];
  timing?: string;
  severity?: number; // 1-10 scale
  associatedSymptoms?: string[];
}

export interface ReviewOfSystems {
  constitutional?: string[];
  cardiovascular?: string[];
  respiratory?: string[];
  gastrointestinal?: string[];
  genitourinary?: string[];
  musculoskeletal?: string[];
  neurological?: string[];
  psychiatric?: string[];
  endocrine?: string[];
  hematologic?: string[];
  allergic?: string[];
  skin?: string[];
  eyes?: string[];
  ears?: string[];
}

export interface PastMedicalHistory {
  conditions?: string[];
  surgeries?: string[];
  hospitalizations?: string[];
  immunizations?: string[];
}

// Note: Simple Medication type for clinical data
// For catalog medication with more details, use MedicationCatalogItem from catalogs
export interface MedicationRecord {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  prescriber?: string;
  indication?: string;
}

export interface AllergyRecord {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  type?: 'drug' | 'food' | 'environmental' | 'other';
}

export interface SocialHistory {
  smoking?: string;
  alcohol?: string;
  drugs?: string;
  occupation?: string;
  livingConditions?: string;
  exercise?: string;
  diet?: string;
}

export interface FamilyHistory {
  conditions: string[];
  details?: string;
}

// =============================================================================
// Diagnosis & Clinical Decision Support
// =============================================================================

export interface Diagnosis {
  name: string;
  icd10Code?: string;
  probability: number; // 0-1
  supportingEvidence: string[];
  ruledOutBy?: string[];
  clinicalPearls?: string[];
}

export interface ClinicalExtraction {
  extractedData: Record<string, any>;
  redFlags: string[];
  riskFactors: string[];
  differentialConsiderations: string[];
  clinicalPearls?: string[];
}

// =============================================================================
// Complete Clinical Data Model
// =============================================================================

// Import UrgencyLevel from chat.types for use in interfaces
import type { UrgencyLevel } from './chat.types';

export interface ClinicalData {
  chiefComplaint: string;
  hpi: Partial<HistoryOfPresentIllness>;
  ros: Partial<ReviewOfSystems>;
  pmh: Partial<PastMedicalHistory>;
  medications: MedicationRecord[];
  allergies: AllergyRecord[];
  socialHistory: Partial<SocialHistory>;
  familyHistory: FamilyHistory;
  riskFactors: string[];
  redFlags: string[];
  assessmentPhase: AssessmentPhase;
  timestamp: string;
  version?: string;
}

// =============================================================================
// Clinical Summary (Output from COMPASS)
// =============================================================================

export interface ClinicalSummary {
  id?: string;
  patientId: string;
  sessionId?: string;
  timestamp: string;
  completedAt?: string;
  chiefComplaint: string;
  hpiNarrative?: string;
  rosFindings?: string;
  pmhSummary?: string;
  medicationList?: string;
  allergiesList?: string;
  assessment?: string;
  clinicalImpression?: string;
  plan?: string;
  recommendedWorkup?: string[];
  riskFactors: string[];
  redFlags: string[];
  urgencyLevel: UrgencyLevel;
  differentialDiagnosis: Diagnosis[];
  clinicalRecommendations: string[];
  followUpNeeded?: string;
  providerNotes?: string;
  confirmedDiagnoses?: Diagnosis[];
  icdCodes?: string[];
  treatmentPlan?: string;
}

// =============================================================================
// Patient Assessment (Full submission from COMPASS to Provider)
// =============================================================================

export interface PatientAssessment {
  id: string;
  patientId: string;
  sessionId?: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientDOB?: string;
  patientContact?: {
    phone?: string;
    email?: string;
  };
  chiefComplaint: string;
  clinicalData?: ClinicalData;
  clinicalSummary?: ClinicalSummary;
  urgencyLevel: UrgencyLevel;
  redFlags: string[];
  riskFactors: string[];
  differentialDiagnosis: Diagnosis[];
  hpiData?: Partial<HistoryOfPresentIllness>;
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  status: AssessmentStatus;
  assignedProviderId?: string;
  submittedAt: string;
  reviewedAt?: string;
  completedAt?: string;
  providerNotes?: string;
  confirmedDiagnoses?: Diagnosis[];
  icdCodes?: string[];
  treatmentPlan?: string;
  followUpInstructions?: string;
  ordersPlaced?: string[];
  compassVersion?: string;
  aiModelUsed?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface SubmitAssessmentRequest {
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  urgencyLevel: UrgencyLevel;
  redFlags: string[];
  riskFactors: string[];
  differentialDiagnosis: Diagnosis[];
  clinicalData?: ClinicalData;
  clinicalSummary?: ClinicalSummary;
  hpiData?: Partial<HistoryOfPresentIllness>;
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  sessionId?: string;
  compassVersion?: string;
}

export interface SubmitAssessmentResponse {
  success: boolean;
  assessmentId: string;
  queuePosition?: number;
  estimatedReviewTime?: string;
  urgentAlert?: boolean;
  message: string;
}

export interface AssessmentListResponse {
  assessments: PatientAssessment[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Provider Chat Message (different from patient ChatMessage in chat.types)
// =============================================================================

export interface ProviderChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    phase?: AssessmentPhase;
    urgencyLevel?: UrgencyLevel;
    quickReplies?: string[];
    medicalSuggestions?: string[];
    aiThinking?: string;
    clinicalData?: any;
  };
}

export interface ProviderChatSession {
  id: string;
  patientId: string;
  startTime: string;
  endTime?: string;
  messages: ProviderChatMessage[];
  currentPhase: AssessmentPhase;
  isComplete: boolean;
  clinicalSummaryId?: string;
}

// =============================================================================
// AI Response Types
// =============================================================================

export interface BioMistralResponse {
  message: string;
  quickReplies: string[];
  medicalSuggestions: string[];
  clinicalExtraction: ClinicalExtraction;
  aiThinking: string;
  nextPhase: AssessmentPhase;
  urgencyLevel: UrgencyLevel;
  confidence?: number;
}

export interface AIStatus {
  isProcessing: boolean;
  currentAction?: string;
  error?: string;
  lastUpdate?: string;
}

// =============================================================================
// Emergency & Location Types
// =============================================================================

export interface EmergencyFacility {
  type: 'emergency-room' | 'urgent-care' | 'hospital';
  name: string;
  address: string;
  phone?: string;
  distance?: number;
  waitTime?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface AppNotification {
  id: string;
  type: 'urgent_assessment' | 'new_assessment' | 'message' | 'system';
  title: string;
  message: string;
  assessmentId?: string;
  patientId?: string;
  urgencyLevel?: UrgencyLevel;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}
