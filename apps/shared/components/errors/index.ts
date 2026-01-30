// ============================================================
// ATTENDING AI - Error Handling Components
// apps/shared/components/errors/index.ts
// ============================================================

export { 
  default as ErrorBoundary,
  ErrorBoundary as GenericErrorBoundary,
} from './ErrorBoundary';

export { 
  ClinicalErrorBoundary,
  CriticalClinicalBoundary,
  ManualReviewRequired,
  withClinicalErrorBoundary,
  type ClinicalErrorBoundaryProps,
  type CriticalClinicalBoundaryProps,
  type ManualReviewRequiredProps,
} from './ClinicalErrorBoundary';
