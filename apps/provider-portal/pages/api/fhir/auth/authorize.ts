// =============================================================================
// ATTENDING AI - FHIR OAuth Authorization Initiation
// apps/provider-portal/pages/api/fhir/auth/authorize.ts
//
// Initiates SMART on FHIR OAuth2 flow with Epic/Cerner
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createFhirClient } from '../../../../lib/fhir/fhirClientFactory';
import { generateState, storeOAuthState } from '../../../../lib/fhir/oauthState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vendor = 'epic', launch, patientId, providerId } = req.query;

    // Validate vendor
    if (!['epic', 'cerner', 'generic'].includes(vendor as string)) {
      return res.status(400).json({ error: 'Invalid vendor. Supported: epic, cerner, generic' });
    }

    // Create FHIR client for the vendor
    const client = createFhirClient(vendor as 'epic' | 'cerner' | 'generic');

    // Fetch SMART configuration from the FHIR server
    const smartConfig = await client.getSmartConfiguration();
    
    // Update client with SMART config
    client['config'].smart = smartConfig;

    // Generate secure state parameter
    const state = generateState();

    // Store state with context for callback verification
    await storeOAuthState(state, {
      vendor: vendor as string,
      patientId: patientId as string | undefined,
      providerId: providerId as string | undefined,
      launch: launch as string | undefined,
      initiatedAt: new Date().toISOString(),
    });

    // Generate authorization URL
    const authUrl = client.getAuthorizationUrl(state, launch as string | undefined);

    // Log for debugging (remove in production)
    console.log('[FHIR Auth] Initiating OAuth flow:', { vendor });

    // Redirect to EHR authorization endpoint
    res.redirect(302, authUrl);
  } catch (error: any) {
    console.error('[FHIR Auth] Authorization initiation failed:', error);
    res.status(500).json({
      error: 'Failed to initiate FHIR authorization',
      message: error.message,
    });
  }
}
