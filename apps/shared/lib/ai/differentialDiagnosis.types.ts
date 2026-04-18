// ============================================================
// ATTENDING AI — Differential Diagnosis Types
// apps/shared/lib/ai/differentialDiagnosis.types.ts
//
// TYPE-ONLY file — safe for frontend import.
// Contains all interfaces and types used by the differential
// diagnosis system. The implementation (Bayesian engine,
// clinical knowledge base, scoring logic) lives in
// differentialDiagnosis.ts and must ONLY be imported server-side.
//
// Frontend code should import from this file:
//   import type { DifferentialDiagnosisResult } from '@attending/shared/lib/ai/differentialDiagnosis.types';
//
// Server-side code imports the implementation:
//   import { DifferentialDiagnosisService } from '@attending/shared/lib/ai/differentialDiagnosis';
// ============================================================

import type { IntelligentWorkup } from './workupIntelligence';

// ============================================================
// PATIENT PRESENTATION
// ============================================================

export interface PatientPresentation {
  /** Primary complaint from patient */
  chiefComplaint: string;

  /** Duration of symptoms */
  duration?: string;

  /** Associated symptoms */
  symptoms: Symptom[];

  /** Vital signs */
  vitals?: VitalSigns;

  /** Patient demographics */
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    pregnant?: boolean;
  };

  /** Medical history */
  medicalHistory?: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries?: string[];
    familyHistory?: string[];
  };

  /** Social history */
  socialHistory?: {
    smoking?: string;
    alcohol?: string;
    drugs?: string;
    occupation?: string;
    travelHistory?: string[];
  };

  /** Physical exam findings */
  physicalExam?: Record<string, string>;

  /** Red flags already identified */
  redFlags?: string[];

  /** Symptom-specific follow-up answers (from COMPASS complaint modules) */
  symptomSpecificAnswers?: Record<string, string>;
}

export interface Symptom {
  name: string;
  severity?: 'mild' | 'moderate' | 'severe';
  onset?: string;
  location?: string;
  character?: string;
  radiation?: string;
  alleviatingFactors?: string[];
  aggravatingFactors?: string[];
  timing?: string;
}

export interface VitalSigns {
  temperature?: number;
  heartRate?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  respiratoryRate?: number;
  oxygenSaturation?: number;
  painScore?: number;
}

// ============================================================
// DIFFERENTIAL DIAGNOSIS RESULT
// ============================================================

export interface DifferentialDiagnosis {
  /** Diagnosis name (ICD-10 text) */
  diagnosis: string;

  /** ICD-10 code */
  icdCode?: string;

  /** Confidence score 0-100 */
  confidence: number;

  /** Clinical reasoning */
  reasoning: string;

  /** Supporting evidence from presentation */
  supportingFindings: string[];

  /** Findings that argue against this diagnosis */
  againstFindings: string[];

  /** Urgency level */
  urgency: 'emergent' | 'urgent' | 'routine';

  /** Red flags specific to this diagnosis */
  redFlags?: string[];

  /** Recommended workup */
  recommendedWorkup: {
    labs?: string[];
    imaging?: string[];
    procedures?: string[];
    consults?: string[];
  };

  /** Treatment considerations */
  treatmentConsiderations?: string[];

  /** Disposition recommendation */
  disposition?: 'discharge' | 'observation' | 'admit' | 'icu' | 'or';
}

/**
 * R2 match-provenance trace — describes what matched the chief complaint
 * in the prevalence / LR / boost systems, for auditability and miss analysis.
 * Every successful diagnosis result now carries one of these.
 */
export interface MatchProvenance {
  /** Prevalence category chosen by the routing scorer, or null if no category matched */
  prevalenceCategory: string | null;
  /** Top-N runner-up categories with their scores (empty if only one matched) */
  alternativeCategories: Array<{ category: string; score: number }>;
  /** Regex sources that triggered the chosen category */
  triggeredBy: string[];
  /** Whether the fallback SYMPTOM_DIAGNOSIS_MAP path was used */
  fallbackUsed: boolean;
  /** CC after all preprocessing (abbrev expand, synonym expand, LLM normalize) */
  effectiveCC: string;
  /** Preprocessing passes that fired */
  preprocessingApplied: string[];
}

export interface DifferentialDiagnosisResult {
  /** Generated differential diagnoses ranked by likelihood */
  differentials: DifferentialDiagnosis[];

  /** Most likely diagnosis */
  primaryDiagnosis: DifferentialDiagnosis;

  /** Critical diagnoses to rule out (can't miss) */
  mustRuleOut: DifferentialDiagnosis[];

  /** Overall clinical impression */
  clinicalImpression: string;

  /** Recommended next steps */
  recommendedActions: string[];

  /** Intelligent workup with evidence grades, priorities, and scoring tool results */
  intelligentWorkup?: IntelligentWorkup;

  /** AI model used */
  model: string;

  /** Confidence in overall assessment */
  overallConfidence: number;

  /** Generation timestamp */
  generatedAt: string;

  /** Request ID for feedback */
  requestId: string;

  /** R2: match-provenance trace for debugging and UI "why" drawer */
  matchProvenance?: MatchProvenance;
}

// ============================================================
// AI SERVICE CONFIG
// ============================================================

export interface AIServiceConfig {
  /** AI provider to use */
  provider: 'biomistral' | 'azure-openai' | 'anthropic' | 'local';

  /** API endpoint */
  endpoint?: string;

  /** API key */
  apiKey?: string;

  /** Model name */
  model?: string;

  /** Temperature for generation */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** Timeout in milliseconds */
  timeout?: number;
}

// ============================================================
// PROVIDER FEEDBACK
// ============================================================

export interface ProviderFeedback {
  /** Request ID from differential result */
  requestId: string;

  /** Provider's selected diagnosis */
  selectedDiagnosis: string;

  /** Was the AI helpful? */
  wasHelpful: boolean;

  /** Accuracy rating 1-5 */
  accuracyRating?: number;

  /** Comments */
  comments?: string;

  /** Final confirmed diagnosis (after workup) */
  confirmedDiagnosis?: string;
}
