// ============================================================
// ATTENDING AI - AI Decision Audit Trail Service
// apps/shared/lib/auditTrail.ts
//
// Tracks AI suggestions vs provider decisions for:
//   - HIPAA compliance (immutable decision audit trail)
//   - Quality improvement (AI accuracy over time)
//   - Provider behavior analytics (acceptance/rejection patterns)
//   - Cost optimization (which AI calls drive value)
//
// IMPORTANT: This service stores NO PHI. Only clinical pattern
// metadata (diagnosis names, ICD codes, confidence scores) which
// are not patient-identifiable on their own.
//
// Architecture:
//   Real-time: In-memory buffer → fast writes during encounters
//   Durable:   Redis backup + periodic DB flush → audit trail
//   Analytics: Aggregated stats by provider, period, category
//
// Usage:
//   import { auditTrail } from '@attending/shared/lib/auditTrail';
//   auditTrail.log({ ... });
//   await auditTrail.flush();
//   const stats = await auditTrail.getProviderAccuracyStats(providerId, '2026-03');
// ============================================================

import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export type AuditEventType =
  | 'ai.diagnosis_suggested'
  | 'ai.diagnosis_selected'
  | 'ai.diagnosis_rejected'
  | 'ai.treatment_suggested'
  | 'ai.treatment_selected'
  | 'ai.treatment_rejected'
  | 'ai.ambient_term_detected'
  | 'ai.ambient_probability_update'
  | 'ai.batch_interval_changed'
  | 'ai.batch_auto_shifted'
  | 'ai.scribe_note_generated'
  | 'ai.scribe_note_edited'
  | 'ai.consent_obtained'
  | 'ai.consent_declined';

export interface AuditEntry {
  id: string;
  timestamp: string;
  organizationId: string;
  providerId: string;
  encounterId: string;
  eventType: AuditEventType;
  // NO PHI - only clinical pattern metadata
  metadata: {
    diagnosisName?: string;       // e.g., "Migraine with Aura" (not PHI)
    icdCode?: string;
    aiConfidence?: number;
    providerAction?: 'accepted' | 'rejected' | 'modified';
    modelUsed?: string;
    modelVersion?: string;
    source?: 'local' | 'cache' | 'model';
    batchInterval?: number;
    reason?: string;
    costIncurred?: number;
  };
}

export interface ProviderAccuracyStats {
  providerId: string;
  period: string;
  totalSuggestions: number;
  accepted: number;
  rejected: number;
  modified: number;
  acceptanceRate: number;
  topAcceptedDiagnoses: Array<{ diagnosisName: string; count: number }>;
  topRejectedDiagnoses: Array<{ diagnosisName: string; count: number }>;
  averageAIConfidenceWhenAccepted: number;
  averageAIConfidenceWhenRejected: number;
}

export interface AIPerformanceReport {
  period: string;
  overallAcceptanceRate: number;
  acceptanceByComplaintCategory: Record<string, { total: number; accepted: number; rate: number }>;
  averageConfidenceScore: number;
  costPerAcceptedDiagnosis: number;
  localVsCacheVsModelBreakdown: {
    local: { count: number; acceptanceRate: number };
    cache: { count: number; acceptanceRate: number };
    model: { count: number; acceptanceRate: number };
  };
}

// ============================================================
// COMPLAINT CATEGORY MAPPING
// ============================================================

const COMPLAINT_CATEGORIES: Record<string, string> = {
  'migraine': 'headache',
  'tension headache': 'headache',
  'cluster headache': 'headache',
  'migraine with aura': 'headache',
  'chest pain': 'chest pain',
  'angina': 'chest pain',
  'myocardial infarction': 'chest pain',
  'acute coronary syndrome': 'chest pain',
  'pneumonia': 'respiratory',
  'bronchitis': 'respiratory',
  'asthma': 'respiratory',
  'copd': 'respiratory',
  'upper respiratory infection': 'respiratory',
  'hypertension': 'cardiovascular',
  'heart failure': 'cardiovascular',
  'atrial fibrillation': 'cardiovascular',
  'diabetes mellitus': 'endocrine',
  'hypothyroidism': 'endocrine',
  'hyperthyroidism': 'endocrine',
  'urinary tract infection': 'genitourinary',
  'kidney stone': 'genitourinary',
  'abdominal pain': 'gastrointestinal',
  'gastroenteritis': 'gastrointestinal',
  'gerd': 'gastrointestinal',
  'appendicitis': 'gastrointestinal',
  'low back pain': 'musculoskeletal',
  'osteoarthritis': 'musculoskeletal',
  'fracture': 'musculoskeletal',
  'sprain': 'musculoskeletal',
  'depression': 'mental health',
  'anxiety': 'mental health',
  'bipolar disorder': 'mental health',
};

