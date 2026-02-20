// ============================================================
// ATTENDING AI - Prometheus Metrics Endpoint
// apps/provider-portal/pages/api/metrics.ts
//
// GET /api/metrics → Prometheus text format (for scraping)
//
// Public endpoint (no auth) — restrict via network policy in prod.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { metrics } from '@attending/shared/lib/metrics';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(metrics.toPrometheus());
}
