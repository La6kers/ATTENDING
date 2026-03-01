// ============================================================
// ATTENDING AI — Crash Detection Settings API Route
// apps/patient-portal/pages/api/emergency/crash-settings.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const patientId = req.headers['x-patient-id'] ?? 'demo-patient';

  if (req.method === 'GET') {
    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/crash-settings`,
        { headers: { Authorization: req.headers.authorization ?? '' } }
      );
      if (backendRes.ok) return res.status(200).json(await backendRes.json());
    } catch { /* fallback */ }

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
    try {
      await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/preferences/crash-settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization ?? '' },
          body: JSON.stringify(req.body),
        }
      );
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save crash settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
