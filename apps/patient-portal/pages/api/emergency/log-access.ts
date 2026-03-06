// =============================================================================
// ATTENDING AI - Emergency Access Log API
// apps/patient-portal/pages/api/emergency/log-access.ts
//
// Logs emergency access events with photo, location, and audit trail.
// Returns an accessLogId that must be used to retrieve medical info.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createAccessLog } from './medical-info';

// =============================================================================
// Types
// =============================================================================

interface EmergencyAccessLog {
  id: string;
  patientId: string;
  timestamp: string;
  accessMethod: 'pin' | 'face_scan' | 'biometric';
  accessorPhoto?: string; // Base64 encoded image
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  deviceInfo: {
    userAgent: string;
    platform?: string;
    screenResolution?: string;
  };
  triggerType: 'crash_detection' | 'manual' | 'lock_screen';
  crashData?: {
    gForce: number;
    impactDirection?: string;
  };
  notificationsSent: {
    emergencyContacts: boolean;
    emergencyServices: boolean;
    careTeam: boolean;
  };
  sessionDuration?: number; // seconds the info was viewed
}

interface ApiResponse {
  success: boolean;
  logId?: string;
  accessToken?: string; // Token to retrieve medical info
  message?: string;
  error?: string;
}

// =============================================================================
// In-Memory Storage (Replace with database in production)
// =============================================================================

const accessLogs: EmergencyAccessLog[] = [];

// =============================================================================
// Helper Functions
// =============================================================================

function generateLogId(): string {
  // Use crypto for secure ID generation
  const crypto = require('crypto');
  return `eal_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  // In production, use a geocoding service like Google Maps or OpenStreetMap
  // For now, return a placeholder
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function notifyEmergencyContacts(patientId: string, log: EmergencyAccessLog): Promise<boolean> {
  // In production, this would send SMS/push notifications
  console.log(`[EMERGENCY] Notifying contacts for patient ${patientId}`);
  console.log(`[EMERGENCY] Access at: ${log.timestamp}`);
  if (log.location) {
    console.log(`[EMERGENCY] Location: ${log.location.latitude}, ${log.location.longitude}`);
  }
  return true;
}

async function notifyCareTeam(patientId: string, log: EmergencyAccessLog): Promise<boolean> {
  // In production, this would notify the care team via the provider portal
  console.log(`[CARE TEAM] Emergency access logged for patient ${patientId}`);
  return true;
}

async function storeAccessPhoto(logId: string, photoData: string): Promise<string> {
  // In production, store in secure cloud storage (S3, Azure Blob, etc.)
  // Return URL to stored photo
  const photoUrl = `/api/emergency/photos/${logId}`;
  console.log(`[STORAGE] Photo stored for log ${logId}, size: ${(photoData.length / 1024).toFixed(1)}KB`);
  return photoUrl;
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
      accessMethod,
      accessorPhoto,
      location,
      deviceInfo,
      triggerType,
      crashData,
    } = req.body;

    // Validate required fields
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient ID is required' 
      });
    }

    if (!accessMethod || !['pin', 'face_scan', 'biometric'].includes(accessMethod)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid access method is required' 
      });
    }

    // Generate log ID
    const logId = generateLogId();

    // Process location if provided
    let processedLocation = location;
    if (location?.latitude && location?.longitude) {
      const address = await reverseGeocode(location.latitude, location.longitude);
      processedLocation = { ...location, address };
    }

    // Store photo if provided
    let photoUrl: string | undefined;
    if (accessorPhoto) {
      photoUrl = await storeAccessPhoto(logId, accessorPhoto);
    }

    // Create log entry
    const logEntry: EmergencyAccessLog = {
      id: logId,
      patientId,
      timestamp: new Date().toISOString(),
      accessMethod,
      accessorPhoto: photoUrl, // Store URL instead of base64
      location: processedLocation,
      deviceInfo: deviceInfo || { userAgent: req.headers['user-agent'] || 'unknown' },
      triggerType: triggerType || 'manual',
      crashData,
      notificationsSent: {
        emergencyContacts: false,
        emergencyServices: false,
        careTeam: false,
      },
    };

    // Store log
    accessLogs.push(logEntry);

    // Send notifications asynchronously
    const notifyContactsPromise = notifyEmergencyContacts(patientId, logEntry);
    const notifyCareTeamPromise = notifyCareTeam(patientId, logEntry);

    // Wait for notifications (in production, might want to fire-and-forget)
    const [contactsNotified, careTeamNotified] = await Promise.all([
      notifyContactsPromise,
      notifyCareTeamPromise,
    ]);

    // Update notification status
    logEntry.notificationsSent.emergencyContacts = contactsNotified;
    logEntry.notificationsSent.careTeam = careTeamNotified;

    // Log for audit trail
    console.log('[AUDIT] Emergency access logged:', {
      logId,
      patientId,
      timestamp: logEntry.timestamp,
      accessMethod,
      triggerType,
      hasPhoto: !!accessorPhoto,
      hasLocation: !!location,
    });

    // Create access token for medical info retrieval
    const accessToken = createAccessLog(patientId);

    return res.status(201).json({
      success: true,
      logId,
      accessToken, // Use this to call /api/emergency/medical-info
      message: 'Emergency access logged successfully',
    });

  } catch (error) {
    console.error('[ERROR] Failed to log emergency access:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to log emergency access',
    });
  }
}

// =============================================================================
// Export for testing
// =============================================================================

export { accessLogs, generateLogId };
