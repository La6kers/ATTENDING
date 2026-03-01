// ============================================================
// ATTENDING AI — Patient Labs API Route
// apps/patient-portal/pages/api/patient/labs.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json([
    { id: 'lab-1', testName: 'Hemoglobin A1C', testCode: '4548-4', value: '5.8', unit: '%', referenceRange: '4.0-5.6', status: 'Abnormal', trend: 'down', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-2', testName: 'Fasting Glucose', testCode: '1558-6', value: '105', unit: 'mg/dL', referenceRange: '70-100', status: 'Abnormal', trend: 'stable', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-3', testName: 'Total Cholesterol', testCode: '2093-3', value: '195', unit: 'mg/dL', referenceRange: '<200', status: 'Normal', trend: 'down', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-4', testName: 'LDL Cholesterol', testCode: '2089-1', value: '118', unit: 'mg/dL', referenceRange: '<100', status: 'Abnormal', trend: 'down', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-5', testName: 'HDL Cholesterol', testCode: '2085-9', value: '52', unit: 'mg/dL', referenceRange: '>40', status: 'Normal', trend: 'up', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-6', testName: 'Creatinine', testCode: '2160-0', value: '1.0', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'Normal', trend: 'stable', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-7', testName: 'TSH', testCode: '3016-3', value: '2.1', unit: 'mIU/L', referenceRange: '0.5-4.5', status: 'Normal', trend: 'stable', collectedAt: '2026-02-25T08:00:00Z' },
    { id: 'lab-8', testName: 'WBC', testCode: '6690-2', value: '6.8', unit: 'K/uL', referenceRange: '4.5-11.0', status: 'Normal', trend: 'stable', collectedAt: '2026-02-25T08:00:00Z' },
  ]);
}
