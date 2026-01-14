// ============================================================
// Shared Schemas - Barrel Export
// apps/shared/schemas/index.ts
// ============================================================

// Lab Order Schemas
export {
  LabPrioritySchema,
  LabCategorySchema,
  LabTestSchema,
  CreateLabOrderSchema,
  UpdateLabOrderSchema,
  LabResultSchema,
  type LabPriority,
  type LabCategory,
  type LabTest,
  type CreateLabOrder,
  type UpdateLabOrder,
  type LabResult,
} from './lab-order.schema';

// Imaging Order Schemas
export {
  ImagingPrioritySchema,
  ImagingModalitySchema,
  LateralitySchema,
  CreateImagingOrderSchema,
  UpdateImagingOrderSchema,
  ImagingReportSchema,
  type ImagingPriority,
  type ImagingModality,
  type Laterality,
  type CreateImagingOrder,
  type UpdateImagingOrder,
  type ImagingReport,
} from './imaging-order.schema';

// Assessment Schemas
export {
  UrgencyLevelSchema,
  AssessmentStatusSchema,
  DiagnosisSchema,
  HPIDataSchema,
  SubmitAssessmentSchema,
  UpdateAssessmentSchema,
  CompleteAssessmentSchema,
  AssessmentQuerySchema,
  type UrgencyLevel,
  type AssessmentStatus,
  type Diagnosis,
  type HPIData,
  type SubmitAssessment,
  type UpdateAssessment,
  type CompleteAssessment,
  type AssessmentQuery,
} from './assessment.schema';

// Referral Schemas
export {
  ReferralPrioritySchema,
  ReferralStatusSchema,
  SpecialtySchema,
  CreateReferralSchema,
  UpdateReferralSchema,
  type ReferralPriority,
  type ReferralStatus,
  type Specialty,
  type CreateReferral,
  type UpdateReferral,
} from './referral-order.schema';

// Validation Helper
export { validate, validateOrThrow, ValidationError } from './validation';
