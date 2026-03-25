// =============================================================================
// COMPASS Webhook — Delivery Engine
// apps/shared/lib/webhooks/delivery.ts
//
// Handles webhook delivery with:
//   • HMAC-SHA256 payload signing (X-Compass-Signature header)
//   • Exponential backoff retries (1m, 5m, 30m, 2h, 12h)
//   • Idempotency key generation
//   • Timeout enforcement (10s per attempt)
//   • Automatic webhook disabling after consecutive failures
//   • Delivery logging for audit trail
//
// This module is pure TypeScript — no framework dependency.
// Works in Next.js API routes, standalone Node server, or edge functions.
// =============================================================================

import crypto from 'crypto';
import type {
  WebhookRegistration,
  WebhookDelivery,
  WebhookEventType,
  AttendingAssessmentPayload,
  FhirBundlePayload,
} from './types';
import { toFhirBundle } from './fhirTransform';

// =============================================================================
// Configuration
// =============================================================================

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 6;
const RETRY_DELAYS_MS = [
  60_000,        // 1 minute
  300_000,       // 5 minutes
  1_800_000,     // 30 minutes
  7_200_000,     // 2 hours
  43_200_000,    // 12 hours
];

// =============================================================================
// HMAC Signing
// =============================================================================

/**
 * Generate HMAC-SHA256 signature for payload verification.
 * The receiver verifies: HMAC(secret, timestamp + '.' + body) === signature
 */
