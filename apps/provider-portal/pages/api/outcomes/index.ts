// ============================================================
// Diagnostic Outcomes API — ML Feedback Loop Ingestion
// apps/provider-portal/pages/api/outcomes/index.ts
//
// Single dispatcher endpoint for the DiagnosticOutcome lifecycle.
// POST with action:
//   - "physician-diagnosis" — physician's documented impression
//   - "lab-results"         — lab order results + AI/physician support flags
//   - "imaging-results"     — imaging results + AI/physician support flags
//   - "finalize"            — final confirmed dx (computes aiAccuracyAssessment)
//   - "provider-feedback"   — thumbs up/down + comments
//
// GET ?requestId=... — retrieve the outcome row (for UI "why" drawer /
//                      outcomes dashboard)
//
// Each POST is keyed by requestId (returned from /api/diagnose).
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  recordPhysicianDiagnosis,
  attachLabResults,
  attachImagingResults,
  finalizeOutcome,
  recordProviderFeedback,
  getOutcome,
} from '@attending/shared/services/diagnosticOutcome.service';

// ============================================================
// Validation schemas
// ============================================================

const RequestIdSchema = z.string().min(1).max(100);

const PhysicianDiagnosisBody = z.object({
  action: z.literal('physician-diagnosis'),
  requestId: RequestIdSchema,
  diagnosis: z.string().min(1).max(300),
  icd10: z.string().max(20).optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  physicianId: z.string().max(100).optional(),
});

const LabResultEntry = z.object({
  name: z.string().max(200),
  loinc: z.string().max(20).optional(),
  value: z.string().max(200),
  interpretation: z.enum(['NORMAL', 'ABNORMAL', 'CRITICAL']).optional(),
  supportsDiagnosis: z.string().max(300).optional(),
});

const LabResultsBody = z.object({
  action: z.literal('lab-results'),
  requestId: RequestIdSchema,
  labOrders: z.array(z.object({
    name: z.string().max(200),
    loinc: z.string().max(20).optional(),
  })).max(50).optional(),
  labResults: z.array(LabResultEntry).max(50),
  supportsAIDiagnosis: z.boolean().nullable().optional(),
  supportsPhysicianDiagnosis: z.boolean().nullable().optional(),
});

const ImagingResultEntry = z.object({
  modality: z.string().max(50),
  region: z.string().max(100),
  findings: z.string().max(2000),
  impression: z.string().max(2000),
  supportsDiagnosis: z.string().max(300).optional(),
});

const ImagingResultsBody = z.object({
  action: z.literal('imaging-results'),
  requestId: RequestIdSchema,
  imagingOrders: z.array(z.object({
    modality: z.string().max(50),
    region: z.string().max(100),
    cptCode: z.string().max(20).optional(),
  })).max(20).optional(),
  imagingResults: z.array(ImagingResultEntry).max(20),
  supportsAIDiagnosis: z.boolean().nullable().optional(),
  supportsPhysicianDiagnosis: z.boolean().nullable().optional(),
});

const FinalizeBody = z.object({
  action: z.literal('finalize'),
  requestId: RequestIdSchema,
  finalDiagnosis: z.string().min(1).max(300),
  icd10: z.string().max(20).optional(),
  confirmedById: z.string().max(100).optional(),
});

const ProviderFeedbackBody = z.object({
  action: z.literal('provider-feedback'),
  requestId: RequestIdSchema,
  wasHelpful: z.boolean(),
  accuracyRating: z.number().int().min(1).max(5).optional(),
  comments: z.string().max(2000).optional(),
});

const RequestSchema = z.discriminatedUnion('action', [
  PhysicianDiagnosisBody,
  LabResultsBody,
  ImagingResultsBody,
  FinalizeBody,
  ProviderFeedbackBody,
]);

// ============================================================
// Handler
// ============================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const requestId = typeof req.query.requestId === 'string' ? req.query.requestId : '';
    if (!requestId) {
      return res.status(400).json({ error: 'requestId query param required' });
    }
    try {
      const outcome = await getOutcome(requestId);
      if (!outcome) return res.status(404).json({ error: 'Outcome not found' });
      return res.status(200).json({ outcome });
    } catch (err) {
      console.error('[Outcomes] GET failed:', err);
      return res.status(500).json({ error: 'Failed to retrieve outcome' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = RequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    });
  }

  const body = parseResult.data;

  try {
    switch (body.action) {
      case 'physician-diagnosis': {
        const outcome = await recordPhysicianDiagnosis({
          requestId: body.requestId,
          diagnosis: body.diagnosis,
          icd10: body.icd10,
          confidence: body.confidence,
          physicianId: body.physicianId,
        });
        return res.status(200).json({ success: true, outcome });
      }
      case 'lab-results': {
        const outcome = await attachLabResults({
          requestId: body.requestId,
          labOrders: body.labOrders,
          labResults: body.labResults,
          supportsAIDiagnosis: body.supportsAIDiagnosis ?? null,
          supportsPhysicianDiagnosis: body.supportsPhysicianDiagnosis ?? null,
        });
        return res.status(200).json({ success: true, outcome });
      }
      case 'imaging-results': {
        const outcome = await attachImagingResults({
          requestId: body.requestId,
          imagingOrders: body.imagingOrders,
          imagingResults: body.imagingResults,
          supportsAIDiagnosis: body.supportsAIDiagnosis ?? null,
          supportsPhysicianDiagnosis: body.supportsPhysicianDiagnosis ?? null,
        });
        return res.status(200).json({ success: true, outcome });
      }
      case 'finalize': {
        const outcome = await finalizeOutcome({
          requestId: body.requestId,
          finalDiagnosis: body.finalDiagnosis,
          icd10: body.icd10,
          confirmedById: body.confirmedById,
        });
        return res.status(200).json({
          success: true,
          outcome,
          aiAccuracyAssessment: outcome.aiAccuracyAssessment,
          aiTopKWasRight: outcome.aiTopKWasRight,
        });
      }
      case 'provider-feedback': {
        const outcome = await recordProviderFeedback({
          requestId: body.requestId,
          wasHelpful: body.wasHelpful,
          accuracyRating: body.accuracyRating,
          comments: body.comments,
        });
        return res.status(200).json({ success: true, outcome });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Outcomes] POST failed:', err);
    // Not-found on update translates to 404 so callers can retry with a valid requestId
    if (msg.includes('Record to update not found') || msg.includes('not found')) {
      return res.status(404).json({ error: 'DiagnosticOutcome not found for requestId — was /api/diagnose called first?' });
    }
    return res.status(500).json({ error: 'Failed to record outcome' });
  }
}
