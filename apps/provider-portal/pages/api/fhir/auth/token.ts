// =============================================================================
// ATTENDING AI — FHIR Token Endpoint
// apps/provider-portal/pages/api/fhir/auth/token.ts
//
// Returns the current FHIR connection state to the browser so the
// FhirProvider can restore its session after a page reload.
//
// The full access token is returned here so the browser-side FhirClient
// can make direct FHIR API calls.  This is appropriate for sandbox / pilot
// environments where all traffic is over HTTPS.
//
// For production deployments with strict PHI controls, proxy all FHIR
// calls through a server-side route instead and never expose the token.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

interface TokenInfo {
  connected: boolean;
  vendor?: string;
  patientId?: string | null;
  encounterId?: string | null;
  expiresAt?: number;
  expired?: boolean;
  // Returned so FhirProvider can initialize the client
  accessToken?: string;
  baseUrl?: string;
  clientId?: string;
  scope?: string;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), decodeURIComponent(v.join('='))];
    })
  );
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenInfo>
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // Never cache this endpoint
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const cookies = parseCookies(req.headers.cookie || '');
  const raw = cookies['attending_fhir_token'];

  if (!raw) {
    return res.json({ connected: false });
  }

  try {
    const token = JSON.parse(raw);
    const expired = Date.now() > token.expiresAt;

    return res.json({
      connected: !expired,
      vendor: token.vendor,
      patientId: token.patientId,
      encounterId: token.encounterId,
      expiresAt: token.expiresAt,
      expired,
      accessToken: expired ? undefined : token.accessToken,
      baseUrl: token.baseUrl,
      clientId: token.clientId,
      scope: token.scope,
    });
  } catch {
    return res.json({ connected: false });
  }
}
