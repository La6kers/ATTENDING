// ============================================================
// ATTENDING AI — Patient Vitals API Route
// apps/patient-portal/pages/api/patient/vitals.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    bloodPressureSystolic: 128,
    bloodPressureDiastolic: 82,
    heartRate: 72,
    temperature: 98.4,
    respiratoryRate: 16,
    oxygenSaturation: 98,
    weight: 185,
    recordedAt: '2026-02-26T09:30:00Z',
  });
}
