// ============================================================
// ATTENDING AI — Mobile Constants
// apps/mobile/lib/constants.ts
// ============================================================

export const BRAND = {
  primary: '#1A8FA8',
  deepNavy: '#0C3547',
  coral: '#E87461',
  lightTeal: '#4FD1C5',
  white: '#FFFFFF',
  background: '#F0FAFA',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  warning: '#F59E0B',
  success: '#10B981',
  error: '#DC2626',
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'attending_access_token',
  REFRESH_TOKEN: 'attending_refresh_token',
  SESSION_DATA: 'attending_session_data',
  USER_DATA: 'attending_user_data',
  PUSH_TOKEN: 'attending_push_token',
  CRASH_SETTINGS: 'attending_crash_settings',
} as const;

export const API_CONFIG = {
  // Set via app.config.ts extra or env — fallback for dev
  BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:5000',
  TIMEOUT: 15000,
} as const;

export const SESSION_CONFIG = {
  MAX_DURATION: 8 * 60 * 60 * 1000,      // 8 hours
  IDLE_TIMEOUT: 15 * 60 * 1000,           // 15 minutes
  EXPIRATION_WARNING: 5 * 60 * 1000,      // 5 minutes
  MAX_EXTENSIONS: 2,
} as const;
