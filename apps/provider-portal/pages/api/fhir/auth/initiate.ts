// =============================================================================
// ATTENDING AI — FHIR SMART on FHIR OAuth Initiator
// apps/provider-portal/pages/api/fhir/auth/initiate.ts
//
// Starts the SMART on FHIR authorization flow:
//   1. Looks up Epic/Cerner credentials from env
//   2. Fetches SMART configuration from EHR's well-known endpoint
//   3. Stores OAuth state in a short-lived httpOnly cookie (CSRF protection)
//   4. Redirects the browser to the EHR's authorization endpoint
//
// Usage:  GET /api/fhir/auth/initiate?vendor=epic&returnTo=/dashboard
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
  path?: string;
}): string {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (options.httpOnly) str += '; HttpOnly';
  if (options.secure) str += '; Secure';
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`;
  if (options.path) str += `; Path=${options.path}`;
  return str;
}

function getVendorConfig(vendor: string) {
  if (vendor === 'epic') {
    return {
      baseUrl: process.env.EPIC_FHIR_BASE_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
      clientId: process.env.EPIC_CLIENT_ID || '',
      scopes: (process.env.EPIC_SCOPES || [
        'launch/patient',
        'patient/Patient.read',
        'patient/Observation.read',
        'patient/Condition.read',
        'patient/MedicationRequest.read',
        'patient/AllergyIntolerance.read',
        'patient/Encounter.read',
        'patient/DiagnosticReport.read',
        'openid',
        'fhirUser',
      ].join(',')).split(',').map((s) => s.trim()),
    };
  }

  if (vendor === 'cerner') {
    return {
      baseUrl: process.env.CERNER_FHIR_BASE_URL || 'https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
      clientId: process.env.CERNER_CLIENT_ID || '',
      scopes: (process.env.CERNER_SCOPES || [
        'launch/patient',
        'patient/Patient.read',
        'patient/Observation.read',
        'patient/Condition.read',
        'patient/MedicationRequest.read',
        'patient/AllergyIntolerance.read',
        'patient/Encounter.read',
        'openid',
        'fhirUser',
        'online_access',
      ].join(',')).split(',').map((s) => s.trim()),
    };
  }

  return null;
}

async function fetchSmartConfiguration(baseUrl: string): Promise<{
  authorization_endpoint: string;
  token_endpoint: string;
} | null> {
  // Try well-known endpoint first (preferred)
  try {
    const res = await fetch(`${baseUrl}/.well-known/smart-configuration`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const config = await res.json();
      if (config.authorization_endpoint && config.token_endpoint) return config;
    }
  } catch { /* fall through to metadata */ }

  // Fallback: parse CapabilityStatement
  try {
    const res = await fetch(`${baseUrl}/metadata`, {
      headers: { Accept: 'application/fhir+json' },
    });
    if (res.ok) {
      const metadata = await res.json();
      const oauthExt = metadata.rest?.[0]?.security?.extension?.find((e: any) =>
        e.url?.includes('oauth-uris')
      );
      const authorize = oauthExt?.extension?.find((e: any) => e.url === 'authorize')?.valueUri;
      const token = oauthExt?.extension?.find((e: any) => e.url === 'token')?.valueUri;
      if (authorize && token) return { authorization_endpoint: authorize, token_endpoint: token };
    }
  } catch { /* both methods failed */ }

  return null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const vendor = String(req.query.vendor || 'epic').toLowerCase();
  const returnTo = String(req.query.returnTo || '/');

  const vendorConfig = getVendorConfig(vendor);
  if (!vendorConfig) {
    return res.status(400).json({ error: `Unsupported vendor: ${vendor}` });
  }

  if (!vendorConfig.clientId) {
    return res.status(400).json({
      error: 'EHR not configured',
      detail: `${vendor.toUpperCase()}_CLIENT_ID is not set. Add it to .env.local and restart the dev server.`,
      helpUrl: vendor === 'epic' ? 'https://fhir.epic.com/Developer/Apps' : 'https://code.cerner.com/developer/smart-on-fhir',
    });
  }

  // Discover SMART configuration from EHR
  const smartConfig = await fetchSmartConfiguration(vendorConfig.baseUrl);
  if (!smartConfig) {
    return res.status(503).json({
      error: 'Could not discover SMART configuration',
      detail: `Failed to reach ${vendorConfig.baseUrl}/.well-known/smart-configuration`,
    });
  }

  // Generate cryptographically random state to prevent CSRF
  const state = crypto.randomUUID();

  // Store everything we need in the callback in an httpOnly cookie (10 min)
  const statePayload = JSON.stringify({
    state,
    vendor,
    returnTo,
    baseUrl: vendorConfig.baseUrl,
    clientId: vendorConfig.clientId,
    smartConfig,
  });

  res.setHeader('Set-Cookie', serializeCookie('attending_fhir_state', statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  }));

  // Build Epic/Cerner authorization URL
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/fhir/auth/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: vendorConfig.clientId,
    redirect_uri: redirectUri,
    scope: vendorConfig.scopes.join(' '),
    state,
    aud: vendorConfig.baseUrl,
  });

  return res.redirect(`${smartConfig.authorization_endpoint}?${params.toString()}`);
}
