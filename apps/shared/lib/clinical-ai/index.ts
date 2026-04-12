// =============================================================================
// ATTENDING AI - Clinical AI Module Exports
// apps/shared/lib/clinical-ai/index.ts
// =============================================================================

// Types
export * from './types';

// Red Flag Detection
export {
  RED_FLAGS,
  RED_FLAG_RULES_VERSION,
  evaluateRedFlags,
  hasImmediateRedFlags,
  getRedFlagsByCategory,
  getActionableRedFlags,
  formatRedFlagAlert,
  expandWithSynonyms,
  extractKeywords,
} from './redFlagDetection';

// Text-Based Red Flag Evaluator (offline-first, zero network dependency)
export {
  evaluateTextForRedFlags,
  type TextRedFlagResult,
  type TextRedFlagMatch,
} from './redFlagTextEvaluator';

// BioMistral Client
export {
  BioMistralClient,
  getClinicalAIClient,
  resetClinicalAIClient,
} from './BioMistralClient';

// Provider & Components
export {
  ClinicalAIProvider,
  useClinicalAIContext,
  ClinicalAIContext,
  RedFlagAlert,
  AnalysisStatus,
} from './ClinicalAIProvider';

// Hooks - Analysis
export {
  useClinicalAnalysis,
  useRedFlagEvaluation,
  useImmediateRedFlagCheck,
  useRealTimeRedFlagMonitor,
} from './hooks';

// Hooks - Differential Diagnosis
export {
  useDifferentialDiagnosis,
  useDiagnosisProbabilities,
} from './hooks';

// Hooks - Treatment
export {
  useTreatmentPlan,
  useTreatmentRecommendationsByCategory,
} from './hooks';

// Hooks - Tests
export { useRecommendedTests } from './hooks';

// Hooks - Reference
export {
  useRedFlagReference,
  useRedFlagCategories,
} from './hooks';

// Hooks - History & Audit
export {
  useAnalysisHistory,
  useClinicalSummary,
  useAuditLog,
} from './hooks';
