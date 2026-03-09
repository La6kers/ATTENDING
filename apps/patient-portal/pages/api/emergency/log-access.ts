// =============================================================================
// ATTENDING AI - Emergency Access Log API
// apps/patient-portal/pages/api/emergency/log-access.ts
//
// Logs emergency access events with photo, location, and audit trail.
// Returns an accessLogId that must be used to retrieve medical info.
//
// Two legitimate flows:
// 1. Patient-initiated: session exists, patientId must match session
// 2. Responder-initiated: no session, but requires valid PIN + rate limiting
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createAccessLog } from './medical-info';

// =============================================================================
// Types
// =============================================================================

interface EmergencyAccessLog {
  id: string;
  patientId: string;
  timestamp: string;
  accessMethod: 'pin' | 'face_scan' | 'biometric';
  accessorPhoto?: string;
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
  sessionDuration?: number;
}

interface ApiResponse {
  success: boolean;
  logId?: string;
  accessToken?: string;
  message?: string;
  error?: string;
}

// =============================================================================
// Rate Limiting for unauthenticated emergency access
// =============================================================================

// NOTE: In-memory rate limiter — per-process only. For multi-replica deployments,
// use Redis-backed rate limiting (e.g., @upstash/ratelimit).
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5; // Stricter for unauthenticated access

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

// =============================================================================
// In-Memory Storage (Replace with database in production)
// =============================================================================

const accessLogs: EmergencyAccessLog[] = [];

// =============================================================================
// Helper Functions
// =============================================================================

function generateLogId(): string {
  return `eal_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

async function notifyEmergencyContacts(patientId: string, log: EmergencyAccessLog): Promise<boolean> {
  console.log(`[EMERGENCY] Notifying contacts for patient ${patientId}`);
  console.log(`[EMERGENCY] Access at: ${log.timestamp}`);
  if (log.location) {
    console.log(`[EMERGENCY] Location: ${log.location.latitude}, ${log.location.longitude}`);
  }
  return true;
}

async function notifyCareTeam(patientId: string, _log: EmergencyAccessLog): Promise<boolean> {
  console.log(`[CARE TEAM] Emergency access logged for patient ${patientId}`);
  return true;
}

async function storeAccessPhoto(logId: string, photoData: string): Promise<string> {
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
      error: 'Method not allowed',
    });
  }

  const clientIp = getClientIp(req);

  // Rate limit all requests
  if (!checkRateLimit(clientIp)) {
    console.log('[SECURITY] Rate limit exceeded for emergency log-access:', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait before trying again.',
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
        error: 'Patient ID is required',
      });
    }

    if (!accessMethod || !['pin', 'face_scan', 'biometric'].includes(accessMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Valid access method is required',
      });
    }

    // Authentication check:
    // 1. If a session exists, enforce that patientId matches the session user.
    // 2. If no session (responder-initiated), require PIN verification.
    const session = await getServerSession(req, res, authOptions);
    if (session?.user) {
      const sessionPatientId = (session.user as { id?: string }).id;
      if (sessionPatientId && sessionPatientId !== patientId) {
        console.log('[SECURITY] Patient ID mismatch in emergency log-access:', {
          sessionPatientId,
          requestedPatientId: patientId,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        });
        return res.status(403).json({
          success: false,
          error: 'Patient ID does not match authenticated session',
        });
      }
    } else {
      // Unauthenticated (responder-initiated) — must verify PIN
      if (accessMethod === 'pin') {
        const { pin } = req.body;
        if (!pin) {
          return res.status(400).json({
            success: false,
            error: 'PIN is required for unauthenticated emergency access',
          });
        }

        // Look up the patient's emergency access profile to verify PIN
        const prismaModule = await import('@attending/shared/lib/prisma');
        const prisma = prismaModule.prisma;

        const profile = await prisma.emergencyAccessProfile.findFirst({
          where: { patientId, deletedAt: null, isEnabled: true },
        });

        if (!profile) {
          console.log('[SECURITY] Emergency access not enabled for patient:', {
            patientId,
            ip: clientIp,
            timestamp: new Date().toISOString(),
          });
          return res.status(403).json({
            success: false,
            error: 'Emergency access is not enabled for this patient',
          });
        }

        // Verify PIN using PBKDF2 with embedded salt.
        // pinHash format: "salt:derivedKey" (both hex-encoded).
        // PIN-setting endpoints must store hashes in this same format
        // using hashPin() from @attending/shared/lib/auth/pinHash.
        const [salt, storedKey] = (profile.pinHash || '').split(':');
        const derivedKey = crypto.pbkdf2Sync(pin, salt || '', 100_000, 64, 'sha512').toString('hex');
        if (!storedKey || derivedKey !== storedKey) {
          console.log('[SECURITY] Invalid PIN attempt for emergency access:', {
            patientId,
            ip: clientIp,
            timestamp: new Date().toISOString(),
          });
          return res.status(403).json({
            success: false,
            error: 'Invalid PIN',
          });
        }
      }
      // face_scan and biometric require device attestation that can only be
      // verified from an authenticated session (WebAuthn / device APIs).
      // Reject unauthenticated requests using these methods.
      if (accessMethod === 'face_scan' || accessMethod === 'biometric') {
        console.log('[SECURITY] Unauthenticated biometric/face_scan attempt:', {
          patientId,
          accessMethod,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        });
        return res.status(403).json({
          success: false,
          error: 'Biometric and face scan access methods require an authenticated session',
        });
      }
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
      accessorPhoto: photoUrl,
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
    const [contactsNotified, careTeamNotified] = await Promise.all([
      notifyEmergencyContacts(patientId, logEntry),
      notifyCareTeam(patientId, logEntry),
    ]);

    // Update notification status
    logEntry.notificationsSent.emergencyContacts = contactsNotified;
    logEntry.notificationsSent.careTeam = careTeamNotified;

    // Audit log
    console.log('[AUDIT] Emergency access logged:', {
      logId,
      patientId,
      timestamp: logEntry.timestamp,
      accessMethod,
      triggerType,
      hasPhoto: !!accessorPhoto,
      hasLocation: !!location,
      authenticated: !!session?.user,
      ip: clientIp,
    });

    // Create access token for medical info retrieval — tied to this patient
    const accessToken = createAccessLog(patientId);

    return res.status(201).json({
      success: true,
      logId,
      accessToken,
      message: 'Emergency access logged successfully',
    });
  } catch (error) {
    console.error('[ERROR] Failed to log emergency access:', {
      error,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
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
