// =============================================================================
// ATTENDING AI - WebAuthn Service Tests
// packages/identity/src/passkeys/__tests__/webauthn-service.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebAuthnService, type ChallengeStore, type PasskeyVerifier } from '../webauthn-service';
import type { PasskeyChallenge, PasskeyCredential } from '../types';

// =============================================================================
// Fakes
// =============================================================================

class InMemoryChallengeStore implements ChallengeStore {
  private data = new Map<string, PasskeyChallenge>();
  async save(key: string, c: PasskeyChallenge) { this.data.set(key, c); }
  async load(key: string) { return this.data.get(key) ?? null; }
  async delete(key: string) { this.data.delete(key); }
  has(key: string) { return this.data.has(key); }
}

function makeVerifier(overrides: Partial<PasskeyVerifier> = {}): PasskeyVerifier {
  return {
    verifyRegistration: vi.fn().mockResolvedValue({
      verified: true,
      credential: {
        credentialId: 'cred-1',
        publicKey: 'pk-base64',
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: true,
      },
    }),
    verifyAuthentication: vi.fn().mockResolvedValue({
      verified: true,
      credentialId: 'cred-1',
      newCounter: 5,
      userId: 'user-1',
      aalLevel: 'AAL2',
    }),
    ...overrides,
  };
}

