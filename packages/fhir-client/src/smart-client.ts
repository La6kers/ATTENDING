// =============================================================================
// ATTENDING AI - SMART on FHIR 2.0 Client
// packages/fhir-client/src/smart-client.ts
//
// Replaces the retiring Azure SMART on FHIR proxy (Sept 2026)
// Implements SMART App Launch 2.0 with PKCE
// =============================================================================

import type { SmartAppLaunchConfig, SmartWellKnown, FhirDataCategory } from './types';
import { SmartAppLaunchConfigSchema, FHIR_CATEGORY_RESOURCE_MAP } from './types';

// =============================================================================
// PKCE Utilities
// =============================================================================

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =============================================================================
// SMART on FHIR 2.0 Client
// =============================================================================

export class SmartFhirClient {
  private config: SmartAppLaunchConfig;
  private discovery: SmartWellKnown | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private patientId: string | null = null;

  constructor(config: SmartAppLaunchConfig) {
    this.config = SmartAppLaunchConfigSchema.parse(config);
  }

  // ---------------------------------------------------------------------------
  // SMART Discovery
  // ---------------------------------------------------------------------------

  async discover(): Promise<SmartWellKnown> {
    if (this.discovery) return this.discovery;

    const url = `${this.config.fhirBaseUrl}/.well-known/smart-configuration`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`SMART discovery failed: ${response.status} at ${url}`);
    }

    this.discovery = await response.json();
    return this.discovery!;
  }

  // ---------------------------------------------------------------------------
  // Authorization (PKCE-based)
  // ---------------------------------------------------------------------------

  async createAuthorizationRequest(params: {
    state: string;
    launch?: string; // EHR launch token
  }): Promise<{
    authorizationUrl: string;
    codeVerifier: string;
    state: string;
  }> {
    const discovery = await this.discover();

    // Generate PKCE pair
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: params.state,
      aud: this.config.fhirBaseUrl,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (params.launch) {
      searchParams.set('launch', params.launch);
    }

    return {
      authorizationUrl: `${discovery.authorization_endpoint}?${searchParams.toString()}`,
      codeVerifier,
      state: params.state,
    };
  }

  // ---------------------------------------------------------------------------
  // Token Exchange
  // ---------------------------------------------------------------------------

  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
  }): Promise<SmartTokenResult> {
    const discovery = await this.discover();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: params.codeVerifier,
    });

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SMART token exchange failed: ${response.status} - ${error}`);
    }

    const result: SmartTokenResult = await response.json();

    this.accessToken = result.access_token;
    this.refreshToken = result.refresh_token ?? null;
    this.tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000);
    this.patientId = result.patient ?? null;

    return result;
  }

  // ---------------------------------------------------------------------------
  // Token Refresh
  // ---------------------------------------------------------------------------

  async refreshAccessToken(): Promise<SmartTokenResult> {
    if (!this.refreshToken) throw new Error('No refresh token available');

    const discovery = await this.discover();

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.config.clientId,
    });

    if (this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`SMART token refresh failed: ${response.status}`);
    }

    const result: SmartTokenResult = await response.json();

    this.accessToken = result.access_token;
    if (result.refresh_token) this.refreshToken = result.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + result.expires_in * 1000);

    return result;
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken) throw new Error('Not authenticated — call exchangeCode first');
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt.getTime() - 60_000) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Access token expired and no refresh token available');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // FHIR API (consent-aware)
  // ---------------------------------------------------------------------------

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.ensureValidToken();

    const url = path.startsWith('http') ? path : `${this.config.fhirBaseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR request failed: ${response.status} ${path} - ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch patient data filtered by consented data categories.
   * Only queries resource types the patient has explicitly consented to share.
   */
  async fetchConsentedData(params: {
    patientId: string;
    consentedCategories: FhirDataCategory[];
  }): Promise<Map<FhirDataCategory, any>> {
    const results = new Map<FhirDataCategory, any>();

    // Build resource type list from consented categories
    const resourceQueries: Array<{ category: FhirDataCategory; resourceType: string }> = [];
    for (const category of params.consentedCategories) {
      const resourceTypes = FHIR_CATEGORY_RESOURCE_MAP[category] || [];
      for (const resourceType of resourceTypes) {
        resourceQueries.push({ category, resourceType });
      }
    }

    // Fetch all consented resources in parallel
    const fetches = resourceQueries.map(async ({ category, resourceType }) => {
      try {
        const searchParams: Record<string, string> = {
          patient: params.patientId,
          _count: '100',
          _sort: '-date',
        };

        // Special handling for lab vs vital observations
        if (resourceType === 'Observation' && category === 'labs') {
          searchParams.category = 'laboratory';
        } else if (resourceType === 'Observation' && category === 'vitals') {
          searchParams.category = 'vital-signs';
        }

        const queryString = new URLSearchParams(searchParams).toString();
        const bundle = await this.request<any>(`/${resourceType}?${queryString}`);
        return { category, bundle };
      } catch (error) {
        // Log but don't fail entire request for one resource type
        console.error(`Failed to fetch ${resourceType} for category ${category}:`, error);
        return { category, bundle: null };
      }
    });

    const fetchResults = await Promise.all(fetches);
    for (const { category, bundle } of fetchResults) {
      if (bundle) {
        const existing = results.get(category);
        if (existing) {
          // Merge bundles for same category (e.g., MedicationRequest + MedicationStatement)
          existing.entry = [...(existing.entry || []), ...(bundle.entry || [])];
          existing.total = (existing.total || 0) + (bundle.total || 0);
        } else {
          results.set(category, bundle);
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Bulk Data Export ($export)
  // ---------------------------------------------------------------------------

  async initiateBulkExport(params?: {
    resourceTypes?: string[];
    since?: string;
  }): Promise<{ contentLocation: string }> {
    await this.ensureValidToken();

    const searchParams = new URLSearchParams();
    if (params?.resourceTypes) {
      searchParams.set('_type', params.resourceTypes.join(','));
    }
    if (params?.since) {
      searchParams.set('_since', params.since);
    }

    const query = searchParams.toString();
    const path = this.patientId
      ? `/Patient/${this.patientId}/$export${query ? '?' + query : ''}`
      : `/Patient/$export${query ? '?' + query : ''}`;

    const response = await fetch(`${this.config.fhirBaseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/fhir+json',
        Prefer: 'respond-async',
      },
    });

    if (response.status !== 202) {
      throw new Error(`Bulk export initiation failed: ${response.status}`);
    }

    const contentLocation = response.headers.get('Content-Location');
    if (!contentLocation) throw new Error('No Content-Location header in bulk export response');

    return { contentLocation };
  }

  async checkBulkExportStatus(contentLocation: string): Promise<{
    status: 'in-progress' | 'complete' | 'error';
    result?: any;
    retryAfter?: number;
  }> {
    await this.ensureValidToken();

    const response = await fetch(contentLocation, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 202) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '120', 10);
      return { status: 'in-progress', retryAfter };
    }

    if (response.status === 200) {
      return { status: 'complete', result: await response.json() };
    }

    return { status: 'error', result: await response.text() };
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  getPatientId(): string | null {
    return this.patientId;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  getConfig(): SmartAppLaunchConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Types
// =============================================================================

interface SmartTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  patient?: string;
  encounter?: string;
  id_token?: string;
  need_patient_banner?: boolean;
  smart_style_url?: string;
}
