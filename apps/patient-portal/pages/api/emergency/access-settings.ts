// ============================================================
// ATTENDING AI — Emergency Settings API Routes
// apps/patient-portal/pages/api/emergency/access-settings.ts
// apps/patient-portal/pages/api/emergency/crash-settings.ts
// apps/patient-portal/pages/api/emergency/contacts.ts
//
// GET / PUT — patient emergency configuration
// Stores in patient preferences (backend) with localStorage
// fallback on client side.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const patientId = req.headers['x-patient-id'] ?? 'demo-patient';

  if (req.method === 'GET') {
    // Try backend, fall back to defaults
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
      // Backend unavailable
    }

    // Default settings
    return res.status(200).json({
      enabled: true,
      pin: '0000',
      countdownSeconds: 30,
      accessDurationMinutes: 10,
      requirePhoto: true,
      lockScreenWidget: true,
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
    try {
      await fetch(
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
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