export function signPayload(secret: string, timestamp: string, body: string): string {
  const message = `${timestamp}.${body}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verify an incoming webhook signature (for receiver-side validation).
 * Exported so practices can use this in their own integration code.
 */
export function verifySignature(
  secret: string,
  signature: string,
  timestamp: string,
  body: string,
): boolean {
  const expected = signPayload(secret, timestamp, body);
  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Idempotency Key
// =============================================================================

/**
 * Generate a deterministic idempotency key from event + entity + timestamp.
 * Receivers can use this to deduplicate deliveries.
 */
export function generateIdempotencyKey(
  event: WebhookEventType,
  entityId: string,
  timestamp: string,
): string {
  const data = `${event}:${entityId}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

// =============================================================================
// Delivery
// =============================================================================

export interface DeliveryResult {
  delivery: WebhookDelivery;
  shouldRetry: boolean;
  shouldDisable: boolean;
}

/**
 * Deliver a webhook payload to a single registration.
 *
 * Returns the delivery record with status. Caller is responsible for:
 *   1. Persisting the delivery record
 *   2. Scheduling retries if shouldRetry === true
 *   3. Disabling the webhook if shouldDisable === true
 */
export async function deliverWebhook(
  webhook: WebhookRegistration,
  event: WebhookEventType,
  payload: AttendingAssessmentPayload,
  attempt: number = 1,
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();
  const deliveryId = crypto.randomUUID();

  // Transform payload to requested format
  let finalPayload: AttendingAssessmentPayload | FhirBundlePayload;
  if (webhook.format === 'fhir-r4') {
    finalPayload = toFhirBundle(payload);
  } else {
    finalPayload = payload;
  }

  const body = JSON.stringify(finalPayload);
  const signature = signPayload(webhook.secret, timestamp, body);
  const idempotencyKey = generateIdempotencyKey(
    event,
    payload.assessment.id,
    payload.assessment.completedAt,
  );

  const delivery: WebhookDelivery = {
    id: deliveryId,
    webhookId: webhook.id,
    event,
    timestamp,
    idempotencyKey,
    payload: finalPayload,
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    status: 'pending',
    createdAt: timestamp,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'COMPASS-Webhook/1.0',
        'X-Compass-Event': event,
        'X-Compass-Delivery': deliveryId,
        'X-Compass-Signature': signature,
        'X-Compass-Timestamp': timestamp,
        'X-Compass-Idempotency-Key': idempotencyKey,
        ...(webhook.headers || {}),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    delivery.responseStatus = response.status;

    // Try to capture response body (truncated)
    try {
      const responseText = await response.text();
      delivery.responseBody = responseText.slice(0, 1000);
    } catch {
      // Response body read failed — not critical
    }

    if (response.ok) {
      delivery.status = 'delivered';
      delivery.deliveredAt = new Date().toISOString();
      return { delivery, shouldRetry: false, shouldDisable: false };
    }

    // Non-2xx response — treat as failure
    delivery.status = attempt >= MAX_ATTEMPTS ? 'failed' : 'retrying';
    delivery.error = `HTTP ${response.status}`;

    if (attempt < MAX_ATTEMPTS) {
      const delayIndex = Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
      delivery.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[delayIndex]).toISOString();
    }

    const newFailureCount = webhook.consecutiveFailures + 1;
    return {
      delivery,
      shouldRetry: attempt < MAX_ATTEMPTS,
      shouldDisable: newFailureCount >= webhook.failureThreshold,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown delivery error';
    const isTimeout = errorMessage.includes('abort');

    delivery.status = attempt >= MAX_ATTEMPTS ? 'failed' : 'retrying';
    delivery.error = isTimeout ? 'Timeout (10s)' : errorMessage;

    if (attempt < MAX_ATTEMPTS) {
      const delayIndex = Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
      delivery.nextRetryAt = new Date(Date.now() + RETRY_DELAYS_MS[delayIndex]).toISOString();
    }

    const newFailureCount = webhook.consecutiveFailures + 1;
    return {
      delivery,
      shouldRetry: attempt < MAX_ATTEMPTS,
      shouldDisable: newFailureCount >= webhook.failureThreshold,
    };
  }
}

// =============================================================================
// Fan-out: deliver to all matching webhooks
// =============================================================================

/**
 * Deliver an event to all active webhooks subscribed to that event type.
 *
 * Returns delivery results for each webhook. Fire-and-forget pattern:
 * the assessment submission should NOT wait for webhook delivery.
 */
export async function fanOutWebhookEvent(
  webhooks: WebhookRegistration[],
  event: WebhookEventType,
  payload: AttendingAssessmentPayload,
): Promise<DeliveryResult[]> {
  const activeWebhooks = webhooks.filter(
    (w) => w.status === 'active' && w.events.includes(event),
  );

  if (activeWebhooks.length === 0) return [];

  // Deliver to all matching webhooks in parallel
  const results = await Promise.allSettled(
    activeWebhooks.map((webhook) => deliverWebhook(webhook, event, payload)),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<DeliveryResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// =============================================================================
// Test delivery — sends a synthetic payload to verify endpoint
// =============================================================================

export async function testWebhook(
  webhook: WebhookRegistration,
): Promise<{ success: boolean; responseStatus?: number; responseTime: number; error?: string }> {
  const start = Date.now();

  const testPayload: AttendingAssessmentPayload = {
    format: 'attending',
    version: '1.0',
    assessment: {
      id: 'test-' + crypto.randomUUID().slice(0, 8),
      sessionId: 'test-session',
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      triageLevel: 'ROUTINE',
      chiefComplaint: 'WEBHOOK TEST — This is a test delivery from COMPASS',
      hpiNarrative: 'This is a test webhook delivery. No clinical data.',
      hpiStructured: {},
      redFlags: [],
      urgencyScore: 0,
      urgencyLevel: 'standard',
    },
    patient: {
      id: 'test-patient',
      mrn: 'TEST-000',
      name: 'Test Patient',
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: '1990-01-01',
      gender: 'Unknown',
      medications: [],
      allergies: ['NKDA'],
      medicalHistory: [],
    },
    meta: {
      compassVersion: '1.0.0',
      source: 'compass-standalone',
    },
  };

  try {
    const result = await deliverWebhook(webhook, 'assessment.completed', testPayload);
    return {
      success: result.delivery.status === 'delivered',
      responseStatus: result.delivery.responseStatus,
      responseTime: Date.now() - start,
      error: result.delivery.error,
    };
  } catch (err) {
    return {
      success: false,
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Test delivery failed',
    };
  }
}
