// ============================================================
// Patient Assessment Validation Schema
// apps/shared/schemas/assessment.schema.ts
// ============================================================

import { z } from 'zod';

export const UrgencyLevelSchema = z.enum(['standard', 'moderate', 'high', 'emergency']);

export const AssessmentStatusSchema = z.enum([
  'in_progress',
  'pending', 
  'urgent',
  'in_review',
  'completed',
  'follow_up',
  'cancelled'
]);

export const DiagnosisSchema = z.object({
  name: z.string().min(1, 'Diagnosis name is required'),
  icd10Code: z.string().optional(),
  probability: z.number().min(0).max(1).optional(),
  supportingEvidence: z.array(z.string()).default([]),
  isPrimary: z.boolean().default(false),
});

export const HPIDataSchema = z.object({
  onset: z.string().optional(),
  location: z.string().optional(),
  duration: z.string().optional(),
  character: z.string().optional(),
  severity: z.number().min(1).max(10).optional(),
  aggravatingFactors: z.array(z.string()).default([]),
  relievingFactors: z.array(z.string()).default([]),
  timing: z.string().optional(),
  associatedSymptoms: z.array(z.string()).default([]),
});

export const SubmitAssessmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  patientAge: z.number().min(0).max(150),
  patientGender: z.string().min(1),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  urgencyLevel: UrgencyLevelSchema.default('standard'),
  redFlags: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  differentialDiagnosis: z.array(DiagnosisSchema).default([]),
  hpiData: HPIDataSchema.optional(),
  medicalHistory: z.object({
    conditions: z.array(z.string()).default([]),
    medications: z.array(z.string()).default([]),
    allergies: z.array(z.string()).default([]),
    surgeries: z.array(z.string()).default([]),
  }).optional(),
  sessionId: z.string().optional(),
  compassVersion: z.string().optional(),
});

export const UpdateAssessmentSchema = z.object({
  status: AssessmentStatusSchema.optional(),
  assignedProviderId: z.string().optional(),
  urgencyLevel: UrgencyLevelSchema.optional(),
});

export const CompleteAssessmentSchema = z.object({
  providerNotes: z.string().min(1, 'Provider notes are required'),
  confirmedDiagnoses: z.array(DiagnosisSchema).min(1, 'At least one diagnosis is required'),
  icdCodes: z.array(z.string()).default([]),
  treatmentPlan: z.string().min(1, 'Treatment plan is required'),
  followUpInstructions: z.string().optional(),
  ordersPlaced: z.array(z.string()).default([]),
});

export const AssessmentQuerySchema = z.object({
  status: AssessmentStatusSchema.optional(),
  urgencyLevel: UrgencyLevelSchema.optional(),
  assignedProviderId: z.string().optional(),
  patientId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;
export type AssessmentStatus = z.infer<typeof AssessmentStatusSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type HPIData = z.infer<typeof HPIDataSchema>;
export type SubmitAssessment = z.infer<typeof SubmitAssessmentSchema>;
export type UpdateAssessment = z.infer<typeof UpdateAssessmentSchema>;
export type CompleteAssessment = z.infer<typeof CompleteAssessmentSchema>;
export type AssessmentQuery = z.infer<typeof AssessmentQuerySchema>;
