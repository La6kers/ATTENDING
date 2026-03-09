// =============================================================================
// ATTENDING AI - Assessment Submit API
// apps/patient-portal/pages/api/assessments/submit.ts
//
// Handles COMPASS assessment submission from chat interface.
// Saves to PatientAssessment table via Prisma.
//
// Phase 3: Wired to real database. Accepts the exact payload shape
// that useChatStore.submitAssessment() produces.
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';
import { proxyToBackend } from '../../../lib/backendProxy';
import { buildWebhookPayload, dispatchWebhooks } from '../../../lib/webhooks';
import { verifyCsrfToken } from '@attending/shared/lib/security';

// =============================================================================
// Types — matches what useChatStore.submitAssessment() sends
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

interface SubmitPayload {
  sessionId: string;
  patientName?: string;
  dateOfBirth?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi?: HPIData;
  reviewOfSystems?: Record<string, string[]>;
  medications?: string[];
  allergies?: string[];
  medicalHistory?: string[];
  surgicalHistory?: string[];
  socialHistory?: Record<string, string>;
  familyHistory?: string[];
  // redFlags from store is string[] (symptom names)
  redFlags?: string[];
  urgencyLevel?: string;
  urgencyScore?: number;
  conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
  submittedAt?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build an HPI narrative from structured OLDCARTS data.
 */
function buildHpiNarrative(cc: string, hpi: HPIData): string {
  const parts: string[] = [];
  if (cc) parts.push(`Chief complaint: ${cc}.`);
  if (hpi.onset) parts.push(`Onset: ${hpi.onset}.`);
  if (hpi.location) parts.push(`Location: ${hpi.location}.`);
  if (hpi.duration) parts.push(`Duration: ${hpi.duration}.`);
  if (hpi.character) parts.push(`Character: ${hpi.character}.`);
  if (hpi.severity != null) parts.push(`Severity: ${hpi.severity}/10.`);
  if (hpi.timing) parts.push(`Timing: ${hpi.timing}.`);
  if (hpi.aggravating?.length) parts.push(`Aggravating factors: ${hpi.aggravating.join(', ')}.`);
  if (hpi.relieving?.length) parts.push(`Relieving factors: ${hpi.relieving.join(', ')}.`);
  if (hpi.associated?.length) parts.push(`Associated symptoms: ${hpi.associated.join(', ')}.`);
  return parts.join(' ');
}

/**
 * Map frontend urgency string to triage level.
 */
function mapTriageLevel(urgency: string | undefined, redFlagCount: number): string {
  if (!urgency) return redFlagCount > 0 ? 'URGENT' : 'ROUTINE';
  const map: Record<string, string> = {
    emergency: 'EMERGENCY',
    high: 'URGENT',
    moderate: 'MODERATE',
    standard: 'ROUTINE',
  };
  return map[urgency.toLowerCase()] || 'ROUTINE';
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // =========================================================================
  // Content-Type validation
  // =========================================================================
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported Media Type. Content-Type must be application/json.' });
  }

  // =========================================================================
  // CSRF validation
  // =========================================================================
  const csrfSecret = req.cookies['__Host-csrf-token'];
  const csrfToken = req.headers['x-csrf-token'] as string;
  if (!csrfSecret || !csrfToken || !verifyCsrfToken(csrfSecret, csrfToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  // =========================================================================
  // Organization context — required since Patient.organizationId is non-nullable
  // =========================================================================
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) {
    console.error('[ASSESSMENT SUBMIT] DEFAULT_ORGANIZATION_ID environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error: organization context unavailable' });
  }

  // =========================================================================
  // Try .NET backend first (CQRS pipeline with domain events → SignalR)
  // When available, the .NET backend handles validation, persistence,
  // and fires domain events that notify providers via SignalR in real-time.
  // =========================================================================
  const proxied = await proxyToBackend(req, res, '/api/v1/assessments/submit', {
    transformRequest: (body: SubmitPayload) => ({
      sessionId: body.sessionId,
      patientName: body.patientName,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      chiefComplaint: body.chiefComplaint,
      hpiData: body.hpi,
      reviewOfSystems: body.reviewOfSystems,
      medications: body.medications,
      allergies: body.allergies,
      medicalHistory: body.medicalHistory,
      surgicalHistory: body.surgicalHistory,
      socialHistory: body.socialHistory,
      familyHistory: body.familyHistory,
      redFlags: body.redFlags,
      urgencyLevel: body.urgencyLevel,
      urgencyScore: body.urgencyScore,
      conversationHistory: body.conversationHistory,
    }),
  });
  if (proxied) return;

