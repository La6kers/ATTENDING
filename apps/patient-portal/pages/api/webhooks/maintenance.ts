// =============================================================================
// COMPASS Webhook Retry & Health Check API
// apps/patient-portal/pages/api/webhooks/maintenance.ts
//
// POST /api/webhooks/maintenance?action=retry       → Process pending retries
// POST /api/webhooks/maintenance?action=health      → Health-check disabled webhooks
//
// Called by cron job, scheduler, or manually from admin UI.
// Both operations are idempotent and safe to call concurrently.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { processRetries, healthCheckWebhooks } from '../../../lib/webhooks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const action = req.query.action || req.body?.action;

  if (action === 'retry') {
    try {
      const processed = await processRetries();
      return res.status(200).json({
        success: true,
        action: 'retry',
        processed,
        message: processed > 0
          ? `Processed ${processed} pending webhook retries`
          : 'No pending retries to process',
      });
    } catch (error) {
      console.error('[WEBHOOK MAINTENANCE] Retry error:', error);
      return res.status(500).json({ error: 'Retry processing failed' });
    }
  }

  if (action === 'health') {
    try {
      const reEnabled = await healthCheckWebhooks();
      return res.status(200).json({
        success: true,
        action: 'health',
        reEnabled,
        message: reEnabled > 0
          ? `Re-enabled ${reEnabled} recovered webhook(s)`
          : 'No disabled webhooks recovered',
      });
    } catch (error) {
      console.error('[WEBHOOK MAINTENANCE] Health check error:', error);
      return res.status(500).json({ error: 'Health check failed' });
    }
  }

  return res.status(400).json({
    error: 'Invalid action. Use ?action=retry or ?action=health',
  });
}
