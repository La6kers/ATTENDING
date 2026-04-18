// ============================================================
// Real-world accuracy metrics
// apps/provider-portal/pages/api/outcomes/metrics.ts
//
// Powers the compass-admin "Real-world accuracy" dashboard card.
// Returns aggregate hit rates across confirmed DiagnosticOutcome rows
// for a given organization within an optional time window.
//
// GET /api/outcomes/metrics?organizationId=...&since=2026-01-01
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccuracyMetrics } from '@attending/shared/services/diagnosticOutcome.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : '';
  const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId query param required' });
  }

  let since: Date | undefined;
  if (sinceRaw) {
    const parsed = new Date(sinceRaw);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid `since` date' });
    }
    since = parsed;
  }

  try {
    const metrics = await getAccuracyMetrics(organizationId, since);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      organizationId,
      since: since?.toISOString() ?? null,
      ...metrics,
    });
  } catch (err) {
    console.error('[Outcomes metrics] failed:', err);
    return res.status(500).json({ error: 'Failed to compute metrics' });
  }
}
