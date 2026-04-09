// =============================================================================
// ATTENDING AI - ID.me Provider Tests
// packages/identity/src/__tests__/idme-provider.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdmeProvider } from '../providers/idme';
import type { IdmeConfig } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeConfig(overrides: Partial<IdmeConfig> = {}): IdmeConfig {
  return {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://patient.attendingai.com/api/auth/callback/idme',
    issuer: 'https://api.id.me/oidc',
    sandboxIssuer: 'https://api.idmelabs.com/oidc',
    useSandbox: true,
    scopes: ['openid', 'profile', 'email', 'http://idmanagement.gov/ns/assurance/ial/2'],
    ...overrides,
  };
}

const MOCK_DISCOVERY = {
  issuer: 'https://api.idmelabs.com/oidc',
  authorization_endpoint: 'https://api.idmelabs.com/oidc/authorize',
  token_endpoint: 'https://api.idmelabs.com/oidc/token',
  userinfo_endpoint: 'https://api.idmelabs.com/oidc/userinfo',
  jwks_uri: 'https://api.idmelabs.com/oidc/.well-known/jwks.json',
};

function createMockIdToken(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'idme-user-123',
    iss: 'https://api.id.me/oidc', // Must contain 'id.me' to pass issuer validation
    aud: 'test-client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    nonce: 'test-nonce',
    email: 'patient@example.com',
    email_verified: true,
    fname: 'Jane',
    lname: 'Doe',
    birthdate: '1985-03-15',
    ial: 'http://idmanagement.gov/ns/assurance/ial/2',
    ...claims,
  })).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

// =============================================================================
// Tests
// =============================================================================

describe('IdmeProvider', () => {
  let provider: IdmeProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new IdmeProvider(makeConfig());
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should validate config with Zod', () => {
      expect(() => new IdmeProvider(makeConfig())).not.toThrow();
    });

    it('should reject invalid config', () => {
      expect(() => new IdmeProvider({ clientId: '', clientSecret: 'x', redirectUri: 'not-a-url' } as any)).toThrow();
    });

    it('should use sandbox issuer when useSandbox is true', () => {
      const p = new IdmeProvider(makeConfig({ useSandbox: true }));
      // Verify via the NextAuth config output
      const nextAuth = p.toNextAuthProvider();
      expect(nextAuth.wellKnown).toContain('idmelabs.com');
    });

    it('should use production issuer when useSandbox is false', () => {
      const p = new IdmeProvider(makeConfig({ useSandbox: false }));
      const nextAuth = p.toNextAuthProvider();
      expect(nextAuth.wellKnown).toContain('api.id.me');
    });
  });

  // ---------------------------------------------------------------------------
  // getDiscoveryDocument
  // ---------------------------------------------------------------------------

  describe('getDiscoveryDocument', () => {
    it('should fetch OIDC discovery document', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_DISCOVERY,
      });

      const doc = await provider.getDiscoveryDocument();
      expect(doc.authorization_endpoint).toBe('https://api.idmelabs.com/oidc/authorize');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.idmelabs.com/oidc/.well-known/openid-configuration'
      );
    });

    it('should throw on discovery failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      await expect(provider.getDiscoveryDocument()).rejects.toThrow('discovery failed');
    });
  });

  // ---------------------------------------------------------------------------
  // getAuthorizationUrl
  // ---------------------------------------------------------------------------

  describe('getAuthorizationUrl', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_DISCOVERY,
      });
    });

    it('should build authorization URL with required params', async () => {
      const url = await provider.getAuthorizationUrl({
        state: 'test-state',
        nonce: 'test-nonce',
      });

      expect(url).toContain('authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('nonce=test-nonce');
      expect(url).toContain('response_type=code');
    });

    it('should include PKCE params when provided', async () => {
      const url = await provider.getAuthorizationUrl({
        state: 'test-state',
        nonce: 'test-nonce',
        codeChallenge: 'abc123',
        codeChallengeMethod: 'S256',
      });

      expect(url).toContain('code_challenge=abc123');
      expect(url).toContain('code_challenge_method=S256');
    });
  });

  // ---------------------------------------------------------------------------
  // verifyIdentity
  // ---------------------------------------------------------------------------

  describe('verifyIdentity', () => {
    it('should return success with IAL2 identity', async () => {
      const idToken = createMockIdToken({ ial: 'http://idmanagement.gov/ns/assurance/ial/2' });

      // exchangeCode calls: getDiscoveryDocument (fetch #1) then token endpoint (fetch #2)
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DISCOVERY })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'at-123',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'rt-123',
            id_token: idToken,
          }),
        });

      const result = await provider.verifyIdentity({
        code: 'auth-code-123',
        expectedNonce: 'test-nonce',
      });

      expect(result.success).toBe(true);
      expect(result.identity).toBeDefined();
      expect(result.identity!.ialLevel).toBe('IAL2');
      expect(result.identity!.provider).toBe('idme');
      expect(result.identity!.givenName).toBe('Jane');
      expect(result.identity!.familyName).toBe('Doe');
      expect(result.identity!.email).toBe('patient@example.com');
    });

    it('should reject IAL1 identity', async () => {
      const idToken = createMockIdToken({ ial: '1', verified: false });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DISCOVERY })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'at-123',
            token_type: 'Bearer',
            expires_in: 3600,
            id_token: idToken,
          }),
        });

      const result = await provider.verifyIdentity({
        code: 'auth-code-123',
        expectedNonce: 'test-nonce',
      });

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('IAL_INSUFFICIENT');
    });

    it('should handle provider errors gracefully', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DISCOVERY })
        .mockResolvedValueOnce({ ok: false, text: async () => 'invalid_grant' });

      const result = await provider.verifyIdentity({
        code: 'bad-code',
        expectedNonce: 'test-nonce',
      });

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('PROVIDER_ERROR');
    });

    it('should detect IAL2 from verified + credential_type', async () => {
      const idToken = createMockIdToken({
        ial: undefined,
        verified: true,
        credential_type: 'identity_verification',
      });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_DISCOVERY })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'at-123',
            token_type: 'Bearer',
            expires_in: 3600,
            id_token: idToken,
          }),
        });

      const result = await provider.verifyIdentity({
        code: 'auth-code',
        expectedNonce: 'test-nonce',
      });

      expect(result.success).toBe(true);
      expect(result.identity!.ialLevel).toBe('IAL2');
    });
  });

  // ---------------------------------------------------------------------------
  // toNextAuthProvider
  // ---------------------------------------------------------------------------

  describe('toNextAuthProvider', () => {
    it('should return valid NextAuth provider config', () => {
      const config = provider.toNextAuthProvider();

      expect(config.id).toBe('idme');
      expect(config.name).toBe('ID.me');
      expect(config.type).toBe('oauth');
      expect(config.idToken).toBe(true);
      expect(config.clientId).toBe('test-client-id');
      expect(config.wellKnown).toContain('.well-known/openid-configuration');
    });

    it('should format profile name correctly', () => {
      const config = provider.toNextAuthProvider();
      const profile = config.profile({
        sub: 'user-1',
        iss: 'test',
        aud: 'test',
        exp: 0,
        iat: 0,
        fname: 'Jane',
        lname: 'Doe',
        email: 'jane@example.com',
      });

      expect(profile.name).toBe('Jane Doe');
      expect(profile.email).toBe('jane@example.com');
    });
  });
});
