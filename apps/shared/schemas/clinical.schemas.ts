// ============================================================
// ATTENDING AI - Clinical Data Validation Schemas (Zod)
// apps/shared/schemas/clinical.schemas.ts
//
// Type-safe validation for all clinical data inputs
// Includes:
// - Patient demographics
// - Vital signs
// - Clinical assessments
// - Orders (labs, imaging, medications, referrals)
// - Red flag evaluation requests
//
// HIPAA Compliance:
// - Validates PHI format before storage
// - Prevents injection attacks
// - Enforces data integrity
// ============================================================

import { z } from 'zod';

// ============================================================
// COMMON VALIDATION HELPERS
// ============================================================

// ICD-10 code pattern (e.g., E11.9, I25.10)
const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;

// LOINC code pattern (e.g., 4548-4)
const loincPattern = /^\d{4,5}-\d$/;

// CPT code pattern (4-5 digits)
const cptPattern = /^\d{4,5}$/;

// NPI number (10 digits)
const npiPattern = /^\d{10}$/;

// MRN pattern (alphanumeric, 6-20 characters)
const mrnPattern = /^[A-Z0-9]{6,20}$/i;

// Phone number (US format)
const phonePattern = /^\+?1?\d{10,14}$/;

// Email validation
const emailSchema = z.string().email('Invalid email format');

// Safe text (no script tags or dangerous characters)
const safeTextSchema = z.string()
  .max(10000)
  .refine(
    (val) => !/<script/i.test(val) && !/javascript:/i.test(val) && !/on\w+=/i.test(val),
    { message: 'Text contains potentially unsafe content' }
  );

// ============================================================
// PATIENT SCHEMAS
// ============================================================

export const PatientDemographicsSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  middleName: z.string().max(100).trim().optional(),
  dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future'),
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  email: emailSchema.optional(),
  phone: z.string().regex(phonePattern, 'Invalid phone number format').optional(),
  mrn: z.string().regex(mrnPattern, 'Invalid MRN format').optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2).optional(),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code').optional(),
  }).optional(),
  preferredLanguage: z.string().max(50).default('en'),
  emergencyContact: z.object({
    name: z.string().max(100),
    relationship: z.string().max(50),
    phone: z.string().regex(phonePattern),
  }).optional(),
});

export type PatientDemographics = z.infer<typeof PatientDemographicsSchema>;

// ============================================================
// VITAL SIGNS SCHEMAS
// ============================================================

export const VitalSignsSchema = z.object({
  heartRate: z.number()
    .min(20, 'Heart rate too low')
    .max(300, 'Heart rate too high')
    .optional(),
  bloodPressure: z.object({
    systolic: z.number().min(40).max(300),
    diastolic: z.number().min(20).max(200),
  }).optional(),
  bloodPressureSystolic: z.number().min(40).max(300).optional(),
  bloodPressureDiastolic: z.number().min(20).max(200).optional(),
  respiratoryRate: z.number()
    .min(4, 'Respiratory rate too low')
    .max(60, 'Respiratory rate too high')
    .optional(),
  temperature: z.number()
    .min(25, 'Temperature too low')
    .max(45, 'Temperature too high')
    .optional(),
  temperatureUnit: z.enum(['C', 'F']).default('F'),
  oxygenSaturation: z.number()
    .min(0)
    .max(100, 'Oxygen saturation must be 0-100%')
    .optional(),
  painLevel: z.number()
    .min(0)
    .max(10, 'Pain level must be 0-10')
    .optional(),
  weight: z.number().min(0).max(700).optional(),
  weightUnit: z.enum(['kg', 'lbs']).default('lbs'),
  height: z.number().min(0).max(300).optional(),
  heightUnit: z.enum(['cm', 'in']).default('in'),
  bloodGlucose: z.number().min(0).max(2000).optional(),
  recordedAt: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.bloodPressure) {
      return data.bloodPressure.systolic > data.bloodPressure.diastolic;
    }
    if (data.bloodPressureSystolic && data.bloodPressureDiastolic) {
      return data.bloodPressureSystolic > data.bloodPressureDiastolic;
    }
    return true;
  },
  { message: 'Systolic must be greater than diastolic blood pressure' }
);

