// =============================================================================
// ATTENDING AI — FHIR Callback Redirect
// apps/provider-portal/pages/api/fhir/callback.ts
//
// Old callback path kept for backwards compatibility.
// Redirects to the new canonical path: /api/fhir/auth/callback
// Epic App Orchard redirect URI should be updated to:
//   http://localhost:3000/api/fhir/auth/callback  (sandbox)
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Forward all query params to the new canonical callback URL
  const params = new URLSearchParams(req.query as Record<string, string>);
  const newPath = `/api/fhir/auth/callback?${params.toString()}`;
  return res.redirect(307, newPath);
}
