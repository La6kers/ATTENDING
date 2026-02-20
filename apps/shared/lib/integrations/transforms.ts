// ============================================================
// ATTENDING AI - Data Transformation Pipeline
// apps/shared/lib/integrations/transforms.ts
//
// Bidirectional data transformation framework for mapping
// between ATTENDING internal models and external formats:
//
//   ATTENDING ↔ FHIR R4
//   ATTENDING ↔ HL7v2  (already in hl7v2.ts — this extends it)
//   ATTENDING ↔ CDA (C-CDA R2.1)
//   ATTENDING ↔ CSV/flat file (for legacy imports)
//
// Architecture: Pipeline of composable transform stages.
//
// Usage:
//   const pipeline = new TransformPipeline()
//     .add(validateStage)
//     .add(normalizeStage)
//     .add(mapToFhirStage)
//     .add(enrichStage);
//
//   const result = await pipeline.execute(inputData);
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface TransformContext {
  /** Source format identifier */
  sourceFormat: string;
  /** Target format identifier */
  targetFormat: string;
  /** Organization context */
  organizationId?: string;
  /** Processing metadata */
  metadata: Record<string, unknown>;
  /** Errors accumulated during transform */
  errors: TransformError[];
  /** Warnings accumulated during transform */
  warnings: string[];
}

export interface TransformError {
  stage: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface TransformResult<T = unknown> {
  success: boolean;
  data: T | null;
  errors: TransformError[];
  warnings: string[];
  metadata: Record<string, unknown>;
}

export type TransformStage<TIn = unknown, TOut = unknown> = {
  name: string;
  execute: (data: TIn, ctx: TransformContext) => Promise<TOut> | TOut;
};

// ============================================================
// PIPELINE
// ============================================================

export class TransformPipeline<TIn = unknown, TOut = unknown> {
  private stages: TransformStage[] = [];

  /** Add a transform stage to the pipeline */
  add<TStageOut>(stage: TransformStage<any, TStageOut>): TransformPipeline<TIn, TStageOut> {
    this.stages.push(stage);
    return this as any;
  }

