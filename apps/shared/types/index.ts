// Shared Type Definitions for ATTENDING AI Platform
// Used by both Provider Portal and Patient Portal (COMPASS)

// =============================================================================
// Re-export Chat Types (Single Source of Truth)
// =============================================================================

export * from './chat.types';

// Import UrgencyLevel for use in this file's type definitions
import type { UrgencyLevel } from './chat.types';

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
  | 'in_progress'    // Patient still completing COMPASS
  | 'pending'        // Submitted, awaiting provider review
  | 'urgent'         // High priority, needs immediate attention
  | 'in_review'      // Provider currently reviewing
  | 'completed'      // Review finished
  | 'follow_up';     // Requires follow-up action

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

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  prescriber?: string;
  indication?: string;
}

export interface Allergy {
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

export interface ClinicalData {
  // Chief complaint
  chiefComplaint: string;
  
  // History of Present Illness
  hpi: Partial<HistoryOfPresentIllness>;
  
  // Review of Systems
  ros: Partial<ReviewOfSystems>;
  
  // Past Medical History
  pmh: Partial<PastMedicalHistory>;
  
  // Medications & Allergies
  medications: Medication[];
  allergies: Allergy[];
  
  // Social & Family History
  socialHistory: Partial<SocialHistory>;
  familyHistory: FamilyHistory;
  
  // Risk Assessment
  riskFactors: string[];
  redFlags: string[];
  
  // Metadata
  assessmentPhase: AssessmentPhase;
  timestamp: string;
  version?: string;
}

// =============================================================================
// Clinical Summary (Output from COMPASS)
// =============================================================================

export interface ClinicalSummary {
  // Identifiers
  id?: string;
  patientId: string;
  sessionId?: string;
  
  // Timestamps
  timestamp: string;
  completedAt?: string;
  
  // Clinical Content
  chiefComplaint: string;
  hpiNarrative?: string;
  rosFindings?: string;
  pmhSummary?: string;
  medicationList?: string;
  allergiesList?: string;
  
  // Assessment
  assessment?: string;
  clinicalImpression?: string;
  
  // Plan
  plan?: string;
  recommendedWorkup?: string[];
  
  // Risk & Urgency
  riskFactors: string[];
  redFlags: string[];
  urgencyLevel: UrgencyLevel;
  
  // Differential Diagnosis
  differentialDiagnosis: Diagnosis[];
  
  // Recommendations
  clinicalRecommendations: string[];
  followUpNeeded?: string;
  
  // Provider additions (filled after review)
  providerNotes?: string;
  confirmedDiagnoses?: Diagnosis[];
  icdCodes?: string[];
  treatmentPlan?: string;
}

// =============================================================================
// Patient Assessment (Full submission from COMPASS to Provider)
// =============================================================================

export interface PatientAssessment {
  // Identifiers
  id: string;
  patientId: string;
  sessionId?: string;
  
  // Patient Demographics
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientDOB?: string;
  patientContact?: {
    phone?: string;
    email?: string;
  };
  
  // Clinical Data from COMPASS
  chiefComplaint: string;
  clinicalData?: ClinicalData;
  clinicalSummary?: ClinicalSummary;
  
  // Risk Assessment
  urgencyLevel: UrgencyLevel;
  redFlags: string[];
  riskFactors: string[];
  differentialDiagnosis: Diagnosis[];
  
  // HPI (extracted for quick view)
  hpiData?: Partial<HistoryOfPresentIllness>;
  
  // Medical History (extracted for quick view)
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  
  // Workflow Status
  status: AssessmentStatus;
  assignedProviderId?: string;
  
  // Timestamps
  submittedAt: string;
  reviewedAt?: string;
  completedAt?: string;
  
  // Provider Additions
  providerNotes?: string;
  confirmedDiagnoses?: Diagnosis[];
  icdCodes?: string[];
  treatmentPlan?: string;
  followUpInstructions?: string;
  ordersPlaced?: string[];
  
  // COMPASS metadata
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
// Chat & Messaging Types
// =============================================================================

export interface ChatMessage {
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

export interface ChatSession {
  id: string;
  patientId: string;
  startTime: string;
  endTime?: string;
  messages: ChatMessage[];
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

export interface Notification {
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
