// =============================================================================
// ATTENDING AI - SMART on FHIR 2.0 Client Tests
// packages/fhir-client/src/__tests__/smart-client.test.ts
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartFhirClient } from '../smart-client';
import type { SmartAppLaunchConfig } from '../types';

// =============================================================================
// Fixtures
// =============================================================================

function makeConfig(overrides: Partial<SmartAppLaunchConfig> = {}): SmartAppLaunchConfig {
  return {
    clientId: 'test-app-id',
    redirectUri: 'https://provider.attendingai.com/api/auth/callback',
    fhirBaseUrl: 'https://fhir.example.com/r4',
    scopes: ['launch/patient', 'patient/Patient.read', 'openid'],
    usePkce: true,
    ...overrides,
  };
}

const MOCK_SMART_CONFIG = {
  authorization_endpoint: 'https://fhir.example.com/auth/authorize',
  token_endpoint: 'https://fhir.example.com/auth/token',
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
  scopes_supported: ['launch/patient', 'patient/*.read', 'openid'],
  code_challenge_methods_supported: ['S256'],
};

// =============================================================================
// Tests
// =============================================================================

describe('SmartFhirClient', () => {
  let client: SmartFhirClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    client = new SmartFhirClient(makeConfig());
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create client with valid config', () => {
      expect(client.isAuthenticated()).toBe(false);
      expect(client.getPatientId()).toBeNull();
    });

    it('should validate config with Zod', () => {
      expect(() => new SmartFhirClient(makeConfig())).not.toThrow();
    });

    it('should reject invalid config', () => {
      expect(() => new SmartFhirClient({
        clientId: '',
        redirectUri: 'not-a-url',
        fhirBaseUrl: 'not-a-url',
      } as any)).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // discover
  // ---------------------------------------------------------------------------

  describe('discover', () => {
    it('should fetch SMART configuration', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_SMART_CONFIG,
      });

      const config = await client.discover();
      expect(config.authorization_endpoint).toBe('https://fhir.example.com/auth/authorize');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://fhir.example.com/r4/.well-known/smart-configuration',
        expect.objectContaining({ headers: { Accept: 'application/json' } })
      );
    });

    it('should cache discovery result', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_SMART_CONFIG,
      });

      await client.discover();
      await client.discover();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on discovery failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
      await expect(client.discover()).rejects.toThrow('SMART discovery failed');
    });
  });

  // ---------------------------------------------------------------------------
  // createAuthorizationRequest
  // ---------------------------------------------------------------------------

  describe('createAuthorizationRequest', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_SMART_CONFIG,
      });
    });

    it('should create authorization URL with PKCE', async () => {
      const result = await client.createAuthorizationRequest({ state: 'test-state' });

      expect(result.authorizationUrl).toContain('authorize');
      expect(result.authorizationUrl).toContain('client_id=test-app-id');
      expect(result.authorizationUrl).toContain('state=test-state');
      expect(result.authorizationUrl).toContain('code_challenge=');
      expect(result.authorizationUrl).toContain('code_challenge_method=S256');
      expect(result.codeVerifier).toBeDefined();
      expect(result.codeVerifier.length).toBeGreaterThan(0);
      expect(result.state).toBe('test-state');
    });

    it('should include launch token when provided', async () => {
      const result = await client.createAuthorizationRequest({
        state: 'test-state',
        launch: 'ehr-launch-token',
      });

      expect(result.authorizationUrl).toContain('launch=ehr-launch-token');
    });

    it('should include aud parameter for FHIR base URL', async () => {
      const result = await client.createAuthorizationRequest({ state: 'test-state' });
      expect(result.authorizationUrl).toContain(encodeURIComponent('https://fhir.example.com/r4'));
    });
  });

  // ---------------------------------------------------------------------------
  // exchangeCode
  // ---------------------------------------------------------------------------

  describe('exchangeCode', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_SMART_CONFIG }) // discovery
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'at-fhir-123',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'patient/Patient.read',
            refresh_token: 'rt-fhir-123',
            patient: 'Patient/12345',
          }),
        });
    });

    it('should exchange code for tokens', async () => {
      const result = await client.exchangeCode({
        code: 'auth-code-xyz',
        codeVerifier: 'verifier-abc',
      });

      expect(result.access_token).toBe('at-fhir-123');
      expect(result.patient).toBe('Patient/12345');
      expect(client.isAuthenticated()).toBe(true);
      expect(client.getPatientId()).toBe('Patient/12345');
    });

    it('should throw on token exchange failure', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_SMART_CONFIG })
        .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'invalid_grant' });

      await expect(client.exchangeCode({
        code: 'bad-code',
        codeVerifier: 'verifier',
      })).rejects.toThrow('SMART token exchange failed');
    });
  });

  // ---------------------------------------------------------------------------
  // request
  // ---------------------------------------------------------------------------

  describe('request', () => {
    it('should throw if not authenticated', async () => {
      await expect(client.request('/Patient/123')).rejects.toThrow('Not authenticated');
    });
  });

  // ---------------------------------------------------------------------------
  // fetchConsentedData
  // ---------------------------------------------------------------------------

  describe('fetchConsentedData', () => {
    it('should fetch only consented resource types', async () => {
      // Authenticate first
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => MOCK_SMART_CONFIG }) // discover
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'at-123',
            token_type: 'Bearer',
            expires_in: 3600,
            patient: 'Patient/123',
          }),
        }) // exchangeCode
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 3,
            entry: [{ resource: { resourceType: 'Condition' } }],
          }),
        }); // FHIR searches

      await client.exchangeCode({ code: 'code', codeVerifier: 'verifier' });

      const results = await client.fetchConsentedData({
        patientId: 'Patient/123',
        consentedCategories: ['conditions', 'medications'],
      });

      expect(results.size).toBeGreaterThan(0);
      // Should have queried Condition + MedicationRequest + MedicationStatement
    });
  });

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  describe('accessors', () => {
    it('should return config copy', () => {
      const config = client.getConfig();
      expect(config.clientId).toBe('test-app-id');
      expect(config.fhirBaseUrl).toBe('https://fhir.example.com/r4');
    });
  });
});
