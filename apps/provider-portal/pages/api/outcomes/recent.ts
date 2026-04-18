// ============================================================
// Recent Diagnostic Outcomes
// apps/provider-portal/pages/api/outcomes/recent.ts
//
// Powers the "Recent outcomes" stream on the ML Outcomes dashboard.
// Returns most-recent-first rows for the given organization.
//
// GET /api/outcomes/recent?organizationId=...&limit=50&assessment=REFUTED
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { listRecentOutcomes } from '@attending/shared/services/diagnosticOutcome.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : '';
  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId query param required' });
  }

  const limit = parseInt(typeof req.query.limit === 'string' ? req.query.limit : '50', 10);
  const assessment = typeof req.query.assessment === 'string' ? req.query.assessment : undefined;

  const allowedAssessments = ['CONFIRMED', 'PARTIAL', 'REFUTED', 'PENDING'];
  if (assessment && !allowedAssessments.includes(assessment)) {
    return res.status(400).json({ error: `assessment must be one of ${allowedAssessments.join(', ')}` });
  }

  try {
    const rows = await listRecentOutcomes(
      organizationId,
      Number.isNaN(limit) ? 50 : limit,
      assessment as 'CONFIRMED' | 'PARTIAL' | 'REFUTED' | 'PENDING' | undefined
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ organizationId, rows });
  } catch (err) {
    console.error('[Outcomes recent] failed:', err);
    return res.status(500).json({ error: 'Failed to list outcomes' });
  }
}
