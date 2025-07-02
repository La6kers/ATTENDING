// Medical-specific type definitions for ATTENDING platform

export type AssessmentPhase = 
  | 'chief-complaint'
  | 'hpi-development'
  | 'review-of-systems'
  | 'medical-history'
  | 'risk-stratification'
  | 'clinical-summary';

export type UrgencyLevel = 'standard' | 'moderate' | 'high';

export interface HistoryOfPresentIllness {
  onset: string;
  location: string;
  duration: string;
  character: string;
  aggravatingFactors: string[];
  relievingFactors: string[];
  timing: string;
  severity: number; // 1-10 scale
  associatedSymptoms: string[];
}

export interface ReviewOfSystems {
  constitutional: string[];
  cardiovascular: string[];
  respiratory: string[];
  gastrointestinal: string[];
  genitourinary: string[];
  musculoskeletal: string[];
  neurological: string[];
  psychiatric: string[];
  endocrine: string[];
  hematologic: string[];
  allergic: string[];
}

export interface PastMedicalHistory {
  conditions: string[];
  surgeries: string[];
  hospitalizations: string[];
  immunizations: string[];
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  startDate?: string;
  prescriber?: string;
}

export interface Allergy {
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  type: 'drug' | 'food' | 'environmental' | 'other';
}

export interface ClinicalData {
  chiefComplaint: string;
  hpi: Partial<HistoryOfPresentIllness>;
  ros: Partial<ReviewOfSystems>;
  pmh: Partial<PastMedicalHistory>;
  medications: Medication[];
  allergies: Allergy[];
  socialHistory: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    livingConditions?: string;
  };
  familyHistory: {
    conditions: string[];
    details?: string;
  };
  riskFactors: string[];
  redFlags: string[];
  assessmentPhase: AssessmentPhase;
  timestamp: string;
}

export interface ClinicalExtraction {
  extractedData: any;
  redFlags: string[];
  riskFactors: string[];
  differentialConsiderations: string[];
  clinicalPearls?: string[];
}

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

export interface Diagnosis {
  name: string;
  icd10Code?: string;
  probability: number;
  supportingEvidence: string[];
  ruledOutBy?: string[];
}

export interface ClinicalSummary {
  patientId: string;
  timestamp: string;
  chiefComplaint: string;
  hpi: string;
  ros: string;
  pmh: string;
  medications: string;
  allergies: string;
  assessment: string;
  plan: string;
  riskFactors: string[];
  redFlags: string[];
  urgencyLevel: UrgencyLevel;
  differentialDiagnosis: Diagnosis[];
  clinicalRecommendations: string[];
  followUpNeeded: string;
  providerNotes?: string;
}

export interface EmergencyContact {
  type: 'emergency-room' | 'urgent-care' | 'provider' | 'nurse-line';
  name: string;
  address?: string;
  phone?: string;
  distance?: number;
  waitTime?: string;
}
