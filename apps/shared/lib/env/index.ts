// ATTENDING AI - Environment Validation
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn('Environment validation warnings:', result.error.format());
  }
  return result.success ? result.data : envSchema.parse({ NODE_ENV: 'development' });
}

export function isProduction(): boolean { return process.env.NODE_ENV === 'production'; }
export function isDevelopment(): boolean { return process.env.NODE_ENV === 'development'; }

export function checkEnvironment(): void {
  console.log('Validating environment...');
  const env = validateEnv();
  console.log(`Environment: ${env.NODE_ENV}`);
}
