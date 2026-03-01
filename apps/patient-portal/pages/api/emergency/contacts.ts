// ============================================================
// ATTENDING AI — Emergency Contacts API Route
// apps/patient-portal/pages/api/emergency/contacts.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const patientId = req.headers['x-patient-id'] ?? 'demo-patient';

  if (req.method === 'GET') {
    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/emergency-contacts`,
        { headers: { Authorization: req.headers.authorization ?? '' } }
      );
      if (backendRes.ok) return res.status(200).json(await backendRes.json());
    } catch { /* fallback */ }

    // Demo data
    return res.status(200).json([
      { id: '1', name: 'Kelli Isbell', relationship: 'Spouse', phone: '(555) 123-4567', isPrimary: true },
      { id: '2', name: 'Ken Isbell', relationship: 'Father', phone: '(555) 987-6543', isPrimary: false },
    ]);
  }

  if (req.method === 'PUT') {
    try {
      await fetch(
        `${BACKEND_URL}/api/v1/patients/${patientId}/emergency-contacts`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization ?? '' },
          body: JSON.stringify(req.body),
        }
      );
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save contacts' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
