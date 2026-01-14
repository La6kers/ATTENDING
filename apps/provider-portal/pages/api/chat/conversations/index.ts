// ============================================================
// Chat Conversations API - List and Create
// apps/provider-portal/pages/api/chat/conversations/index.ts
// ============================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Types
interface ChatConversation {
  id: string;
  patientId: string;
  patientName: string;
  assessmentId?: string;
  providerId?: string;
  providerName?: string;
  status: 'open' | 'claimed' | 'closed';
  urgencyLevel: 'routine' | 'urgent' | 'stat' | 'emergent';
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: 'patient' | 'provider' | 'system';
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Mock data for development
const mockConversations: ChatConversation[] = [
  {
    id: 'conv-001',
    patientId: 'patient-001',
    patientName: 'John Smith',
    assessmentId: 'assess-001',
    status: 'open',
    urgencyLevel: 'urgent',
    lastMessage: {
      content: 'I\'m still having severe chest pain',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      sender: 'patient',
    },
    unreadCount: 3,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'conv-002',
    patientId: 'patient-002',
    patientName: 'Sarah Johnson',
    assessmentId: 'assess-002',
    providerId: 'provider-001',
    providerName: 'Dr. Chen',
    status: 'claimed',
    urgencyLevel: 'routine',
    lastMessage: {
      content: 'Thank you for the information. I\'ll review your labs.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      sender: 'provider',
    },
    unreadCount: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'conv-003',
    patientId: 'patient-003',
    patientName: 'Michael Brown',
    assessmentId: 'assess-003',
    status: 'open',
    urgencyLevel: 'stat',
    lastMessage: {
      content: 'My symptoms are getting worse',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      sender: 'patient',
    },
    unreadCount: 5,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res, session);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Chat conversations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { status, urgency, providerId, limit = '50' } = req.query;

  let conversations = [...mockConversations];

  // Filter by status
  if (status && typeof status === 'string') {
    conversations = conversations.filter(c => c.status === status);
  }

  // Filter by urgency
  if (urgency && typeof urgency === 'string') {
    conversations = conversations.filter(c => c.urgencyLevel === urgency);
  }

  // Filter by provider (for claimed conversations)
  if (providerId && typeof providerId === 'string') {
    conversations = conversations.filter(c => c.providerId === providerId);
  }

  // Sort by urgency and then by unread count
  const urgencyOrder = { emergent: 0, stat: 1, urgent: 2, routine: 3 };
  conversations.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.unreadCount - a.unreadCount;
  });

  // Limit results
  const limitNum = parseInt(limit as string, 10);
  conversations = conversations.slice(0, limitNum);

  return res.status(200).json({
    conversations,
    total: mockConversations.length,
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { patientId, assessmentId } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  // Create new conversation
  const newConversation: ChatConversation = {
    id: `conv-${Date.now()}`,
    patientId,
    patientName: req.body.patientName || 'Unknown Patient',
    assessmentId,
    status: 'open',
    urgencyLevel: req.body.urgencyLevel || 'routine',
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // In production, save to database
  mockConversations.push(newConversation);

  return res.status(201).json(newConversation);
}
