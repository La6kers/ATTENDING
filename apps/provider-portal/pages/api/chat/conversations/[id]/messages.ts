// ============================================================
// Chat Messages API - Get and Send Messages
// apps/provider-portal/pages/api/chat/conversations/[id]/messages.ts
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Types
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'provider' | 'system';
  content: string;
  contentType: 'text' | 'quick-reply' | 'attachment' | 'system';
  metadata?: {
    attachmentUrl?: string;
    attachmentType?: string;
    quickReplyOptions?: string[];
    isUrgent?: boolean;
    readAt?: string;
  };
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

// Mock messages for development
const mockMessages: Record<string, ChatMessage[]> = {
  'conv-001': [
    {
      id: 'msg-001-1',
      conversationId: 'conv-001',
      senderId: 'system',
      senderName: 'COMPASS',
      senderType: 'system',
      content: 'Patient John Smith has completed their COMPASS assessment and is waiting for provider review.',
      contentType: 'system',
      status: 'read',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'msg-001-2',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderType: 'patient',
      content: 'Hello, I completed my assessment. I\'m really worried about my chest pain.',
      contentType: 'text',
      status: 'delivered',
      createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    },
    {
      id: 'msg-001-3',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderType: 'patient',
      content: 'The pain is getting worse and it\'s radiating to my left arm now.',
      contentType: 'text',
      metadata: { isUrgent: true },
      status: 'delivered',
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
    {
      id: 'msg-001-4',
      conversationId: 'conv-001',
      senderId: 'patient-001',
      senderName: 'John Smith',
      senderType: 'patient',
      content: 'I\'m still having severe chest pain',
      contentType: 'text',
      metadata: { isUrgent: true },
      status: 'delivered',
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ],
  'conv-002': [
    {
      id: 'msg-002-1',
      conversationId: 'conv-002',
      senderId: 'system',
      senderName: 'COMPASS',
      senderType: 'system',
      content: 'Patient Sarah Johnson has completed their COMPASS assessment.',
      contentType: 'system',
      status: 'read',
      createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    },
    {
      id: 'msg-002-2',
      conversationId: 'conv-002',
      senderId: 'patient-002',
      senderName: 'Sarah Johnson',
      senderType: 'patient',
      content: 'Hi, I\'ve been having headaches for the past few days.',
      contentType: 'text',
      status: 'read',
      metadata: { readAt: new Date(Date.now() - 90 * 60000).toISOString() },
      createdAt: new Date(Date.now() - 100 * 60000).toISOString(),
    },
    {
      id: 'msg-002-3',
      conversationId: 'conv-002',
      senderId: 'provider-001',
      senderName: 'Dr. Chen',
      senderType: 'provider',
      content: 'Hello Sarah, thank you for sharing your symptoms. I\'m reviewing your assessment now. Can you tell me if the headaches are worse in the morning or at night?',
      contentType: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 80 * 60000).toISOString(),
    },
    {
      id: 'msg-002-4',
      conversationId: 'conv-002',
      senderId: 'patient-002',
      senderName: 'Sarah Johnson',
      senderType: 'patient',
      content: 'They\'re usually worse in the morning when I wake up.',
      contentType: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: 'msg-002-5',
      conversationId: 'conv-002',
      senderId: 'provider-001',
      senderName: 'Dr. Chen',
      senderType: 'provider',
      content: 'Thank you for the information. I\'ll review your labs.',
      contentType: 'text',
      status: 'delivered',
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ],
  'conv-003': [
    {
      id: 'msg-003-1',
      conversationId: 'conv-003',
      senderId: 'system',
      senderName: 'COMPASS',
      senderType: 'system',
      content: '⚠️ URGENT: Patient Michael Brown has red flags detected. Immediate review recommended.',
      contentType: 'system',
      metadata: { isUrgent: true },
      status: 'delivered',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 'msg-003-2',
      conversationId: 'conv-003',
      senderId: 'patient-003',
      senderName: 'Michael Brown',
      senderType: 'patient',
      content: 'I\'m having trouble breathing and my chest feels tight.',
      contentType: 'text',
      metadata: { isUrgent: true },
      status: 'delivered',
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    },
    {
      id: 'msg-003-3',
      conversationId: 'conv-003',
      senderId: 'patient-003',
      senderName: 'Michael Brown',
      senderType: 'patient',
      content: 'My symptoms are getting worse',
      contentType: 'text',
      metadata: { isUrgent: true },
      status: 'delivered',
      createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ],
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: conversationId } = req.query;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, conversationId);
      case 'POST':
        return handlePost(req, res, conversationId, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Chat messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest, 
  res: NextApiResponse,
  conversationId: string
) {
  const { before, limit = '50' } = req.query;

  let messages = mockMessages[conversationId] || [];

  // Filter messages before a timestamp (for pagination)
  if (before && typeof before === 'string') {
    const beforeDate = new Date(before);
    messages = messages.filter(m => new Date(m.createdAt) < beforeDate);
  }

  // Sort by creation time (oldest first for display)
  messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Limit results (take last N for most recent)
  const limitNum = parseInt(limit as string, 10);
  if (messages.length > limitNum) {
    messages = messages.slice(-limitNum);
  }

  return res.status(200).json({
    messages,
    hasMore: messages.length === limitNum,
  });
}

async function handlePost(
  req: NextApiRequest, 
  res: NextApiResponse,
  conversationId: string,
  session: any
) {
  const { content, contentType = 'text', metadata } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const newMessage: ChatMessage = {
    id: `msg-${conversationId}-${Date.now()}`,
    conversationId,
    senderId: session.user.id,
    senderName: session.user.name || 'Provider',
    senderType: 'provider',
    content,
    contentType,
    metadata,
    status: 'sent',
    createdAt: new Date().toISOString(),
  };

  // In production, save to database and emit via WebSocket
  if (!mockMessages[conversationId]) {
    mockMessages[conversationId] = [];
  }
  mockMessages[conversationId].push(newMessage);

  // TODO: Emit WebSocket event for real-time delivery
  // socket.emit('chat:message', { conversationId, message: newMessage });

  return res.status(201).json(newMessage);
}
