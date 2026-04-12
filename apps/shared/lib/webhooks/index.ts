// =============================================================================
// COMPASS Webhook Module — Public API
// apps/shared/lib/webhooks/index.ts
// =============================================================================

// Types & Contracts
export type {
  WebhookEventType,
  WebhookPayloadFormat,
  WebhookStatus,
  WebhookRegistration,
  WebhookDelivery,
  AttendingAssessmentPayload,
  FhirBundlePayload,
  FhirBundleEntry,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookTestResult,
  WebhookDeliveryLog,
} from './types';

export { WEBHOOK_EVENTS } from './types';

// Payload Builder
export { buildWebhookPayload } from './buildPayload';
export type { AssessmentWebhookInput } from './buildPayload';

// Delivery Engine
export {
  signPayload,
  verifySignature,
  generateIdempotencyKey,
  deliverWebhook,
  fanOutWebhookEvent,
  testWebhook,
} from './delivery';
export type { DeliveryResult } from './delivery';

// FHIR Transform
export { toFhirBundle } from './fhirTransform';
