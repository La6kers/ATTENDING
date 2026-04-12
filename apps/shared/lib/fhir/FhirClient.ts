// =============================================================================
// ATTENDING AI - FHIR Client
// apps/shared/lib/fhir/FhirClient.ts
//
// Core FHIR R4 client with SMART on FHIR authentication
// =============================================================================

import {
  FhirClientConfig, EhrConfiguration, SmartConfiguration, SmartTokenResponse,
  FhirResource, FhirBundle, FhirPatient, FhirObservation, FhirCondition,
  FhirMedicationRequest, FhirAllergyIntolerance, FhirEncounter, FhirServiceRequest,
  FhirDiagnosticReport,
} from './types';

// =============================================================================
// FHIR Client Class
// =============================================================================

export class FhirClient {
  private config: FhirClientConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: FhirClientConfig) {
    this.config = config;
    this.accessToken = config.accessToken || null;
    this.refreshToken = config.refreshToken || null;
    this.tokenExpiresAt = config.tokenExpiresAt || null;
  }

  // ===========================================================================
  // SMART on FHIR Authentication
  // ===========================================================================

  async getSmartConfiguration(): Promise<SmartConfiguration> {
    const wellKnownUrl = `${this.config.ehr.baseUrl}/.well-known/smart-configuration`;

    try {
      const response = await fetch(wellKnownUrl);
      if (!response.ok) throw new Error(`Failed to fetch SMART configuration: ${response.status}`);
      return await response.json();
    } catch (error) {
      // Fallback to metadata endpoint
      const metadataUrl = `${this.config.ehr.baseUrl}/metadata`;
      const response = await fetch(metadataUrl);
      if (!response.ok) throw new Error(`Failed to fetch capability statement: ${response.status}`);

      const metadata = await response.json();
      const security = metadata.rest?.[0]?.security;
      const oauth = security?.extension?.find((e: any) => e.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris');

      return {
        authorization_endpoint: oauth?.extension?.find((e: any) => e.url === 'authorize')?.valueUri,
        token_endpoint: oauth?.extension?.find((e: any) => e.url === 'token')?.valueUri,
      };
    }
  }

  getAuthorizationUrl(state: string, launch?: string): string {
    const smart = this.config.smart;
    if (!smart?.authorization_endpoint) throw new Error('SMART configuration not available');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.ehr.clientId,
      redirect_uri: this.config.ehr.redirectUri,
      scope: this.config.ehr.scopes.join(' '),
      state,
      aud: this.config.ehr.aud || this.config.ehr.baseUrl,
    });

    if (launch) params.set('launch', launch);

    return `${smart.authorization_endpoint}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<SmartTokenResponse> {
    const smart = this.config.smart;
    if (!smart?.token_endpoint) throw new Error('SMART configuration not available');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.ehr.redirectUri,
      client_id: this.config.ehr.clientId,
    });

    if (this.config.ehr.clientSecret) {
      body.set('client_secret', this.config.ehr.clientSecret);
    }

    const response = await fetch(smart.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenResponse: SmartTokenResponse = await response.json();

    this.accessToken = tokenResponse.access_token;
    this.refreshToken = tokenResponse.refresh_token || null;
    this.tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    this.config.patientId = tokenResponse.patient;
    this.config.encounterId = tokenResponse.encounter;

    return tokenResponse;
  }

  async refreshAccessToken(): Promise<SmartTokenResponse> {
    if (!this.refreshToken) throw new Error('No refresh token available');

    const smart = this.config.smart;
    if (!smart?.token_endpoint) throw new Error('SMART configuration not available');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.config.ehr.clientId,
    });

    if (this.config.ehr.clientSecret) {
      body.set('client_secret', this.config.ehr.clientSecret);
    }

    const response = await fetch(smart.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenResponse: SmartTokenResponse = await response.json();

    this.accessToken = tokenResponse.access_token;
    if (tokenResponse.refresh_token) this.refreshToken = tokenResponse.refresh_token;
    this.tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    return tokenResponse;
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return true;
    return Date.now() >= this.tokenExpiresAt.getTime() - 60000; // 1 minute buffer
  }

  async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired() && this.refreshToken) {
      await this.refreshAccessToken();
    }
  }

  // ===========================================================================
  // FHIR API Methods
  // ===========================================================================

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.ensureValidToken();

    if (!this.accessToken) throw new Error('No access token available');

    const url = `${this.config.ehr.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FHIR request failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async read<T extends FhirResource>(resourceType: string, id: string): Promise<T> {
    return this.request<T>(`/${resourceType}/${id}`);
  }

  async search<T extends FhirResource>(resourceType: string, params: Record<string, string> = {}): Promise<FhirBundle> {
    const searchParams = new URLSearchParams(params);
    return this.request<FhirBundle>(`/${resourceType}?${searchParams.toString()}`);
  }

  async create<T extends FhirResource>(resource: T): Promise<T> {
    return this.request<T>(`/${resource.resourceType}`, {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  }

  async update<T extends FhirResource>(resource: T): Promise<T> {
    if (!resource.id) throw new Error('Resource ID required for update');
    return this.request<T>(`/${resource.resourceType}/${resource.id}`, {
      method: 'PUT',
      body: JSON.stringify(resource),
    });
  }

  async delete(resourceType: string, id: string): Promise<void> {
    await this.request(`/${resourceType}/${id}`, { method: 'DELETE' });
  }

  // ===========================================================================
  // Patient Methods
  // ===========================================================================

  async getPatient(patientId?: string): Promise<FhirPatient> {
    const id = patientId || this.config.patientId;
    if (!id) throw new Error('Patient ID required');
    return this.read<FhirPatient>('Patient', id);
  }

  async searchPatients(params: {
    name?: string;
    birthdate?: string;
    identifier?: string;
    family?: string;
    given?: string;
  }): Promise<FhirBundle> {
    const searchParams: Record<string, string> = {};
    if (params.name) searchParams.name = params.name;
    if (params.birthdate) searchParams.birthdate = params.birthdate;
    if (params.identifier) searchParams.identifier = params.identifier;
    if (params.family) searchParams.family = params.family;
    if (params.given) searchParams.given = params.given;
    return this.search('Patient', searchParams);
  }

  // ===========================================================================
  // Observation Methods (Labs, Vitals)
  // ===========================================================================

  async getObservations(patientId?: string, category?: string, code?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-date',
      _count: '100',
    };
    if (category) params.category = category;
    if (code) params.code = code;
    return this.search('Observation', params);
  }

  async getLabResults(patientId?: string): Promise<FhirBundle> {
    return this.getObservations(patientId, 'laboratory');
  }

  async getVitals(patientId?: string): Promise<FhirBundle> {
    return this.getObservations(patientId, 'vital-signs');
  }

  async createObservation(observation: FhirObservation): Promise<FhirObservation> {
    return this.create(observation);
  }

  // ===========================================================================
  // Condition Methods (Diagnoses, Problems)
  // ===========================================================================

  async getConditions(patientId?: string, category?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-recorded-date',
    };
    if (category) params.category = category;
    return this.search('Condition', params);
  }

  async getProblemList(patientId?: string): Promise<FhirBundle> {
    return this.getConditions(patientId, 'problem-list-item');
  }

  async createCondition(condition: FhirCondition): Promise<FhirCondition> {
    return this.create(condition);
  }

  // ===========================================================================
  // Medication Methods
  // ===========================================================================

  async getMedications(patientId?: string, status?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-authoredon',
    };
    if (status) params.status = status;
    return this.search('MedicationRequest', params);
  }

  async getActiveMedications(patientId?: string): Promise<FhirBundle> {
    return this.getMedications(patientId, 'active');
  }

  async createMedicationRequest(medication: FhirMedicationRequest): Promise<FhirMedicationRequest> {
    return this.create(medication);
  }

  // ===========================================================================
  // Allergy Methods
  // ===========================================================================

  async getAllergies(patientId?: string): Promise<FhirBundle> {
    return this.search('AllergyIntolerance', {
      patient: patientId || this.config.patientId || '',
      'clinical-status': 'active',
    });
  }

  async createAllergy(allergy: FhirAllergyIntolerance): Promise<FhirAllergyIntolerance> {
    return this.create(allergy);
  }

  // ===========================================================================
  // Encounter Methods
  // ===========================================================================

  async getEncounters(patientId?: string, status?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-date',
    };
    if (status) params.status = status;
    return this.search('Encounter', params);
  }

  async getEncounter(encounterId?: string): Promise<FhirEncounter> {
    const id = encounterId || this.config.encounterId;
    if (!id) throw new Error('Encounter ID required');
    return this.read<FhirEncounter>('Encounter', id);
  }

  // ===========================================================================
  // Order Methods (ServiceRequest)
  // ===========================================================================

  async getOrders(patientId?: string, category?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-authored',
    };
    if (category) params.category = category;
    return this.search('ServiceRequest', params);
  }

  async createOrder(order: FhirServiceRequest): Promise<FhirServiceRequest> {
    return this.create(order);
  }

  // ===========================================================================
  // Diagnostic Report Methods
  // ===========================================================================

  async getDiagnosticReports(patientId?: string, category?: string): Promise<FhirBundle> {
    const params: Record<string, string> = {
      patient: patientId || this.config.patientId || '',
      _sort: '-date',
    };
    if (category) params.category = category;
    return this.search('DiagnosticReport', params);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  getPatientId(): string | undefined {
    return this.config.patientId;
  }

  getEncounterId(): string | undefined {
    return this.config.encounterId;
  }

  setPatientId(patientId: string): void {
    this.config.patientId = patientId;
  }

  setEncounterId(encounterId: string): void {
    this.config.encounterId = encounterId;
  }

  getConfig(): FhirClientConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createFhirClient(config: FhirClientConfig): FhirClient {
  return new FhirClient(config);
}

export function createEpicClient(config: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}): FhirClient {
  return new FhirClient({
    ehr: {
      vendor: 'epic',
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes || [
        'launch/patient',
        'patient/Patient.read',
        'patient/Observation.read',
        'patient/Condition.read',
        'patient/MedicationRequest.read',
        'patient/AllergyIntolerance.read',
        'patient/Encounter.read',
        'openid',
        'fhirUser',
      ],
    },
  });
}

export function createCernerClient(config: {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}): FhirClient {
  return new FhirClient({
    ehr: {
      vendor: 'cerner',
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes || [
        'launch/patient',
        'patient/Patient.read',
        'patient/Observation.read',
        'patient/Condition.read',
        'patient/MedicationRequest.read',
        'patient/AllergyIntolerance.read',
        'patient/Encounter.read',
        'openid',
        'fhirUser',
        'online_access',
      ],
    },
  });
}
