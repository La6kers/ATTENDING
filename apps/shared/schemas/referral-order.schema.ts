// ============================================================
// Referral Order Validation Schema
// apps/shared/schemas/referral-order.schema.ts
// ============================================================

import { z } from 'zod';

export const ReferralPrioritySchema = z.enum(['STAT', 'URGENT', 'ROUTINE']);

export const ReferralStatusSchema = z.enum([
  'PENDING',
  'SENT', 
  'RECEIVED',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'DENIED'
]);

export const SpecialtySchema = z.enum([
  'ALLERGY',
  'CARDS',
  'DERM',
  'ENDO',
  'ENT',
  'GI',
  'HEME',
  'ID',
  'NEURO',
  'NEPHRO',
  'OB',
  'ONCO',
  'OPHTH',
  'ORTHO',
  'PAIN',
  'PSYCH',
  'PULM',
  'RHEUM',
  'SURG',
  'URO',
  'OTHER'
]);

export const CreateReferralSchema = z.object({
  encounterId: z.string().min(1, 'Encounter ID is required'),
  patientId: z.string().optional(),
  specialty: z.string().min(1, 'Specialty is required'),
  specialtyName: z.string().optional(),
  urgency: ReferralPrioritySchema.default('ROUTINE'),
  preferredProviderId: z.string().optional(),
  clinicalQuestion: z.string().min(1, 'Clinical question is required'),
  relevantHistory: z.string().optional(),
  attachedDocuments: z.array(z.string()).default([]),
  priorAuthRequired: z.boolean().default(false),
});

export const UpdateReferralSchema = z.object({
  status: ReferralStatusSchema.optional(),
  urgency: ReferralPrioritySchema.optional(),
  appointmentDate: z.string().datetime().optional(),
  appointmentTime: z.string().optional(),
  consultNote: z.string().optional(),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

export type ReferralPriority = z.infer<typeof ReferralPrioritySchema>;
export type ReferralStatus = z.infer<typeof ReferralStatusSchema>;
export type Specialty = z.infer<typeof SpecialtySchema>;
export type CreateReferral = z.infer<typeof CreateReferralSchema>;
export type UpdateReferral = z.infer<typeof UpdateReferralSchema>;