function getComplaintCategory(diagnosisName?: string): string {
  if (!diagnosisName) return 'unknown';
  const lower = diagnosisName.toLowerCase();
  for (const [pattern, category] of Object.entries(COMPLAINT_CATEGORIES)) {
    if (lower.includes(pattern)) return category;
  }
  return 'other';
}

// ============================================================
// AUDIT TRAIL SERVICE
// ============================================================

class AuditTrailService {
  private buffer: AuditEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_BUFFER_SIZE = 500;

  // ----------------------------------------------------------
  // LOG - Buffer an audit entry
  // ----------------------------------------------------------

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.buffer.push(fullEntry);

    logger.debug('Audit entry logged', {
      eventType: fullEntry.eventType,
      encounterId: fullEntry.encounterId,
    });

    // Also push to Redis for durability
    this.pushToRedis(fullEntry).catch(() => {});

    // Auto-flush if buffer is large
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush().catch(() => {});
    }
  }

  // ----------------------------------------------------------
  // FLUSH - Write buffered entries to database
  // ----------------------------------------------------------

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const { prisma } = await import('./prisma');
      if (prisma.auditEntry) {
        await prisma.auditEntry.createMany({
          data: entries.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            organizationId: e.organizationId,
            providerId: e.providerId,
            encounterId: e.encounterId,
            eventType: e.eventType,
            metadata: e.metadata as any,
          })),
          skipDuplicates: true,
        }).catch(() => {});
      }

      logger.info('Audit trail flushed', { count: entries.length });
    } catch {
      // Re-buffer on failure
      this.buffer = [...entries, ...this.buffer];
      logger.warn('Audit trail flush failed, re-buffered', { count: entries.length });
    }
  }

  // ----------------------------------------------------------
  // GET ENCOUNTER AUDIT - Retrieve full trail for an encounter
  // ----------------------------------------------------------

  async getEncounterAudit(encounterId: string): Promise<AuditEntry[]> {
    // Check buffer first
    const buffered = this.buffer.filter((e) => e.encounterId === encounterId);

    // Then check Redis
    const fromRedis = await this.getFromRedis(encounterId);

    // Then check database
    let fromDb: AuditEntry[] = [];
    try {
      const { prisma } = await import('./prisma');
      if (prisma.auditEntry) {
        const rows = await prisma.auditEntry.findMany({
          where: { encounterId },
          orderBy: { timestamp: 'asc' },
        });
        fromDb = rows.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp,
          organizationId: r.organizationId,
          providerId: r.providerId,
          encounterId: r.encounterId,
          eventType: r.eventType as AuditEventType,
          metadata: r.metadata || {},
        }));
      }
    } catch { /* DB not available */ }

    // Merge and deduplicate by id
    const allEntries = [...fromDb, ...fromRedis, ...buffered];
    const seen = new Set<string>();
    const deduped: AuditEntry[] = [];
    for (const entry of allEntries) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        deduped.push(entry);
      }
    }

    return deduped.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // ----------------------------------------------------------
  // PROVIDER ACCURACY STATS
  // ----------------------------------------------------------

  async getProviderAccuracyStats(
    providerId: string,
    period: string
  ): Promise<ProviderAccuracyStats> {
    const entries = await this.getEntriesForProviderAndPeriod(providerId, period);

    // Filter to diagnosis suggestion events
    const suggestions = entries.filter(
      (e) => e.eventType === 'ai.diagnosis_suggested'
    );
    const decisions = entries.filter(
      (e) =>
        e.eventType === 'ai.diagnosis_selected' ||
        e.eventType === 'ai.diagnosis_rejected'
    );

    let accepted = 0;
    let rejected = 0;
    let modified = 0;
    const acceptedDiagnoses = new Map<string, number>();
    const rejectedDiagnoses = new Map<string, number>();
    const confidencesAccepted: number[] = [];
    const confidencesRejected: number[] = [];

    for (const entry of decisions) {
      const action = entry.metadata.providerAction;
      const diagName = entry.metadata.diagnosisName || 'Unknown';
      const confidence = entry.metadata.aiConfidence;

      if (action === 'accepted' || entry.eventType === 'ai.diagnosis_selected') {
        accepted++;
        acceptedDiagnoses.set(diagName, (acceptedDiagnoses.get(diagName) || 0) + 1);
        if (confidence !== undefined) confidencesAccepted.push(confidence);
      } else if (action === 'rejected' || entry.eventType === 'ai.diagnosis_rejected') {
        rejected++;
        rejectedDiagnoses.set(diagName, (rejectedDiagnoses.get(diagName) || 0) + 1);
        if (confidence !== undefined) confidencesRejected.push(confidence);
      } else if (action === 'modified') {
        modified++;
        if (confidence !== undefined) confidencesAccepted.push(confidence);
      }
    }

    const totalSuggestions = Math.max(suggestions.length, accepted + rejected + modified);
    const acceptanceRate = totalSuggestions > 0
      ? Math.round(((accepted + modified) / totalSuggestions) * 10000) / 100
      : 0;

    const avgConfAccepted = confidencesAccepted.length > 0
      ? Math.round((confidencesAccepted.reduce((a, b) => a + b, 0) / confidencesAccepted.length) * 100) / 100
      : 0;

    const avgConfRejected = confidencesRejected.length > 0
      ? Math.round((confidencesRejected.reduce((a, b) => a + b, 0) / confidencesRejected.length) * 100) / 100
      : 0;

    return {
      providerId,
      period,
      totalSuggestions,
      accepted,
      rejected,
      modified,
      acceptanceRate,
      topAcceptedDiagnoses: this.topN(acceptedDiagnoses, 10),
      topRejectedDiagnoses: this.topN(rejectedDiagnoses, 10),
      averageAIConfidenceWhenAccepted: avgConfAccepted,
      averageAIConfidenceWhenRejected: avgConfRejected,
    };
  }

  // ----------------------------------------------------------
  // AI PERFORMANCE REPORT
  // ----------------------------------------------------------

  async getAIPerformanceReport(period: string): Promise<AIPerformanceReport> {
    const entries = await this.getEntriesForPeriod(period);

    const decisions = entries.filter(
      (e) =>
        e.eventType === 'ai.diagnosis_selected' ||
        e.eventType === 'ai.diagnosis_rejected' ||
        e.eventType === 'ai.treatment_selected' ||
        e.eventType === 'ai.treatment_rejected'
    );

    let totalAccepted = 0;
    let totalDecisions = decisions.length;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalCost = 0;

    // Per-category tracking
    const categoryStats = new Map<string, { total: number; accepted: number }>();

    // Source tracking
    const sourceStats = new Map<string, { count: number; accepted: number }>();
    for (const src of ['local', 'cache', 'model'] as const) {
      sourceStats.set(src, { count: 0, accepted: 0 });
    }

    for (const entry of decisions) {
      const isAccepted =
        entry.eventType === 'ai.diagnosis_selected' ||
        entry.eventType === 'ai.treatment_selected' ||
        entry.metadata.providerAction === 'accepted' ||
        entry.metadata.providerAction === 'modified';

      if (isAccepted) totalAccepted++;

      // Confidence
      if (entry.metadata.aiConfidence !== undefined) {
        totalConfidence += entry.metadata.aiConfidence;
        confidenceCount++;
      }

      // Cost
      if (entry.metadata.costIncurred !== undefined) {
        totalCost += entry.metadata.costIncurred;
      }

      // Category
      const category = getComplaintCategory(entry.metadata.diagnosisName);
      const catStat = categoryStats.get(category) || { total: 0, accepted: 0 };
      catStat.total++;
      if (isAccepted) catStat.accepted++;
      categoryStats.set(category, catStat);

      // Source
      const source = entry.metadata.source || 'model';
      const srcStat = sourceStats.get(source) || { count: 0, accepted: 0 };
      srcStat.count++;
      if (isAccepted) srcStat.accepted++;
      sourceStats.set(source, srcStat);
    }

    const overallAcceptanceRate = totalDecisions > 0
      ? Math.round((totalAccepted / totalDecisions) * 10000) / 100
      : 0;

    const averageConfidenceScore = confidenceCount > 0
      ? Math.round((totalConfidence / confidenceCount) * 100) / 100
      : 0;

    const costPerAcceptedDiagnosis = totalAccepted > 0
      ? Math.round((totalCost / totalAccepted) * 10000) / 10000
      : 0;

    // Build category breakdown
    const acceptanceByComplaintCategory: Record<string, { total: number; accepted: number; rate: number }> = {};
    for (const [cat, stats] of categoryStats) {
      acceptanceByComplaintCategory[cat] = {
        total: stats.total,
        accepted: stats.accepted,
        rate: stats.total > 0
          ? Math.round((stats.accepted / stats.total) * 10000) / 100
          : 0,
      };
    }

    // Build source breakdown
    const buildSourceStat = (key: string) => {
      const s = sourceStats.get(key) || { count: 0, accepted: 0 };
      return {
        count: s.count,
        acceptanceRate: s.count > 0
          ? Math.round((s.accepted / s.count) * 10000) / 100
          : 0,
      };
    };

    return {
      period,
      overallAcceptanceRate,
      acceptanceByComplaintCategory,
      averageConfidenceScore,
      costPerAcceptedDiagnosis,
      localVsCacheVsModelBreakdown: {
        local: buildSourceStat('local'),
        cache: buildSourceStat('cache'),
        model: buildSourceStat('model'),
      },
    };
  }

  // ----------------------------------------------------------
  // FLUSH LIFECYCLE
  // ----------------------------------------------------------

  startFlush(intervalMs: number = 60_000): void {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => this.flush().catch(() => {}), intervalMs);
    logger.info('Audit trail flush started', { intervalMs });
  }

  stopFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      logger.info('Audit trail flush stopped');
    }
  }

  // ----------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `audit_${timestamp}_${random}`;
  }

  private async pushToRedis(entry: AuditEntry): Promise<void> {
    try {
      const { redis } = await import('./redis');
      if (redis) {
        const key = `audit:encounter:${entry.encounterId}`;
        await redis.rpush(key, JSON.stringify(entry));
        await redis.expire(key, 90 * 86400); // 90-day TTL
      }
    } catch { /* Redis not available */ }
  }

  private async getFromRedis(encounterId: string): Promise<AuditEntry[]> {
    try {
      const { redis } = await import('./redis');
      if (redis) {
        const key = `audit:encounter:${encounterId}`;
        const items = await redis.lrange(key, 0, -1);
        return items.map((item: string) => JSON.parse(item) as AuditEntry);
      }
    } catch { /* Redis not available */ }
    return [];
  }

  private async getEntriesForProviderAndPeriod(
    providerId: string,
    period: string
  ): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    // Buffer entries matching provider and period
    for (const entry of this.buffer) {
      if (
        entry.providerId === providerId &&
        entry.timestamp.startsWith(period)
      ) {
        entries.push(entry);
      }
    }

    // Database entries
    try {
      const { prisma } = await import('./prisma');
      if (prisma.auditEntry) {
        const rows = await prisma.auditEntry.findMany({
          where: {
            providerId,
            timestamp: {
              gte: `${period}-01T00:00:00.000Z`,
              lt: this.getNextPeriodStart(period),
            },
          },
          orderBy: { timestamp: 'asc' },
        });
        for (const r of rows as any[]) {
          entries.push({
            id: r.id,
            timestamp: r.timestamp,
            organizationId: r.organizationId,
            providerId: r.providerId,
            encounterId: r.encounterId,
            eventType: r.eventType as AuditEventType,
            metadata: r.metadata || {},
          });
        }
      }
    } catch { /* DB not available */ }

    return entries;
  }

  private async getEntriesForPeriod(period: string): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    // Buffer entries matching period
    for (const entry of this.buffer) {
      if (entry.timestamp.startsWith(period)) {
        entries.push(entry);
      }
    }

    // Database entries
    try {
      const { prisma } = await import('./prisma');
      if (prisma.auditEntry) {
        const rows = await prisma.auditEntry.findMany({
          where: {
            timestamp: {
              gte: `${period}-01T00:00:00.000Z`,
              lt: this.getNextPeriodStart(period),
            },
          },
          orderBy: { timestamp: 'asc' },
        });
        for (const r of rows as any[]) {
          entries.push({
            id: r.id,
            timestamp: r.timestamp,
            organizationId: r.organizationId,
            providerId: r.providerId,
            encounterId: r.encounterId,
            eventType: r.eventType as AuditEventType,
            metadata: r.metadata || {},
          });
        }
      }
    } catch { /* DB not available */ }

    return entries;
  }

  private getNextPeriodStart(period: string): string {
    // period is "YYYY-MM"
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;
  }

  private topN(
    map: Map<string, number>,
    n: number
  ): Array<{ diagnosisName: string; count: number }> {
    return Array.from(map.entries())
      .map(([diagnosisName, count]) => ({ diagnosisName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const auditTrail = new AuditTrailService();

export default auditTrail;