  // =========================================================================
  // Fallback: direct Prisma access (works without .NET backend running)
  // =========================================================================
  try {
    const data: SubmitPayload = req.body;

    // Validate
    if (!data.sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    if (!data.chiefComplaint) {
      return res.status(400).json({ error: 'Chief complaint is required' });
    }

    // =========================================================================
    // Size limits for arrays and overall body
    // =========================================================================
    const MAX_CONVERSATION_HISTORY = 200;
    const MAX_RED_FLAGS = 50;
    const MAX_BODY_SIZE_BYTES = 1_000_000; // 1 MB

    const bodySize = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    if (bodySize > MAX_BODY_SIZE_BYTES) {
      return res.status(413).json({ error: 'Request body too large. Maximum size is 1 MB.' });
    }
    if (data.conversationHistory && data.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      return res.status(400).json({ error: `conversationHistory exceeds maximum of ${MAX_CONVERSATION_HISTORY} items.` });
    }
    if (data.redFlags && data.redFlags.length > MAX_RED_FLAGS) {
      return res.status(400).json({ error: `redFlags exceeds maximum of ${MAX_RED_FLAGS} items.` });
    }

    console.log('[ASSESSMENT SUBMIT] .NET backend unavailable, using Prisma fallback');

    const redFlagCount = data.redFlags?.length || 0;
    const triageLevel = mapTriageLevel(data.urgencyLevel, redFlagCount);
    const hasRedFlags = redFlagCount > 0;

    // =========================================================================
    // Find or create patient (avoid duplicates by matching name + DOB + org)
    // =========================================================================
    const firstName = data.patientName?.split(' ')[0] || 'Anonymous';
    const lastName = data.patientName?.split(' ').slice(1).join(' ') || 'Patient';
    const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01');

    let patient = await prisma.patient.findFirst({
      where: {
        firstName,
        lastName,
        dateOfBirth,
        organizationId,
      },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          mrn: `COMPASS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          firstName,
          lastName,
          dateOfBirth,
          gender: data.gender || null,
          organizationId,
        },
      });
    }

    // =========================================================================
    // Build HPI narrative from structured data
    // =========================================================================
    const hpiNarrative = data.hpi
      ? buildHpiNarrative(data.chiefComplaint, data.hpi)
      : null;

    // Build symptoms array from HPI associated + red flags
    const symptoms = [
      ...(data.hpi?.associated || []),
      ...(data.redFlags || []),
    ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

    // =========================================================================
    // Create assessment — all fields match prisma/schema.prisma
    // =========================================================================
    const assessment = await prisma.patientAssessment.create({
      data: {
        sessionId: data.sessionId,
        patientId: patient.id,
        status: 'COMPLETED',
        phase: 'COMPLETE',
        chiefComplaint: data.chiefComplaint,
        hpiNarrative,
        symptoms: symptoms.length > 0 ? JSON.stringify(symptoms) : null,
        reviewOfSystems: data.reviewOfSystems ? JSON.stringify(data.reviewOfSystems) : null,
        medications: data.medications?.length ? JSON.stringify(data.medications) : null,
        allergies: data.allergies?.length ? JSON.stringify(data.allergies) : null,
        medicalHistory: data.medicalHistory?.length ? JSON.stringify(data.medicalHistory) : null,
        vitalSigns: null, // COMPASS doesn't collect vitals (done at clinic)
        triageLevel,
        redFlagsDetected: hasRedFlags ? JSON.stringify(data.redFlags) : null,
        conversation: data.conversationHistory ? JSON.stringify(data.conversationHistory) : null,
        completedAt: new Date(),
      },
    });

    // =========================================================================
    // Emergency event if red flags detected
    // =========================================================================
    if (hasRedFlags) {
      await prisma.emergencyEvent.create({
        data: {
          patientId: patient.id,
          assessmentId: assessment.id,
          eventType: 'RED_FLAG',
          severity: triageLevel === 'EMERGENCY' ? 'CRITICAL' : 'HIGH',
          description: `COMPASS detected ${redFlagCount} red flag(s): ${data.redFlags!.join(', ')}`,
          triggeredBy: 'SYSTEM',
        },
      });
    }

    // =========================================================================
    // Audit log
    // =========================================================================
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_SUBMITTED',
        entityType: 'PatientAssessment',
        entityId: assessment.id,
        userId: (req as any).userId || null,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
        changes: JSON.stringify({
          triageLevel,
          redFlagCount,
          urgencyScore: data.urgencyScore,
        }),
        success: true,
      },
    });

    // =========================================================================
    // Notify providers (Prisma fallback path — .NET uses domain events/SignalR)
    // Create a Notification record for each active provider so the provider
    // dashboard shows a badge and the notification list includes the new assessment.
    // =========================================================================
    try {
      const activeProviders = await prisma.user.findMany({
        where: { role: 'PROVIDER', isActive: true },
        select: { id: true },
        take: 50,
      });

      if (activeProviders.length > 0) {
        await prisma.notification.createMany({
          data: activeProviders.map((p) => ({
            userId: p.id,
            type: hasRedFlags ? 'URGENT_ASSESSMENT' : 'NEW_ASSESSMENT',
            priority: hasRedFlags ? 'URGENT' : 'NORMAL',
            title: hasRedFlags
              ? `🚨 Urgent: ${data.chiefComplaint}`
              : `New Assessment: ${data.chiefComplaint}`,
            message: `Patient ${data.patientName || 'Anonymous'} submitted a COMPASS assessment${hasRedFlags ? ` with ${redFlagCount} red flag(s)` : ''}.`,
            data: JSON.stringify({
              assessmentId: assessment.id,
              patientId: patient.id,
              triageLevel,
              redFlagCount,
            }),
            actionUrl: `/previsit/${assessment.id}`,
          })),
        });
      }
    } catch (notifErr) {
      // Best effort — don't fail the submission if notification creation fails
      console.warn('[ASSESSMENT SUBMIT] Failed to create provider notifications:', notifErr);
    }

    // =========================================================================
    // Dispatch webhooks (fire-and-forget — never blocks patient response)
    // Fires assessment.completed for all assessments, plus assessment.emergency
    // for those with critical red flags. Errors are caught internally.
    // =========================================================================
    try {
      const webhookPayload = buildWebhookPayload(
        'assessment.completed',
        assessment.id,
        {
          sessionId: data.sessionId,
          patientName: data.patientName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          chiefComplaint: data.chiefComplaint!,
          hpi: data.hpi,
          hpiNarrative: hpiNarrative || undefined,
          reviewOfSystems: data.reviewOfSystems,
          medications: data.medications,
          allergies: data.allergies,
          medicalHistory: data.medicalHistory,
          socialHistory: data.socialHistory,
          familyHistory: data.familyHistory,
          redFlags: data.redFlags,
          triageLevel,
          urgencyScore: data.urgencyScore,
          completedAt: assessment.completedAt?.toISOString(),
        },
      );

      // Fire-and-forget: don't await — patient response should not wait for webhooks
      dispatchWebhooks('assessment.completed', webhookPayload, assessment.id, patient.id)
        .then((results) => {
          const successes = results.filter(r => r.status === 'success').length;
          const failures = results.filter(r => r.status === 'failed').length;
          if (results.length > 0) {
            console.log(`[WEBHOOK] assessment.completed → ${successes} success, ${failures} failed`);
          }
        })
        .catch((err) => console.error('[WEBHOOK] Dispatch error:', err));

      // Additionally fire assessment.emergency for critical red flags
      if (triageLevel === 'EMERGENCY' || data.redFlags?.some(rf =>
        typeof rf !== 'string' && (rf as { severity?: string }).severity === 'critical'
      )) {
        const emergencyPayload = { ...webhookPayload, event: 'assessment.emergency' as const };
        dispatchWebhooks('assessment.emergency', emergencyPayload, assessment.id, patient.id)
          .catch((err) => console.error('[WEBHOOK] Emergency dispatch error:', err));
      }
    } catch (webhookErr) {
      // Never fail assessment submission due to webhook issues
      console.warn('[WEBHOOK] Failed to build/dispatch webhooks:', webhookErr);
    }

    // =========================================================================
    // Queue position
    // =========================================================================
    const pendingAhead = await prisma.patientAssessment.count({
      where: {
        status: 'COMPLETED',
        assignedProviderId: null,
        completedAt: { lt: assessment.completedAt! },
      },
    });

    const queuePosition = triageLevel === 'EMERGENCY' ? 1 : pendingAhead + 1;

    console.log(`[ASSESSMENT] ID: ${assessment.id}, Triage: ${triageLevel}, RedFlags: ${redFlagCount}, Queue: ${queuePosition}`);

    return res.status(201).json({
      success: true,
      assessmentId: assessment.id,
      queuePosition,
      estimatedReviewTime: triageLevel === 'EMERGENCY' ? 'Immediate' : hasRedFlags ? '30 minutes' : '2-4 hours',
      urgentAlert: hasRedFlags,
      message: hasRedFlags
        ? 'Your assessment has been flagged as urgent and will be reviewed immediately.'
        : 'Your assessment has been submitted. A provider will review it shortly.',
    });
  } catch (error) {
    console.error('[ASSESSMENT SUBMIT ERROR]', error);

    try {
      await prisma.auditLog.create({
        data: {
          action: 'ASSESSMENT_SUBMIT_FAILED',
          entityType: 'PatientAssessment',
          entityId: req.body?.sessionId || 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        },
      });
    } catch (_) { /* best effort */ }

    return res.status(500).json({
      error: 'Failed to submit assessment. Please try again.',
    });
  }
}
