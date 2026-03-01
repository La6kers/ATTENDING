// ============================================================
// ATTENDING AI — Messages: Unread Count
// apps/patient-portal/pages/api/patient/messages/unread.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ count: 1 });
}
