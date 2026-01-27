// =============================================================================
// ATTENDING AI - FHIR OAuth Callback Handler
// apps/provider-portal/pages/api/fhir/callback.ts
//
// Handles OAuth 2.0 callback from Epic/Cerner SMART on FHIR flow
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { createFhirClient } from '@/shared/lib/fhir';
import type { FhirClientConfig, EhrVendor } from '@/shared/lib/fhir/types';

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query as CallbackQuery;

  // Handle OAuth errors
  if (error) {
    console.error('[FHIR Callback] OAuth error:', error, error_description);
    return res.redirect(
      `/settings/integrations?error=${encodeURIComponent(error_description || error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  try {
    // Retrieve stored state from database
    const storedState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!storedState) {
      console.error('[FHIR Callback] Invalid or expired state:', state);
      return res.redirect('/settings/integrations?error=Session+expired');
    }

    // Check state expiration
    if (new Date() >= storedState.expiresAt) {
      await prisma.oAuthState.delete({ where: { state } });
      return res.redirect('/settings/integrations?error=Session+expired');
    }

    // Parse context from state
    const context = JSON.parse(storedState.context);
    const { vendor, providerId, redirectUrl, smartConfig } = context;

    // Build FHIR client config
    const config: FhirClientConfig = {
      ehr: {
        vendor,
        baseUrl: getBaseUrl(vendor),
        clientId: getClientId(vendor),
        clientSecret: getClientSecret(vendor),
        redirectUri: `${process.env.NEXTAUTH_URL}/api/fhir/callback`,
        scopes: getScopes(vendor),
      },
      smart: smartConfig,
    };

    // Create FHIR client and exchange code for token
    const fhirClient = createFhirClient(config);
    const tokenResponse = await fhirClient.exchangeCodeForToken(code);

    // Store credentials in database
    await prisma.fhirConnection.upsert({
      where: {
        providerId_vendor: {
          providerId,
          vendor,
        },
      },
      update: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        patientId: tokenResponse.patient || null,
        encounterId: tokenResponse.encounter || null,
        scope: tokenResponse.scope,
        updatedAt: new Date(),
      },
      create: {
        providerId,
        vendor,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        patientId: tokenResponse.patient || null,
        encounterId: tokenResponse.encounter || null,
        scope: tokenResponse.scope,
      },
    });

    // Clean up state
    await prisma.oAuthState.delete({ where: { state } });

    // Log successful connection
    await prisma.auditLog.create({
      data: {
        userId: providerId,
        action: 'FHIR_CONNECTED',
        entityType: 'FhirConnection',
        entityId: vendor,
        changes: JSON.stringify({
          vendor,
          patientId: tokenResponse.patient,
          scopes: tokenResponse.scope,
        }),
      },
    });

    // Redirect to success page
    const successUrl = `${redirectUrl || '/settings/integrations'}?fhir_connected=true&vendor=${vendor}`;
    return res.redirect(successUrl);

  } catch (error: any) {
    console.error('[FHIR Callback] Token exchange failed:', error);
    
    // Clean up state on error
    if (state) {
      await prisma.oAuthState.delete({ where: { state } }).catch(() => {});
    }
    
    return res.redirect(
      `/settings/integrations?error=${encodeURIComponent(error.message || 'Authentication failed')}`
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function getBaseUrl(vendor: EhrVendor): string {
  switch (vendor) {
    case 'epic':
      return process.env.EPIC_FHIR_BASE_URL || 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
    case 'cerner':
      return process.env.CERNER_FHIR_BASE_URL || 'https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d';
    default:
      return process.env.FHIR_BASE_URL || '';
  }
}

function getClientId(vendor: EhrVendor): string {
  switch (vendor) {
    case 'epic':
      return process.env.EPIC_CLIENT_ID || '';
    case 'cerner':
      return process.env.CERNER_CLIENT_ID || '';
    default:
      return process.env.FHIR_CLIENT_ID || '';
  }
}

function getClientSecret(vendor: EhrVendor): string | undefined {
  switch (vendor) {
    case 'epic':
      return process.env.EPIC_CLIENT_SECRET;
    case 'cerner':
      return process.env.CERNER_CLIENT_SECRET;
    default:
      return process.env.FHIR_CLIENT_SECRET;
  }
}

function getScopes(vendor: EhrVendor): string[] {
  const scopeString = vendor === 'epic' 
    ? process.env.EPIC_SCOPES 
    : vendor === 'cerner' 
      ? process.env.CERNER_SCOPES 
      : process.env.FHIR_SCOPES;

  if (scopeString) {
    return scopeString.split(',').map(s => s.trim());
  }

  // Default scopes
  return [
    'launch/patient',
    'patient/Patient.read',
    'patient/Observation.read',
    'patient/Condition.read',
    'patient/MedicationRequest.read',
    'patient/AllergyIntolerance.read',
    'patient/Encounter.read',
    'openid',
    'fhirUser',
  ];
}
