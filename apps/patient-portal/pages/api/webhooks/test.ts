// =============================================================================
// COMPASS Webhook Test Fire API
// apps/patient-portal/pages/api/webhooks/test.ts
//
// POST /api/webhooks/test  → Send a test payload to a specific webhook
//
// Sends a sample assessment.completed payload so the practice can verify
// their EHR integration receives and parses COMPASS data correctly.
// The test delivery is logged like any real delivery.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '@attending/shared/lib/prisma';
import { buildWebhookPayload, dispatchWebhooks } from '../../../lib/webhooks';

// Sample patient data for test payloads
const TEST_ASSESSMENT_DATA = {
  sessionId: `test-${Date.now()}`,
  patientName: 'Test Patient',
  dateOfBirth: '1985-03-15',
  gender: 'Female',
  chiefComplaint: 'Persistent headache with vision changes for 3 days',
  hpi: {
    onset: '3 days ago, gradual',
    location: 'Frontal and temporal, bilateral',
    duration: 'Constant since onset',
    character: 'Throbbing, pressure-like',
    severity: 7,
    timing: 'Worse in morning, improves slightly by evening',
    aggravating: ['bright lights', 'bending over', 'coughing'],
    relieving: ['dark room', 'ibuprofen (partial relief)'],
    associated: ['nausea', 'photophobia', 'blurred vision'],
  },
  hpiNarrative:
    'Patient presents with a 3-day history of persistent bilateral frontal/temporal headache. Onset was gradual. Character is throbbing and pressure-like. Severity: 7/10. Worse in morning, aggravated by bright lights and bending over. Partially relieved by ibuprofen and resting in dark room. Associated symptoms include nausea, photophobia, and blurred vision.',
  medications: ['Lisinopril 10mg daily', 'Ibuprofen 400mg PRN'],
  allergies: ['Penicillin — rash', 'Sulfa drugs — hives'],
  medicalHistory: ['Hypertension (diagnosed 2020)', 'Migraine with aura (childhood history)'],
  socialHistory: { tobacco: 'Never', alcohol: 'Social — 2-3 drinks/week', exercise: 'Walks 30min 3x/week' },
  familyHistory: ['Mother: stroke at age 62', 'Father: hypertension'],
  redFlags: [
    { symptom: 'Severe headache with vision changes', severity: 'urgent', category: 'neurological', detectedFrom: 'persistent headache with vision changes' },
  ],
  triageLevel: 'URGENT',
  urgencyScore: 65,
  completedAt: new Date().toISOString(),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { webhookId } = req.body;
  if (!webhookId) {
    return res.status(400).json({ error: 'webhookId is required' });
  }

  try {
    const webhook = await prisma.webhookConfig.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Build test payload
    const testAssessmentId = `test-${crypto.randomUUID().substring(0, 8)}`;
    const payload = buildWebhookPayload(
      'assessment.completed',
      testAssessmentId,
      TEST_ASSESSMENT_DATA,
    );

    // Dispatch to just this one webhook (synchronous — we want to return the result)
    const results = await dispatchWebhooks(
      'assessment.completed',
      payload,
      testAssessmentId,
      'test-patient-id',
    );

    const result = results.find((r) => r.webhookId === webhookId) || results[0];

    return res.status(200).json({
      success: result?.status === 'success',
      result: result || { status: 'no_result', error: 'Webhook may not be subscribed to assessment.completed' },
      testPayload: payload,
      message: result?.status === 'success'
        ? `Test delivery successful (HTTP ${result.httpStatus}, ${result.latencyMs}ms)`
        : `Test delivery failed: ${result?.error || 'Unknown error'}`,
    });
  } catch (error) {
    console.error('[WEBHOOK TEST] Error:', error);
    return res.status(500).json({ error: 'Test fire failed' });
  }
}
