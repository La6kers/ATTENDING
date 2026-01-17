// ============================================================
// Validation Helper Utilities
// apps/shared/schemas/validation.ts
// ============================================================

import { z, ZodSchema, ZodError } from 'zod';
import type { NextApiResponse } from 'next';

/**
 * Custom validation error for API responses
 */
export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  public readonly flatErrors: z.typeToFlattenedError<unknown, string>;
  
  constructor(zodError: ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = zodError.issues;
    this.flatErrors = zodError.flatten();
  }

  /**
   * Format errors for API response
   */
  toJSON() {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: this.flatErrors.fieldErrors,
      formErrors: this.flatErrors.formErrors,
    };
  }
}

/**
 * Validate data against a Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, error: new ValidationError(result.error) };
}

/**
 * Validate data and throw if invalid
 * Use in try/catch blocks
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data;
}

/**
 * API route helper - validates request body and handles error response
 * Returns validated data or sends 400 response and returns null
 */
export async function validateRequest<T>(
  schema: ZodSchema<T>,
  body: unknown,
  res: NextApiResponse
): Promise<T | null> {
  const result = validate(schema, body);
  
  if (!result.success) {
    res.status(400).json(result.error.toJSON());
    return null;
  }
  
  return result.data;
}

/**
 * Validate query parameters
 * Coerces string values to appropriate types
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: Record<string, string | string[] | undefined>
): { success: true; data: T } | { success: false; error: ValidationError } {
  // Convert query params to plain object
  const plainQuery: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      plainQuery[key] = value[0]; // Take first value if array
    } else {
      plainQuery[key] = value;
    }
  }
  
  return validate(schema, plainQuery);
}
