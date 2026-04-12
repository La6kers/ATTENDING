// =============================================================================
// ATTENDING AI - AI Governance Package
// packages/ai-governance/src/index.ts
//
// AI transparency, content classification, audit logging, model governance
// Required for CMS HTE conversational AI certification
// =============================================================================

// Disclaimers
export { DISCLAIMERS, getDisclaimer, attachDisclaimer } from './disclaimers/templates';
export type { Disclaimer, DisclaimerLevel } from './disclaimers/templates';

// Content Classification
export { ContentClassifier } from './classification/ContentClassifier';
export type {
  ContentClassification,
  ClassificationResult,
  ClassificationContext,
  ClassificationSignal,
} from './classification/ContentClassifier';

// Audit Logging
export { AIRecommendationLogger } from './audit/AIRecommendationLog';
export type {
  AIRecommendationEntry,
  RecommendationType,
  ReviewStatus,
  ReviewAction,
  ReviewUpdate,
  AIAuditStorage,
  AIAuditMetrics,
} from './audit/AIRecommendationLog';

// Model Governance
export { ModelRegistry } from './governance/ModelRegistry';
export type {
  AIModel,
  ModelCapability,
  ValidationMetrics,
  BiasAssessment,
  SafetyRecord,
  ModelGovernanceReport,
} from './governance/ModelRegistry';
