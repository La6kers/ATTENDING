// =============================================================================
// ATTENDING AI - Identity Verification Types
// packages/identity/src/types.ts
//
// CMS HTE IAL2 identity verification types for ID.me, CLEAR, Login.gov
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Identity Assurance Levels (NIST SP 800-63A)
// =============================================================================

export type IdentityAssuranceLevel = 'IAL1' | 'IAL2' | 'IAL3';
export type AuthenticatorAssuranceLevel = 'AAL1' | 'AAL2' | 'AAL3';

export type IdentityProvider = 'idme' | 'clear' | 'logingov';

// =============================================================================
// ID.me OIDC Configuration
// =============================================================================

export const IdmeConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  redirectUri: z.string().url(),
  issuer: z.string().url().default('https://api.id.me/oidc'),
  sandboxIssuer: z.string().url().default('https://api.idmelabs.com/oidc'),
  useSandbox: z.boolean().default(false),
  scopes: z.array(z.string()).default([
    'openid',
    'profile',
    'email',
    'http://idmanagement.gov/ns/assurance/ial/2',
  ]),
});

export type IdmeConfig = z.infer<typeof IdmeConfigSchema>;

// =============================================================================
// CLEAR Configuration
// =============================================================================

export const ClearConfigSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  baseUrl: z.string().url().default('https://api.clearme.com/v1'),
  sandboxUrl: z.string().url().default('https://sandbox-api.clearme.com/v1'),
  useSandbox: z.boolean().default(false),
  redirectUri: z.string().url(),
});

export type ClearConfig = z.infer<typeof ClearConfigSchema>;

// =============================================================================
// Login.gov Configuration
// =============================================================================

export const LoginGovConfigSchema = z.object({
  clientId: z.string().min(1),
  redirectUri: z.string().url(),
  issuer: z.string().url().default('https://secure.login.gov'),
  sandboxIssuer: z.string().url().default('https://idp.int.identitysandbox.gov'),
  useSandbox: z.boolean().default(false),
  acrValues: z.string().default('http://idmanagement.gov/ns/assurance/ial/2'),
  privateKeyJwt: z.string().min(1), // Login.gov uses private_key_jwt
});

export type LoginGovConfig = z.infer<typeof LoginGovConfigSchema>;

// =============================================================================
// Verified Identity
// =============================================================================

export const VerifiedIdentitySchema = z.object({
  provider: z.enum(['idme', 'clear', 'logingov']),
  subject: z.string().min(1), // Unique identifier from provider
  ialLevel: z.enum(['IAL1', 'IAL2', 'IAL3']),
  aalLevel: z.enum(['AAL1', 'AAL2', 'AAL3']).optional(),
  verifiedAt: z.date(),
  expiresAt: z.date().optional(),

  // Verified claims
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  birthDate: z.string().optional(), // ISO date
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  phone: z.string().optional(),
  phoneVerified: z.boolean().optional(),

  // Address (IAL2 requires physical address verification)
  address: z.object({
    streetAddress: z.string().optional(),
    locality: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),

  // Raw OIDC tokens (encrypted at rest)
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type VerifiedIdentity = z.infer<typeof VerifiedIdentitySchema>;

// =============================================================================
// Identity Verification Result
// =============================================================================

export interface IdentityVerificationResult {
  success: boolean;
  identity?: VerifiedIdentity;
  error?: {
    code: IdentityErrorCode;
    message: string;
    provider?: IdentityProvider;
  };
}

export type IdentityErrorCode =
  | 'VERIFICATION_FAILED'
  | 'IAL_INSUFFICIENT'
  | 'PROVIDER_ERROR'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'CONSENT_REQUIRED'
  | 'ACCOUNT_LOCKED'
  | 'NETWORK_ERROR';

// =============================================================================
// OIDC Token Claims
// =============================================================================

export interface IdmeTokenClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  fname?: string;
  lname?: string;
  birthdate?: string;
  phone?: string;
  phone_verified?: boolean;
  address?: {
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  // IAL level claim
  ial?: string;
  // Credential type
  credential_type?: string;
  // Verification groups
  verified?: boolean;
}

// =============================================================================
// Patient-Identity Link
// =============================================================================

export interface PatientIdentityLink {
  patientId: string;
  organizationId: string;
  provider: IdentityProvider;
  providerSubject: string;
  ialLevel: IdentityAssuranceLevel;
  verifiedAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}
