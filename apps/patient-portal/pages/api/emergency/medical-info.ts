// =============================================================================
// ATTENDING AI - Emergency Medical Info API
// apps/patient-portal/pages/api/emergency/medical-info.ts
//
// Returns critical medical information for emergency responders.
//
// Security measures:
// - Requires valid access log ID tied to a specific patient
// - Rate limited by IP address
// - All access is audit logged
// - Access logs expire after 30 minutes
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '@attending/shared/lib/prisma';

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// =============================================================================
// Security Configuration
// =============================================================================

// Rate limiting: track requests per IP.
// NOTE: This in-memory rate limiter is per-process only. In a multi-replica
// deployment (Vercel serverless, Kubernetes), use Redis-backed rate limiting
// (e.g., @upstash/ratelimit) for cross-instance enforcement.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requests per minute per IP

// In-memory store for valid access logs (in production, use database)
const validAccessLogs = new Map<
  string,
  { patientId: string; createdAt: number; expiresAt: number }
>();

/**
 * Validate rate limit for an IP address.
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
 * Validate access log ID is legitimate AND matches the requested patient.
 */
function validateAccessLogId(
  accessLogId: string,
  patientId: string
): { valid: boolean; reason?: string } {
  const log = validAccessLogs.get(accessLogId);

  if (!log) {
    return { valid: false, reason: 'ACCESS_LOG_NOT_FOUND' };
  }

  if (Date.now() >= log.expiresAt) {
    validAccessLogs.delete(accessLogId);
    return { valid: false, reason: 'ACCESS_LOG_EXPIRED' };
  }

  if (log.patientId !== patientId) {
    return { valid: false, reason: 'ACCESS_LOG_PATIENT_MISMATCH' };
  }

  return { valid: true };
}

/**
 * Create a new access log entry tied to a specific patient.
 * Called by the log-access endpoint when emergency access is initiated.
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
      error: 'Method not allowed',
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

    // Require patient ID
    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Patient ID is required',
      });
    }

    // Require access log ID
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

    // Validate the access log ID is legitimate AND matches this patient
    const validation = validateAccessLogId(accessLogId, patientId);
    if (!validation.valid) {
      console.log('[SECURITY] Invalid access log ID attempted:', {
        accessLogId: accessLogId.substring(0, 8) + '...',
        reason: validation.reason,
        ip: clientIp,
        timestamp: new Date().toISOString(),
      });
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired access log ID',
      });
    }

    // Fetch patient medical info from database
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
      include: {
        allergies: { where: { deletedAt: null } },
        conditions: { where: { deletedAt: null } },
        medications: { where: { deletedAt: null } },
      },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
      });
    }

    // Audit log this data retrieval
    console.log('[AUDIT] Emergency medical info retrieved:', {
      patientId,
      accessLogId: accessLogId.substring(0, 8) + '...',
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    // Build emergency medical info response from real data
    const medicalInfo = {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth?.toISOString() || '',
        gender: patient.gender || '',
      },
      allergies: patient.allergies.map((a) => ({
        allergen: a.allergen,
        reaction: a.reaction || '',
        severity: a.severity || 'unknown',
      })),
      conditions: patient.conditions.map((c) => ({
        name: c.name,
        icdCode: c.icdCode || undefined,
      })),
      medications: patient.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
      })),
      emergencyContacts: safeJsonParse(patient.emergencyContact as string, []),
      lastUpdated: patient.updatedAt.toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: medicalInfo,
    });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve medical info:', {
      error,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve medical information',
    });
  }
}
