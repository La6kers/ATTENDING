// ============================================================
// Lab Order Validation Schema
// apps/shared/schemas/lab-order.schema.ts
// ============================================================

import { z } from 'zod';

export const LabPrioritySchema = z.enum(['STAT', 'ASAP', 'ROUTINE']);

export const LabCategorySchema = z.enum([
  'hematology',
  'chemistry', 
  'endocrine',
  'coagulation',
  'microbiology',
  'urinalysis',
  'immunology',
  'toxicology',
  'other'
]);

export const LabTestSchema = z.object({
  code: z.string().min(1, 'Test code is required'),
  name: z.string().min(1, 'Test name is required'),
  category: LabCategorySchema.optional(),
  specimenType: z.string().optional(),
  priority: LabPrioritySchema.default('ROUTINE'),
});

export const CreateLabOrderSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  tests: z.array(LabTestSchema).min(1, 'At least one test is required'),
  indication: z.string().min(1, 'Clinical indication is required'),
  priority: LabPrioritySchema.default('ROUTINE'),
  specialInstructions: z.string().optional(),
  collectionDate: z.string().datetime().optional(),
});

export const UpdateLabOrderSchema = z.object({
  status: z.enum(['PENDING', 'ORDERED', 'IN_PROGRESS', 'COLLECTED', 'RESULTED', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  priority: LabPrioritySchema.optional(),
  notes: z.string().optional(),
});

export const LabResultSchema = z.object({
  analyte: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  isAbnormal: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  interpretation: z.string().optional(),
  notes: z.string().optional(),
});

export type LabPriority = z.infer<typeof LabPrioritySchema>;
export type LabCategory = z.infer<typeof LabCategorySchema>;
export type LabTest = z.infer<typeof LabTestSchema>;
export type CreateLabOrder = z.infer<typeof CreateLabOrderSchema>;
export type UpdateLabOrder = z.infer<typeof UpdateLabOrderSchema>;
export type LabResult = z.infer<typeof LabResultSchema>;
