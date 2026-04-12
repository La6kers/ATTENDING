// =============================================================================
// Lab Orders API - /api/lab-orders (canonical alias for /api/labs)
// apps/provider-portal/pages/api/lab-orders/index.ts
//
// This route exists alongside /api/labs to satisfy external callers
// (E2E tests, future EHR integrations) that expect the REST-conventional
// /lab-orders path. All logic delegates to the /api/labs handler.
//
// Authentication: requireAuth enforced — unauthenticated requests → 401.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/api/auth';
import labsHandler from '../labs/index';

// Re-export the labs handler under the /api/lab-orders path.
// requireAuth is already applied in labs/index, but wrapping here
// ensures the alias is also explicitly protected.
async function handler(req: NextApiRequest, res: NextApiResponse, _session: any) {
  return labsHandler(req, res);
}

export default requireAuth(handler);
