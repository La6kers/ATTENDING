// =============================================================================
// ATTENDING AI - FHIR Client Factory
// apps/provider-portal/lib/fhir/fhirClientFactory.ts
//
// Creates configured FHIR clients for different EHR vendors
// =============================================================================

import { FhirClient, createEpicClient, createCernerClient } from '@attending/shared/lib/fhir';

export type FhirVendor = 'epic' | 'cerner' | 'generic';

// =============================================================================
// Environment Configuration
// =============================================================================

interface FhirEnvironmentConfig {
  epic: {
    baseUrl: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes: string[];
  };
  cerner: {
    baseUrl: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes: string[];
  };
  generic: {
    baseUrl: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes: string[];
  };
}

function getEnvironmentConfig(): FhirEnvironmentConfig {
  const baseRedirectUri = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    epic: {
      baseUrl: process.env.EPIC_FHIR_BASE_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
      clientId: process.env.EPIC_CLIENT_ID || '',
      clientSecret: process.env.EPIC_CLIENT_SECRET,
      redirectUri: process.env.EPIC_REDIRECT_URI || `${baseRedirectUri}/api/fhir/auth/callback`,
      scopes: (process.env.EPIC_SCOPES || '').split(',').filter(Boolean) || [
        'launch/patient',
        'patient/Patient.read',
        'patient/Observation.read',
        'patient/Observation.write',
        'patient/Condition.read',
        'patient/Condition.write',
        'patient/MedicationRequest.read',
        'patient/MedicationRequest.write',
        'patient/AllergyIntolerance.read',
        'patient/AllergyIntolerance.write',
        'patient/Encounter.read',
        'patient/ServiceRequest.read',
        'patient/ServiceRequest.write',
        'patient/DiagnosticReport.read',
        'patient/DocumentReference.read',
        'openid',
        'fhirUser',
      ],
    },
    cerner: {
      baseUrl: process.env.CERNER_FHIR_BASE_URL || 'https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
      clientId: process.env.CERNER_CLIENT_ID || '',
      clientSecret: process.env.CERNER_CLIENT_SECRET,
      redirectUri: process.env.CERNER_REDIRECT_URI || `${baseRedirectUri}/api/fhir/auth/callback`,
      scopes: (process.env.CERNER_SCOPES || '').split(',').filter(Boolean) || [
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
    generic: {
      baseUrl: process.env.FHIR_SERVER_URL || 'http://localhost:8080/fhir',
      clientId: process.env.FHIR_CLIENT_ID || '',
      clientSecret: process.env.FHIR_CLIENT_SECRET,
      redirectUri: process.env.FHIR_REDIRECT_URI || `${baseRedirectUri}/api/fhir/auth/callback`,
      scopes: (process.env.FHIR_SCOPES || '').split(',').filter(Boolean) || [
        'patient/*.read',
        'patient/*.write',
        'openid',
      ],
    },
  };
}

// =============================================================================
// Client Factory
// =============================================================================

export function createFhirClient(vendor: FhirVendor): FhirClient {
  const config = getEnvironmentConfig();

  switch (vendor) {
    case 'epic':
      if (!config.epic.clientId) {
        throw new Error('Epic FHIR client ID not configured. Set EPIC_CLIENT_ID environment variable.');
      }
      return createEpicClient({
        baseUrl: config.epic.baseUrl,
        clientId: config.epic.clientId,
        redirectUri: config.epic.redirectUri,
        scopes: config.epic.scopes,
      });

    case 'cerner':
      if (!config.cerner.clientId) {
        throw new Error('Cerner FHIR client ID not configured. Set CERNER_CLIENT_ID environment variable.');
      }
      return createCernerClient({
        baseUrl: config.cerner.baseUrl,
        clientId: config.cerner.clientId,
        redirectUri: config.cerner.redirectUri,
        scopes: config.cerner.scopes,
      });

    case 'generic':
      return new FhirClient({
        ehr: {
          vendor: 'generic',
          baseUrl: config.generic.baseUrl,
          clientId: config.generic.clientId,
          clientSecret: config.generic.clientSecret,
          redirectUri: config.generic.redirectUri,
          scopes: config.generic.scopes,
        },
      });

    default:
      throw new Error(`Unsupported FHIR vendor: ${vendor}`);
  }
}

// =============================================================================
// Client with Stored Tokens
// =============================================================================

export async function createAuthenticatedFhirClient(
  vendor: FhirVendor,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<FhirClient> {
  const config = getEnvironmentConfig();
  const vendorConfig = config[vendor];

  const client = new FhirClient({
    ehr: {
      vendor: vendor === 'generic' ? 'generic' : vendor,
      baseUrl: vendorConfig.baseUrl,
      clientId: vendorConfig.clientId,
      clientSecret: vendorConfig.clientSecret,
      redirectUri: vendorConfig.redirectUri,
      scopes: vendorConfig.scopes,
    },
    accessToken,
    refreshToken,
    tokenExpiresAt: expiresAt,
  });

  // Fetch SMART config for token refresh
  try {
    const smartConfig = await client.getSmartConfiguration();
    client['config'].smart = smartConfig;
  } catch (error) {
    console.warn('[FhirClientFactory] Could not fetch SMART config:', error);
  }

  return client;
}

// =============================================================================
// Vendor Detection
// =============================================================================

export function detectVendorFromUrl(fhirUrl: string): FhirVendor {
  const url = fhirUrl.toLowerCase();
  
  if (url.includes('epic.com') || url.includes('epichosted')) {
    return 'epic';
  }
  if (url.includes('cerner.com') || url.includes('cernercentral')) {
    return 'cerner';
  }
  
  return 'generic';
}

// =============================================================================
// Configuration Validation
// =============================================================================

export function validateFhirConfiguration(vendor: FhirVendor): { valid: boolean; errors: string[] } {
  const config = getEnvironmentConfig();
  const vendorConfig = config[vendor];
  const errors: string[] = [];

  if (!vendorConfig.baseUrl) {
    errors.push(`${vendor.toUpperCase()}_FHIR_BASE_URL is not configured`);
  }

  if (!vendorConfig.clientId) {
    errors.push(`${vendor.toUpperCase()}_CLIENT_ID is not configured`);
  }

  if (!vendorConfig.redirectUri) {
    errors.push(`${vendor.toUpperCase()}_REDIRECT_URI is not configured`);
  }

  if (vendorConfig.scopes.length === 0) {
    errors.push(`No scopes configured for ${vendor}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Get All Configured Vendors
// =============================================================================

export function getConfiguredVendors(): FhirVendor[] {
  const vendors: FhirVendor[] = [];
  
  if (process.env.EPIC_CLIENT_ID) vendors.push('epic');
  if (process.env.CERNER_CLIENT_ID) vendors.push('cerner');
  if (process.env.FHIR_CLIENT_ID) vendors.push('generic');
  
  return vendors;
}
