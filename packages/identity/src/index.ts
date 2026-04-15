// =============================================================================
// ATTENDING AI - Identity Verification Package
// packages/identity/src/index.ts
//
// CMS HTE IAL2 identity verification for Medicare App Library
// Supports ID.me, CLEAR, and Login.gov
// =============================================================================

// Types
export type {
  IdentityAssuranceLevel,
  AuthenticatorAssuranceLevel,
  IdentityProvider,
  IdmeConfig,
  ClearConfig,
  LoginGovConfig,
  VerifiedIdentity,
  IdentityVerificationResult,
  IdentityErrorCode,
  IdmeTokenClaims,
  PatientIdentityLink,
} from './types';

export {
  IdmeConfigSchema,
  ClearConfigSchema,
  LoginGovConfigSchema,
  VerifiedIdentitySchema,
} from './types';

// Providers
export { IdmeProvider } from './providers/idme';

// Middleware
export {
  checkIAL2,
  createIAL2ErrorResponse,
  requireIAL2,
  extractIdentityFromSession,
} from './middleware/ial2-verify';
export type { IAL2VerificationContext } from './middleware/ial2-verify';

// Passkeys / WebAuthn (AAL2)
export { WebAuthnService } from './passkeys/webauthn-service';
export type {
  ChallengeStore,
  PasskeyVerifier,
  WebAuthnServiceConfig,
} from './passkeys/webauthn-service';
export type {
  PasskeyCredential,
  PasskeyChallenge,
  RegistrationOptions,
  RegistrationChallenge,
  RegistrationResponse,
  RegistrationVerification,
  AuthenticationOptions,
  AuthenticationChallenge,
  AuthenticationResponse,
  AuthenticationVerification,
  PasskeyErrorCode,
} from './passkeys/types';
export {
  PasskeyCredentialSchema,
  PasskeyChallengeSchema,
} from './passkeys/types';
