// ============================================================
// ATTENDING AI — Patient Appointments API Route
// apps/patient-portal/pages/api/patient/appointments.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  return res.status(200).json([
    {
      id: 'apt-1',
      provider: 'Dr. Sarah Chen',
      specialty: 'Family Medicine',
      type: 'Annual Physical',
      date: '2026-03-03',
      time: '9:30 AM',
      location: 'Parker Family Medicine',
      status: 'confirmed',
      notes: 'Fasting required — no food 12 hours prior',
    },
    {
      id: 'apt-2',
      provider: 'Dr. Emily Park',
      specialty: 'Endocrinology',
      type: 'Follow-up',
      date: '2026-03-18',
      time: '2:00 PM',
      location: 'Colorado Endocrine Center',
      status: 'scheduled',
      notes: 'Bring glucose log',
    },
    {
      id: 'apt-3',
      provider: 'Dr. James Ramirez',
      specialty: 'Cardiology',
      type: '6-Month Check',
      date: '2026-04-10',
      time: '11:00 AM',
      location: 'Parker Cardiology Associates',
      status: 'scheduled',
    },
  ]);
}
