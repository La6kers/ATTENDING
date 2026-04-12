// =============================================================================
// COMPASS Webhook — Types & Contracts
// apps/shared/lib/webhooks/types.ts
//
// Defines the webhook registration model, event types, payload shapes,
// and delivery tracking. These types are shared across:
//   • COMPASS Standalone (compass-admin)
//   • Full ATTENDING (provider-portal / patient-portal)
//   • Any future integration point
//
// Design principles:
//   1. Payloads are self-contained — receiver needs no other API calls
//   2. HMAC-SHA256 signature on every delivery for verification
//   3. FHIR R4 output option for EHR-native ingestion
//   4. Idempotency keys prevent duplicate processing
// =============================================================================

// =============================================================================
// Webhook Registration
// =============================================================================

export type WebhookEventType =
  | 'assessment.completed'        // Patient finished COMPASS assessment
  | 'assessment.emergency'        // Red flags triggered emergency protocol
  | 'assessment.updated'          // Provider added notes/triage changes
  | 'assessment.claimed'          // Provider claimed the assessment
  | 'assessment.reviewed'         // Provider marked assessment as reviewed
  | 'patient.created'             // New patient record created via COMPASS
  | 'patient.updated';            // Patient demographics updated

export type WebhookPayloadFormat = 'attending' | 'fhir-r4';

export type WebhookStatus = 'active' | 'paused' | 'disabled' | 'failing';

export interface WebhookRegistration {
  id: string;
  /** Display name for the webhook (e.g., "Epic EHR Integration") */
  name: string;
  /** HTTPS endpoint that receives POST payloads */
  url: string;
  /** HMAC-SHA256 signing secret — used to verify payload authenticity */
  secret: string;
  /** Which events trigger delivery */
  events: WebhookEventType[];
  /** Payload format: native ATTENDING JSON or FHIR R4 Bundle */
  format: WebhookPayloadFormat;
  /** Current status */
  status: WebhookStatus;
  /** Optional: custom HTTP headers sent with each delivery */
  headers?: Record<string, string>;
  /** Auto-disable after N consecutive failures (default: 10) */
  failureThreshold: number;
  /** Current consecutive failure count */
  consecutiveFailures: number;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  lastDeliveryAt?: string;
  lastSuccessAt?: string;
  /** Organization/practice this webhook belongs to */
  organizationId?: string;
}

// =============================================================================
// Webhook Delivery Envelope
// =============================================================================

export interface WebhookDelivery {
  /** Unique delivery ID — use for idempotency */
  id: string;
  /** Which webhook registration this delivery is for */
  webhookId: string;
  /** Event type that triggered this delivery */
  event: WebhookEventType;
  /** ISO timestamp of the event */
  timestamp: string;
  /** Idempotency key — hash of (event + entityId + timestamp) */
  idempotencyKey: string;
  /** The actual payload (format depends on webhook.format) */
  payload: AttendingAssessmentPayload | FhirBundlePayload;
  /** Delivery attempt tracking */
  attempt: number;
  maxAttempts: number;
  /** HTTP response from the receiver */
  responseStatus?: number;
  responseBody?: string;
  /** Delivery status */
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  /** Error message if failed */
  error?: string;
  /** When to retry next (ISO timestamp) */
  nextRetryAt?: string;
  createdAt: string;
  deliveredAt?: string;
}

// =============================================================================
// ATTENDING Native Payload — assessment.completed / assessment.emergency
// =============================================================================

export interface AttendingAssessmentPayload {
  format: 'attending';
  version: '1.0';
  assessment: {
    id: string;
    sessionId: string;
    status: string;
    completedAt: string;
    triageLevel: 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE';
    /** Chief complaint as stated by patient */
    chiefComplaint: string;
    /** Structured HPI following OLDCARTS methodology */
    hpiNarrative: string;
    hpiStructured: {
      onset?: string;
      location?: string;
      duration?: string;
      character?: string;
      severity?: number;
      timing?: string;
      aggravatingFactors?: string[];
      relievingFactors?: string[];
      associatedSymptoms?: string[];
    };
    /** Review of systems responses */
    reviewOfSystems?: Record<string, string[]>;
    /** Red flags detected during assessment */
    redFlags: Array<{
      symptom: string;
      severity: 'critical' | 'urgent' | 'moderate';
      category: string;
      detectedAt: string;
    }>;
    /** Urgency scoring */
    urgencyScore: number;
    urgencyLevel: string;
  };
  patient: {
    id: string;
    mrn: string;
    name: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    /** Self-reported during COMPASS assessment */
    medications: string[];
    allergies: string[];
    medicalHistory: string[];
    socialHistory?: Record<string, string>;
    familyHistory?: string[];
  };
  /** Provider who claimed/reviewed (if applicable) */
  provider?: {
    id: string;
    name: string;
    npi?: string;
  };
  /** Metadata */
  meta: {
    compassVersion: string;
    organizationId?: string;
    locationId?: string;
    source: 'compass-standalone' | 'attending-full';
  };
}

// =============================================================================
// FHIR R4 Bundle Payload — for EHR-native ingestion
// =============================================================================

export interface FhirBundlePayload {
  format: 'fhir-r4';
  version: '1.0';
  /** FHIR R4 Bundle containing Patient + Composition + Observations */
  bundle: {
    resourceType: 'Bundle';
    type: 'document';
    timestamp: string;
    entry: FhirBundleEntry[];
  };
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: Record<string, unknown>;
}

// =============================================================================
// Webhook API Request/Response Shapes
// =============================================================================

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: WebhookEventType[];
  format?: WebhookPayloadFormat;
  headers?: Record<string, string>;
  failureThreshold?: number;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  format?: WebhookPayloadFormat;
  headers?: Record<string, string>;
  status?: WebhookStatus;
  failureThreshold?: number;
}

export interface WebhookTestResult {
  webhookId: string;
  success: boolean;
  responseStatus?: number;
  responseTime: number;
  error?: string;
}

export interface WebhookDeliveryLog {
  deliveries: WebhookDelivery[];
  total: number;
  page: number;
  pageSize: number;
}

// =============================================================================
// Event Constants
// =============================================================================

export const WEBHOOK_EVENTS: Record<WebhookEventType, { label: string; description: string }> = {
  'assessment.completed': {
    label: 'Assessment Completed',
    description: 'Fires when a patient completes their COMPASS assessment',
  },
  'assessment.emergency': {
    label: 'Emergency Detected',
    description: 'Fires immediately when red flags trigger emergency protocol',
  },
  'assessment.updated': {
    label: 'Assessment Updated',
    description: 'Fires when a provider adds notes or changes triage level',
  },
  'assessment.claimed': {
    label: 'Assessment Claimed',
    description: 'Fires when a provider claims an assessment for review',
  },
  'assessment.reviewed': {
    label: 'Assessment Reviewed',
    description: 'Fires when a provider marks an assessment as fully reviewed',
  },
  'patient.created': {
    label: 'Patient Created',
    description: 'Fires when a new patient record is created via COMPASS intake',
  },
  'patient.updated': {
    label: 'Patient Updated',
    description: 'Fires when patient demographics are updated',
  },
};
