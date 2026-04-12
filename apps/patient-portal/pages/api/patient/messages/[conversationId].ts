// ============================================================
// ATTENDING AI — Messages: Thread + Send
// apps/patient-portal/pages/api/patient/messages/[conversationId].ts
//
// GET:  Fetch messages in a conversation
// POST: Send a message in a conversation
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

// Demo message threads keyed by conversation ID
const DEMO_THREADS: Record<string, any[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      sender: 'provider',
      senderName: 'Dr. Sarah Chen',
      content: 'Hi Alex, I\'ve reviewed your recent lab work. Overall things are looking good.',
      timestamp: '2026-02-28T10:15:00Z',
      status: 'read',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      sender: 'provider',
      senderName: 'Dr. Sarah Chen',
      content: 'Your A1C came back at 5.8%, which is slightly above the normal range of 4.0–5.6%. This puts you in the pre-diabetes range, but it\'s improved from your last test.',
      timestamp: '2026-02-28T10:15:30Z',
      status: 'read',
      attachment: { id: 'att-1', type: 'lab-result', name: 'CBC_LabResults_Feb2026.pdf', size: '245 KB' },
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      sender: 'patient',
      senderName: 'You',
      content: 'Thanks for letting me know. Is there anything I should change in my diet or exercise?',
      timestamp: '2026-02-28T10:32:00Z',
      status: 'read',
    },
    {
      id: 'msg-4',
      conversationId: 'conv-1',
      sender: 'provider',
      senderName: 'Dr. Sarah Chen',
      content: 'Great question. I\'d recommend continuing to limit refined carbs and sugary drinks. Your current exercise routine is helping — keep that up. We can discuss more at your annual physical on March 3rd.',
      timestamp: '2026-02-28T11:05:00Z',
      status: 'read',
    },
    {
      id: 'msg-5',
      conversationId: 'conv-1',
      sender: 'patient',
      senderName: 'You',
      content: 'Sounds good. See you then!',
      timestamp: '2026-02-28T11:12:00Z',
      status: 'read',
    },
    {
      id: 'msg-6',
      conversationId: 'conv-1',
      sender: 'provider',
      senderName: 'Dr. Sarah Chen',
      content: 'Your lab results look good overall. Let\'s discuss the A1C at your next visit. If you have any concerns before then, don\'t hesitate to reach out.',
      timestamp: '2026-02-28T14:30:00Z',
      status: 'delivered',
    },
  ],
  'conv-2': [
    {
      id: 'msg-10',
      conversationId: 'conv-2',
      sender: 'provider',
      senderName: 'Dr. James Ramirez',
      content: 'Alex, your latest echocardiogram results are in. Everything looks normal.',
      timestamp: '2026-02-25T09:30:00Z',
      status: 'read',
      attachment: { id: 'att-2', type: 'document', name: 'Echo_Report_Feb2026.pdf', size: '1.2 MB' },
    },
    {
      id: 'msg-11',
      conversationId: 'conv-2',
      sender: 'provider',
      senderName: 'Dr. James Ramirez',
      content: 'BP looks good. Keep up the current medication regimen. We\'ll do another check at your 6-month visit.',
      timestamp: '2026-02-25T10:15:00Z',
      status: 'read',
    },
  ],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { conversationId } = req.query;
  const convId = String(conversationId);

  if (req.method === 'GET') {
    const messages = DEMO_THREADS[convId] ?? [];
    return res.status(200).json(messages);
  }

  if (req.method === 'POST') {
    const { content, attachmentId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // In production: POST to messaging service
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      sender: 'patient',
      senderName: 'You',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
      ...(attachmentId ? { attachment: { id: attachmentId } } : {}),
    };

    // Add to demo thread
    if (!DEMO_THREADS[convId]) DEMO_THREADS[convId] = [];
    DEMO_THREADS[convId].push(newMessage);

    return res.status(201).json(newMessage);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
