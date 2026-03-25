// ============================================================
// ATTENDING AI - AI Services Index
// apps/shared/lib/ai/index.ts
//
// Central export for all AI-powered clinical services
// ============================================================

// Differential Diagnosis Service
export {
  DifferentialDiagnosisService,
  differentialDiagnosisService,
  type PatientPresentation,
  type Symptom,
  type VitalSigns,
  type DifferentialDiagnosis,
  type DifferentialDiagnosisResult,
  type AIServiceConfig,
  type ProviderFeedback,
} from './differentialDiagnosis';

// Default export
export { differentialDiagnosisService as default } from './differentialDiagnosis';
