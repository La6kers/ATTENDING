// ============================================================
// Mark Messages Read API
// apps/provider-portal/pages/api/chat/conversations/[id]/read.ts
// ============================================================

import { NextApiRequest, NextApiResponse } from 'next';
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
  const { messageIds: _messageIds } = req.body;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    const readAt = new Date().toISOString();

    // In production, update database
    // if (messageIds && messageIds.length > 0) {
    //   await prisma.chatMessage.updateMany({
    //     where: {
    //       id: { in: messageIds },
    //       conversationId,
    //       senderType: 'patient',
    //     },
    //     data: {
    //       status: 'read',
    //       readAt: new Date(),
    //       readBy: session.user.id,
    //     },
    //   });
    // } else {
    //   // Mark all unread messages as read
    //   await prisma.chatMessage.updateMany({
    //     where: {
    //       conversationId,
    //       senderType: 'patient',
    //       status: { not: 'read' },
    //     },
    //     data: {
    //       status: 'read',
    //       readAt: new Date(),
    //       readBy: session.user.id,
    //     },
    //   });
    // }
    //
    // // Update conversation unread count
    // await prisma.chatConversation.update({
    //   where: { id: conversationId },
    //   data: { unreadCount: 0 },
    // });

    // TODO: Emit WebSocket event for read receipts
    // socket.emit('messages:read', {
    //   conversationId,
    //   messageIds,
    //   readBy: session.user.id,
    //   readAt,
    // });

    return res.status(200).json({
      success: true,
      readAt,
      readBy: session.user.id,
    });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
}
