// ============================================================
// DiagnosticOutcome Service
// apps/shared/services/diagnosticOutcome.service.ts
//
// End-to-end ML feedback loop for the COMPASS diagnostic engine.
//
// Responsibilities:
//   1. Record    — called by /api/diagnose on every response
//   2. Annotate  — physician documents initial impression
//   3. Attach    — labs + imaging results come in from orders
//   4. Finalize  — encounter close sets confirmed dx, computes accuracy
//   5. Export    — ML-ready dump of confirmed rows for offline training
//   6. Analyze   — miss-report aggregation for iteration loop
//
// HIPAA: all queries are organizationId-scoped (multi-tenant middleware
// enforces this). Soft-delete respected. No cross-tenant reads.
// ============================================================

import { prisma, type DbDiagnosticOutcome } from '../lib/prisma';

// ============================================================
// Types
// ============================================================

export interface RecordAIOutputInput {
  organizationId: string;
  requestId: string;
  assessmentId?: string;
  encounterId?: string;
  patientId?: string;
  chiefComplaint: string;
  age?: number;
  gender?: string;
  hpi?: unknown;
  redFlags?: string[];
  /** Top-N differentials (ranked) from the AI */
  aiDifferentials: Array<{ diagnosis: string; confidence: number; icd10?: string }>;
  aiProvider: string;
  matchProvenance?: unknown;
  latencyMs?: number;
}

export interface PhysicianDiagnosisInput {
  requestId: string;
  diagnosis: string;
  icd10?: string;
  confidence?: number; // 1-5
  physicianId?: string;
}

export interface LabResultsInput {
  requestId: string;
  labOrders?: Array<{ name: string; loinc?: string }>;
  labResults: Array<{ name: string; loinc?: string; value: string; interpretation?: 'NORMAL' | 'ABNORMAL' | 'CRITICAL'; supportsDiagnosis?: string }>;
  supportsAIDiagnosis?: boolean | null;
  supportsPhysicianDiagnosis?: boolean | null;
}

export interface ImagingResultsInput {
  requestId: string;
  imagingOrders?: Array<{ modality: string; region: string; cptCode?: string }>;
  imagingResults: Array<{ modality: string; region: string; findings: string; impression: string; supportsDiagnosis?: string }>;
  supportsAIDiagnosis?: boolean | null;
  supportsPhysicianDiagnosis?: boolean | null;
}

export interface FinalizeInput {
  requestId: string;
  finalDiagnosis: string;
  icd10?: string;
  confirmedById?: string;
}

export interface ProviderFeedbackInput {
  requestId: string;
  wasHelpful: boolean;
  accuracyRating?: number; // 1-5
  comments?: string;
}

export type AIAccuracyAssessment = 'CONFIRMED' | 'PARTIAL' | 'REFUTED' | 'PENDING';

// ============================================================
// Helpers
// ============================================================

/**
 * Fuzzy diagnosis matching — the final confirmed dx from the chart
 * often uses a different wording than the AI's canonical phrasing.
 * E.g. AI says "Acute Myocardial Infarction", chart says "STEMI".
 *
 * Match rules (case-insensitive):
 *   - Exact match
 *   - One contains the other (substring)
 *   - First-word match for conditions where the short form is unambiguous
 *   - ICD-10 code match if both are present
 *
 * Returns true if the confirmed dx matches any of the AI's top-N slice.
 */
export function confirmedDxMatchesDifferential(
  confirmed: string,
  confirmedIcd10: string | undefined,
  differentials: Array<{ diagnosis: string; icd10?: string }>
): boolean {
  const conf = confirmed.toLowerCase().trim();
  const confFirst = conf.split(/\s+/)[0].replace(/[^a-z0-9]/g, '');

  for (const d of differentials) {
    const dx = d.diagnosis.toLowerCase().trim();
    if (dx === conf) return true;
    if (dx.includes(conf) || conf.includes(dx)) return true;
    const dxFirst = dx.split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
    if (dxFirst && dxFirst === confFirst && confFirst.length >= 4) return true;
    if (confirmedIcd10 && d.icd10 && confirmedIcd10 === d.icd10) return true;
  }
  return false;
}

