// =============================================================================
// ATTENDING AI - Enhanced FHIR Client Package
// packages/fhir-client/src/index.ts
//
// FHIR R4, SMART on FHIR 2.0, CMS-Aligned Network support
// =============================================================================

// Types
export type {
  SmartAppLaunchConfig,
  CmsNetworkConfig,
  SmartWellKnown,
  FhirDataCategory,
  RecordLocatorQuery,
  RecordLocatorResult,
  BulkExportRequest,
  BulkExportStatus,
  BulkExportFile,
  USCoreProfile,
  ProfileValidationResult,
  ProfileValidationError,
  ProfileValidationWarning,
} from './types';

export {
  SmartAppLaunchConfigSchema,
  CmsNetworkConfigSchema,
  FHIR_CATEGORY_RESOURCE_MAP,
} from './types';

// SMART on FHIR 2.0 Client
export { SmartFhirClient } from './smart-client';

// CMS Network Record Locator
export { RecordLocatorService } from './network/RecordLocator';

// US Core Profile Validation
export { USCoreValidator } from './profiles/us-core-validator';
