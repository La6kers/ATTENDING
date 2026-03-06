// =============================================================================
// ATTENDING AI - Emergency Medical Info API
// apps/patient-portal/pages/api/emergency/medical-info.ts
//
// Returns critical medical information for emergency responders.
//
// Security measures:
// - Requires valid access log ID (verified against recent logs)
// - Rate limited by IP address
// - All access is audit logged
// - In demo mode, accepts demo access tokens
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// =============================================================================
// Security Configuration
// =============================================================================

const isDev = process.env.NODE_ENV === 'development';
const isDemo = process.env.DEMO_MODE === 'true';

// Rate limiting: track requests per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

// Valid demo access tokens (for testing emergency access flow)
const DEMO_ACCESS_TOKENS = new Set([
  'demo-emergency-access',
  'test-access-log',
  'emt-access-token',
]);

// In-memory store for valid access logs (in production, use database)
const validAccessLogs = new Map<string, { patientId: string; createdAt: number; expiresAt: number }>();

/**
 * Validate rate limit for an IP address.
 * Returns true if request is allowed, false if rate limited.
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

/**
 * Get client IP address from request.
 */
function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Validate access log ID.
 * In production, this would verify against a database of recent emergency access logs.
 * In demo mode, accepts demo tokens.
 */
function validateAccessLogId(accessLogId: string): boolean {
  // Demo/dev mode: accept demo tokens
  if ((isDev || isDemo) && DEMO_ACCESS_TOKENS.has(accessLogId)) {
    return true;
  }

  // Check in-memory valid access logs
  const log = validAccessLogs.get(accessLogId);
  if (log && Date.now() < log.expiresAt) {
    return true;
  }

  // In production, this would query the database
  // For now, require valid format (UUID-like)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(accessLogId)) {
    // In production: verify in database
    // For demo: accept valid UUID format in dev mode
    return isDev || isDemo;
  }

  return false;
}

/**
 * Generate a new access log ID (called when emergency access is initiated).
 * This would be called by the log-access endpoint.
 */
export function createAccessLog(patientId: string): string {
  const accessLogId = crypto.randomUUID();
  const now = Date.now();
  validAccessLogs.set(accessLogId, {
    patientId,
    createdAt: now,
    expiresAt: now + 30 * 60 * 1000, // 30 minutes
  });
  return accessLogId;
}

// =============================================================================
// Types
// =============================================================================

interface EmergencyMedicalInfo {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    age: number;
    gender: string;
    photoUrl?: string;
  };
  criticalAlerts: string[];
  bloodType: string;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  }>;
  conditions: Array<{
    name: string;
    icdCode?: string;
    severity?: string;
    notes?: string;
  }>;
  medications: Array<{
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    route: string;
    isCritical: boolean;
    warnings?: string[];
  }>;
  implants: Array<{
    type: string;
    manufacturer?: string;
    model?: string;
    implantDate?: string;
    serialNumber?: string;
    mriSafe: boolean;
    notes?: string;
  }>;
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    isPrimary: boolean;
  }>;
  physician: {
    name: string;
    specialty: string;
    phone: string;
    fax?: string;
    organization?: string;
  };
  directives: {
    organDonor: boolean;
    advanceDirective: boolean;
    advanceDirectiveLocation?: string;
    dnr: boolean;
    dnrOrderDate?: string;
    polst: boolean;
    polstDetails?: string;
  };
  insurance: {
    provider: string;
    memberId: string;
    groupNumber?: string;
    phone?: string;
  };
  additionalNotes: string;
  lastUpdated: string;
}

// =============================================================================
// Mock Data (Replace with database query in production)
// =============================================================================

