// =============================================================================
// ATTENDING AI - FHIR OAuth Callback Handler
// apps/provider-portal/pages/api/fhir/auth/callback.ts
//
// Handles OAuth2 callback from Epic/Cerner, exchanges code for tokens
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createFhirClient } from '../../../../lib/fhir/fhirClientFactory';
import { verifyOAuthState, clearOAuthState } from '../../../../lib/fhir/oauthState';
import { storeFhirTokens } from '../../../../lib/fhir/tokenStorage';
import { prisma } from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors from the EHR
  if (error) {
    console.error('[FHIR Callback] OAuth error:', error, error_description);
    return res.redirect(
      `/settings/ehr-connection?error=${encodeURIComponent(error as string)}&message=${encodeURIComponent(error_description as string || 'Authorization failed')}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('[FHIR Callback] Missing code or state');
    return res.redirect('/settings/ehr-connection?error=missing_params&message=Missing authorization code or state');
  }

  try {
    // Verify state to prevent CSRF
    const storedState = await verifyOAuthState(state as string);
    if (!storedState) {
      console.error('[FHIR Callback] Invalid or expired state');
      return res.redirect('/settings/ehr-connection?error=invalid_state&message=Session expired, please try again');
    }

    const { vendor, providerId } = storedState;

    // Create FHIR client for the vendor
    const client = createFhirClient(vendor as 'epic' | 'cerner' | 'generic');

    // Fetch SMART configuration
    const smartConfig = await client.getSmartConfiguration();
    client['config'].smart = smartConfig;

    // Exchange authorization code for tokens
    console.log('[FHIR Callback] Exchanging code for tokens...');
    const tokenResponse = await client.exchangeCodeForToken(code as string);

    console.log('[FHIR Callback] Token exchange successful:', {
      hasAccessToken: !!tokenResponse.access_token,
      hasRefreshToken: !!tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      patientId: tokenResponse.patient,
      encounterId: tokenResponse.encounter,
    });

    // Store tokens securely
    await storeFhirTokens({
      providerId: providerId || 'system',
      vendor,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      patientId: tokenResponse.patient,
      encounterId: tokenResponse.encounter,
      scope: tokenResponse.scope,
    });

    // Clear the OAuth state
    await clearOAuthState(state as string);

    // Log the successful connection
    await prisma.auditLog.create({
      data: {
        action: 'FHIR_CONNECTION_ESTABLISHED',
        entityType: 'EHR_CONNECTION',
        entityId: vendor,
        userId: providerId || 'system',
        details: JSON.stringify({
          vendor,
          patientId: tokenResponse.patient,
          encounterId: tokenResponse.encounter,
          scopes: tokenResponse.scope?.split(' '),
        }),
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      },
    });

    // If we have a patient context, trigger initial sync
    if (tokenResponse.patient) {
      // Queue background sync (don't await)
      fetch(`${process.env.NEXTAUTH_URL}/api/fhir/sync/patient?patientId=${tokenResponse.patient}&vendor=${vendor}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => console.error('[FHIR Callback] Background sync trigger failed:', err));
    }

    // Redirect to success page
    const successUrl = tokenResponse.patient
      ? `/patients/${tokenResponse.patient}?ehr_connected=true&vendor=${vendor}`
      : `/settings/ehr-connection?connected=true&vendor=${vendor}`;

    res.redirect(successUrl);
  } catch (error: any) {
    console.error('[FHIR Callback] Token exchange failed:', error);
    
    // Clear state on error
    if (state) {
      await clearOAuthState(state as string).catch(() => {});
    }

    res.redirect(
      `/settings/ehr-connection?error=token_exchange_failed&message=${encodeURIComponent(error.message)}`
    );
  }
}