export type VitalSigns = z.infer<typeof VitalSignsSchema>;

// ============================================================
// SYMPTOM SCHEMAS
// ============================================================

export const SymptomSchema = z.object({
  id: z.string().optional(),
  name: safeTextSchema.min(1).max(200),
  severity: z.enum(['mild', 'moderate', 'severe']).default('moderate'),
  duration: z.string().max(100).optional(),
  onset: z.enum(['sudden', 'gradual', 'unknown']).optional(),
  location: z.string().max(100).optional(),
  quality: z.string().max(100).optional(),
  radiation: z.string().max(100).optional(),
  aggravatedBy: z.array(z.string().max(100)).optional(),
  relievedBy: z.array(z.string().max(100)).optional(),
  associatedSymptoms: z.array(z.string().max(100)).optional(),
  timing: z.string().max(100).optional(),
  notes: safeTextSchema.max(1000).optional(),
});

export type Symptom = z.infer<typeof SymptomSchema>;

// ============================================================
// CLINICAL ASSESSMENT SCHEMAS
// ============================================================

export const ChiefComplaintSchema = z.object({
  complaint: safeTextSchema.min(1).max(500),
  onset: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
});

export const ClinicalAssessmentSchema = z.object({
  patientId: z.string().min(1),
  chiefComplaint: ChiefComplaintSchema,
  symptoms: z.array(SymptomSchema).default([]),
  historyOfPresentIllness: safeTextSchema.max(5000).optional(),
  
  // Review of Systems
  reviewOfSystems: z.record(z.array(z.string())).optional(),
  
  // History
  medicalHistory: z.array(z.string().max(200)).optional(),
  surgicalHistory: z.array(z.string().max(200)).optional(),
  medications: z.array(z.object({
    name: z.string().max(200),
    dose: z.string().max(100).optional(),
    frequency: z.string().max(100).optional(),
  })).optional(),
  allergies: z.array(z.object({
    allergen: z.string().max(200),
    reaction: z.string().max(200).optional(),
    severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  })).optional(),
  familyHistory: safeTextSchema.max(2000).optional(),
  socialHistory: z.object({
    smoking: z.enum(['current', 'former', 'never', 'unknown']).optional(),
    alcohol: z.string().max(200).optional(),
    drugs: z.string().max(200).optional(),
    occupation: z.string().max(200).optional(),
  }).optional(),
  
  // Vital signs at time of assessment
  vitalSigns: VitalSignsSchema.optional(),
  
  // Session info
  sessionId: z.string().optional(),
  assignedProviderId: z.string().optional(),
});

export type ClinicalAssessment = z.infer<typeof ClinicalAssessmentSchema>;

// ============================================================
// RED FLAG REQUEST SCHEMA
// ============================================================

export const RedFlagRequestSchema = z.object({
  symptoms: z.array(z.string().max(500)).min(0),
  chiefComplaint: safeTextSchema.max(1000).optional(),
  vitalSigns: z.object({
    heartRate: z.number().min(20).max(300).optional(),
    systolicBP: z.number().min(40).max(300).optional(),
    diastolicBP: z.number().min(20).max(200).optional(),
    respiratoryRate: z.number().min(4).max(60).optional(),
    temperature: z.number().min(25).max(45).optional(),
    oxygenSaturation: z.number().min(0).max(100).optional(),
    painLevel: z.number().min(0).max(10).optional(),
  }).optional(),
  patientAge: z.number().min(0).max(150).optional(),
  medicalHistory: z.array(z.string().max(200)).optional(),
  mentalStatus: z.enum(['alert', 'confused', 'lethargic', 'unresponsive']).optional(),
  onsetDuration: z.string().max(100).optional(),
  progression: z.enum(['improving', 'stable', 'worsening', 'rapidly-worsening']).optional(),
}).refine(
  (data) => data.symptoms.length > 0 || data.chiefComplaint,
  { message: 'Either symptoms or chiefComplaint is required' }
);

export type RedFlagRequest = z.infer<typeof RedFlagRequestSchema>;

