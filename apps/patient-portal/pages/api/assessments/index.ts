// =============================================================================
// ATTENDING AI - Patient Portal Assessments API
// apps/patient-portal/pages/api/assessments/index.ts
//
// Handles:
//   GET  /api/assessments — fetch assessments for the current patient session
//   POST /api/assessments — offline sync path (from syncManager.ts)
//
// The primary submission path (/api/assessments/submit) is used by the
// live COMPASS chat flow (useChatStore.submitAssessment). This handler
// exists to support the offline sync manager, which queues assessments
// locally when the device is offline and re-submits them via POST to
// /api/assessments when connectivity is restored.
//
// Both paths write to the same PatientAssessment table via Prisma, so
// the provider portal dashboard shows all assessments regardless of path.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '@attending/shared/lib/prisma';
import { proxyToBackend } from '../../../lib/backendProxy';

// =============================================================================
// Types — matches the payload syncManager.submitAssessment() sends
// =============================================================================

interface HPIData {
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  severity?: number;
  aggravating?: string[];
  relieving?: string[];
  associated?: string[];
  timing?: string;
}

interface AssessmentPostBody {
  // Fields added by offline sync
  offlineId?: string;
  sessionId: string;
  createdAt?: string;
  triageLevel?: string;
  redFlags?: string[];

  // Core assessment fields
  patientName?: string;
  dateOfBirth?: string;
  chiefComplaint?: string;
  hpi?: HPIData;
  medications?: string[];
  allergies?: string[];
  medicalHistory?: string[];
  urgencyLevel?: string;
  urgencyScore?: number;
  conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
}

// =============================================================================
// Helpers
// =============================================================================

function buildHpiNarrative(cc: string, hpi: HPIData): string {
  const parts: string[] = [];
  if (cc) parts.push(`Chief complaint: ${cc}.`);
  if (hpi.onset) parts.push(`Onset: ${hpi.onset}.`);
  if (hpi.location) parts.push(`Location: ${hpi.location}.`);
  if (hpi.duration) parts.push(`Duration: ${hpi.duration}.`);
  if (hpi.character) parts.push(`Character: ${hpi.character}.`);
  if (hpi.severity != null) parts.push(`Severity: ${hpi.severity}/10.`);
  if (hpi.timing) parts.push(`Timing: ${hpi.timing}.`);
  if (hpi.aggravating?.length) parts.push(`Aggravating: ${hpi.aggravating.join(', ')}.`);
  if (hpi.relieving?.length) parts.push(`Relieving: ${hpi.relieving.join(', ')}.`);
  if (hpi.associated?.length) parts.push(`Associated symptoms: ${hpi.associated.join(', ')}.`);
  return parts.join(' ');
}

function mapTriageLevel(urgency: string | undefined, redFlagCount: number): string {
  if (!urgency) return redFlagCount > 0 ? 'URGENT' : 'ROUTINE';
  const map: Record<string, string> = {
    emergency: 'EMERGENCY',
    high: 'URGENT',
    moderate: 'MODERATE',
    standard: 'ROUTINE',
  };
  return map[urgency.toLowerCase()] ?? 'ROUTINE';
}

// =============================================================================
// GET — list assessments for a patient session (read-only, lightweight)
// =============================================================================

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Try .NET backend first
  const proxied = await proxyToBackend(req, res, '/api/v1/assessments');
  if (proxied) return;

  const { sessionId, limit = '10' } = req.query;

  try {
    const where = sessionId && typeof sessionId === 'string'
      ? { sessionId }
      : {};

    const assessments = await prisma.patientAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10) || 10, 50),
      select: {
        id: true,
        sessionId: true,
        chiefComplaint: true,
        triageLevel: true,
        status: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ assessments });
  } catch (error) {
    console.error('[ASSESSMENTS GET ERROR]', error);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
}

// =============================================================================
// POST — offline sync path from syncManager.ts
// =============================================================================

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Try .NET backend first (domain events + SignalR notification to providers)
  const proxied = await proxyToBackend(req, res, '/api/v1/assessments');
  if (proxied) return;

  console.log('[ASSESSMENTS POST] .NET backend unavailable, using Prisma fallback');
  const isOfflineSync = req.headers['x-offline-sync'] === 'true';
  const data: AssessmentPostBody = req.body;

  if (!data.sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  if (!data.chiefComplaint) {
    return res.status(400).json({ error: 'chiefComplaint is required' });
  }

  try {
    // Idempotency: if this sessionId was already synced, return the existing record.
    const existing = await prisma.patientAssessment.findFirst({
      where: { sessionId: data.sessionId },
      select: { id: true },
    });
    if (existing) {
      console.log(`[ASSESSMENTS POST] sessionId ${data.sessionId} already exists, skipping duplicate`);
      return res.status(200).json({ id: existing.id, duplicate: true });
    }

    const redFlagCount = data.redFlags?.length ?? 0;
    const triageLevel = data.triageLevel ?? mapTriageLevel(data.urgencyLevel, redFlagCount);
    const hasRedFlags = redFlagCount > 0;

    const organizationId = (session.user as any).organizationId || '';

    // Create patient record
    const patient = await prisma.patient.create({
      data: {
        organizationId,
        mrn: `COMPASS-SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        firstName: data.patientName?.split(' ')[0] || 'Anonymous',
        lastName: data.patientName?.split(' ').slice(1).join(' ') || 'Patient',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
      },
    });

    const hpiNarrative = data.hpi
      ? buildHpiNarrative(data.chiefComplaint, data.hpi)
      : null;

    const symptoms = [
      ...(data.hpi?.associated ?? []),
      ...(data.redFlags ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const assessment = await prisma.patientAssessment.create({
      data: {
        sessionId: data.sessionId,
        patientId: patient.id,
        status: 'COMPLETED',
        phase: 'COMPLETE',
        chiefComplaint: data.chiefComplaint,
        hpiNarrative,
        symptoms: symptoms.length > 0 ? JSON.stringify(symptoms) : null,
        medications: data.medications?.length ? JSON.stringify(data.medications) : null,
        allergies: data.allergies?.length ? JSON.stringify(data.allergies) : null,
        medicalHistory: data.medicalHistory?.length ? JSON.stringify(data.medicalHistory) : null,
        triageLevel,
        redFlagsDetected: hasRedFlags ? JSON.stringify(data.redFlags) : null,
        conversation: data.conversationHistory ? JSON.stringify(data.conversationHistory) : null,
        completedAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      },
    });

    if (hasRedFlags) {
      await prisma.emergencyEvent.create({
        data: {
          organizationId,
          patientId: patient.id,
          assessmentId: assessment.id,
          eventType: 'RED_FLAG',
          severity: triageLevel === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
          description: `COMPASS offline sync: ${redFlagCount} red flag(s): ${data.redFlags!.join(', ')}`,
          triggeredBy: 'SYSTEM',
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: isOfflineSync ? 'ASSESSMENT_OFFLINE_SYNCED' : 'ASSESSMENT_SUBMITTED',
        entityType: 'PatientAssessment',
        entityId: assessment.id,
        changes: JSON.stringify({ triageLevel, redFlagCount, offlineId: data.offlineId }),
        success: true,
      },
    });

    console.log(`[ASSESSMENTS POST] Created ${assessment.id} via ${isOfflineSync ? 'offline sync' : 'direct submit'}`);
    return res.status(201).json({ id: assessment.id });
  } catch (error) {
    console.error('[ASSESSMENTS POST ERROR]', error);
    return res.status(500).json({ error: 'Failed to save assessment' });
  }
}

// =============================================================================
// Router
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
