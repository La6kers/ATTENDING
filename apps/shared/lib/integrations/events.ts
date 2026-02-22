// ============================================================
// ATTENDING AI - Event Bus & Webhook Delivery
// apps/shared/lib/integrations/events.ts
//
// In-process event bus that dispatches clinical events to:
//   - Webhook subscriptions (HTTP POST with HMAC signature)
//   - Internal listeners (real-time alerts, notifications)
//
// Event flow:
//   Application code → emit('lab.result.created', payload)
//       ↓
//   Event Bus → fans out to all listeners
//       ↓
//   Webhook Dispatcher → signed HTTP POST to subscriber URLs
//       ↓
//   Retry Queue → exponential backoff on failure
//
// Usage:
//   import { events } from '@attending/shared/lib/integrations/events';
//
//   // Emit an event
//   events.emit('lab.result.created', {
//     patientId: 'P-001',
//     labOrderId: 'L-123',
//     results: [...],
//   });
//
//   // Listen to events (internal)
//   events.on('emergency.triggered', async (payload) => {
//     await sendPushNotification(payload);
//   });
// ============================================================

// Webpack cannot resolve Node.js built-in 'crypto' during client bundling.
// Using eval('require') hides it from webpack's static module analysis.
// This code only runs server-side (webhook HMAC signing + event IDs).
// eslint-disable-next-line no-eval
const getCrypto = (): typeof import('crypto') => eval('require')('crypto');

// ============================================================
// EVENT TYPES
// ============================================================

export const CLINICAL_EVENTS = {
  // Patient lifecycle
  'patient.created': 'New patient registered',
  'patient.updated': 'Patient demographics updated',
  'patient.merged': 'Patient records merged',

  // Encounters
  'encounter.started': 'Clinical encounter started',
  'encounter.completed': 'Clinical encounter completed',
  'encounter.transferred': 'Patient transferred',

  // Lab orders & results
  'lab.order.created': 'Lab order placed',
  'lab.order.cancelled': 'Lab order cancelled',
  'lab.result.created': 'Lab result received',
  'lab.result.critical': 'Critical lab result flagged',

  // Imaging
  'imaging.order.created': 'Imaging order placed',
  'imaging.result.created': 'Imaging result received',

  // Medications
  'medication.prescribed': 'Medication prescribed',
  'medication.discontinued': 'Medication discontinued',
  'medication.interaction': 'Drug interaction detected',

  // Referrals
  'referral.created': 'Referral created',
  'referral.completed': 'Referral completed',

  // Clinical AI
  'ai.triage.completed': 'AI triage classification completed',
  'ai.differential.generated': 'Differential diagnosis generated',
  'ai.red_flag.detected': 'Clinical red flag detected',

  // Emergency
  'emergency.triggered': 'Emergency event triggered',
  'emergency.acknowledged': 'Emergency event acknowledged',
  'emergency.resolved': 'Emergency event resolved',

  // Assessment (COMPASS)
  'assessment.completed': 'Patient assessment completed',
  'assessment.escalated': 'Assessment escalated to provider',

  // FHIR sync
  'fhir.sync.completed': 'FHIR data sync completed',
  'fhir.sync.failed': 'FHIR data sync failed',

  // Administrative
  'user.created': 'User account created',
  'user.deactivated': 'User account deactivated',
  'api_key.created': 'API key created',
  'api_key.revoked': 'API key revoked',
} as const;

export type ClinicalEventType = keyof typeof CLINICAL_EVENTS;

export interface ClinicalEvent<T = Record<string, unknown>> {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: ClinicalEventType;
  /** ISO timestamp */
  timestamp: string;
  /** Organization that generated the event */
  organizationId?: string;
  /** User who triggered the event */
  userId?: string;
  /** Event payload */
  data: T;
  /** API version */
  version: '1.0';
}

// ============================================================
// EVENT BUS (In-Process)
// ============================================================

