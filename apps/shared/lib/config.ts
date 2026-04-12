// ============================================================
// ATTENDING AI - Runtime Configuration
// apps/shared/lib/config.ts
//
// Centralized runtime configuration with type-safe access.
// Environment variables are parsed once and cached.
//
// Usage:
//   import { config, isDemoMode } from '@attending/shared/lib/config';
//   if (isDemoMode()) { return mockData; }
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface AppConfig {
  // Application
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production' | 'test';

  // Demo Mode - When true, APIs can return mock/sample data
  demoMode: boolean;

  // Service URLs
  backendApiUrl: string;
  patientPortalUrl: string;
  providerPortalUrl: string;

  // Timeouts (ms)
  backendTimeoutMs: number;
  defaultApiTimeoutMs: number;

  // Feature toggles (from env)
  features: {
    aiDifferentialDiagnosis: boolean;
    aiDrugRecommendations: boolean;
    aiLabOrdering: boolean;
  };
}

// ============================================================
// ENVIRONMENT PARSING
// ============================================================

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvironment(value: string | undefined): AppConfig['environment'] {
  const env = value?.toLowerCase();
  if (env === 'production' || env === 'staging' || env === 'test') {
    return env;
  }
  return 'development';
}

function requireEnvInProd(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    console.error(`[CONFIG] ${name} is not set in production — using fallback is unsafe`);
  }
  return value || fallback;
}

// ============================================================
// CONFIG SINGLETON
// ============================================================

let cachedConfig: AppConfig | null = null;

/**
 * Get the application configuration.
 * Configuration is parsed once from environment variables and cached.
 */
export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    // Application
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'ATTENDING AI',
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: parseEnvironment(process.env.NODE_ENV),

    // Demo Mode
    demoMode: parseBoolean(process.env.DEMO_MODE, false),

    // Service URLs
    backendApiUrl: requireEnvInProd('BACKEND_API_URL', 'http://localhost:5080'),
    patientPortalUrl: requireEnvInProd('PATIENT_PORTAL_URL', 'http://localhost:3001'),
    providerPortalUrl: requireEnvInProd('NEXTAUTH_URL', 'http://localhost:3002'),

    // Timeouts
    backendTimeoutMs: parseInt(process.env.BACKEND_TIMEOUT_MS, 5000),
    defaultApiTimeoutMs: parseInt(process.env.API_TIMEOUT_MS, 15000),

    // Feature toggles
    features: {
      aiDifferentialDiagnosis: parseBoolean(process.env.FEATURE_AI_DIFFERENTIAL_DIAGNOSIS, true),
      aiDrugRecommendations: parseBoolean(process.env.FEATURE_AI_DRUG_RECOMMENDATIONS, true),
      aiLabOrdering: parseBoolean(process.env.FEATURE_AI_LAB_ORDERING, true),
    },
  };

  return cachedConfig;
}

/**
 * Clear the cached configuration.
 * Useful for testing or when environment variables change.
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Check if the application is running in demo mode.
 * In demo mode, APIs may return mock/sample data instead of real database queries.
 */
export function isDemoMode(): boolean {
  return getConfig().demoMode;
}

/**
 * Check if the application is running in development mode.
 */
export function isDevelopment(): boolean {
  return getConfig().environment === 'development';
}

/**
 * Check if the application is running in production mode.
 */
export function isProduction(): boolean {
  return getConfig().environment === 'production';
}

/**
 * Check if a specific feature is enabled.
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return getConfig().features[feature];
}

// ============================================================
// EXPORTS
// ============================================================

export const config = {
  get: getConfig,
  clearCache: clearConfigCache,
  isDemoMode,
  isDevelopment,
  isProduction,
  isFeatureEnabled,
};

export default config;
