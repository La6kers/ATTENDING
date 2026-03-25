// ============================================================
// Claim Conversation API
// apps/provider-portal/pages/api/chat/conversations/[id]/claim.ts
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

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    // In production, update database
    // await prisma.chatConversation.update({
    //   where: { id: conversationId },
    //   data: {
    //     providerId: session.user.id,
    //     providerName: session.user.name,
    //     status: 'claimed',
    //     claimedAt: new Date(),
    //   },
    // });

    // For now, return mock success
    const claimedConversation = {
      id: conversationId,
      providerId: session.user.id,
      providerName: session.user.name,
      status: 'claimed',
      claimedAt: new Date().toISOString(),
    };

    // TODO: Emit WebSocket event
    // socket.emit('conversation:claimed', claimedConversation);

    // Add audit log
    console.log(`[Audit] Conversation ${conversationId} claimed by ${session.user.email}`);

    return res.status(200).json({
      success: true,
      conversation: claimedConversation,
    });
  } catch (error) {
    console.error('Claim conversation error:', error);
    return res.status(500).json({ error: 'Failed to claim conversation' });
  }
}
