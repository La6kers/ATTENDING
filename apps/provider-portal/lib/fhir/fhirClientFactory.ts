// =============================================================================
// Stub: FHIR Client Factory
// Placeholder until SMART on FHIR integration is fully implemented.
// =============================================================================

export interface FhirClientConfig {
  baseUrl: string;
  vendor: string;
  clientId?: string;
  scope?: string;
}

export function createFhirClient(_config?: Partial<FhirClientConfig>) {
  return {
    baseUrl: '',
    vendor: 'stub',
    getAuthorizationUrl: () => '#',
    request: async () => ({}),
  };
}

export default createFhirClient;