// ============================================================
// LAB ORDER SCHEMAS
// ============================================================

export const LabOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  tests: z.array(z.object({
    testCode: z.string().max(50),
    testName: z.string().max(200),
    loincCode: z.string().regex(loincPattern).optional(),
    cptCode: z.string().regex(cptPattern).optional(),
    category: z.string().max(100).optional(),
  })).min(1, 'At least one test is required'),
  priority: z.enum(['STAT', 'ASAP', 'ROUTINE', 'TIMED']).default('ROUTINE'),
  indication: safeTextSchema.max(500),
  specialInstructions: safeTextSchema.max(1000).optional(),
  specimenType: z.string().max(100).optional(),
  collectionDate: z.coerce.date().optional(),
  fasting: z.boolean().optional(),
  diagnosis: z.array(z.object({
    code: z.string().regex(icd10Pattern),
    description: z.string().max(500),
  })).optional(),
});

export type LabOrder = z.infer<typeof LabOrderSchema>;

// ============================================================
// IMAGING ORDER SCHEMAS
// ============================================================

export const ImagingOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  studyType: z.enum([
    'X-RAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'NUCLEAR', 
    'MAMMOGRAM', 'FLUOROSCOPY', 'DEXA'
  ]),
  studyName: z.string().max(200),
  bodyPart: z.string().max(100),
  laterality: z.enum(['LEFT', 'RIGHT', 'BILATERAL', 'NA']).optional(),
  priority: z.enum(['STAT', 'URGENT', 'ROUTINE']).default('ROUTINE'),
  indication: safeTextSchema.min(1).max(1000),
  clinicalHistory: safeTextSchema.max(2000).optional(),
  contrast: z.boolean().default(false),
  contrastType: z.string().max(100).optional(),
  contrastAllergy: z.boolean().optional(),
  pregnancy: z.enum(['yes', 'no', 'unknown', 'na']).optional(),
  specialInstructions: safeTextSchema.max(1000).optional(),
  diagnosis: z.array(z.object({
    code: z.string().regex(icd10Pattern),
    description: z.string().max(500),
  })).min(1, 'At least one diagnosis is required'),
  priorAuthRequired: z.boolean().optional(),
});

export type ImagingOrder = z.infer<typeof ImagingOrderSchema>;

// ============================================================
// MEDICATION ORDER SCHEMAS
// ============================================================

export const MedicationOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  medicationName: z.string().min(1).max(200),
  genericName: z.string().max(200).optional(),
  rxnormCode: z.string().max(20).optional(),
  ndcCode: z.string().max(20).optional(),
  dose: z.string().min(1).max(50),
  doseUnit: z.string().max(20).optional(),
  frequency: z.string().min(1).max(50),
  route: z.enum([
    'PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'TOPICAL', 'INHALED',
    'OPHTHALMIC', 'OTIC', 'NASAL', 'TRANSDERMAL', 'OTHER'
  ]),
  duration: z.string().max(50).optional(),
  quantity: z.number().min(1).max(9999).optional(),
  refills: z.number().min(0).max(99).default(0),
  indication: safeTextSchema.min(1).max(500),
  instructions: safeTextSchema.max(1000).optional(),
  isControlled: z.boolean().default(false),
  deaSchedule: z.enum(['II', 'III', 'IV', 'V']).optional(),
  dispenseAsWritten: z.boolean().default(false),
  substitutionAllowed: z.boolean().default(true),
  priorAuthRequired: z.boolean().optional(),
  diagnosis: z.array(z.object({
    code: z.string().regex(icd10Pattern),
    description: z.string().max(500),
  })).optional(),
}).refine(
  (data) => {
    if (data.isControlled && !data.deaSchedule) {
      return false;
    }
    return true;
  },
  { message: 'DEA schedule is required for controlled substances' }
);

export type MedicationOrder = z.infer<typeof MedicationOrderSchema>;

// ============================================================
// REFERRAL ORDER SCHEMAS
// ============================================================

