// =============================================================================
// ATTENDING AI — Send to Provider API
// apps/patient-portal/pages/api/send-to-provider.ts
//
// Creates a Notification record in the database for the provider
// when a patient sends a message or summary from the chat interface.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
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

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { patientId, patientName, chatSummary, urgencyLevel, messageType }: ProviderMessage = req.body;

    if (!patientId || !chatSummary) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId and chatSummary',
      });
    }

    if (typeof patientId !== 'string' || typeof chatSummary !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'patientId and chatSummary must be strings',
      });
    }

    if (chatSummary.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'chatSummary must not be empty',
      });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isUrgent = urgencyLevel === 'high';
    const priorityStr = isUrgent ? 'URGENT' : 'NORMAL';

    // Resolve the target provider:
    // 1. Use assignedProviderId from the request body (if the caller knows it)
    // 2. Look up the patient's most recent assessment for an assigned provider
    // 3. Fall back to the first active provider (demo mode only)
    const { assignedProviderId } = req.body as { assignedProviderId?: string };
    let targetProviderIds: string[] = [];

    if (assignedProviderId) {
      // Caller explicitly specified the provider
      targetProviderIds = [assignedProviderId];
    } else {
      // Look up from the patient's most recent assessment
      const latestAssessment = await prisma.patientAssessment.findFirst({
        where: { patientId, assignedProviderId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { assignedProviderId: true },
      });

      if (latestAssessment?.assignedProviderId) {
        targetProviderIds = [latestAssessment.assignedProviderId];
      } else {
        // Demo fallback: route to first active provider
        // TODO: Remove this fallback when clinic integration is live
        const fallbackProvider = await prisma.user.findFirst({
          where: { role: 'PROVIDER', isActive: true },
          select: { id: true },
        });
        if (fallbackProvider) {
          targetProviderIds = [fallbackProvider.id];
        }
        console.warn(`[SEND-TO-PROVIDER] No assigned provider for patient ${patientId} — using demo fallback`);
      }
    }

    if (targetProviderIds.length > 0) {
      await prisma.notification.createMany({
        data: targetProviderIds.map((providerId) => ({
          userId: providerId,
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

    console.log(`[SEND-TO-PROVIDER] ${messageId} priority=${priorityStr} providers=${targetProviderIds.length}`);

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
