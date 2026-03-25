// =============================================================================
// ATTENDING AI - FHIR Launch Endpoint
// apps/provider-portal/pages/api/fhir/launch.ts
//
// Initiates SMART on FHIR authorization flow for Epic/Cerner
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';
import { createFhirClient } from '@/shared/lib/fhir';
import type { EhrVendor, FhirClientConfig } from '@/shared/lib/fhir/types';
import crypto from 'crypto';

interface LaunchQuery {
  vendor?: EhrVendor;
  iss?: string;        // EHR launch parameter
  launch?: string;     // EHR launch context
  redirect?: string;   // Where to go after auth
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get authenticated user
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized - please sign in first' });
  }

  const { vendor = 'epic', iss, launch, redirect = '/settings/integrations' } = req.query as LaunchQuery;

  try {
    // Determine base URL (from iss parameter or environment)
    const baseUrl = iss || getBaseUrl(vendor);
    if (!baseUrl) {
      return res.status(400).json({ error: 'FHIR base URL not configured' });
    }

    const clientId = getClientId(vendor);
    if (!clientId) {
      return res.status(400).json({ 
        error: `${vendor.toUpperCase()} Client ID not configured. Please add ${vendor.toUpperCase()}_CLIENT_ID to your environment.` 
      });
    }

    // Build client config
    const config: FhirClientConfig = {
      ehr: {
        vendor,
        baseUrl,
        clientId,
        clientSecret: getClientSecret(vendor),
        redirectUri: `${process.env.NEXTAUTH_URL}/api/fhir/callback`,
        scopes: getScopes(vendor),
        aud: baseUrl,
      },
    };

    // Create client and fetch SMART configuration
    const fhirClient = createFhirClient(config);
    
    let smartConfig;
    try {
      smartConfig = await fhirClient.getSmartConfiguration();
    } catch (error) {
      console.error('[FHIR Launch] Failed to get SMART config:', error);
      return res.status(500).json({ 
        error: 'Failed to connect to EHR. Please check the FHIR endpoint is accessible.' 
      });
    }

    // Generate secure state parameter
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in database for callback validation
    await prisma.oAuthState.create({
      data: {
        state,
        context: JSON.stringify({
          vendor,
          providerId: session.user.id,
          redirectUrl: redirect,
          smartConfig,
        }),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    // Update client with SMART config
    const configWithSmart: FhirClientConfig = {
      ...config,
      smart: smartConfig,
    };
    const authorizedClient = createFhirClient(configWithSmart);

    // Generate authorization URL
    const authUrl = authorizedClient.getAuthorizationUrl(state, launch as string | undefined);

    // Redirect to EHR authorization
    return res.redirect(authUrl);

  } catch (error: any) {
    console.error('[FHIR Launch] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to initiate FHIR connection',
      details: error.message,
    });
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
  const baseScopes = [
    'launch/patient',
    'patient/Patient.read',
    'patient/Observation.read',
    'patient/Condition.read',
    'patient/MedicationRequest.read',
    'patient/AllergyIntolerance.read',
    'patient/Encounter.read',
    'patient/DiagnosticReport.read',
    'patient/ServiceRequest.write',
    'openid',
    'fhirUser',
  ];

  if (vendor === 'cerner') {
    return [...baseScopes, 'online_access'];
  }

  return baseScopes;
}
