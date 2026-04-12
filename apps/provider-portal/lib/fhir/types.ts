// =============================================================================
// FHIR Types
// =============================================================================

export type EhrVendor = 'epic' | 'cerner' | 'allscripts' | 'meditech' | 'stub';

export interface FhirClientConfig {
  baseUrl: string;
  vendor: EhrVendor;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}
