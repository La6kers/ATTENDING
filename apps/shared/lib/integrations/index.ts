// ============================================================
// ATTENDING AI - Integrations Barrel Export
// apps/shared/lib/integrations/index.ts
// ============================================================

// Event bus & webhook delivery
export {
  events,
  wireWebhookDispatcher,
  processWebhookDeliveries,
  retryFailedDeliveries,
  signWebhookPayload,
  CLINICAL_EVENTS,
} from './events';

export type {
  ClinicalEvent,
  ClinicalEventType,
  WebhookDeliveryResult,
} from './events';

// HL7v2 message handling
export {
  HL7v2Parser,
  HL7v2Builder,
  attendingPatientToHL7,
  hl7PatientToAttending,
  hl7ObservationsToLabResults,
} from './hl7v2';

export type {
  HL7Message,
  HL7Patient,
  HL7Observation,
  HL7Segment,
} from './hl7v2';

// Integration registry
export { IntegrationRegistry } from './registry';

export type {
  IntegrationType,
  IntegrationDirection,
  IntegrationStatus,
  HealthStatus,
  IntegrationConfig,
  ConnectionSummary,
} from './registry';

// Bulk data export
export {
  startExportJob,
  getExportJob,
  cancelExportJob,
  listExportJobs,
  getExportFileData,
} from './bulkExport';

export type {
  ExportStatus,
  ExportableResourceType,
  BulkExportRequest,
  ExportJob,
  ExportFile,
} from './bulkExport';

// Data transformation pipeline
export {
  TransformPipeline,
  validateRequired,
  normalizeText,
  normalizeDates,
  normalizeGender,
  normalizePhone,
  stripPHI,
  fieldMapper,
  enrichWith,
  filterItems,
  batchTransform,
  patientImportPipeline,
  labResultImportPipeline,
  deidentifiedExportPipeline,
} from './transforms';

export type {
  TransformContext,
  TransformError,
  TransformResult,
  TransformStage,
} from './transforms';
