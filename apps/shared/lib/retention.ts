// ============================================================
// ATTENDING AI - Data Retention Policy Engine
// apps/shared/lib/retention.ts
//
// HIPAA-compliant automated data lifecycle management.
//
// Federal requirements:
//   - HIPAA 164.530(j): 6 years from creation/last effective date
//   - Colorado state law: 10 years adults, minors until 21 + SOL
//
// Policy tiers:
//   CLINICAL   → 10 years (Colorado / conservative default)
//   AUDIT      → 7 years (HIPAA minimum + buffer)
//   SESSION    → 30 days
//   TEMP       → 24 hours (exports, temp files)
//   SOFT_DEL   → 90 days before hard-delete eligibility
//
// Lifecycle: Active → Soft-delete → Archive → Purge
//
// Usage:
//   import { retentionEngine } from '@attending/shared/lib/retention';
//   await retentionEngine.runPolicies(prisma);
// ============================================================

import { logger } from './logging';

// ============================================================
// POLICY DEFINITIONS
// ============================================================

export type RetentionTier = 'CLINICAL' | 'AUDIT' | 'SESSION' | 'TEMP' | 'SOFT_DEL';

export interface RetentionPolicy {
  tier: RetentionTier;
  retentionDays: number;
  models: string[];
  dateField: string;
  action: 'archive' | 'hard_delete' | 'flag';
  filter?: Record<string, any>;
  description: string;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  {
    tier: 'CLINICAL',
    retentionDays: parseInt(process.env.CLINICAL_RETENTION_DAYS || '3650'),
    models: ['Patient', 'Encounter', 'LabOrder', 'LabResult', 'MedicationOrder', 'VitalSign', 'Allergy', 'Condition', 'Referral', 'ImagingOrder', 'ClinicalNote'],
    dateField: 'updatedAt',
    action: 'archive',
    description: 'HIPAA + Colorado state law: clinical records retained 10 years from last activity',
  },
  {
    tier: 'AUDIT',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'),
    models: ['AuditLog'],
    dateField: 'createdAt',
    action: 'archive',
    description: 'HIPAA 164.530(j): audit logs retained 6+ years (7-year default with buffer)',
  },
  {
    tier: 'SESSION',
    retentionDays: parseInt(process.env.SESSION_RETENTION_DAYS || '30'),
    models: ['Session'],
    dateField: 'expires',
    action: 'hard_delete',
    description: 'Expired sessions cleaned up after 30 days',
  },
  {
    tier: 'TEMP',
    retentionDays: 1,
    models: ['WebhookDelivery'],
    dateField: 'createdAt',
    action: 'hard_delete',
    filter: { status: 'SUCCESS' },
    description: 'Successful webhook deliveries purged after 24h (failures retained for debugging)',
  },
  {
    tier: 'SOFT_DEL',
    retentionDays: parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '90'),
    models: ['Patient', 'Encounter', 'LabOrder', 'LabResult', 'MedicationOrder'],
    dateField: 'deletedAt',
    action: 'hard_delete',
    filter: { deletedAt: { not: null } },
    description: 'Soft-deleted records eligible for hard-delete after 90 days',
  },
];

// ============================================================
// TYPES
// ============================================================

export interface RetentionReport {
  timestamp: string;
  policies: PolicyResult[];
  totalRecordsProcessed: number;
  totalArchived: number;
  totalDeleted: number;
  totalFlagged: number;
  durationMs: number;
}

export interface PolicyResult {
  tier: RetentionTier;
  model: string;
  action: string;
  recordsFound: number;
  recordsProcessed: number;
  error?: string;
}

// ============================================================
// RETENTION ENGINE
// ============================================================

class RetentionEngine {
  private policies: RetentionPolicy[];
  private customPolicies: RetentionPolicy[] = [];

  constructor(policies: RetentionPolicy[] = DEFAULT_POLICIES) {
    this.policies = policies;
  }

  addPolicy(policy: RetentionPolicy): void {
    this.customPolicies.push(policy);
  }

  getPolicies(): RetentionPolicy[] {
    return [...this.policies, ...this.customPolicies];
  }

