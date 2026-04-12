// ============================================================
// Imaging Order Validation Schema
// apps/shared/schemas/imaging-order.schema.ts
// ============================================================

import { z } from 'zod';

export const ImagingPrioritySchema = z.enum(['STAT', 'URGENT', 'ROUTINE']);

export const ImagingModalitySchema = z.enum([
  'CT', 'MRI', 'XRAY', 'US', 'NM', 'FLUORO', 'MAMMO', 'DEXA'
]);

export const LateralitySchema = z.enum(['left', 'right', 'bilateral', 'none']);

export const CreateImagingOrderSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  studyType: z.string().min(1, 'Study type is required'),
  studyName: z.string().min(1, 'Study name is required'),
  bodyPart: z.string().min(1, 'Body part is required'),
  laterality: LateralitySchema.optional(),
  priority: ImagingPrioritySchema.default('ROUTINE'),
  indication: z.string().min(1, 'Clinical indication is required'),
  clinicalHistory: z.string().optional(),
  contrast: z.boolean().default(false),
  contrastType: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const UpdateImagingOrderSchema = z.object({
  status: z.enum(['PENDING', 'ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  priority: ImagingPrioritySchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const ImagingReportSchema = z.object({
  report: z.string().min(1, 'Report text is required'),
  impression: z.string().min(1, 'Impression is required'),
  findings: z.string().optional(),
  radiologist: z.string().optional(),
});

export type ImagingPriority = z.infer<typeof ImagingPrioritySchema>;
export type ImagingModality = z.infer<typeof ImagingModalitySchema>;
export type Laterality = z.infer<typeof LateralitySchema>;
export type CreateImagingOrder = z.infer<typeof CreateImagingOrderSchema>;
export type UpdateImagingOrder = z.infer<typeof UpdateImagingOrderSchema>;
export type ImagingReport = z.infer<typeof ImagingReportSchema>;
