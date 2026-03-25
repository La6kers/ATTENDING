// =============================================================================
// COMPASS Webhook Types
// apps/patient-portal/lib/webhooks/types.ts
//
// Shared type definitions for the webhook delivery system.
// =============================================================================

// ── Webhook Events ──────────────────────────────────────────
export type WebhookEvent =
  | 'assessment.completed'
  | 'assessment.emergency'
  | 'assessment.updated'
  | 'assessment.claimed';

// ── Webhook Payload (COMPASS JSON native format) ────────────
export interface CompassWebhookPayload {
  // Envelope
  event: WebhookEvent;
  version: '1.0';
  timestamp: string;
  compassId: string;
  webhookId?: string;

  // Patient Demographics
  patient: {
    name: string;
    dateOfBirth?: string;
    gender?: string;
    mrn?: string;
    phone?: string;
  };

  // Assessment Intelligence
  assessment: {
    sessionId: string;
    chiefComplaint: string;
    hpiNarrative?: string;
    hpi: {
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
    reviewOfSystems?: Record<string, string[]>;
    medications?: string[];
    allergies?: string[];
    medicalHistory?: string[];
    socialHistory?: Record<string, string>;
    familyHistory?: string[];
  };

  // Clinical Intelligence
  triage: {
    level: 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE';
    score: number;
    redFlags: Array<{
      symptom: string;
      severity: 'critical' | 'urgent' | 'warning';
      category: string;
      detectedFrom?: string;
    }>;
    reasoning?: string;
  };

  // Metadata
  metadata: {
    completedAt: string;
    durationMinutes?: number;
    assessmentVersion: string;
    offlineSubmission: boolean;
    compassVersion: string;
  };
}

// ── Delivery Result ─────────────────────────────────────────
export interface DeliveryResult {
  webhookId: string;
  deliveryId: string;
  status: 'success' | 'failed';
  httpStatus?: number;
  latencyMs: number;
  error?: string;
}

// ── Format Output ───────────────────────────────────────────
export interface FormattedPayload {
  body: string;
  contentType: string;
}
