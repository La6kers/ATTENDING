// ============================================================
// ATTENDING AI - Schema Exports
// apps/shared/schemas/index.ts
//
// All Zod validation schemas and helpers.
// Import as: import { CreateLabOrderSchema, validate } from '@attending/shared/schemas';
// ============================================================

// Validation utilities
export {
  validate,
  validateOrThrow,
  validateRequest,
  validateQuery,
  ValidationError,
} from './validation';

// Clinical schemas (patients, vitals, assessments, etc.)
export * from './clinical.schemas';

// Order schemas
export * from './lab-order.schema';
export * from './imaging-order.schema';
export * from './referral-order.schema';

// Assessment schemas
export * from './assessment.schema';
