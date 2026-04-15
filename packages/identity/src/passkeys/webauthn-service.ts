// =============================================================================
// ATTENDING AI - WebAuthn Service
// packages/identity/src/passkeys/webauthn-service.ts
//
// Orchestrates WebAuthn registration and authentication ceremonies.
// Produces AAL2 assertions for CMS HTE Patient Facing Apps requirement.
//
// Cryptographic verification is delegated to an injected PasskeyVerifier so
// that this package has no hard dependency on a specific WebAuthn library.
// Production deployments plug in @simplewebauthn/server (or equivalent).
// =============================================================================

import { randomBytes } from 'node:crypto';
import type {
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
} from './types';

// =============================================================================
// Injected dependencies
// =============================================================================

/**
 * Persistence for ceremony challenges. Back this with Redis or a DB table
 * keyed by session ID so challenges are discarded after use / expiration.
 */
export interface ChallengeStore {
  save(key: string, challenge: PasskeyChallenge): Promise<void>;
  load(key: string): Promise<PasskeyChallenge | null>;
  delete(key: string): Promise<void>;
}

/**
 * Cryptographic verifier. Production: wire to @simplewebauthn/server.
 * Tests: inject a fake verifier that returns deterministic results.
 */
export interface PasskeyVerifier {
  verifyRegistration(input: {
    response: RegistrationResponse;
    expectedChallenge: string;
    expectedOrigin: string | string[];
    expectedRpId: string;
    requireUserVerification: boolean;
  }): Promise<RegistrationVerification>;

  verifyAuthentication(input: {
    response: AuthenticationResponse;
    expectedChallenge: string;
    expectedOrigin: string | string[];
    expectedRpId: string;
    credential: PasskeyCredential;
    requireUserVerification: boolean;
  }): Promise<AuthenticationVerification>;
}

// =============================================================================
// Service
// =============================================================================

export interface WebAuthnServiceConfig {
  rpId: string;
  rpName: string;
  origin: string | string[];
  challengeTtlMs?: number;
  /** If true, registration and authentication both require user verification → AAL2. */
  requireUserVerification?: boolean;
}

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// COSE algorithm identifiers — order matters (prefer ES256, then EdDSA, then RS256)
const SUPPORTED_ALGORITHMS = [
  { type: 'public-key' as const, alg: -7 },   // ES256
  { type: 'public-key' as const, alg: -8 },   // EdDSA
  { type: 'public-key' as const, alg: -257 }, // RS256
];

export class WebAuthnService {
  constructor(
    private readonly config: WebAuthnServiceConfig,
    private readonly store: ChallengeStore,
    private readonly verifier: PasskeyVerifier,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async beginRegistration(
    sessionKey: string,
    options: RegistrationOptions,
  ): Promise<RegistrationChallenge> {
    const challenge = this.generateChallenge();
    const now = new Date();
    const ttl = this.config.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;

    await this.store.save(sessionKey, {
      challenge,
      userId: options.userId,
      type: 'registration',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
    });

    const userVerification = options.userVerification
      ?? (this.config.requireUserVerification ? 'required' : 'preferred');

    return {
      challenge,
      rp: { id: options.rpId, name: options.rpName },
      user: {
        id: options.userId,
        name: options.userName,
        displayName: options.userDisplayName,
      },
      pubKeyCredParams: SUPPORTED_ALGORITHMS,
      timeout: 60_000,
      attestation: 'none', // Privacy-preserving default per FIDO best practice
      authenticatorSelection: {
        residentKey: options.residentKey ?? 'preferred',
        userVerification,
      },
      excludeCredentials: options.excludeCredentials?.map((c) => ({
        id: c.credentialId,
        type: 'public-key',
        transports: c.transports,
      })),
    };
  }

  async finishRegistration(
    sessionKey: string,
    userId: string,
    response: RegistrationResponse,
  ): Promise<RegistrationVerification> {
    const stored = await this.loadAndValidateChallenge(sessionKey, 'registration', userId);
    if (!stored.ok) return { verified: false, error: stored.error };

    const verification = await this.verifier.verifyRegistration({
      response,
      expectedChallenge: stored.challenge.challenge,
      expectedOrigin: this.config.origin,
      expectedRpId: this.config.rpId,
      requireUserVerification: this.config.requireUserVerification ?? true,
    });

    // Challenge is single-use — discard regardless of outcome.
    await this.store.delete(sessionKey);

    return verification;
  }

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  async beginAuthentication(
    sessionKey: string,
    options: AuthenticationOptions,
  ): Promise<AuthenticationChallenge> {
    const challenge = this.generateChallenge();
    const now = new Date();
    const ttl = this.config.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;

    await this.store.save(sessionKey, {
      challenge,
      userId: options.userId ?? '', // Empty string for discoverable-credential flow
      type: 'authentication',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
    });

    const userVerification = options.userVerification
      ?? (this.config.requireUserVerification ? 'required' : 'preferred');

    return {
      challenge,
      rpId: options.rpId,
      timeout: 60_000,
      userVerification,
      allowCredentials: options.allowCredentials?.map((c) => ({
        id: c.credentialId,
        type: 'public-key',
        transports: c.transports,
      })),
    };
  }

  async finishAuthentication(
    sessionKey: string,
    credential: PasskeyCredential,
    response: AuthenticationResponse,
  ): Promise<AuthenticationVerification> {
    const stored = await this.loadAndValidateChallenge(sessionKey, 'authentication');
    if (!stored.ok) return { verified: false, error: stored.error };

    if (credential.revokedAt) {
      await this.store.delete(sessionKey);
      return { verified: false, error: 'CREDENTIAL_REVOKED' };
    }

    const verification = await this.verifier.verifyAuthentication({
      response,
      expectedChallenge: stored.challenge.challenge,
      expectedOrigin: this.config.origin,
      expectedRpId: this.config.rpId,
      credential,
      requireUserVerification: this.config.requireUserVerification ?? true,
    });

    await this.store.delete(sessionKey);

    if (verification.verified && verification.newCounter !== undefined) {
      if (verification.newCounter <= credential.counter && credential.counter !== 0) {
        return { verified: false, error: 'COUNTER_REPLAY_DETECTED' };
      }
    }

    return verification;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Cryptographically-random base64url challenge, 32 bytes (256 bits). */
  private generateChallenge(): string {
    return randomBytes(32).toString('base64url');
  }

  private async loadAndValidateChallenge(
    sessionKey: string,
    expectedType: 'registration' | 'authentication',
    expectedUserId?: string,
  ): Promise<
    | { ok: true; challenge: PasskeyChallenge }
    | { ok: false; error: string }
  > {
    const challenge = await this.store.load(sessionKey);
    if (!challenge) return { ok: false, error: 'CHALLENGE_NOT_FOUND' };

    if (challenge.type !== expectedType) {
      await this.store.delete(sessionKey);
      return { ok: false, error: 'CHALLENGE_NOT_FOUND' };
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.store.delete(sessionKey);
      return { ok: false, error: 'CHALLENGE_EXPIRED' };
    }

    if (expectedUserId && challenge.userId !== expectedUserId) {
      await this.store.delete(sessionKey);
      return { ok: false, error: 'CHALLENGE_NOT_FOUND' };
    }

    return { ok: true, challenge };
  }
}
