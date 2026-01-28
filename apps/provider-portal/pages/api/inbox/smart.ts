// =============================================================================
// ATTENDING AI - Smart Inbox API Endpoint
// apps/provider-portal/pages/api/inbox/smart.ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetMessages(req, res);
      case 'POST':
        return handleClassifyMessage(req, res);
      case 'PUT':
        return handleUpdateMessage(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Smart Inbox API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetMessages(req: NextApiRequest, res: NextApiResponse) {
  const { priority, classification, status } = req.query;

  const messages = [
    {
      id: 'msg_1',
      patientId: 'P001',
      patientName: 'John Smith',
      subject: 'Medication refill request',
      content: 'I need a refill for my lisinopril 10mg',
      receivedAt: new Date(),
      classification: 'refill-request',
      priority: 'medium',
      suggestedAction: 'Approve refill - no changes to medication history',
      draftResponse: 'Your lisinopril 10mg refill has been sent to your pharmacy.',
      status: 'pending',
    },
    {
      id: 'msg_2',
      patientId: 'P002',
      patientName: 'Mary Johnson',
      subject: 'Chest pain concern',
      content: 'I have been having chest pain when I walk upstairs',
      receivedAt: new Date(),
      classification: 'symptom-report',
      priority: 'high',
      suggestedAction: 'Schedule urgent appointment - cardiac evaluation needed',
      draftResponse: 'Please call our office immediately or go to the ER if symptoms worsen.',
      status: 'pending',
    },
  ];

  let filtered = messages;
  if (priority) filtered = filtered.filter(m => m.priority === priority);
  if (classification) filtered = filtered.filter(m => m.classification === classification);
  if (status) filtered = filtered.filter(m => m.status === status);

  return res.status(200).json({
    messages: filtered,
    total: filtered.length,
    stats: {
      critical: messages.filter(m => m.priority === 'critical').length,
      high: messages.filter(m => m.priority === 'high').length,
      medium: messages.filter(m => m.priority === 'medium').length,
      low: messages.filter(m => m.priority === 'low').length,
    },
  });
}

async function handleClassifyMessage(req: NextApiRequest, res: NextApiResponse) {
  const { content, subject, patientId } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content required' });
  }

  // Simulate AI classification
  const classification = {
    messageId: `msg_${Date.now()}`,
    classification: 'general-inquiry',
    priority: 'medium',
    confidence: 0.87,
    extractedInfo: {
      medications: [],
      symptoms: [],
      actionItems: [],
    },
    suggestedRouting: 'physician',
    draftResponse: 'Thank you for your message. We will review and respond shortly.',
  };

  return res.status(200).json(classification);
}

async function handleUpdateMessage(req: NextApiRequest, res: NextApiResponse) {
  const { messageId, status, response, assignedTo } = req.body;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID required' });
  }

  return res.status(200).json({
    messageId,
    status: status || 'resolved',
    response,
    assignedTo,
    updatedAt: new Date(),
  });
}
