// ============================================================
// ATTENDING AI — Patient Medications API Route
// apps/patient-portal/pages/api/patient/medications.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json([
    { id: 'med-1', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescribedBy: 'Dr. Sarah Chen', startDate: '2023-06-15', refillDate: '2026-03-15', isActive: true },
    { id: 'med-2', name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribedBy: 'Dr. Emily Park', startDate: '2024-02-01', refillDate: '2026-03-01', isActive: true },
    { id: 'med-3', name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', prescribedBy: 'Dr. James Ramirez', startDate: '2024-09-01', refillDate: '2026-03-20', isActive: true },
    { id: 'med-4', name: 'Vitamin D3', dosage: '2000 IU', frequency: 'Once daily', prescribedBy: 'Dr. Sarah Chen', startDate: '2025-01-10', refillDate: null, isActive: true },
  ]);
}
