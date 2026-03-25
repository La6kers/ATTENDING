// =============================================================================
// COMPASS Webhook System — Barrel Export
// apps/patient-portal/lib/webhooks/index.ts
// =============================================================================

export {
  dispatchWebhooks,
  buildWebhookPayload,
  processRetries,
  healthCheckWebhooks,
} from './dispatcher';

export { formatFhirR4, toFhirR4Bundle } from './formatters/fhir-r4';
export { formatHl7v2, toHl7v2Oru } from './formatters/hl7v2';

export type {
  WebhookEvent,
  CompassWebhookPayload,
  DeliveryResult,
  FormattedPayload,
} from './types';
