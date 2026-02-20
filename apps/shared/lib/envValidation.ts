// ============================================================
// ATTENDING AI - Environment Configuration Validator
// apps/shared/lib/envValidation.ts
//
// Validates required environment variables at startup.
// Prevents the app from running in a misconfigured state
// (e.g., missing NEXTAUTH_SECRET, no database URL, etc.)
//
// Usage in next.config.js or server startup:
//   require('./apps/shared/lib/envValidation').validateEnv();
//
// Or import in _app.tsx serverSideProps:
//   import { validateEnv } from '@attending/shared/lib/envValidation';
// ============================================================

import { z } from 'zod';

// ============================================================
// SCHEMA DEFINITIONS
// ============================================================

/** Variables required in ALL environments */
const baseSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string'
    ),

  // Auth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z
    .string()
    .url('NEXTAUTH_URL must be a valid URL'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

/** Variables required in PRODUCTION only */
const productionSchema = baseSchema.extend({
  // Redis is required in production (no memory fallback)
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required in production')
    .refine(
      (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
      'REDIS_URL must be a Redis connection string'
    ),

  // Azure AD B2C is required in production
  AZURE_AD_B2C_TENANT_NAME: z
    .string()
    .min(1, 'Azure AD B2C tenant name is required in production'),
  AZURE_AD_B2C_CLIENT_ID: z
    .string()
    .min(1, 'Azure AD B2C client ID is required in production'),
  AZURE_AD_B2C_CLIENT_SECRET: z
    .string()
    .min(1, 'Azure AD B2C client secret is required in production'),

  // PHI encryption key
  PHI_ENCRYPTION_KEY: z
    .string()
    .min(32, 'PHI_ENCRYPTION_KEY must be at least 32 characters for AES-256'),

  // Session encryption
  SESSION_ENCRYPTION_KEY: z
    .string()
    .min(32, 'SESSION_ENCRYPTION_KEY must be at least 32 characters'),

  // CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1, 'CORS_ALLOWED_ORIGINS is required in production')
    .refine(
      (v) => v.split(',').every((o) => o.trim().startsWith('https://')),
      'All CORS origins must use HTTPS in production'
    ),
});

/** Variables that trigger warnings (optional but recommended) */
const warningChecks = [
  {
    key: 'REDIS_URL',
    message: 'Redis not configured — using in-memory session/rate-limit stores (not suitable for multi-instance)',
  },
  {
    key: 'SENTRY_DSN',
    message: 'Sentry not configured — errors will only be logged to stdout',
  },
  {
    key: 'HEALTH_CHECK_SECRET',
    message: 'No health check secret — detailed health info available without auth',
  },
  {
    key: 'ENABLE_AUDIT_LOGGING',
    message: 'Audit logging not explicitly enabled',
    check: (v?: string) => v !== 'true',
  },
];

/** Security anti-patterns to detect */
const securityChecks = [
  {
    check: () =>
      process.env.DEV_BYPASS_AUTH === 'true' &&
      process.env.NODE_ENV === 'production',
    message: '🚨 CRITICAL: DEV_BYPASS_AUTH=true in production! Authentication is DISABLED.',
    fatal: true,
  },
  {
    check: () =>
      process.env.NEXTAUTH_SECRET === 'your-32-character-secret-here-generate-securely',
    message: '🚨 CRITICAL: Using default NEXTAUTH_SECRET — generate a unique secret!',
    fatal: process.env.NODE_ENV === 'production',
  },
  {
    check: () =>
      process.env.SECURE_COOKIES === 'false' &&
      process.env.NODE_ENV === 'production',
    message: '⚠️ WARNING: SECURE_COOKIES=false in production — cookies sent over HTTP',
    fatal: false,
  },
  {
    check: () =>
      process.env.DATABASE_URL?.includes('attending_dev_password') &&
      process.env.NODE_ENV === 'production',
    message: '🚨 CRITICAL: Default development database password used in production!',
    fatal: true,
  },
];

// ============================================================
// VALIDATION FUNCTION
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
}

/**
 * Validate environment variables.
 * Returns validation result with errors and warnings.
 *
 * @param options.fatal - If true (default), throws on fatal errors
 */
export function validateEnv(options?: { fatal?: boolean }): ValidationResult {
  const fatal = options?.fatal ?? true;
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    environment: env,
  };

  // 1. Schema validation
  const schema = isProduction ? productionSchema : baseSchema;
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    result.valid = false;
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      result.errors.push(`${path}: ${issue.message}`);
    }
  }

  // 2. Security checks
  for (const check of securityChecks) {
    if (check.check()) {
      if (check.fatal) {
        result.valid = false;
        result.errors.push(check.message);
      } else {
        result.warnings.push(check.message);
      }
    }
  }

  // 3. Warning checks (non-fatal)
  if (!isProduction) {
    for (const warn of warningChecks) {
      const value = process.env[warn.key];
      const shouldWarn = warn.check ? warn.check(value) : !value;
      if (shouldWarn) {
        result.warnings.push(`${warn.key}: ${warn.message}`);
      }
    }
  }

  // Output
  if (result.errors.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════╗');
    console.error('║  ATTENDING AI - Environment Configuration Errors     ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    for (const err of result.errors) {
      console.error(`  ✗ ${err}`);
    }
    console.error('');
  }

  if (result.warnings.length > 0) {
    console.warn('\n┌──────────────────────────────────────────────────────┐');
    console.warn('│  ATTENDING AI - Configuration Warnings                │');
    console.warn('└──────────────────────────────────────────────────────┘');
    for (const warn of result.warnings) {
      console.warn(`  ⚠ ${warn}`);
    }
    console.warn('');
  }

  if (result.valid && result.warnings.length === 0) {
    console.log(`✓ Environment validated: ${env}`);
  }

  if (!result.valid && fatal) {
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s). ` +
      'Fix the above issues and restart.'
    );
  }

  return result;
}

export default { validateEnv };
