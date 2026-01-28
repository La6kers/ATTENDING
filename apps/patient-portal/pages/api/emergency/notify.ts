// =============================================================================
// ATTENDING AI - Emergency Notifications API
// apps/patient-portal/pages/api/emergency/notify.ts
//
// Sends notifications to emergency contacts, care team, and 911
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';

// =============================================================================
// Types
// =============================================================================

interface NotificationRequest {
  patientId: string;
  notificationType: 'crash_detected' | 'emergency_access' | 'sos' | 'fall_detected';
  recipients: ('emergency_contacts' | 'care_team' | 'emergency_services')[];
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  additionalInfo?: {
    gForce?: number;
    crashType?: string;
    accessorInfo?: string;
  };
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationResult {
  recipient: string;
  channel: 'sms' | 'push' | 'email' | 'call';
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  messageId?: string;
  error?: string;
}

interface ApiResponse {
  success: boolean;
  notificationId?: string;
  results?: NotificationResult[];
  message?: string;
  error?: string;
}

// =============================================================================
// Mock Contact Data (Replace with database in production)
// =============================================================================

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  pushToken?: string;
  relationship: string;
  isPrimary: boolean;
  notificationPreferences: {
    sms: boolean;
    push: boolean;
    email: boolean;
    call: boolean;
  };
}

const mockEmergencyContacts: EmergencyContact[] = [
  {
    id: 'ec-001',
    name: 'Rachel Anderson',
    phone: '+15551234567',
    email: 'rachel@email.com',
    pushToken: 'expo-push-token-12345',
    relationship: 'Fiancée',
    isPrimary: true,
    notificationPreferences: {
      sms: true,
      push: true,
      email: true,
      call: true,
    },
  },
  {
    id: 'ec-002',
    name: 'Michael Anderson',
    phone: '+15552345678',
    email: 'michael@email.com',
    relationship: 'Brother',
    isPrimary: false,
    notificationPreferences: {
      sms: true,
      push: true,
      email: false,
      call: false,
    },
  },
];

const mockCareTeam = [
  {
    id: 'ct-001',
    name: 'Dr. Sarah Chen',
    phone: '+15554567890',
    email: 'sarah.chen@cpmg.org',
    role: 'Primary Care Physician',
  },
];

// =============================================================================
// Notification Services (Mock implementations)
// =============================================================================

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // In production, use Twilio, AWS SNS, or similar
  console.log(`[SMS] Sending to ${phone}: ${message.substring(0, 50)}...`);
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // In production, use Firebase Cloud Messaging, Expo Push, or Apple APNS
  console.log(`[PUSH] Sending to token ${token.substring(0, 20)}...: ${title}`);
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

