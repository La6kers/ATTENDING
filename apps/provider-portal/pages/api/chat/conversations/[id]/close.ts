// ============================================================
// Close Conversation API
// apps/provider-portal/pages/api/chat/conversations/[id]/close.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: conversationId } = req.query;
  const { reason, summary } = req.body;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    // In production, update database
    // await prisma.chatConversation.update({
    //   where: { id: conversationId },
    //   data: {
    //     status: 'closed',
    //     closedAt: new Date(),
    //     closedBy: session.user.id,
    //     closeReason: reason,
    //     closeSummary: summary,
    //   },
    // });

    // For now, return mock success
    const closedConversation = {
      id: conversationId,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: session.user.id,
      closeReason: reason || 'Resolved',
      closeSummary: summary,
    };

    // TODO: Emit WebSocket event
    // socket.emit('conversation:closed', closedConversation);

    // Add audit log
    console.log(`[Audit] Conversation ${conversationId} closed by ${session.user.email}`);

    return res.status(200).json({
      success: true,
      conversation: closedConversation,
    });
  } catch (error) {
    console.error('Close conversation error:', error);
    return res.status(500).json({ error: 'Failed to close conversation' });
  }
}
