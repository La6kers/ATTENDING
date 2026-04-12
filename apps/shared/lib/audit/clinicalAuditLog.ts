// ============================================================
// ATTENDING AI — Clinical Audit Logger
// apps/shared/lib/audit/clinicalAuditLog.ts
//
// HIPAA 164.312(b) — Audit controls for PHI access.
// Logs every clinical AI invocation with metadata (no raw PHI).
// In production, writes to the AuditLog database table.
// Pre-pilot: logs to structured console output for Seq/App Insights.
// ============================================================

export interface ClinicalAuditEntry {
  /** Unique request identifier for tracing */
  requestId: string;
  /** Type of clinical operation */
  action: 'differential_diagnosis' | 'image_analysis' | 'clinical_extraction' | 'drug_interaction';
  /** AI provider used (azure-openai, local, anthropic, etc.) */
  provider: string;
  /** Timestamp */
  timestamp: string;
  /** Client IP (hashed for privacy) */
  clientIpHash: string;
  /** Chief complaint category (not raw text) */
  chiefComplaintCategory?: string;
  /** Number of symptoms submitted */
  symptomCount?: number;
  /** Number of red flags detected */
  redFlagCount?: number;
  /** Number of differentials generated */
  differentialCount?: number;
  /** Whether AI was invoked (vs local-only) */
  aiInvoked: boolean;
  /** Response time in ms */
  latencyMs: number;
  /** Whether the request succeeded */
  success: boolean;
  /** Error message if failed (no PHI) */
  errorMessage?: string;
  /** MRN hash (not raw MRN) for correlation */
  mrnHash?: string;
}

/**
 * Hash a value for audit logging (one-way, no PHI stored).
 * Uses a simple FNV-1a hash — not cryptographic, just for correlation.
 */
function hashForAudit(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Categorize a chief complaint into a non-PHI category.
 */
function categorizeComplaint(complaint: string): string {
  const cc = complaint.toLowerCase();
  if (/chest|cardiac|heart/.test(cc)) return 'chest_pain';
  if (/head|migraine|cephalgia/.test(cc)) return 'headache';
  if (/abdomen|stomach|belly/.test(cc)) return 'abdominal_pain';
  if (/back|lumbar|spine/.test(cc)) return 'back_pain';
  if (/knee|shoulder|ankle|joint|hip/.test(cc)) return 'musculoskeletal';
  if (/breath|dyspnea|respiratory|cough/.test(cc)) return 'respiratory';
  if (/throat|pharyngitis/.test(cc)) return 'throat';
  if (/urin|bladder|dysuria/.test(cc)) return 'urinary';
  if (/depress|anxiety|mental/.test(cc)) return 'mental_health';
  if (/skin|rash|lesion/.test(cc)) return 'dermatologic';
  if (/fever|infection/.test(cc)) return 'infectious';
  return 'other';
}

/**
 * Log a clinical AI invocation for HIPAA audit compliance.
 * No raw PHI is logged — only hashed identifiers and categories.
 */
export function logClinicalAudit(entry: ClinicalAuditEntry): void {
  // Structured log output — ingested by Seq / Application Insights / CloudWatch
  const logEntry = {
    '@t': entry.timestamp,
    '@mt': `Clinical AI audit: {Action} via {Provider} — {DifferentialCount} differentials in {LatencyMs}ms`,
    '@l': entry.success ? 'Information' : 'Warning',
    ...entry,
  };

  // In production: write to AuditLog table via Prisma
  // await prisma.auditLog.create({ data: { ... } });
  // For now: structured console output
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
}

/**
 * Create an audit entry from a diagnose API request.
 */
export function createDiagnoseAuditEntry(params: {
  requestId: string;
  clientIp: string;
  chiefComplaint: string;
  mrn?: string;
  symptomCount: number;
  redFlagCount: number;
  differentialCount: number;
  provider: string;
  aiInvoked: boolean;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}): ClinicalAuditEntry {
  return {
    requestId: params.requestId,
    action: 'differential_diagnosis',
    provider: params.provider,
    timestamp: new Date().toISOString(),
    clientIpHash: hashForAudit(params.clientIp),
    chiefComplaintCategory: categorizeComplaint(params.chiefComplaint),
    symptomCount: params.symptomCount,
    redFlagCount: params.redFlagCount,
    differentialCount: params.differentialCount,
    aiInvoked: params.aiInvoked,
    latencyMs: params.latencyMs,
    success: params.success,
    errorMessage: params.errorMessage,
    mrnHash: params.mrn ? hashForAudit(params.mrn) : undefined,
  };
}

/**
 * Create an audit entry from an image analysis request.
 */
export function createImageAuditEntry(params: {
  requestId: string;
  clientIp: string;
  bodyRegion?: string;
  provider: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}): ClinicalAuditEntry {
  return {
    requestId: params.requestId,
    action: 'image_analysis',
    provider: params.provider,
    timestamp: new Date().toISOString(),
    clientIpHash: hashForAudit(params.clientIp),
    chiefComplaintCategory: params.bodyRegion || 'unknown',
    aiInvoked: true,
    latencyMs: params.latencyMs,
    success: params.success,
    errorMessage: params.errorMessage,
  };
}