  /** Execute the pipeline */
  async execute(
    input: TIn,
    options: {
      sourceFormat?: string;
      targetFormat?: string;
      organizationId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<TransformResult<TOut>> {
    const ctx: TransformContext = {
      sourceFormat: options.sourceFormat || 'unknown',
      targetFormat: options.targetFormat || 'unknown',
      organizationId: options.organizationId,
      metadata: options.metadata || {},
      errors: [],
      warnings: [],
    };

    let current: unknown = input;

    for (const stage of this.stages) {
      try {
        current = await stage.execute(current, ctx);

        // If stage returns null/undefined, abort pipeline
        if (current === null || current === undefined) {
          ctx.errors.push({
            stage: stage.name,
            message: 'Stage returned null — pipeline aborted',
            severity: 'error',
          });
          return {
            success: false,
            data: null,
            errors: ctx.errors,
            warnings: ctx.warnings,
            metadata: ctx.metadata,
          };
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        ctx.errors.push({
          stage: stage.name,
          message: err.message,
          severity: 'error',
        });
        return {
          success: false,
          data: null,
          errors: ctx.errors,
          warnings: ctx.warnings,
          metadata: ctx.metadata,
        };
      }
    }

    return {
      success: ctx.errors.filter(e => e.severity === 'error').length === 0,
      data: current as TOut,
      errors: ctx.errors,
      warnings: ctx.warnings,
      metadata: ctx.metadata,
    };
  }
}

// ============================================================
// PRE-BUILT STAGES
// ============================================================

/** Validate that required fields are present */
export function validateRequired(fields: string[]): TransformStage<Record<string, any>, Record<string, any>> {
  return {
    name: 'validate-required',
    execute: (data, ctx) => {
      for (const field of fields) {
        const value = getNestedValue(data, field);
        if (value === null || value === undefined || value === '') {
          ctx.errors.push({
            stage: 'validate-required',
            field,
            message: `Missing required field: ${field}`,
            severity: 'error',
          });
        }
      }
      return data;
    },
  };
}

/** Normalize text fields (trim, case normalization) */
export const normalizeText: TransformStage = {
  name: 'normalize-text',
  execute: (data: any) => {
    if (typeof data !== 'object' || !data) return data;
    return deepMap(data, (value, key) => {
      if (typeof value !== 'string') return value;
      let normalized = value.trim();
      // Normalize name fields to Title Case
      if (['firstName', 'lastName', 'middleName', 'city'].includes(key)) {
        normalized = normalized.replace(/\b\w/g, c => c.toUpperCase());
      }
      // Normalize state to uppercase
      if (key === 'state' && normalized.length === 2) {
        normalized = normalized.toUpperCase();
      }
      return normalized;
    });
  },
};

/** Normalize date fields to ISO 8601 */
export const normalizeDates: TransformStage = {
  name: 'normalize-dates',
  execute: (data: any, ctx) => {
    return deepMap(data, (value, key) => {
      if (typeof value !== 'string') return value;
      if (!isDateField(key)) return value;

      // Try to parse various date formats
      const parsed = parseFlexibleDate(value);
      if (parsed) return parsed;

      ctx.warnings.push(`Could not normalize date field "${key}": ${value}`);
      return value;
    });
  },
};

/** Normalize gender values */
export const normalizeGender: TransformStage = {
  name: 'normalize-gender',
  execute: (data: any) => {
    if (!data || typeof data !== 'object') return data;

    const genderMap: Record<string, string> = {
      'm': 'male', 'male': 'male', 'M': 'male',
      'f': 'female', 'female': 'female', 'F': 'female',
      'o': 'other', 'other': 'other', 'O': 'other',
      'u': 'unknown', 'unknown': 'unknown', 'U': 'unknown',
      'non-binary': 'other', 'nb': 'other', 'NB': 'other',
    };

    if (data.gender) {
      data.gender = genderMap[data.gender] || data.gender;
    }
    return data;
  },
};

/** Normalize phone numbers to E.164 */
export const normalizePhone: TransformStage = {
  name: 'normalize-phone',
  execute: (data: any) => {
    return deepMap(data, (value, key) => {
      if (typeof value !== 'string') return value;
      if (!['phone', 'homePhone', 'mobilePhone', 'workPhone', 'fax'].includes(key)) return value;

      // Strip non-digits
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) return `+1${digits}`;
      if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
      return value; // Return as-is if can't normalize
    });
  },
};

/** Strip PHI for de-identified exports */
export const stripPHI: TransformStage = {
  name: 'strip-phi',
  execute: (data: any) => {
    const phiFields = [
      'ssn', 'socialSecurityNumber', 'driversLicense',
      'insuranceNumber', 'creditCard', 'bankAccount',
    ];
    return deepMap(data, (value, key) => {
      if (phiFields.includes(key)) return '[REDACTED]';
      return value;
    });
  },
};

/** Map fields between schemas */
export function fieldMapper(mapping: Record<string, string | ((data: any) => any)>): TransformStage {
  return {
    name: 'field-mapper',
    execute: (data: any) => {
      const result: Record<string, any> = {};
      for (const [targetField, sourceOrFn] of Object.entries(mapping)) {
        if (typeof sourceOrFn === 'function') {
          result[targetField] = sourceOrFn(data);
        } else {
          result[targetField] = getNestedValue(data, sourceOrFn);
        }
      }
      return result;
    },
  };
}

/** Add computed/enriched fields */
export function enrichWith(
  enrichments: Record<string, (data: any, ctx: TransformContext) => any>
): TransformStage {
  return {
    name: 'enrich',
    execute: (data: any, ctx) => {
      const enriched = { ...data };
      for (const [field, compute] of Object.entries(enrichments)) {
        enriched[field] = compute(data, ctx);
      }
      return enriched;
    },
  };
}

/** Filter array items by predicate */
export function filterItems<T>(
  predicate: (item: T, ctx: TransformContext) => boolean
): TransformStage<T[], T[]> {
  return {
    name: 'filter-items',
    execute: (data, ctx) => data.filter(item => predicate(item, ctx)),
  };
}

/** Batch transform array items through a sub-pipeline */
export function batchTransform<TIn, TOut>(
  pipeline: TransformPipeline<TIn, TOut>
): TransformStage<TIn[], TransformResult<TOut>[]> {
  return {
    name: 'batch-transform',
    execute: async (items) => {
      const results: TransformResult<TOut>[] = [];
      for (const item of items) {
        results.push(await pipeline.execute(item));
      }
      return results;
    },
  };
}

// ============================================================
// PRE-BUILT PIPELINES
// ============================================================

/** Patient import pipeline: CSV/flat → ATTENDING format */
export function patientImportPipeline(): TransformPipeline {
  return new TransformPipeline()
    .add(normalizeText)
    .add(normalizeDates)
    .add(normalizeGender)
    .add(normalizePhone)
    .add(validateRequired(['firstName', 'lastName', 'dateOfBirth']))
    .add(fieldMapper({
      mrn: 'mrn',
      firstName: 'firstName',
      lastName: 'lastName',
      middleName: 'middleName',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      zipCode: (d: any) => d.zipCode || d.zip || d.postalCode,
    }));
}

/** Lab result import pipeline: external → ATTENDING format */
export function labResultImportPipeline(): TransformPipeline {
  return new TransformPipeline()
    .add(normalizeText)
    .add(normalizeDates)
    .add(validateRequired(['testCode', 'value', 'patientId']))
    .add(enrichWith({
      interpretation: (data: any) => {
        // Auto-interpret based on reference range
        if (!data.referenceRange || !data.value) return null;
        const val = parseFloat(data.value);
        if (isNaN(val)) return null;
        const match = data.referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
        if (!match) return null;
        const [, low, high] = match.map(Number);
        if (val < low * 0.5) return 'CRITICAL_LOW';
        if (val < low) return 'LOW';
        if (val > high * 2) return 'CRITICAL_HIGH';
        if (val > high) return 'HIGH';
        return 'NORMAL';
      },
    }));
}

/** De-identified export pipeline */
export function deidentifiedExportPipeline(): TransformPipeline {
  return new TransformPipeline()
    .add(stripPHI)
    .add({
      name: 'redact-dates',
      execute: (data: any) => {
        // Shift dates by random offset (±30 days) for de-identification
        return deepMap(data, (value, key) => {
          if (!isDateField(key) || typeof value !== 'string') return value;
          try {
            const date = new Date(value);
            const offset = Math.floor(Math.random() * 60 - 30) * 86400000;
            return new Date(date.getTime() + offset).toISOString().slice(0, 10);
          } catch {
            return value;
          }
        });
      },
    })
    .add({
      name: 'truncate-zip',
      execute: (data: any) => {
        // Truncate zip to 3 digits per Safe Harbor
        if (data.zipCode) data.zipCode = data.zipCode.slice(0, 3) + '00';
        if (data.zip) data.zip = data.zip.slice(0, 3) + '00';
        return data;
      },
    });
}

// ============================================================
// UTILITIES
// ============================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function deepMap(
  obj: any,
  fn: (value: any, key: string) => any,
  parentKey = ''
): any {
  if (Array.isArray(obj)) {
    return obj.map((item, i) => deepMap(item, fn, `${parentKey}[${i}]`));
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepMap(fn(value, key), fn, key);
    }
    return result;
  }
  return obj;
}

function isDateField(key: string): boolean {
  const dateFields = [
    'dateOfBirth', 'dob', 'birthDate', 'onsetDate', 'orderedAt',
    'startTime', 'endTime', 'performedAt', 'reportedAt', 'createdAt',
    'updatedAt', 'recordedAt', 'expiresAt', 'completedAt',
  ];
  return dateFields.includes(key) || key.endsWith('Date') || key.endsWith('At');
}

function parseFlexibleDate(value: string): string | null {
  // ISO 8601
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;

  // HL7 format: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  // US format: MM/DD/YYYY
  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try native Date parsing as last resort
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch { /* ignore */ }

  return null;
}

export default TransformPipeline;
