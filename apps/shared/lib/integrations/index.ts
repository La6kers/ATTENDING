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