export const ReferralOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  specialty: z.string().min(1).max(100),
  subspecialty: z.string().max(100).optional(),
  urgency: z.enum(['STAT', 'URGENT', 'ROUTINE', 'ELECTIVE']).default('ROUTINE'),
  reason: safeTextSchema.min(1).max(1000),
  clinicalSummary: safeTextSchema.max(5000).optional(),
  specificQuestions: safeTextSchema.max(2000).optional(),
  preferredProvider: z.string().max(200).optional(),
  preferredFacility: z.string().max(200).optional(),
  preferredLocation: z.string().max(200).optional(),
  diagnosis: z.array(z.object({
    code: z.string().regex(icd10Pattern),
    description: z.string().max(500),
    isPrimary: z.boolean().optional(),
  })).min(1, 'At least one diagnosis is required'),
  relevantLabs: z.array(z.string().max(500)).optional(),
  relevantImaging: z.array(z.string().max(500)).optional(),
  insurancePreAuth: z.boolean().optional(),
});

export type ReferralOrder = z.infer<typeof ReferralOrderSchema>;

// ============================================================
// TREATMENT PLAN SCHEMAS
// ============================================================

export const TreatmentPlanSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1),
  diagnoses: z.array(z.object({
    code: z.string().regex(icd10Pattern),
    description: z.string().max(500),
    isPrimary: z.boolean().optional(),
  })).min(1),
  chiefComplaint: safeTextSchema.max(500).optional(),
  clinicalSummary: safeTextSchema.max(5000).optional(),
  labOrders: z.array(LabOrderSchema).optional(),
  imagingOrders: z.array(ImagingOrderSchema).optional(),
  medicationOrders: z.array(MedicationOrderSchema).optional(),
  referralOrders: z.array(ReferralOrderSchema).optional(),
  followUpSchedule: z.array(z.object({
    interval: z.string().max(50),
    reason: z.string().max(200),
    specialty: z.string().max(100).optional(),
  })).optional(),
  patientEducation: z.array(z.string().max(500)).optional(),
  returnPrecautions: z.array(z.string().max(500)).optional(),
  additionalInstructions: safeTextSchema.max(2000).optional(),
});

export type TreatmentPlan = z.infer<typeof TreatmentPlanSchema>;

// ============================================================
// DRUG INTERACTION CHECK SCHEMA
// ============================================================

export const DrugInteractionCheckSchema = z.object({
  medications: z.array(z.string().max(200)).min(1),
  newMedication: z.string().max(200).optional(),
  allergies: z.array(z.string().max(200)).optional(),
  patientAge: z.number().min(0).max(150).optional(),
  renalFunction: z.number().min(0).max(200).optional(), // eGFR
  hepaticFunction: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
  pregnancy: z.boolean().optional(),
  breastfeeding: z.boolean().optional(),
});

export type DrugInteractionCheck = z.infer<typeof DrugInteractionCheckSchema>;

// ============================================================
// PAGINATION SCHEMAS
// ============================================================

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// ============================================================
// SEARCH SCHEMAS
// ============================================================

export const PatientSearchSchema = z.object({
  query: z.string().max(100).optional(),
  mrn: z.string().regex(mrnPattern).optional(),
  lastName: z.string().max(100).optional(),
  firstName: z.string().max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().regex(phonePattern).optional(),
}).refine(
  (data) => data.query || data.mrn || data.lastName || data.firstName || data.dateOfBirth || data.phone,
  { message: 'At least one search parameter is required' }
);

export type PatientSearch = z.infer<typeof PatientSearchSchema>;

// ============================================================
// VALIDATION UTILITY FUNCTIONS
// ============================================================

/**
 * Validate and parse data with Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['issues'] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error.issues };
}

/**
 * Extract user-friendly error messages from Zod errors
 */
export function formatZodErrors(errors: z.ZodError['issues']): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const error of errors) {
    const path = error.path.join('.');
    formatted[path] = error.message;
  }
  
  return formatted;
}

// ============================================================
// EXPORTS
// ============================================================

export {
  safeTextSchema,
  emailSchema,
  icd10Pattern,
  loincPattern,
  cptPattern,
  npiPattern,
  mrnPattern,
  phonePattern,
};
