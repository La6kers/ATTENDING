// ============================================================
// ATTENDING AI — Messages: Conversations List
// apps/patient-portal/pages/api/patient/messages/conversations.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Demo data — in production, proxy to backend messaging service
  return res.status(200).json([
    {
      id: 'conv-1',
      provider: {
        id: 'prov-1',
        name: 'Dr. Sarah Chen',
        specialty: 'Family Medicine',
        practice: 'Parker Family Medicine',
      },
      lastMessage: {
        content: 'Your lab results look good overall. Let\'s discuss the A1C at your next visit.',
        sender: 'provider',
        timestamp: '2026-02-28T14:30:00Z',
        hasAttachment: false,
      },
      unreadCount: 1,
      updatedAt: '2026-02-28T14:30:00Z',
    },
    {
      id: 'conv-2',
      provider: {
        id: 'prov-2',
        name: 'Dr. James Ramirez',
        specialty: 'Cardiology',
        practice: 'Parker Cardiology Associates',
      },
      lastMessage: {
        content: 'BP looks good. Keep up the current medication regimen.',
        sender: 'provider',
        timestamp: '2026-02-25T10:15:00Z',
        hasAttachment: true,
      },
      unreadCount: 0,
      updatedAt: '2026-02-25T10:15:00Z',
    },
    {
      id: 'conv-3',
      provider: {
        id: 'prov-3',
        name: 'Dr. Emily Park',
        specialty: 'Endocrinology',
        practice: 'Colorado Endocrine Center',
      },
      lastMessage: {
        content: 'See you at your follow-up next month. Remember to bring your glucose log.',
        sender: 'provider',
        timestamp: '2026-02-20T16:45:00Z',
        hasAttachment: false,
      },
      unreadCount: 0,
      updatedAt: '2026-02-20T16:45:00Z',
    },
  ]);
}