async function sendEmail(
  email: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // In production, use SendGrid, AWS SES, or similar
  console.log(`[EMAIL] Sending to ${email}: ${subject}`);
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

async function initiateCall(phone: string, message: string): Promise<{ success: boolean; callId?: string; error?: string }> {
  // In production, use Twilio Voice API
  console.log(`[CALL] Initiating call to ${phone}`);
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}

// =============================================================================
// Message Templates
// =============================================================================

function getEmergencyMessage(
  patientName: string,
  notificationType: NotificationRequest['notificationType'],
  location?: NotificationRequest['location']
): { sms: string; pushTitle: string; pushBody: string; emailSubject: string; emailBody: string } {
  const locationStr = location?.address || 
    (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown');
  
  const mapsLink = location 
    ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
    : '';

  const templates = {
    crash_detected: {
      sms: `🚨 EMERGENCY: ${patientName}'s phone detected a severe crash. Location: ${locationStr}. Their medical info is being shared with first responders. ${mapsLink}`,
      pushTitle: '🚨 CRASH DETECTED',
      pushBody: `${patientName}'s phone detected a severe crash. Tap for location and details.`,
      emailSubject: `[EMERGENCY] Crash Detected - ${patientName}`,
      emailBody: `
        <h2>🚨 Emergency Alert - Crash Detected</h2>
        <p><strong>${patientName}'s phone detected a severe crash.</strong></p>
        <p>Location: ${locationStr}</p>
        ${mapsLink ? `<p><a href="${mapsLink}">View on Map</a></p>` : ''}
        <p>Their emergency medical information is being shared with first responders.</p>
        <p>Please attempt to contact them or go to their location if possible.</p>
      `,
    },
    emergency_access: {
      sms: `🏥 ALERT: Someone accessed ${patientName}'s emergency medical info. Location: ${locationStr}. This may indicate a medical emergency.`,
      pushTitle: '🏥 Medical Info Accessed',
      pushBody: `Someone accessed ${patientName}'s emergency medical information.`,
      emailSubject: `[ALERT] Emergency Medical Info Accessed - ${patientName}`,
      emailBody: `
        <h2>🏥 Emergency Medical Info Accessed</h2>
        <p>Someone accessed <strong>${patientName}'s</strong> emergency medical information.</p>
        <p>Location: ${locationStr}</p>
        ${mapsLink ? `<p><a href="${mapsLink}">View on Map</a></p>` : ''}
        <p>This typically means a first responder or medical professional needed their medical history.</p>
      `,
    },
    sos: {
      sms: `🆘 SOS: ${patientName} triggered an emergency SOS. Location: ${locationStr}. Please call them or check on them immediately. ${mapsLink}`,
      pushTitle: '🆘 SOS ALERT',
      pushBody: `${patientName} triggered an emergency SOS alert. Tap for location.`,
      emailSubject: `[SOS] Emergency Alert - ${patientName}`,
      emailBody: `
        <h2>🆘 SOS Alert</h2>
        <p><strong>${patientName} manually triggered an emergency SOS alert.</strong></p>
        <p>Location: ${locationStr}</p>
        ${mapsLink ? `<p><a href="${mapsLink}">View on Map</a></p>` : ''}
        <p>Please attempt to contact them immediately or go to their location.</p>
      `,
    },
    fall_detected: {
      sms: `⚠️ ALERT: ${patientName}'s phone detected a fall and they haven't responded. Location: ${locationStr}. ${mapsLink}`,
      pushTitle: '⚠️ Fall Detected',
      pushBody: `${patientName}'s phone detected a fall. They haven't responded.`,
      emailSubject: `[ALERT] Fall Detected - ${patientName}`,
      emailBody: `
        <h2>⚠️ Fall Detected</h2>
        <p><strong>${patientName}'s phone detected a hard fall and they haven't responded.</strong></p>
        <p>Location: ${locationStr}</p>
        ${mapsLink ? `<p><a href="${mapsLink}">View on Map</a></p>` : ''}
        <p>Please attempt to contact them or check on them.</p>
      `,
    },
  };

  return templates[notificationType];
}

// =============================================================================
// API Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const {
      patientId,
      notificationType,
      recipients,
      location,
      additionalInfo,
      urgency,
    } = req.body as NotificationRequest;

    // Validate required fields
    if (!patientId || !notificationType || !recipients?.length) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID, notification type, and recipients are required',
      });
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: NotificationResult[] = [];
    const patientName = 'Robert Anderson'; // In production, fetch from database

    // Get message templates
    const messages = getEmergencyMessage(patientName, notificationType, location);

    // Send to emergency contacts
    if (recipients.includes('emergency_contacts')) {
      for (const contact of mockEmergencyContacts) {
        // SMS
        if (contact.notificationPreferences.sms) {
          const smsResult = await sendSMS(contact.phone, messages.sms);
          results.push({
            recipient: contact.name,
            channel: 'sms',
            status: smsResult.success ? 'sent' : 'failed',
            timestamp: new Date().toISOString(),
            messageId: smsResult.messageId,
            error: smsResult.error,
          });
        }

        // Push notification
        if (contact.notificationPreferences.push && contact.pushToken) {
          const pushResult = await sendPushNotification(
            contact.pushToken,
            messages.pushTitle,
            messages.pushBody,
            { patientId, notificationType, location }
          );
          results.push({
            recipient: contact.name,
            channel: 'push',
            status: pushResult.success ? 'sent' : 'failed',
            timestamp: new Date().toISOString(),
            messageId: pushResult.messageId,
            error: pushResult.error,
          });
        }

        // Email
        if (contact.notificationPreferences.email && contact.email) {
          const emailResult = await sendEmail(
            contact.email,
            messages.emailSubject,
            messages.emailBody
          );
          results.push({
            recipient: contact.name,
            channel: 'email',
            status: emailResult.success ? 'sent' : 'failed',
            timestamp: new Date().toISOString(),
            messageId: emailResult.messageId,
            error: emailResult.error,
          });
        }

        // Phone call for critical/high urgency and primary contacts
        if (
          contact.notificationPreferences.call &&
          contact.isPrimary &&
          (urgency === 'critical' || urgency === 'high')
        ) {
          const callResult = await initiateCall(
            contact.phone,
            `This is an emergency alert for ${patientName}. ${messages.sms}`
          );
          results.push({
            recipient: contact.name,
            channel: 'call',
            status: callResult.success ? 'sent' : 'failed',
            timestamp: new Date().toISOString(),
            messageId: callResult.callId,
            error: callResult.error,
          });
        }
      }
    }

    // Notify care team
    if (recipients.includes('care_team')) {
      for (const member of mockCareTeam) {
        const emailResult = await sendEmail(
          member.email,
          `[URGENT] Emergency Alert - Patient ${patientName}`,
          `
            <h2>Emergency Alert</h2>
            <p>Patient: ${patientName}</p>
            <p>Alert Type: ${notificationType.replace('_', ' ').toUpperCase()}</p>
            <p>Urgency: ${urgency.toUpperCase()}</p>
            ${location ? `<p>Location: ${location.latitude}, ${location.longitude}</p>` : ''}
            <p>Please review the patient's emergency access log in the provider portal.</p>
          `
        );
        results.push({
          recipient: member.name,
          channel: 'email',
          status: emailResult.success ? 'sent' : 'failed',
          timestamp: new Date().toISOString(),
          messageId: emailResult.messageId,
          error: emailResult.error,
        });
      }
    }

    // Log notification batch
    console.log('[AUDIT] Emergency notifications sent:', {
      notificationId,
      patientId,
      notificationType,
      urgency,
      recipientCount: results.length,
      successCount: results.filter(r => r.status === 'sent').length,
    });

    return res.status(200).json({
      success: true,
      notificationId,
      results,
      message: `Sent ${results.filter(r => r.status === 'sent').length} of ${results.length} notifications`,
    });

  } catch (error) {
    console.error('[ERROR] Failed to send notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send emergency notifications',
    });
  }
}
