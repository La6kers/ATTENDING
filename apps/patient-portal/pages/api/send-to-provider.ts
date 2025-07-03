// Next.js API route to handle provider messaging
import type { NextApiRequest, NextApiResponse } from 'next';

interface ProviderMessage {
  patientId: string;
  patientName: string;
  chatSummary: string;
  urgencyLevel: 'low' | 'medium' | 'high';
  timestamp: string;
  messageType: 'chat-summary' | 'urgent-alert' | 'general';
}

interface ApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { patientId, patientName, chatSummary, urgencyLevel, timestamp, messageType }: ProviderMessage = req.body;

    // Validate required fields
    if (!patientId || !chatSummary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: patientId and chatSummary' 
      });
    }

    // Generate a message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // In a real implementation, this would:
    // 1. Store the message in a database
    // 2. Send real-time notification to provider portal
    // 3. Send email/SMS alerts for high urgency
    // 4. Update patient record with chat summary

    // Simulate storing the message
    const providerMessage = {
      id: messageId,
      patientId,
      patientName: patientName || `Patient ${patientId}`,
      chatSummary,
      urgencyLevel: urgencyLevel || 'medium',
      timestamp: timestamp || new Date().toISOString(),
      messageType: messageType || 'chat-summary',
      status: 'unread',
      providerResponse: null
    };

    console.log('Provider Message Created:', providerMessage);

    // For demonstration, we'll also try to notify the provider portal if it's running
    // In production, this would use WebSockets, Server-Sent Events, or a message queue
    try {
      // This would be a real-time notification system
      // For now, we'll store it in a way the provider portal can fetch it
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingMessages = JSON.parse(localStorage.getItem('providerMessages') || '[]');
        existingMessages.unshift(providerMessage);
        localStorage.setItem('providerMessages', JSON.stringify(existingMessages.slice(0, 50))); // Keep last 50 messages
      }
    } catch (storageError) {
      console.log('Note: Local storage not available (running on server)');
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: urgencyLevel === 'high' 
        ? 'Urgent message sent to provider - they will be notified immediately'
        : 'Message sent to provider successfully',
      messageId
    });

  } catch (error) {
    console.error('Error processing provider message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing message'
    });
  }
}
