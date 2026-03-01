// =============================================================================
// COMPASS Admin - Webhook Test Fire API
// apps/compass-admin/pages/api/webhooks/test.ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { webhookId } = req.body;
  if (!webhookId) return res.status(400).json({ error: 'webhookId is required' });

  try {
    const webhook = await prisma.webhookConfig.findUnique({ where: { id: webhookId } });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const testPayload = {
      event: 'assessment.completed',
      version: '1.0',
      timestamp: new Date().toISOString(),
      compassId: `test-${crypto.randomUUID().substring(0, 8)}`,
      patient: {
        name: 'Test Patient',
        dateOfBirth: '1985-03-15',
        gender: 'Female',
      },
      assessment: {
        sessionId: `test-session-${Date.now()}`,
        chiefComplaint: 'Persistent headache with vision changes for 3 days',
        hpi: {
          onset: '3 days ago',
          location: 'Frontal and temporal',
          character: 'Throbbing',
          severity: 7,
          associated: ['nausea', 'photophobia'],
        },
        medications: ['Lisinopril 10mg daily'],
        allergies: ['Penicillin — rash'],
      },
      triage: {
        level: 'URGENT',
        score: 65,
        redFlags: [
          { symptom: 'Headache with vision changes', severity: 'urgent', category: 'neurological' },
        ],
      },
      metadata: {
        completedAt: new Date().toISOString(),
        assessmentVersion: 'OLDCARTS-v2',
        offlineSubmission: false,
        compassVersion: '1.0.0',
      },
    };

    const timestamp = new Date().toISOString();
    const body = JSON.stringify(testPayload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const deliveryId = `del_test_${crypto.randomUUID().substring(0, 8)}`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Compass-Signature': `sha256=${signature}`,
          'X-Compass-Timestamp': timestamp,
          'X-Compass-Delivery-Id': deliveryId,
          'X-Compass-Event': 'assessment.completed',
          'User-Agent': 'COMPASS-Webhook-Test/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      // Log the test delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event: 'assessment.completed',
          deliveryId,
          attemptNumber: 1,
          status: response.ok ? 'success' : 'failed',
          httpStatus: response.status,
          latencyMs,
          scheduledAt: new Date(),
          attemptedAt: new Date(),
        },
      });

      return res.status(200).json({
        success: response.ok,
        result: { httpStatus: response.status, latencyMs, deliveryId },
        testPayload,
        message: response.ok
          ? `Test delivery successful (HTTP ${response.status}, ${latencyMs}ms)`
          : `Test delivery failed (HTTP ${response.status})`,
      });
    } catch (err) {
      const latencyMs = Date.now() - start;
      return res.status(200).json({
        success: false,
        result: { latencyMs, error: err instanceof Error ? err.message : 'Unknown error' },
        testPayload,
        message: `Test delivery failed: ${err instanceof Error ? err.message : 'Connection error'}`,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Test fire failed' });
  }
}
