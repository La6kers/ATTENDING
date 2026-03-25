/**
 * ATTENDING AI - Centralized Environment Configuration
 * apps/shared/lib/env/index.ts
 * 
 * Single source of truth for all environment variables.
 * Validates at startup and fails fast with clear error messages.
 * 
 * Usage:
 *   import { env, isProduction, isDevelopment } from '@attending/shared/lib/env';
 *   
 *   // Access validated env vars
 *   const dbUrl = env.DATABASE_URL;
 *   
 *   // Check environment
 *   if (isProduction()) { ... }
 */

import { z } from 'zod';

// ============================================================================
// Schema Definition
// ============================================================================

/**
 * Base environment variables required by all apps.
 * Strict in production, lenient in development.
 */
const baseSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // Development auth bypass — validated for safety
  DEV_BYPASS_AUTH: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  NEXT_PUBLIC_DEV_BYPASS_AUTH: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  // WebSocket
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),

  // Inter-service communication
  PROVIDER_API_URL: z.string().url().optional(),
  PATIENT_API_URL: z.string().url().optional(),

  // BioMistral AI
  NEXT_PUBLIC_BIOMISTRAL_API_ENDPOINT: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_BIOMISTRAL_API_KEY: z.string().optional().or(z.literal('')),
});

/**
 * Development schema — relaxed requirements.
 * Allows default SQLite, short secrets, etc.
 */
const devSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  NEXTAUTH_SECRET: z.string().default('attending-dev-secret-key-change-in-production-2024'),
  NEXTAUTH_URL: z.string().default('http://localhost:3002'),
  DEV_BYPASS_AUTH: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  NEXT_PUBLIC_DEV_BYPASS_AUTH: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  PROVIDER_API_URL: z.string().optional(),
  PATIENT_API_URL: z.string().optional(),
  NEXT_PUBLIC_BIOMISTRAL_API_ENDPOINT: z.string().optional(),
  NEXT_PUBLIC_BIOMISTRAL_API_KEY: z.string().optional(),
});

// ============================================================================
// Validation
// ============================================================================

type EnvConfig = z.infer<typeof baseSchema>;

let _env: EnvConfig | null = null;

/**
 * Validate and return environment configuration.
 * Uses strict schema in production, relaxed in development.
 * Caches result after first call.
 */
export function validateEnv(): EnvConfig {
  if (_env) return _env;

  const isProduction = process.env.NODE_ENV === 'production';
  const schema = isProduction ? baseSchema : devSchema;

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    if (isProduction) {
      // In production, fail fast with clear error
      console.error(
        `\n[FATAL] Environment validation failed:\n${formatted}\n` +
        `Fix these environment variables before deploying to production.\n`
      );
      throw new Error(`Environment validation failed in production. See logs for details.`);
    } else {
      // In development, warn but continue with defaults
      console.warn(
        `\n[ENV WARNING] Some environment variables are missing or invalid:\n${formatted}\n` +
        `Using defaults for development. These MUST be set in production.\n`
      );
      // Re-parse with dev schema which has defaults
      _env = devSchema.parse(process.env) as EnvConfig;
      return _env;
    }
  }

  _env = result.data as EnvConfig;

  // Safety check: DEV_BYPASS_AUTH in production
  if (isProduction && _env.DEV_BYPASS_AUTH) {
    throw new Error(
      '[FATAL SECURITY] DEV_BYPASS_AUTH is enabled in production. ' +
      'Remove this variable from production environment.'
    );
  }

  return _env;
}

/**
 * Pre-validated environment config.
 * Access this instead of process.env throughout the application.
 */
export const env = new Proxy({} as EnvConfig, {
  get(_, prop: string) {
    const config = validateEnv();
    return (config as any)[prop];
  },
});

// ============================================================================
// Helpers
// ============================================================================

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Run environment check at startup.
 * Call this in _app.tsx or app layout to validate early.
 */
export function checkEnvironment(): void {
  try {
    const config = validateEnv();
    console.log(`[ENV] Environment: ${config.NODE_ENV}`);
    console.log(`[ENV] Database: ${config.DATABASE_URL?.substring(0, 20)}...`);
    console.log(`[ENV] Auth bypass: ${config.DEV_BYPASS_AUTH ? 'ENABLED (dev only)' : 'disabled'}`);
  } catch (error) {
    console.error('[ENV] Environment check failed:', error);
    throw error;
  }
}
