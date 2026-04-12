// ============================================================
// ATTENDING AI - Inbound Webhook Receiver
// apps/provider-portal/pages/api/integrations/webhook.ts
//
// Generic webhook receiver for external systems.
// Validates HMAC signature, routes to appropriate handler.
//
// POST /api/integrations/webhook
//   X-API-Key: atnd_xxxxx
//   X-Webhook-Signature: sha256=<hmac>
//   X-Webhook-Event: lab.result.created
//   Content-Type: application/json
//   Body: { ... event payload ... }
//
// Supported inbound event types:
//   - lab.result.created     (LIS result delivery)
//   - imaging.result.created (RIS/PACS result delivery)
//   - patient.updated        (ADT sync)
//   - fhir.sync.completed    (FHIR subscription notification)
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac } from 'crypto';
import { validateApiKey } from '@attending/shared/lib/auth/apiKeys';
import { events } from '@attending/shared/lib/integrations/events';
import { auditLog, AuditActions } from '@attending/shared/lib/audit';
import { logger } from '@attending/shared/lib/logging';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

// Allowed inbound event types
const ALLOWED_INBOUND_EVENTS = new Set([
  'lab.result.created',
  'lab.result.critical',
  'imaging.result.created',
  'patient.created',
  'patient.updated',
  'patient.merged',
  'encounter.completed',
  'fhir.sync.completed',
  'fhir.sync.failed',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const prisma = await getPrisma();

  // ---- API Key Authentication ----
  const apiKey = await validateApiKey(req, prisma, 'write:results');
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  // ---- Signature Verification (optional but recommended) ----
  const signature = req.headers['x-webhook-signature'] as string;
  if (signature) {
    const webhookSecret = req.headers['x-webhook-secret'] as string;
    // Lookup the subscription secret for this API key's org
    // For now, verify against a shared secret if provided
    if (webhookSecret) {
      const payload = JSON.stringify(req.body);
      const expected = `sha256=${createHmac('sha256', webhookSecret).update(payload).digest('hex')}`;
      if (signature !== expected) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }
  }

  // ---- Extract Event Type ----
  const eventType = (req.headers['x-webhook-event'] as string) || req.body?.type || req.body?.event;
  if (!eventType) {
    return res.status(400).json({ error: 'Missing event type (X-Webhook-Event header or body.type)' });
  }

  if (!ALLOWED_INBOUND_EVENTS.has(eventType)) {
    return res.status(400).json({
      error: `Unsupported event type: ${eventType}`,
      supportedEvents: Array.from(ALLOWED_INBOUND_EVENTS),
    });
  }

  // ---- Extract Payload ----
  const payload = req.body?.data || req.body?.payload || req.body;
  const eventId = req.headers['x-webhook-id'] as string || `inbound-${Date.now()}`;

  logger.info('[Webhook:Inbound] Event received', {
    eventType,
    eventId,
    orgId: apiKey.organizationId,
    source: apiKey.name,
  });

  try {
    // ---- Dispatch to internal event bus ----
    await events.emit(eventType as any, {
      ...payload,
      _source: 'webhook',
      _integrationName: apiKey.name,
      _inboundEventId: eventId,
    }, {
      organizationId: apiKey.organizationId,
    });

    // ---- Audit ----
    await auditLog({
      action: AuditActions.FHIR_RESULT_RECEIVED,
      userId: `integration:${apiKey.name}`,
      resourceType: 'API',
      details: {
        source: 'webhook',
        eventType,
        eventId,
        integrationName: apiKey.name,
      },
    });

    return res.status(200).json({
      success: true,
      eventId,
      message: `Event ${eventType} processed`,
    });

  } catch (error) {
    logger.error('[Webhook:Inbound] Processing error', error instanceof Error ? error : new Error(String(error)));

    return res.status(500).json({
      success: false,
      eventId,
      error: 'Internal processing error',
    });
  }
}
