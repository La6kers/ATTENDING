// ============================================================
// Authentication Module - @attending/shared
// apps/shared/auth/index.ts
//
// Centralized authentication exports for ATTENDING AI
// ============================================================

// Configuration
export {
  authOptions,
  createProviderAuthOptions,
  createPatientAuthOptions,
  type AttendingUser,
  type AttendingSession,
  type AttendingJWT,
} from './config';

// Middleware
export {
  withAuth,
  withRole,
  withProvider,
  withPatient,
  withAuditLog,
  type AuthenticatedRequest,
} from './middleware';

// React Hook
export { useAuth, type UseAuthReturn } from './useAuth';