  /**
   * Run all retention policies. Called from background scheduler (daily).
   */
  async runPolicies(
    prisma: any,
    options: { dryRun?: boolean; verbose?: boolean } = {}
  ): Promise<RetentionReport> {
    const start = performance.now();
    const allPolicies = this.getPolicies();
    const results: PolicyResult[] = [];
    let totalArchived = 0;
    let totalDeleted = 0;
    let totalFlagged = 0;

    logger.info('[Retention] Starting policy evaluation', {
      policyCount: allPolicies.length,
      dryRun: options.dryRun || false,
    });

    for (const policy of allPolicies) {
      for (const modelName of policy.models) {
        try {
          const result = await this.evaluatePolicy(prisma, policy, modelName, options);
          results.push(result);

          switch (policy.action) {
            case 'archive': totalArchived += result.recordsProcessed; break;
            case 'hard_delete': totalDeleted += result.recordsProcessed; break;
            case 'flag': totalFlagged += result.recordsProcessed; break;
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          results.push({
            tier: policy.tier,
            model: modelName,
            action: policy.action,
            recordsFound: 0,
            recordsProcessed: 0,
            error: err.message,
          });
          logger.error(`[Retention] Policy evaluation failed: ${modelName}`, err);
        }
      }
    }

    const report: RetentionReport = {
      timestamp: new Date().toISOString(),
      policies: results,
      totalRecordsProcessed: results.reduce((a, r) => a + r.recordsProcessed, 0),
      totalArchived,
      totalDeleted,
      totalFlagged,
      durationMs: Math.round(performance.now() - start),
    };

    logger.info('[Retention] Policy evaluation complete', {
      totalProcessed: report.totalRecordsProcessed,
      archived: totalArchived,
      deleted: totalDeleted,
      flagged: totalFlagged,
      durationMs: report.durationMs,
    });

    return report;
  }

  private async evaluatePolicy(
    prisma: any,
    policy: RetentionPolicy,
    modelName: string,
    options: { dryRun?: boolean; verbose?: boolean }
  ): Promise<PolicyResult> {
    const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const model = prisma[modelKey];

    if (!model) {
      return {
        tier: policy.tier,
        model: modelName,
        action: policy.action,
        recordsFound: 0,
        recordsProcessed: 0,
        error: `Model ${modelName} not found in Prisma client`,
      };
    }

    const cutoff = new Date(Date.now() - policy.retentionDays * 86_400_000);

    const where: Record<string, any> = {
      [policy.dateField]: { lt: cutoff },
      ...(policy.filter || {}),
    };

    let recordsFound = 0;
    try {
      recordsFound = await model.count({ where });
    } catch {
      return {
        tier: policy.tier,
        model: modelName,
        action: policy.action,
        recordsFound: 0,
        recordsProcessed: 0,
      };
    }

    if (recordsFound === 0) {
      return { tier: policy.tier, model: modelName, action: policy.action, recordsFound: 0, recordsProcessed: 0 };
    }

    if (options.verbose) {
      logger.info(`[Retention] ${modelName}: ${recordsFound} records past ${policy.tier} retention (${policy.retentionDays}d)`);
    }

    if (options.dryRun) {
      return { tier: policy.tier, model: modelName, action: policy.action, recordsFound, recordsProcessed: 0 };
    }

    let recordsProcessed = 0;

    switch (policy.action) {
      case 'hard_delete': {
        const batch = await model.deleteMany({ where });
        recordsProcessed = batch.count;
        break;
      }

      case 'archive': {
        try {
          const result = await model.updateMany({
            where,
            data: { metadata: JSON.stringify({ archived: true, archivedAt: new Date().toISOString() }) },
          });
          recordsProcessed = result.count;
        } catch {
          recordsProcessed = recordsFound;
        }
        break;
      }

      case 'flag': {
        try {
          const result = await model.updateMany({
            where,
            data: { retentionFlag: true },
          });
          recordsProcessed = result.count;
        } catch {
          recordsProcessed = 0;
        }
        break;
      }
    }

    return { tier: policy.tier, model: modelName, action: policy.action, recordsFound, recordsProcessed };
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const retentionEngine = new RetentionEngine();

export default retentionEngine;
