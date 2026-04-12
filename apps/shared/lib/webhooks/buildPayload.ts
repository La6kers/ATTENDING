// =============================================================================
// COMPASS Webhook — Payload Builder
// apps/shared/lib/webhooks/buildPayload.ts
//
// Converts raw assessment data (from Prisma, store, or .NET backend)
// into the standardized AttendingAssessmentPayload for webhook delivery.
//
// This is called from the assessment submit handler AFTER successful
// persistence. The webhook delivery is fire-and-forget — it never
// blocks the patient's submission response.
// =============================================================================

import type { AttendingAssessmentPayload } from './types';

// =============================================================================
// Input shape — flexible enough to accept data from multiple sources
// =============================================================================

export interface AssessmentWebhookInput {
  // Assessment fields
  assessmentId: string;
  sessionId: string;
  status?: string;
  completedAt?: string;
  triageLevel: string;
  chiefComplaint: string;
  hpiNarrative?: string;
  hpi?: {
    onset?: string;
    location?: string;
    duration?: string;
    character?: string;
    severity?: number;
    timing?: string;
    aggravating?: string[];
    relieving?: string[];
    associated?: string[];
  };
  reviewOfSystems?: Record<string, string[]> | string;
  redFlags?: Array<{ symptom: string; severity: string; category?: string; detectedAt?: string }> | string[] | string;
  urgencyScore?: number;
  urgencyLevel?: string;

  // Patient fields
  patientId: string;
  patientMrn?: string;
  patientName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  medications?: string[] | string;
  allergies?: string[] | string;
  medicalHistory?: string[] | string;
  socialHistory?: Record<string, string> | string;
  familyHistory?: string[] | string;

  // Provider (optional — set when claimed/reviewed)
  providerId?: string;
  providerName?: string;
  providerNpi?: string;

  // Meta
  organizationId?: string;
  locationId?: string;
  source?: 'compass-standalone' | 'attending-full';
}

// =============================================================================
// Builder
// =============================================================================

/**
 * Build a standardized webhook payload from flexible input data.
 * Handles JSON strings (from Prisma columns) and typed arrays alike.
 */
export function buildWebhookPayload(input: AssessmentWebhookInput): AttendingAssessmentPayload {
  return {
    format: 'attending',
    version: '1.0',
    assessment: {
      id: input.assessmentId,
      sessionId: input.sessionId,
      status: input.status || 'COMPLETED',
      completedAt: input.completedAt || new Date().toISOString(),
      triageLevel: normalizeTriageLevel(input.triageLevel),
      chiefComplaint: input.chiefComplaint,
      hpiNarrative: input.hpiNarrative || '',
      hpiStructured: {
        onset: input.hpi?.onset,
        location: input.hpi?.location,
        duration: input.hpi?.duration,
        character: input.hpi?.character,
        severity: input.hpi?.severity,
        timing: input.hpi?.timing,
        aggravatingFactors: input.hpi?.aggravating,
        relievingFactors: input.hpi?.relieving,
        associatedSymptoms: input.hpi?.associated,
      },
      reviewOfSystems: parseJsonOrPassthrough(input.reviewOfSystems) as Record<string, string[]> | undefined,
      redFlags: normalizeRedFlags(input.redFlags, input.completedAt),
      urgencyScore: input.urgencyScore || 0,
      urgencyLevel: input.urgencyLevel || 'standard',
    },
    patient: {
      id: input.patientId,
      mrn: input.patientMrn || '',
      name: input.patientName || `${input.firstName || ''} ${input.lastName || ''}`.trim() || 'Unknown',
      firstName: input.firstName || input.patientName?.split(' ')[0] || 'Unknown',
      lastName: input.lastName || input.patientName?.split(' ').slice(1).join(' ') || 'Patient',
      dateOfBirth: input.dateOfBirth || '',
      gender: input.gender || 'Unknown',
      medications: parseStringArray(input.medications),
      allergies: parseStringArray(input.allergies, ['NKDA']),
      medicalHistory: parseStringArray(input.medicalHistory),
      socialHistory: parseJsonOrPassthrough(input.socialHistory) as Record<string, string> | undefined,
      familyHistory: parseStringArray(input.familyHistory),
    },
    provider: input.providerId
      ? {
          id: input.providerId,
          name: input.providerName || 'Unknown Provider',
          npi: input.providerNpi,
        }
      : undefined,
    meta: {
      compassVersion: '1.0.0',
      organizationId: input.organizationId,
      locationId: input.locationId,
      source: input.source || 'compass-standalone',
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

function normalizeTriageLevel(level: string): AttendingAssessmentPayload['assessment']['triageLevel'] {
  const upper = level.toUpperCase();
  if (upper === 'EMERGENCY') return 'EMERGENCY';
  if (upper === 'URGENT') return 'URGENT';
  if (upper === 'MODERATE') return 'MODERATE';
  return 'ROUTINE';
}

function normalizeRedFlags(
  input: AssessmentWebhookInput['redFlags'],
  completedAt?: string,
): AttendingAssessmentPayload['assessment']['redFlags'] {
  if (!input) return [];
  const now = completedAt || new Date().toISOString();

  // JSON string from Prisma
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return normalizeRedFlags(parsed, completedAt);
    } catch {
      return [{ symptom: input, severity: 'moderate', category: 'unknown', detectedAt: now }];
    }
  }

  // Array of strings (e.g., from useChatStore.redFlags.map(rf => rf.symptom))
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'string') {
    return (input as string[]).map((s) => ({
      symptom: s,
      severity: 'moderate' as const,
      category: 'unknown',
      detectedAt: now,
    }));
  }

  // Array of objects
  if (Array.isArray(input)) {
    return (input as Array<{ symptom: string; severity: string; category?: string; detectedAt?: string }>).map((rf) => ({
      symptom: rf.symptom,
      severity: (rf.severity as 'critical' | 'urgent' | 'moderate') || 'moderate',
      category: rf.category || 'unknown',
      detectedAt: rf.detectedAt || now,
    }));
  }

  return [];
}

function parseStringArray(input: string[] | string | undefined, fallback: string[] = []): string[] {
  if (!input) return fallback;
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return [input];
    }
  }
  return fallback;
}

function parseJsonOrPassthrough<T>(input: T | string | undefined): T | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as T;
    } catch {
      return undefined;
    }
  }
  return input;
}