function makeCredential(overrides: Partial<PasskeyCredential> = {}): PasskeyCredential {
  return {
    id: 'internal-1',
    userId: 'user-1',
    credentialId: 'cred-1',
    publicKey: 'pk-base64',
    counter: 3,
    transports: ['internal'],
    deviceType: 'multiDevice',
    backedUp: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('WebAuthnService', () => {
  let store: InMemoryChallengeStore;
  let verifier: PasskeyVerifier;
  let service: WebAuthnService;

  beforeEach(() => {
    store = new InMemoryChallengeStore();
    verifier = makeVerifier();
    service = new WebAuthnService(
      {
        rpId: 'attendingai.health',
        rpName: 'ATTENDING AI',
        origin: 'https://patient.attendingai.health',
        requireUserVerification: true,
      },
      store,
      verifier,
    );
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  describe('beginRegistration', () => {
    it('should create challenge and return WebAuthn registration options', async () => {
      const opts = await service.beginRegistration('session-1', {
        rpId: 'attendingai.health',
        rpName: 'ATTENDING AI',
        userId: 'user-1',
        userName: 'jane@example.com',
        userDisplayName: 'Jane Doe',
      });

      expect(opts.challenge).toBeDefined();
      expect(opts.challenge.length).toBeGreaterThan(0);
      expect(opts.rp.id).toBe('attendingai.health');
      expect(opts.user.id).toBe('user-1');
      expect(opts.authenticatorSelection.userVerification).toBe('required');
      expect(opts.pubKeyCredParams).toContainEqual({ type: 'public-key', alg: -7 });
      expect(opts.attestation).toBe('none');
    });

    it('should persist challenge with TTL', async () => {
      await service.beginRegistration('session-1', {
        rpId: 'attendingai.health',
        rpName: 'ATTENDING AI',
        userId: 'user-1',
        userName: 'jane@example.com',
        userDisplayName: 'Jane Doe',
      });

      const stored = await store.load('session-1');
      expect(stored).not.toBeNull();
      expect(stored!.type).toBe('registration');
      expect(stored!.userId).toBe('user-1');
      expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include excludeCredentials to prevent re-registration', async () => {
      const opts = await service.beginRegistration('session-1', {
        rpId: 'attendingai.health',
        rpName: 'ATTENDING AI',
        userId: 'user-1',
        userName: 'jane@example.com',
        userDisplayName: 'Jane Doe',
        excludeCredentials: [makeCredential({ credentialId: 'existing-key' })],
      });

      expect(opts.excludeCredentials).toHaveLength(1);
      expect(opts.excludeCredentials![0].id).toBe('existing-key');
    });
  });

  describe('finishRegistration', () => {
    it('should verify valid registration and discard challenge', async () => {
      await service.beginRegistration('session-1', {
        rpId: 'attendingai.health',
        rpName: 'ATTENDING AI',
        userId: 'user-1',
        userName: 'jane@example.com',
        userDisplayName: 'Jane Doe',
      });

      const result = await service.finishRegistration('session-1', 'user-1', {
        credentialId: 'cred-1',
        clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIn0',
        attestationObject: 'attestation-bytes',
      });

      expect(result.verified).toBe(true);
      expect(result.credential!.credentialId).toBe('cred-1');
      expect(store.has('session-1')).toBe(false); // Single-use
    });

    it('should reject when challenge not found', async () => {
      const result = await service.finishRegistration('missing', 'user-1', {
        credentialId: 'cred-1',
        clientDataJSON: 'x',
        attestationObject: 'y',
      });
      expect(result.verified).toBe(false);
      expect(result.error).toBe('CHALLENGE_NOT_FOUND');
    });

    it('should reject expired challenge', async () => {
      // Inject a stale challenge directly
      await store.save('session-1', {
        challenge: 'abc',
        userId: 'user-1',
        type: 'registration',
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.finishRegistration('session-1', 'user-1', {
        credentialId: 'cred-1', clientDataJSON: 'x', attestationObject: 'y',
      });
      expect(result.verified).toBe(false);
      expect(result.error).toBe('CHALLENGE_EXPIRED');
      expect(store.has('session-1')).toBe(false);
    });

    it('should reject user ID mismatch (session hijack guard)', async () => {
      await service.beginRegistration('session-1', {
        rpId: 'attendingai.health', rpName: 'ATTENDING AI',
        userId: 'user-1', userName: 'jane@example.com', userDisplayName: 'Jane',
      });

      const result = await service.finishRegistration('session-1', 'other-user', {
        credentialId: 'cred-1', clientDataJSON: 'x', attestationObject: 'y',
      });
      expect(result.verified).toBe(false);
    });

    it('should propagate verifier failure', async () => {
      verifier = makeVerifier({
        verifyRegistration: vi.fn().mockResolvedValue({
          verified: false, error: 'INVALID_SIGNATURE',
        }),
      });
      service = new WebAuthnService(
        { rpId: 'attendingai.health', rpName: 'ATTENDING AI', origin: 'https://patient.attendingai.health', requireUserVerification: true },
        store, verifier,
      );

      await service.beginRegistration('session-1', {
        rpId: 'attendingai.health', rpName: 'ATTENDING AI',
        userId: 'user-1', userName: 'jane@example.com', userDisplayName: 'Jane',
      });

      const result = await service.finishRegistration('session-1', 'user-1', {
        credentialId: 'cred-1', clientDataJSON: 'x', attestationObject: 'y',
      });
      expect(result.verified).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe('beginAuthentication', () => {
    it('should create authentication challenge with allowCredentials', async () => {
      const cred = makeCredential();
      const opts = await service.beginAuthentication('session-2', {
        rpId: 'attendingai.health',
        userId: 'user-1',
        allowCredentials: [cred],
      });

      expect(opts.challenge).toBeDefined();
      expect(opts.userVerification).toBe('required');
      expect(opts.allowCredentials).toHaveLength(1);
      expect(opts.allowCredentials![0].id).toBe('cred-1');
    });

    it('should support discoverable-credential flow (no userId)', async () => {
      const opts = await service.beginAuthentication('session-2', {
        rpId: 'attendingai.health',
      });

      expect(opts.challenge).toBeDefined();
      expect(opts.allowCredentials).toBeUndefined();
    });
  });

  describe('finishAuthentication', () => {
    it('should verify authentication and return AAL2', async () => {
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });

      const result = await service.finishAuthentication(
        'session-2',
        makeCredential(),
        {
          credentialId: 'cred-1',
          clientDataJSON: 'x',
          authenticatorData: 'y',
          signature: 'sig',
        },
      );

      expect(result.verified).toBe(true);
      expect(result.aalLevel).toBe('AAL2');
      expect(result.newCounter).toBe(5);
      expect(store.has('session-2')).toBe(false);
    });

    it('should reject revoked credential', async () => {
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });

      const revoked = makeCredential({ revokedAt: new Date() });
      const result = await service.finishAuthentication('session-2', revoked, {
        credentialId: 'cred-1', clientDataJSON: 'x', authenticatorData: 'y', signature: 'sig',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBe('CREDENTIAL_REVOKED');
    });

    it('should detect counter replay', async () => {
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });

      verifier = makeVerifier({
        verifyAuthentication: vi.fn().mockResolvedValue({
          verified: true, credentialId: 'cred-1', newCounter: 2, aalLevel: 'AAL2',
        }),
      });
      service = new WebAuthnService(
        { rpId: 'attendingai.health', rpName: 'ATTENDING AI', origin: 'https://patient.attendingai.health', requireUserVerification: true },
        store, verifier,
      );
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });

      const cred = makeCredential({ counter: 5 }); // Stored counter is higher than new
      const result = await service.finishAuthentication('session-2', cred, {
        credentialId: 'cred-1', clientDataJSON: 'x', authenticatorData: 'y', signature: 'sig',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBe('COUNTER_REPLAY_DETECTED');
    });

    it('should allow first-use counter of 0 without replay check', async () => {
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });
      verifier = makeVerifier({
        verifyAuthentication: vi.fn().mockResolvedValue({
          verified: true, credentialId: 'cred-1', newCounter: 0, aalLevel: 'AAL2',
        }),
      });
      service = new WebAuthnService(
        { rpId: 'attendingai.health', rpName: 'ATTENDING AI', origin: 'https://patient.attendingai.health', requireUserVerification: true },
        store, verifier,
      );
      await service.beginAuthentication('session-2', { rpId: 'attendingai.health' });

      const cred = makeCredential({ counter: 0 });
      const result = await service.finishAuthentication('session-2', cred, {
        credentialId: 'cred-1', clientDataJSON: 'x', authenticatorData: 'y', signature: 'sig',
      });
      expect(result.verified).toBe(true);
    });

    it('should reject when challenge type mismatches (registration challenge reused for auth)', async () => {
      await service.beginRegistration('session-2', {
        rpId: 'attendingai.health', rpName: 'ATTENDING AI',
        userId: 'user-1', userName: 'jane@example.com', userDisplayName: 'Jane',
      });

      const result = await service.finishAuthentication('session-2', makeCredential(), {
        credentialId: 'cred-1', clientDataJSON: 'x', authenticatorData: 'y', signature: 'sig',
      });
      expect(result.verified).toBe(false);
      expect(result.error).toBe('CHALLENGE_NOT_FOUND');
    });
  });

  // ---------------------------------------------------------------------------
  // Challenge randomness
  // ---------------------------------------------------------------------------

  describe('challenge generation', () => {
    it('should generate unique challenges across invocations', async () => {
      await service.beginRegistration('s1', {
        rpId: 'attendingai.health', rpName: 'ATTENDING AI',
        userId: 'user-1', userName: 'a@b.com', userDisplayName: 'A',
      });
      await service.beginRegistration('s2', {
        rpId: 'attendingai.health', rpName: 'ATTENDING AI',
        userId: 'user-2', userName: 'c@d.com', userDisplayName: 'C',
      });

      const c1 = (await store.load('s1'))!.challenge;
      const c2 = (await store.load('s2'))!.challenge;
      expect(c1).not.toBe(c2);
      expect(c1.length).toBeGreaterThanOrEqual(40); // 32 bytes base64url ≈ 43 chars
    });
  });
});
