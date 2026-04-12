// ============================================================
// ATTENDING AI — Crash Detection Settings API Route
// apps/patient-portal/pages/api/emergency/crash-settings.ts
//
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
    if (BACKEND_URL) {
      try {
        const backendRes = await fetch(
          `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/crash-settings`,
          { headers: { Authorization: req.headers.authorization ?? '' } }
        );
        if (backendRes.ok) return res.status(200).json(await backendRes.json());
      } catch {
        // Backend unavailable — fall through to defaults
      }
    }

    return res.status(200).json({
      enabled: false,
      gForceThreshold: 4.0,
      sensitivityPreset: 'standard',
      activityAware: true,
      ignoreWhileStationary: true,
      countdownSeconds: 30,
      countdownAudio: true,
      countdownHaptic: true,
      alertSiren: true,
      extendedResponseMode: false,
      extendedCountdownSeconds: 120,
      drivingMode: true,
      cyclingMode: false,
      hikingMode: false,
    });
  }

  if (req.method === 'PUT') {
    if (!BACKEND_URL) {
      return res.status(503).json({ error: 'Backend service unavailable' });
    }

    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/crash-settings`,
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
        return res.status(backendRes.status).json({ error: 'Failed to save crash settings' });
      }

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save crash settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
