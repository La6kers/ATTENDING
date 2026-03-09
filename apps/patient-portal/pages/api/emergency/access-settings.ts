// ============================================================
// ATTENDING AI — Emergency Access Settings API
// apps/patient-portal/pages/api/emergency/access-settings.ts
//
// GET / PUT — patient emergency access configuration.
// Patient ID is extracted from the authenticated session,
// never from client-supplied headers.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const BACKEND_URL = process.env.BACKEND_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate — patient ID comes from the session, not headers
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const patientId = (session.user as { id?: string }).id;
  if (!patientId) {
    return res.status(401).json({ error: 'Patient identity could not be determined' });
  }

  if (req.method === 'GET') {
    // Try backend first
    if (BACKEND_URL) {
      try {
        const backendRes = await fetch(
          `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/access-settings`,
          { headers: { Authorization: req.headers.authorization ?? '' } }
        );

        if (backendRes.ok) {
          const data = await backendRes.json();
          return res.status(200).json(data);
        }
      } catch {
        // Backend unavailable — fall through to safe defaults
      }
    }

    // Safe defaults: emergency access disabled until patient configures it.
    // No default PIN — patient must set one explicitly.
    return res.status(200).json({
      enabled: false,
      configured: false,
      pin: null,
      countdownSeconds: 30,
      accessDurationMinutes: 10,
      requirePhoto: true,
      lockScreenWidget: false,
      notifyOnAccess: true,
      notifyContacts: true,
      showAllergies: true,
      showConditions: true,
      showMedications: true,
      showBloodType: true,
      showEmergencyContacts: true,
      showVitals: true,
      showAdvancedDirective: true,
    });
  }

  if (req.method === 'PUT') {
    if (!BACKEND_URL) {
      return res.status(503).json({ error: 'Backend service unavailable' });
    }

    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/access-settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.authorization ?? '',
          },
          body: JSON.stringify(req.body),
        }
      );

      if (!backendRes.ok) {
        return res.status(backendRes.status).json({ error: 'Failed to save settings' });
      }

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