const mockMedicalInfo: EmergencyMedicalInfo = {
  patient: {
    id: 'patient-001',
    firstName: 'Robert',
    lastName: 'Anderson',
    dateOfBirth: '1957-03-15',
    age: 68,
    gender: 'Male',
  },
  criticalAlerts: [
    'ON ANTICOAGULATION (Eliquis) - HIGH BLEEDING RISK',
    'HAS PACEMAKER - NO MRI WITHOUT CARDIOLOGY CLEARANCE',
    'CHRONIC KIDNEY DISEASE - ADJUST MEDICATION DOSES',
  ],
  bloodType: 'A+',
  allergies: [
    { allergen: 'Penicillin', reaction: 'Anaphylaxis', severity: 'life-threatening' },
    { allergen: 'Sulfa drugs', reaction: 'Rash, hives', severity: 'moderate' },
    { allergen: 'Shellfish', reaction: 'Swelling, difficulty breathing', severity: 'severe' },
  ],
  conditions: [
    { name: 'Type 2 Diabetes Mellitus', icdCode: 'E11.9', severity: 'Moderate', notes: 'A1c 7.2%' },
    { name: 'Essential Hypertension', icdCode: 'I10', severity: 'Controlled' },
    { name: 'Atrial Fibrillation', icdCode: 'I48.91', severity: 'Persistent', notes: 'Rate controlled' },
    { name: 'Chronic Kidney Disease Stage 3b', icdCode: 'N18.32', notes: 'eGFR 38' },
    { name: 'Heart Failure with Preserved EF', icdCode: 'I50.32', notes: 'EF 55%' },
  ],
  medications: [
    {
      name: 'Eliquis (Apixaban)',
      genericName: 'Apixaban',
      dosage: '5mg',
      frequency: 'Twice daily',
      route: 'Oral',
      isCritical: true,
      warnings: ['ANTICOAGULANT - Bleeding risk', 'Hold 48h before procedures'],
    },
    {
      name: 'Metformin',
      genericName: 'Metformin HCl',
      dosage: '1000mg',
      frequency: 'Twice daily',
      route: 'Oral',
      isCritical: false,
      warnings: ['Hold if contrast dye administered'],
    },
    {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      dosage: '20mg',
      frequency: 'Once daily',
      route: 'Oral',
      isCritical: false,
    },
    {
      name: 'Carvedilol',
      genericName: 'Carvedilol',
      dosage: '12.5mg',
      frequency: 'Twice daily',
      route: 'Oral',
      isCritical: false,
      warnings: ['Do not stop abruptly'],
    },
    {
      name: 'Furosemide',
      genericName: 'Furosemide',
      dosage: '40mg',
      frequency: 'Once daily',
      route: 'Oral',
      isCritical: false,
    },
    {
      name: 'Atorvastatin',
      genericName: 'Atorvastatin',
      dosage: '40mg',
      frequency: 'Once daily at bedtime',
      route: 'Oral',
      isCritical: false,
    },
  ],
  implants: [
    {
      type: 'Pacemaker',
      manufacturer: 'Medtronic',
      model: 'Azure XT DR MRI SureScan',
      implantDate: '2022-03-15',
      serialNumber: 'MDT123456789',
      mriSafe: true,
      notes: 'MRI conditional - requires cardiology clearance and specific settings',
    },
  ],
  emergencyContacts: [
    {
      name: 'Rachel Anderson',
      relationship: 'Fiancée',
      phone: '(555) 123-4567',
      isPrimary: true,
    },
    {
      name: 'Michael Anderson',
      relationship: 'Brother',
      phone: '(555) 234-5678',
      isPrimary: false,
    },
    {
      name: 'Lucy Anderson',
      relationship: 'Daughter',
      phone: '(555) 345-6789',
      isPrimary: false,
    },
  ],
  physician: {
    name: 'Dr. Sarah Chen',
    specialty: 'Internal Medicine',
    phone: '(555) 456-7890',
    fax: '(555) 456-7891',
    organization: 'Colorado Permanente Medical Group',
  },
  directives: {
    organDonor: true,
    advanceDirective: true,
    advanceDirectiveLocation: 'On file with primary care physician',
    dnr: false,
    polst: false,
  },
  insurance: {
    provider: 'Blue Cross Blue Shield',
    memberId: 'XYZ123456789',
    groupNumber: 'GRP001',
    phone: '1-800-555-1234',
  },
  additionalNotes: 'Patient on anticoagulation therapy (Eliquis) for atrial fibrillation - INCREASED BLEEDING RISK. Has implanted pacemaker - avoid MRI without cardiology clearance and pacemaker interrogation. Contact cardiology (555-789-0123) for pacemaker-related questions. CKD Stage 3b - adjust renally-cleared medications. Lives with fiancée who is healthcare proxy.',
  lastUpdated: new Date().toISOString(),
};

// =============================================================================
// API Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // Get client IP for rate limiting and audit
  const clientIp = getClientIp(req);

  // Check rate limit
  const rateLimit = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    console.log('[SECURITY] Rate limit exceeded for emergency medical info:', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait before trying again.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  }

  try {
    const { patientId, accessLogId } = req.query;

    // Validate access log ID (ensures this is a legitimate emergency access)
    if (!accessLogId || typeof accessLogId !== 'string') {
      console.log('[SECURITY] Missing access log ID:', {
        ip: clientIp,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({
        success: false,
        error: 'Access log ID required - emergency access must be logged first',
      });
    }

    // Validate the access log ID is legitimate
    if (!validateAccessLogId(accessLogId)) {
      console.log('[SECURITY] Invalid access log ID attempted:', {
        accessLogId: accessLogId.substring(0, 8) + '...',
        ip: clientIp,
        timestamp: new Date().toISOString(),
      });
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired access log ID',
      });
    }

    // Audit log this data retrieval
    console.log('[AUDIT] Medical info retrieved:', {
      patientId: patientId || mockMedicalInfo.patient.id,
      accessLogId: accessLogId.substring(0, 8) + '...',
      ip: clientIp,
      timestamp: new Date().toISOString(),
      mode: isDemo ? 'demo' : isDev ? 'development' : 'production',
    });

    // Return medical info
    return res.status(200).json({
      success: true,
      data: mockMedicalInfo,
    });

  } catch (error) {
    console.error('[ERROR] Failed to retrieve medical info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve medical information',
    });
  }
}
