// =============================================================================
// ATTENDING AI - Enhanced FHIR Client Types
// packages/fhir-client/src/types.ts
//
// FHIR R4, SMART on FHIR 2.0, CMS-Aligned Network types
// =============================================================================

import { z } from 'zod';

// =============================================================================
// SMART on FHIR 2.0 (replaces retiring Azure SMART proxy)
// =============================================================================

export const SmartAppLaunchConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().optional(), // Confidential clients only
  redirectUri: z.string().url(),
  fhirBaseUrl: z.string().url(),
  scopes: z.array(z.string()).default([
    'launch/patient',
    'patient/Patient.read',
    'patient/Observation.read',
    'patient/Condition.read',
    'patient/MedicationRequest.read',
    'patient/AllergyIntolerance.read',
    'patient/Encounter.read',
    'patient/DocumentReference.read',
    'patient/ExplanationOfBenefit.read',
    'openid',
    'fhirUser',
  ]),
  usePkce: z.boolean().default(true), // SMART 2.0 requires PKCE
});

export type SmartAppLaunchConfig = z.infer<typeof SmartAppLaunchConfigSchema>;

// =============================================================================
// CMS-Aligned Network
// =============================================================================

export const CmsNetworkConfigSchema = z.object({
  networkId: z.string().min(1),
  networkName: z.string().min(1),
  fhirBaseUrl: z.string().url(),
  recordLocatorUrl: z.string().url().optional(),
  authConfig: SmartAppLaunchConfigSchema,
  supportedResources: z.array(z.string()).default([
    'Patient', 'Observation', 'Condition', 'MedicationRequest',
    'AllergyIntolerance', 'Encounter', 'DocumentReference',
    'ExplanationOfBenefit', 'Immunization', 'Procedure',
  ]),
});

export type CmsNetworkConfig = z.infer<typeof CmsNetworkConfigSchema>;

// =============================================================================
// SMART on FHIR 2.0 Discovery
// =============================================================================

export interface SmartWellKnown {
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported?: string[];
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  management_endpoint?: string;
  introspection_endpoint?: string;
  revocation_endpoint?: string;
  code_challenge_methods_supported?: string[];
  capabilities?: string[];
}

// =============================================================================
// FHIR Data Categories (for patient consent filtering)
// =============================================================================

export type FhirDataCategory =
  | 'demographics'
  | 'conditions'
  | 'medications'
  | 'allergies'
  | 'labs'
  | 'vitals'
  | 'encounters'
  | 'procedures'
  | 'immunizations'
  | 'documents'
  | 'claims'
  | 'imaging';

export const FHIR_CATEGORY_RESOURCE_MAP: Record<FhirDataCategory, string[]> = {
  demographics: ['Patient'],
  conditions: ['Condition'],
  medications: ['MedicationRequest', 'MedicationStatement'],
  allergies: ['AllergyIntolerance'],
  labs: ['Observation'],
  vitals: ['Observation'],
  encounters: ['Encounter'],
  procedures: ['Procedure'],
  immunizations: ['Immunization'],
  documents: ['DocumentReference'],
  claims: ['ExplanationOfBenefit', 'Claim', 'ClaimResponse'],
  imaging: ['ImagingStudy', 'DiagnosticReport'],
};

// =============================================================================
// Record Locator Service
// =============================================================================

export interface RecordLocatorQuery {
  patientIdentifier: string; // IAL2-verified patient identifier
  networkIds?: string[]; // Specific networks to query (patient consent)
  dataCategories?: FhirDataCategory[]; // What data to retrieve (patient consent)
}

export interface RecordLocatorResult {
  networkId: string;
  networkName: string;
  fhirEndpoint: string;
  patientReference: string; // FHIR Patient reference at this network
  availableResources: string[];
  lastUpdated?: string;
}

// =============================================================================
// Bulk Data Export ($export)
// =============================================================================

export interface BulkExportRequest {
  resourceTypes?: string[];
  since?: string; // ISO datetime
  outputFormat?: 'application/fhir+ndjson' | 'application/ndjson';
  typeFilter?: string[];
}

export interface BulkExportStatus {
  transactionTime: string;
  request: string;
  requiresAccessToken: boolean;
  output: BulkExportFile[];
  error?: BulkExportFile[];
}

export interface BulkExportFile {
  type: string;
  url: string;
  count?: number;
}

// =============================================================================
// US Core Profile Validation
// =============================================================================

export type USCoreProfile =
  | 'us-core-patient'
  | 'us-core-condition'
  | 'us-core-observation-lab'
  | 'us-core-vital-signs'
  | 'us-core-medication-request'
  | 'us-core-allergy-intolerance'
  | 'us-core-encounter'
  | 'us-core-procedure'
  | 'us-core-immunization'
  | 'us-core-document-reference'
  | 'us-core-diagnostic-report-lab'
  | 'us-core-diagnostic-report-note';

export interface ProfileValidationResult {
  isValid: boolean;
  profile: USCoreProfile;
  errors: ProfileValidationError[];
  warnings: ProfileValidationWarning[];
}

export interface ProfileValidationError {
  path: string;
  message: string;
  severity: 'error';
}

export interface ProfileValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
}
