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

  try {
    const data: SubmitPayload = req.body;

    // Validate
    if (!data.sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    if (!data.chiefComplaint) {
      return res.status(400).json({ error: 'Chief complaint is required' });
    }

    const redFlagCount = data.redFlags?.length || 0;
    const triageLevel = mapTriageLevel(data.urgencyLevel, redFlagCount);
    const hasRedFlags = redFlagCount > 0;

    // =========================================================================
    // Find or create patient
    // =========================================================================
    const patient = await prisma.patient.create({
      data: {
        mrn: `COMPASS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        firstName: data.patientName?.split(' ')[0] || 'Anonymous',
        lastName: data.patientName?.split(' ').slice(1).join(' ') || 'Patient',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date('1990-01-01'),
        gender: data.gender || null,
      },
    });

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
        changes: JSON.stringify({
          triageLevel,
          redFlagCount,
          urgencyScore: data.urgencyScore,
        }),
        success: true,
      },
    });

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
