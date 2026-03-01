// =============================================================================
// ATTENDING AI — Send to Provider API
// apps/patient-portal/pages/api/send-to-provider.ts
//
// Creates a Notification record in the database for the provider
// when a patient sends a message or summary from the chat interface.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

interface ProviderMessage {
  patientId: string;
  patientName: string;
  chatSummary: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  timestamp: string;
  messageType: 'chat-summary' | 'urgent-alert' | 'general';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { patientId, patientName, chatSummary, urgencyLevel, messageType }: ProviderMessage = req.body;

    if (!patientId || !chatSummary) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId and chatSummary',
      });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isUrgent = urgencyLevel === 'high';
    const priorityStr = isUrgent ? 'URGENT' : 'NORMAL';

    // Find active providers to notify
    const activeProviders = await prisma.user.findMany({
      where: { role: 'PROVIDER', isActive: true },
      select: { id: true },
      take: 50,
    });

    if (activeProviders.length > 0) {
      await prisma.notification.createMany({
        data: activeProviders.map((p) => ({
          userId: p.id,
          type: messageType === 'urgent-alert' ? 'URGENT_MESSAGE' : 'PATIENT_MESSAGE',
          priority: priorityStr,
          title: isUrgent
            ? `🚨 Urgent message from ${patientName || 'Patient'}`
            : `Message from ${patientName || 'Patient'}`,
          message: chatSummary.substring(0, 500),
          data: JSON.stringify({ patientId, messageId, messageType }),
          actionUrl: `/patients/${patientId}`,
        })),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PATIENT_MESSAGE_SENT',
        entityType: 'Notification',
        entityId: messageId,
        changes: JSON.stringify({ patientId, urgencyLevel, messageType }),
        success: true,
      },
    });

    console.log(`[SEND-TO-PROVIDER] ${messageId} priority=${priorityStr} providers=${activeProviders.length}`);

    return res.status(200).json({
      success: true,
      message: isUrgent
        ? 'Urgent message sent to provider — they will be notified immediately'
        : 'Message sent to provider successfully',
      messageId,
    });
  } catch (error) {
    console.error('[SEND-TO-PROVIDER ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing message',
    });
  }
}