type EventListener = (event: ClinicalEvent) => Promise<void> | void;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private globalListeners: Set<EventListener> = new Set();

  /**
   * Emit a clinical event.
   * Dispatches to all matching listeners and webhook subscribers.
   */
  async emit(
    type: ClinicalEventType,
    data: Record<string, unknown>,
    context?: { organizationId?: string; userId?: string }
  ): Promise<void> {
    const event: ClinicalEvent = {
      id: getCrypto().randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      organizationId: context?.organizationId,
      userId: context?.userId,
      data,
      version: '1.0',
    };

    // Dispatch to type-specific listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          await listener(event);
        } catch (err) {
          console.error(`[EventBus] Listener error for ${type}:`, err);
        }
      }
    }

    // Dispatch to wildcard listeners
    for (const listener of this.globalListeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`[EventBus] Global listener error:`, err);
      }
    }
  }

  /** Subscribe to a specific event type */
  on(type: ClinicalEventType | '*', listener: EventListener): () => void {
    if (type === '*') {
      this.globalListeners.add(listener);
      return () => this.globalListeners.delete(listener);
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /** Remove all listeners (for testing) */
  removeAll(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// ============================================================
// WEBHOOK DISPATCHER
// ============================================================

export interface WebhookDeliveryResult {
  subscriptionId: string;
  statusCode: number | null;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 * The signature is sent in the X-Webhook-Signature header.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return getCrypto().createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Deliver a webhook to a single subscriber.
 */
async function deliverWebhook(
  url: string,
  secret: string,
  event: ClinicalEvent,
  attempt: number = 1
): Promise<WebhookDeliveryResult> {
  const payload = JSON.stringify(event);
  const signature = signWebhookPayload(payload, secret);
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': event.type,
        'X-Webhook-ID': event.id,
        'X-Webhook-Timestamp': event.timestamp,
        'X-Webhook-Attempt': String(attempt),
        'User-Agent': 'ATTENDING-AI-Webhooks/1.0',
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Math.round(performance.now() - start);

    return {
      subscriptionId: '',
      statusCode: response.status,
      durationMs,
      success: response.status >= 200 && response.status < 300,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      subscriptionId: '',
      statusCode: null,
      durationMs,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================
// WEBHOOK PROCESSOR (with retry)
// ============================================================

const MAX_RETRY_ATTEMPTS = 5;
const FAILURE_DISABLE_THRESHOLD = 10; // Disable after 10 consecutive failures

/** Exponential backoff: 1min, 5min, 15min, 1hr, 4hr */
function getRetryDelay(attempt: number): number {
  const delays = [60, 300, 900, 3600, 14400]; // seconds
  return (delays[attempt - 1] || delays[delays.length - 1]) * 1000;
}

/**
 * Process webhook delivery for an event.
 * Queries active subscriptions and delivers to each.
 *
 * @param prisma - Prisma client
 * @param event - The event to deliver
 */
export async function processWebhookDeliveries(
  prisma: any,
  event: ClinicalEvent
): Promise<WebhookDeliveryResult[]> {
  // Find matching subscriptions
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      isActive: true,
      organizationId: event.organizationId || undefined,
    },
  });

  const results: WebhookDeliveryResult[] = [];

  for (const sub of subscriptions) {
    // Check if this subscription wants this event type
    const events: string[] = typeof sub.events === 'string'
      ? JSON.parse(sub.events) : sub.events;

    const matches = events.includes(event.type) || events.includes('*');
    if (!matches) continue;

    // Deliver
    const result = await deliverWebhook(sub.url, sub.secret, event);
    result.subscriptionId = sub.id;
    results.push(result);

    // Record delivery
    await prisma.webhookDelivery.create({
      data: {
        subscriptionId: sub.id,
        eventType: event.type,
        payload: JSON.stringify(event),
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        status: result.success ? 'SUCCESS' : 'RETRYING',
        errorMessage: result.error,
        attempt: 1,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        nextRetryAt: result.success ? null : new Date(Date.now() + getRetryDelay(1)),
      },
    }).catch(err => console.error('[Webhook] Failed to record delivery:', err));

    // Update subscription stats
    if (result.success) {
      await prisma.webhookSubscription.update({
        where: { id: sub.id },
        data: {
          failureCount: 0,
          lastDeliveryAt: new Date(),
          lastStatusCode: result.statusCode,
        },
      }).catch(() => {});
    } else {
      const newFailureCount = sub.failureCount + 1;
      const shouldDisable = newFailureCount >= FAILURE_DISABLE_THRESHOLD;

      await prisma.webhookSubscription.update({
        where: { id: sub.id },
        data: {
          failureCount: newFailureCount,
          lastDeliveryAt: new Date(),
          lastStatusCode: result.statusCode,
          ...(shouldDisable ? {
            isActive: false,
            disabledAt: new Date(),
            disabledReason: `Auto-disabled after ${FAILURE_DISABLE_THRESHOLD} consecutive failures`,
          } : {}),
        },
      }).catch(() => {});

      if (shouldDisable) {
        console.warn(`[Webhook] Subscription ${sub.id} (${sub.name}) auto-disabled after ${FAILURE_DISABLE_THRESHOLD} failures`);
      }
    }
  }

  return results;
}

/**
 * Retry failed webhook deliveries.
 * Call this from a scheduled job (e.g., every minute).
 */
export async function retryFailedDeliveries(prisma: any): Promise<number> {
  const pending = await prisma.webhookDelivery.findMany({
    where: {
      status: 'RETRYING',
      nextRetryAt: { lte: new Date() },
      attempt: { lt: MAX_RETRY_ATTEMPTS },
    },
    include: { subscription: true },
    take: 50, // Process in batches
  });

  let retried = 0;

  for (const delivery of pending) {
    if (!delivery.subscription.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', errorMessage: 'Subscription disabled' },
      });
      continue;
    }

    const event: ClinicalEvent = JSON.parse(delivery.payload);
    const result = await deliverWebhook(
      delivery.subscription.url,
      delivery.subscription.secret,
      event,
      delivery.attempt + 1
    );

    const nextAttempt = delivery.attempt + 1;
    const isFinal = nextAttempt >= delivery.maxAttempts;

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempt: nextAttempt,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        status: result.success ? 'SUCCESS' : (isFinal ? 'FAILED' : 'RETRYING'),
        errorMessage: result.error,
        nextRetryAt: result.success || isFinal ? null : new Date(Date.now() + getRetryDelay(nextAttempt)),
      },
    });

    retried++;
  }

  return retried;
}

// ============================================================
// SINGLETON EVENT BUS
// ============================================================

export const events = new EventBus();

/**
 * Wire the event bus to webhook delivery.
 * Call once at server startup (e.g., in instrumentation.ts).
 */
export function wireWebhookDispatcher(prisma: any): void {
  events.on('*', async (event) => {
    try {
      await processWebhookDeliveries(prisma, event);
    } catch (err) {
      console.error('[Webhook] Dispatch error:', err);
    }
  });
}

export default events;
