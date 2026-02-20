// ============================================================
// ATTENDING AI - Validation Middleware
// apps/shared/lib/withValidation.ts
//
// Composable Zod validation middleware for API routes.
// Validates body, query, or both before the handler runs.
// Integrates with standardized error format from apiErrors.ts.
//
// Usage:
//
//   import { withValidation } from '@attending/shared/lib/withValidation';
//   import { CreateLabOrderSchema } from '@attending/shared/schemas';
//
//   // Validate body
//   export default withValidation({ body: CreateLabOrderSchema }, handler);
//
//   // Validate query params
//   export default withValidation({ query: ListQuerySchema }, handler);
//
//   // Both
//   export default withValidation({
//     body: CreateLabOrderSchema,
//     query: PaginationSchema,
//   }, handler);
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { z, ZodSchema, ZodError } from 'zod';

// ============================================================
// TYPES
// ============================================================

export interface ValidationSchemas {
  /** Zod schema for req.body (POST/PUT/PATCH) */
  body?: ZodSchema;
  /** Zod schema for req.query (GET params) */
  query?: ZodSchema;
}

// ============================================================
// COMMON QUERY SCHEMAS
// ============================================================

/** Standard pagination query params */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Standard sort query params */
export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Pagination + Sort combined */
export const ListQuerySchema = PaginationSchema.merge(SortSchema);

/** Standard ID param */
export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Format Zod errors into the standardized API error format.
 */
function formatZodErrors(error: ZodError, source: 'body' | 'query') {
  return error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    source,
    code: issue.code,
  }));
}

/**
 * Wrap an API handler with Zod validation.
 *
 * Validated data is attached to `req` as:
 * - `(req as any).validatedBody` — parsed body
 * - `(req as any).validatedQuery` — parsed query
 */
export function withValidation(
  schemas: ValidationSchemas,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const errors: ReturnType<typeof formatZodErrors> = [];

    // Validate body for methods that have one
    if (schemas.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'body'));
      } else {
        (req as any).validatedBody = result.data;
      }
    }

    // Validate query params
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'query'));
      } else {
        (req as any).validatedQuery = result.data;
      }
    }

    // Return all validation errors at once
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          validationErrors: errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
          apiVersion: '1.0.0',
        },
      });
    }

    return handler(req, res);
  };
}

export default withValidation;
