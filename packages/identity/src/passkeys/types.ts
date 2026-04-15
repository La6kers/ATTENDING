// =============================================================================
// ATTENDING AI - WebAuthn / Passkey Types
// packages/identity/src/passkeys/types.ts
//
// CMS HTE AAL2 authenticator assurance via WebAuthn Level 3 / FIDO2 passkeys.
// Satisfies "AAL2 (e.g., passkeys)" requirement for Patient Facing Apps.
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Credential Storage Record
// =============================================================================
// A stored passkey is an opaque credential tied to a user. We never store
// private keys — only the public key reported by the authenticator during
// registration, along with metadata needed for counter-replay detection.

export const PasskeyCredentialSchema = z.object({
  id: z.string().min(1),                   // Internal ID
  userId: z.string().min(1),                // Patient or user ID
  credentialId: z.string().min(1),          // Base64url credential ID from authenticator
  publicKey: z.string().min(1),             // Base64url-encoded COSE public key
  counter: z.number().int().nonnegative(),  // Signature counter (replay protection)
  transports: z.array(z.enum([
    'usb', 'nfc', 'ble', 'internal', 'hybrid',
  ])).default([]),
  deviceType: z.enum(['singleDevice', 'multiDevice']).default('multiDevice'),
  backedUp: z.boolean().default(false),     // iCloud Keychain / Google Password Manager sync
  aaguid: z.string().optional(),            // Authenticator model identifier
  nickname: z.string().optional(),          // User-facing label ("iPhone", "YubiKey")
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
  revokedAt: z.date().optional(),
});

export type PasskeyCredential = z.infer<typeof PasskeyCredentialSchema>;

// =============================================================================
// Ceremony Challenge State
// =============================================================================
// Challenges are single-use nonces that must be bound to a session. The
// caller is responsible for associating the challenge with a session ID
// and discarding after use or expiration.

export const PasskeyChallengeSchema = z.object({
  challenge: z.string().min(1),             // Base64url random bytes
  userId: z.string().min(1),
  type: z.enum(['registration', 'authentication']),
  createdAt: z.date(),
  expiresAt: z.date(),
});

export type PasskeyChallenge = z.infer<typeof PasskeyChallengeSchema>;

// =============================================================================
// Registration Ceremony Inputs / Outputs
// =============================================================================

export interface RegistrationOptions {
  rpId: string;                             // Relying party ID (domain, e.g. "attendingai.health")
  rpName: string;                           // Relying party display name
  userId: string;
  userName: string;                         // e.g., email
  userDisplayName: string;                  // e.g., "Jane Doe"
  excludeCredentials?: PasskeyCredential[]; // Prevent re-registering existing keys
  userVerification?: 'required' | 'preferred' | 'discouraged';
  residentKey?: 'required' | 'preferred' | 'discouraged';
}

export interface RegistrationChallenge {
  challenge: string;                        // Base64url
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct' | 'enterprise';
  authenticatorSelection: {
    residentKey: 'required' | 'preferred' | 'discouraged';
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
  excludeCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>;
}

export interface RegistrationResponse {
  credentialId: string;                     // Base64url
  clientDataJSON: string;                   // Base64url
  attestationObject: string;                // Base64url (CBOR)
  transports?: string[];
}

export interface RegistrationVerification {
  verified: boolean;
  credential?: Omit<PasskeyCredential, 'id' | 'userId' | 'createdAt'>;
  error?: string;
}

// =============================================================================
// Authentication Ceremony Inputs / Outputs
// =============================================================================

export interface AuthenticationOptions {
  rpId: string;
  userId?: string;                          // Optional for discoverable-credential flow
  allowCredentials?: PasskeyCredential[];
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface AuthenticationChallenge {
  challenge: string;                        // Base64url
  rpId: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>;
}

export interface AuthenticationResponse {
  credentialId: string;                     // Base64url
  clientDataJSON: string;                   // Base64url
  authenticatorData: string;                // Base64url
  signature: string;                        // Base64url
  userHandle?: string;                      // Base64url (for discoverable creds)
}

export interface AuthenticationVerification {
  verified: boolean;
  credentialId?: string;
  newCounter?: number;
  userId?: string;
  /** AAL2 is satisfied when userVerification was required AND the authenticator data reflects UV. */
  aalLevel?: 'AAL1' | 'AAL2' | 'AAL3';
  error?: string;
}

// =============================================================================
// Error Codes
// =============================================================================

export type PasskeyErrorCode =
  | 'CHALLENGE_EXPIRED'
  | 'CHALLENGE_NOT_FOUND'
  | 'INVALID_CLIENT_DATA'
  | 'INVALID_ORIGIN'
  | 'INVALID_SIGNATURE'
  | 'COUNTER_REPLAY_DETECTED'
  | 'USER_VERIFICATION_REQUIRED'
  | 'CREDENTIAL_NOT_FOUND'
  | 'CREDENTIAL_REVOKED'
  | 'UNSUPPORTED_ALGORITHM';