/**
 * Compute (assessment, topKWasRight) from a confirmed final dx against the
 * originally-returned ranked differentials. Used when an outcome is finalized.
 */
export function computeAccuracyAssessment(
  confirmed: string,
  confirmedIcd10: string | undefined,
  differentials: Array<{ diagnosis: string; icd10?: string }>
): { assessment: AIAccuracyAssessment; topKWasRight: number } {
  if (!confirmed) return { assessment: 'PENDING', topKWasRight: 0 };

  const top1 = differentials.slice(0, 1);
  const top3 = differentials.slice(0, 3);
  const top5 = differentials.slice(0, 5);

  if (confirmedDxMatchesDifferential(confirmed, confirmedIcd10, top1)) {
    return { assessment: 'CONFIRMED', topKWasRight: 1 };
  }
  if (confirmedDxMatchesDifferential(confirmed, confirmedIcd10, top3)) {
    return { assessment: 'PARTIAL', topKWasRight: 3 };
  }
  if (confirmedDxMatchesDifferential(confirmed, confirmedIcd10, top5)) {
    return { assessment: 'PARTIAL', topKWasRight: 5 };
  }
  return { assessment: 'REFUTED', topKWasRight: 0 };
}

function parseDifferentials(json: string | null | undefined): Array<{ diagnosis: string; icd10?: string }> {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d: { diagnosis?: string; icd10?: string }) => ({
      diagnosis: String(d.diagnosis || ''),
      icd10: d.icd10 ? String(d.icd10) : undefined,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Stage 1: Record AI output
// ============================================================

/**
 * Called from /api/diagnose immediately after the Bayesian engine returns.
 * Fails softly (logs + swallows) so persistence bugs never break the
 * clinical response to the user.
 */
export async function recordAIOutput(input: RecordAIOutputInput): Promise<DbDiagnosticOutcome | null> {
  try {
    return await prisma.diagnosticOutcome.create({
      data: {
        organizationId: input.organizationId,
        requestId: input.requestId,
        assessmentId: input.assessmentId,
        encounterId: input.encounterId,
        patientId: input.patientId,
        chiefComplaint: input.chiefComplaint,
        age: input.age,
        gender: input.gender,
        hpiJson: input.hpi ? JSON.stringify(input.hpi) : undefined,
        redFlagsJson: input.redFlags ? JSON.stringify(input.redFlags) : undefined,
        aiDifferentialJson: JSON.stringify(input.aiDifferentials),
        aiPrimaryDiagnosis: input.aiDifferentials[0]?.diagnosis,
        aiProvider: input.aiProvider,
        matchProvenanceJson: input.matchProvenance ? JSON.stringify(input.matchProvenance) : undefined,
        latencyMs: input.latencyMs,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[DiagnosticOutcome] recordAIOutput failed — persistence bypassed', {
      requestId: input.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ============================================================
// Stage 2: Physician documented diagnosis
// ============================================================

export async function recordPhysicianDiagnosis(input: PhysicianDiagnosisInput): Promise<DbDiagnosticOutcome> {
  return prisma.diagnosticOutcome.update({
    where: { requestId: input.requestId },
    data: {
      physicianDiagnosis: input.diagnosis,
      physicianDiagnosisIcd10: input.icd10,
      physicianConfidence: input.confidence,
      physicianDiagnosedById: input.physicianId,
      physicianDiagnosisAt: new Date(),
    },
  });
}

// ============================================================
// Stage 3: Lab results attached
// ============================================================

export async function attachLabResults(input: LabResultsInput): Promise<DbDiagnosticOutcome> {
  return prisma.diagnosticOutcome.update({
    where: { requestId: input.requestId },
    data: {
      labOrdersJson: input.labOrders ? JSON.stringify(input.labOrders) : undefined,
      labResultsJson: JSON.stringify(input.labResults),
      labSupportsAIDiagnosis: input.supportsAIDiagnosis,
      labSupportsPhysicianDx: input.supportsPhysicianDiagnosis,
      labResultsAt: new Date(),
    },
  });
}

// ============================================================
// Stage 4: Imaging results attached
// ============================================================

export async function attachImagingResults(input: ImagingResultsInput): Promise<DbDiagnosticOutcome> {
  return prisma.diagnosticOutcome.update({
    where: { requestId: input.requestId },
    data: {
      imagingOrdersJson: input.imagingOrders ? JSON.stringify(input.imagingOrders) : undefined,
      imagingResultsJson: JSON.stringify(input.imagingResults),
      imagingSupportsAIDiagnosis: input.supportsAIDiagnosis,
      imagingSupportsPhysicianDx: input.supportsPhysicianDiagnosis,
      imagingResultsAt: new Date(),
    },
  });
}

// ============================================================
// Stage 5: Finalize — close the loop
// ============================================================

export async function finalizeOutcome(input: FinalizeInput): Promise<DbDiagnosticOutcome> {
  // Fetch the existing row to access the stored differentials for accuracy scoring
  const row = await prisma.diagnosticOutcome.findUnique({
    where: { requestId: input.requestId },
    select: { aiDifferentialJson: true },
  });
  if (!row) throw new Error(`DiagnosticOutcome not found for requestId=${input.requestId}`);

  const differentials = parseDifferentials(row.aiDifferentialJson);
  const { assessment, topKWasRight } = computeAccuracyAssessment(
    input.finalDiagnosis,
    input.icd10,
    differentials
  );

  return prisma.diagnosticOutcome.update({
    where: { requestId: input.requestId },
    data: {
      finalConfirmedDiagnosis: input.finalDiagnosis,
      finalConfirmedIcd10: input.icd10,
      finalConfirmedById: input.confirmedById,
      finalConfirmedAt: new Date(),
      aiAccuracyAssessment: assessment,
      aiTopKWasRight: topKWasRight,
    },
  });
}

// ============================================================
// Optional: provider feedback (thumbs + comments)
// ============================================================

export async function recordProviderFeedback(input: ProviderFeedbackInput): Promise<DbDiagnosticOutcome> {
  return prisma.diagnosticOutcome.update({
    where: { requestId: input.requestId },
    data: {
      providerFoundHelpful: input.wasHelpful,
      providerAccuracyRating: input.accuracyRating,
      providerComments: input.comments,
      providerFeedbackAt: new Date(),
    },
  });
}

// ============================================================
// Read helpers
// ============================================================

export async function getOutcome(requestId: string): Promise<DbDiagnosticOutcome | null> {
  return prisma.diagnosticOutcome.findUnique({ where: { requestId } });
}

/**
 * List recent outcomes for the ML dashboard — most recent first.
 * Tenant-scoped; respects soft-delete; caps at 100 by default.
 */
export async function listRecentOutcomes(
  organizationId: string,
  limit: number = 50,
  assessmentFilter?: AIAccuracyAssessment
): Promise<DbDiagnosticOutcome[]> {
  return prisma.diagnosticOutcome.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(assessmentFilter ? { aiAccuracyAssessment: assessmentFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

/**
 * Per-clinic summary for the ML dashboard clinic panel.
 * Groups by a clinic identifier available on the row (patientId → clinic
 * join would require additional queries; for now we use assessmentId via
 * PatientAssessment.organizationId — callers should join at the Prisma
 * level if a finer clinic-level grouping is needed).
 */
export interface OutcomeClinicSummary {
  organizationId: string;
  totalConfirmed: number;
  top3Rate: number;
  pendingConfirmations: number;
}

export async function getClinicOutcomeSummary(
  organizationId: string
): Promise<OutcomeClinicSummary> {
  const rows = await prisma.diagnosticOutcome.findMany({
    where: { organizationId, deletedAt: null },
    select: { aiAccuracyAssessment: true, aiTopKWasRight: true, finalConfirmedDiagnosis: true },
  });
  const total = rows.length;
  const confirmed = rows.filter(r => r.finalConfirmedDiagnosis != null);
  const top3 = confirmed.filter(r => (r.aiTopKWasRight || 0) > 0 && (r.aiTopKWasRight || 0) <= 3).length;
  return {
    organizationId,
    totalConfirmed: confirmed.length,
    top3Rate: confirmed.length === 0 ? 0 : parseFloat(((top3 / confirmed.length) * 100).toFixed(1)),
    pendingConfirmations: total - confirmed.length,
  };
}

// ============================================================
// Analytics / ML export
// ============================================================

export interface MissAnalysisRow {
  chiefComplaintCategory: string;
  confirmedDiagnosis: string;
  missCount: number;
  totalForCategory: number;
  exampleRequestIds: string[];
}

/**
 * Aggregate misses over a time window. Used by the weekly cron that
 * produces docs/pilot-miss-reports/YYYY-MM-DD.md.
 *
 * A "miss" is any row with aiAccuracyAssessment === 'REFUTED' within the window.
 */
export async function getMissAnalysis(
  organizationId: string,
  since: Date,
  until: Date = new Date()
): Promise<MissAnalysisRow[]> {
  const rows = await prisma.diagnosticOutcome.findMany({
    where: {
      organizationId,
      finalConfirmedAt: { gte: since, lte: until },
      aiAccuracyAssessment: 'REFUTED',
      deletedAt: null,
    },
    select: {
      requestId: true,
      chiefComplaint: true,
      finalConfirmedDiagnosis: true,
    },
  });

  // Group by (ccCategory, confirmedDx)
  const grouped = new Map<string, { cc: string; dx: string; ids: string[] }>();
  const totalByCC = new Map<string, number>();

  const categorize = (cc: string): string => {
    const c = cc.toLowerCase();
    if (/chest|cardiac|heart/.test(c)) return 'chest_pain';
    if (/head|migraine/.test(c)) return 'headache';
    if (/abdom|belly|stomach/.test(c)) return 'abdominal_pain';
    if (/back|lumbar|spine/.test(c)) return 'back_pain';
    if (/knee|ankle|shoulder|hip|joint|musculo/.test(c)) return 'musculoskeletal';
    if (/breath|dyspnea|cough|respir/.test(c)) return 'respiratory';
    if (/urin|bladder|dysuria/.test(c)) return 'urinary';
    if (/skin|rash|lesion/.test(c)) return 'dermatologic';
    if (/fever|infect/.test(c)) return 'infectious';
    return 'other';
  };

  for (const r of rows) {
    const cat = categorize(r.chiefComplaint);
    totalByCC.set(cat, (totalByCC.get(cat) || 0) + 1);
    const key = `${cat}::${r.finalConfirmedDiagnosis}`;
    const g = grouped.get(key) || { cc: cat, dx: r.finalConfirmedDiagnosis ?? '', ids: [] };
    g.ids.push(r.requestId);
    grouped.set(key, g);
  }

  return Array.from(grouped.values())
    .map(g => ({
      chiefComplaintCategory: g.cc,
      confirmedDiagnosis: g.dx,
      missCount: g.ids.length,
      totalForCategory: totalByCC.get(g.cc) || 0,
      exampleRequestIds: g.ids.slice(0, 5),
    }))
    .sort((a, b) => b.missCount - a.missCount);
}

export interface TrainingExampleRow {
  requestId: string;
  chiefComplaint: string;
  age: number | null;
  gender: string | null;
  hpi: unknown;
  redFlags: unknown;
  aiDifferentials: Array<{ diagnosis: string; icd10?: string; confidence: number }>;
  matchProvenance: unknown;
  physicianDiagnosis: string | null;
  physicianDiagnosisIcd10: string | null;
  labSupportsAIDiagnosis: boolean | null;
  imagingSupportsAIDiagnosis: boolean | null;
  finalConfirmedDiagnosis: string;
  finalConfirmedIcd10: string | null;
  aiAccuracyAssessment: string;
  aiTopKWasRight: number | null;
  confirmedAt: Date;
}

/**
 * Export confirmed outcomes as ML-ready rows. Designed to be dumped to
 * JSON Lines for offline model training without DB access.
 *
 * Only returns rows where finalConfirmedDiagnosis is set — no PENDING rows.
 */
export async function exportTrainingData(
  organizationId: string,
  since?: Date,
  markAsExported: boolean = true
): Promise<{ batchId: string; rows: TrainingExampleRow[] }> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const rows = await prisma.diagnosticOutcome.findMany({
    where: {
      organizationId,
      finalConfirmedDiagnosis: { not: null },
      deletedAt: null,
      ...(since ? { finalConfirmedAt: { gte: since } } : {}),
    },
    orderBy: { finalConfirmedAt: 'asc' },
  });

  const examples: TrainingExampleRow[] = rows.map(r => ({
    requestId: r.requestId,
    chiefComplaint: r.chiefComplaint,
    age: r.age,
    gender: r.gender,
    hpi: r.hpiJson ? JSON.parse(r.hpiJson) : null,
    redFlags: r.redFlagsJson ? JSON.parse(r.redFlagsJson) : null,
    aiDifferentials: r.aiDifferentialJson ? JSON.parse(r.aiDifferentialJson) : [],
    matchProvenance: r.matchProvenanceJson ? JSON.parse(r.matchProvenanceJson) : null,
    physicianDiagnosis: r.physicianDiagnosis,
    physicianDiagnosisIcd10: r.physicianDiagnosisIcd10,
    labSupportsAIDiagnosis: r.labSupportsAIDiagnosis,
    imagingSupportsAIDiagnosis: r.imagingSupportsAIDiagnosis,
    finalConfirmedDiagnosis: r.finalConfirmedDiagnosis as string,
    finalConfirmedIcd10: r.finalConfirmedIcd10,
    aiAccuracyAssessment: r.aiAccuracyAssessment,
    aiTopKWasRight: r.aiTopKWasRight,
    confirmedAt: r.finalConfirmedAt as Date,
  }));

  if (markAsExported && rows.length > 0) {
    await prisma.diagnosticOutcome.updateMany({
      where: { id: { in: rows.map(r => r.id) } },
      data: { mlExportedAt: new Date(), mlBatchId: batchId },
    });
  }

  return { batchId, rows: examples };
}

/**
 * Summary metrics across all confirmed outcomes — powers the
 * compass-admin dashboard "real-world accuracy" card.
 */
export async function getAccuracyMetrics(
  organizationId: string,
  since?: Date
): Promise<{
  totalConfirmed: number;
  top1Hits: number;
  top3Hits: number;
  top5Hits: number;
  misses: number;
  top1Rate: number;
  top3Rate: number;
  top5Rate: number;
}> {
  const rows = await prisma.diagnosticOutcome.findMany({
    where: {
      organizationId,
      finalConfirmedDiagnosis: { not: null },
      deletedAt: null,
      ...(since ? { finalConfirmedAt: { gte: since } } : {}),
    },
    select: { aiTopKWasRight: true },
  });

  const total = rows.length;
  const top1 = rows.filter(r => r.aiTopKWasRight === 1).length;
  const top3 = rows.filter(r => (r.aiTopKWasRight || 0) > 0 && (r.aiTopKWasRight || 0) <= 3).length;
  const top5 = rows.filter(r => (r.aiTopKWasRight || 0) > 0 && (r.aiTopKWasRight || 0) <= 5).length;
  const misses = rows.filter(r => (r.aiTopKWasRight || 0) === 0).length;

  const pct = (n: number) => total === 0 ? 0 : parseFloat(((n / total) * 100).toFixed(1));

  return {
    totalConfirmed: total,
    top1Hits: top1,
    top3Hits: top3,
    top5Hits: top5,
    misses,
    top1Rate: pct(top1),
    top3Rate: pct(top3),
    top5Rate: pct(top5),
  };
}
