// =============================================================================
// ATTENDING AI — FHIR OAuth Callback Handler
// apps/provider-portal/pages/api/fhir/auth/callback.ts
//
// Receives the authorization code redirect from Epic/Cerner, exchanges
// it for tokens, and stores them in a secure httpOnly cookie.
//
// No database required — state lives in a short-lived cookie; tokens
// live in an 8-hour httpOnly cookie.  For production, swap the token
// storage for an encrypted DB column (see DEPLOYMENT.md).
//
// Register this URL in Epic App Orchard:
//   http://localhost:3000/api/fhir/auth/callback   (sandbox)
//   https://your-domain.com/api/fhir/auth/callback (production)
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), decodeURIComponent(v.join('='))];
    })
  );
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  // OAuth error from EHR
  if (error) {
    console.error('[FHIR Callback] OAuth error from EHR:', error, error_description);
    return res.redirect(
      `/?fhir_error=${encodeURIComponent(String(error_description || error))}`
    );
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  // Retrieve state cookie
  const cookies = parseCookies(req.headers.cookie || '');
  const rawState = cookies['attending_fhir_state'];

  if (!rawState) {
    console.error('[FHIR Callback] State cookie missing — session expired or CSRF attempt');
    return res.redirect('/?fhir_error=Session+expired.+Please+try+connecting+again.');
  }

  let statePayload: {
    state: string;
    vendor: string;
    returnTo: string;
    baseUrl: string;
    clientId: string;
    smartConfig: { authorization_endpoint: string; token_endpoint: string };
  };

  try {
    statePayload = JSON.parse(rawState);
  } catch {
    return res.redirect('/?fhir_error=Invalid+state.+Please+try+connecting+again.');
  }

  // Verify state matches to prevent CSRF
  if (statePayload.state !== String(state)) {
    console.error('[FHIR Callback] State mismatch — possible CSRF attack');
    return res.redirect('/?fhir_error=Security+check+failed.+Please+try+again.');
  }

  const { vendor, returnTo, baseUrl, clientId, smartConfig } = statePayload;
  const clientSecret =
    vendor === 'epic' ? process.env.EPIC_CLIENT_SECRET :
    vendor === 'cerner' ? process.env.CERNER_CLIENT_SECRET :
    undefined;

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/fhir/auth/callback`;

  // Exchange authorization code for tokens
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code),
    redirect_uri: redirectUri,
    client_id: clientId,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  let tokenResponse: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    patient?: string;
    encounter?: string;
    id_token?: string;
  };

  try {
    const tokenRes = await fetch(smartConfig.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`${tokenRes.status}: ${errText}`);
    }

    tokenResponse = await tokenRes.json();
  } catch (err) {
    console.error('[FHIR Callback] Token exchange failed:', err);
    return res.redirect(
      `/?fhir_error=${encodeURIComponent(`Token exchange failed: ${String(err)}`)}`
    );
  }

  // Store token in httpOnly cookie (8 hours — typical clinical shift)
  const tokenPayload = JSON.stringify({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || null,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    patientId: tokenResponse.patient || null,
    encounterId: tokenResponse.encounter || null,
    scope: tokenResponse.scope,
    vendor,
    baseUrl,
    clientId,
  });

  res.setHeader('Set-Cookie', [
    // Clear the state cookie
    serializeCookie('attending_fhir_state', '', { maxAge: 0, path: '/' }),
    // Store the token cookie (8 hours)
    serializeCookie('attending_fhir_token', tokenPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 28800,
      path: '/',
    }),
  ]);

  const vendorName = vendor === 'epic' ? 'Epic' : vendor === 'cerner' ? 'Oracle Health' : vendor;
  console.info(`[FHIR] Connected to ${vendorName}. PatientId: ${tokenResponse.patient || 'none'}`);

  // Redirect back to where the provider was
  return res.redirect(`${returnTo}?fhir_connected=true&vendor=${vendor}`);
}
