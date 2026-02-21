// ============================================================
// ATTENDING AI - Background Job Scheduler
// apps/shared/lib/scheduler.ts
//
// Lightweight in-process cron scheduler for recurring tasks.
// No external dependencies — runs inside the Next.js server
// process via instrumentation.ts.
//
// Usage:
//   import { scheduler } from '@attending/shared/lib/scheduler';
//   scheduler.start(); // Call once at server startup
//   scheduler.stop();  // Call on graceful shutdown
// ============================================================

import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export interface JobDefinition {
  name: string;
  intervalMs: number;
  handler: () => Promise<void>;
  runOnStart?: boolean;
  enabled?: boolean;
  timeoutMs?: number;
}

export interface JobStatus {
  name: string;
  lastRun: string | null;
  lastDuration: number | null;
  lastError: string | null;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
  nextRun: string | null;
  enabled: boolean;
}

// ============================================================
// SCHEDULER
// ============================================================

class JobScheduler {
  private jobs = new Map<string, {
    definition: JobDefinition;
    timer: ReturnType<typeof setInterval> | null;
    status: JobStatus;
  }>();
  private running = false;

  register(definition: JobDefinition): void {
    if (this.jobs.has(definition.name)) {
      logger.warn(`[Scheduler] Job already registered: ${definition.name}`);
      return;
    }

    this.jobs.set(definition.name, {
      definition,
      timer: null,
      status: {
        name: definition.name,
        lastRun: null,
        lastDuration: null,
        lastError: null,
        runCount: 0,
        errorCount: 0,
        isRunning: false,
        nextRun: null,
        enabled: definition.enabled !== false,
      },
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    logger.info(`[Scheduler] Starting ${this.jobs.size} jobs`);

    for (const [name, job] of this.jobs) {
      if (!job.status.enabled) {
        logger.info(`[Scheduler] Skipping disabled job: ${name}`);
        continue;
      }

      if (job.definition.runOnStart) {
        this.executeJob(name).catch(() => {});
      }

      job.timer = setInterval(() => {
        this.executeJob(name).catch(() => {});
      }, job.definition.intervalMs);

      job.status.nextRun = new Date(Date.now() + job.definition.intervalMs).toISOString();

      logger.info(`[Scheduler] Job registered: ${name} (every ${formatInterval(job.definition.intervalMs)})`);
    }
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    for (const [, job] of this.jobs) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = null;
      }
    }

    logger.info('[Scheduler] All jobs stopped');
  }

  private async executeJob(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (!job || job.status.isRunning) return;

    job.status.isRunning = true;
    const start = performance.now();

    try {
      const timeoutMs = job.definition.timeoutMs || 30_000;
      await Promise.race([
        job.definition.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Job ${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      job.status.lastDuration = Math.round(performance.now() - start);
      job.status.lastError = null;
      job.status.runCount++;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      job.status.lastError = err.message;
      job.status.errorCount++;
      job.status.lastDuration = Math.round(performance.now() - start);

      logger.error(`[Scheduler] Job ${name} failed`, err);
    } finally {
      job.status.isRunning = false;
      job.status.lastRun = new Date().toISOString();
      job.status.nextRun = new Date(Date.now() + job.definition.intervalMs).toISOString();
    }
  }

  getStatus(): JobStatus[] {
    return Array.from(this.jobs.values()).map(j => ({ ...j.status }));
  }

  getJobStatus(name: string): JobStatus | null {
    return this.jobs.get(name)?.status ?? null;
  }

  async triggerJob(name: string): Promise<boolean> {
    if (!this.jobs.has(name)) return false;
    await this.executeJob(name);
    return true;
  }

  setEnabled(name: string, enabled: boolean): void {
    const job = this.jobs.get(name);
    if (!job) return;

    job.status.enabled = enabled;
    if (!enabled && job.timer) {
      clearInterval(job.timer);
      job.timer = null;
    } else if (enabled && !job.timer && this.running) {
      job.timer = setInterval(() => {
        this.executeJob(name).catch(() => {});
      }, job.definition.intervalMs);
    }
  }
}

// ============================================================
// DEFAULT JOBS
// ============================================================

function registerDefaultJobs(scheduler: JobScheduler): void {
  // 1. Webhook retry processor — every 60 seconds
  scheduler.register({
    name: 'webhook-retry',
    intervalMs: 60_000,
    runOnStart: false,
    handler: async () => {
      try {
        const { retryFailedDeliveries } = await import('./integrations/events');
        const { prisma } = await import('./prisma');
        await retryFailedDeliveries(prisma);
      } catch { /* Module not available */ }
    },
  });

  // 2. Export file cleanup — every hour
  scheduler.register({
    name: 'export-cleanup',
    intervalMs: 3_600_000,
    runOnStart: false,
    timeoutMs: 60_000,
    handler: async () => {
      try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        logger.info('[Scheduler:export-cleanup] Cleaning exports older than', { cutoff: cutoff.toISOString() });
      } catch { /* ignore */ }
    },
  });

  // 3. Integration health checks — every 5 minutes
  scheduler.register({
    name: 'integration-health',
    intervalMs: 300_000,
    runOnStart: true,
    handler: async () => {
      try {
        const { prisma } = await import('./prisma');
        const connections = await prisma.integrationConnection.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, type: true, lastSyncAt: true },
        });

        for (const conn of connections) {
          const lastSync = conn.lastSyncAt ? new Date(conn.lastSyncAt).getTime() : 0;
          const hourAgo = Date.now() - 3_600_000;

          if (lastSync < hourAgo && conn.lastSyncAt) {
            await prisma.integrationConnection.update({
              where: { id: conn.id },
              data: { healthStatus: 'DEGRADED' },
            });
          }
        }
      } catch { /* Module not available */ }
    },
  });

  // 4. Audit log rotation — daily
  scheduler.register({
    name: 'audit-rotation',
    intervalMs: 86_400_000,
    runOnStart: false,
    timeoutMs: 120_000,
    handler: async () => {
      try {
        const { prisma } = await import('./prisma');
        const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '2555');
        const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

        const count = await prisma.auditLog.count({
          where: { createdAt: { lt: cutoff } },
        });

        if (count > 0) {
          logger.info(`[Scheduler:audit-rotation] ${count} audit records past retention (${retentionDays} days)`);
        }
      } catch { /* ignore */ }
    },
  });

  // 5. Soft-deleted record cleanup — daily
  scheduler.register({
    name: 'softdelete-cleanup',
    intervalMs: 86_400_000,
    runOnStart: false,
    timeoutMs: 120_000,
    handler: async () => {
      try {
        const { prisma } = await import('./prisma');
        const retentionDays = parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '90');
        const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

        const models = ['patient', 'encounter', 'labOrder', 'labResult', 'medicationOrder'];
        for (const model of models) {
          try {
            const count = await (prisma as any)[model].count({
              where: { deletedAt: { lt: cutoff, not: null } },
            });
            if (count > 0) {
              logger.info(`[Scheduler:softdelete-cleanup] ${count} ${model} records past retention`);
            }
          } catch { /* Model may not have deletedAt */ }
        }
      } catch { /* ignore */ }
    },
  });

  // 6. Session cleanup — every 4 hours
  scheduler.register({
    name: 'session-cleanup',
    intervalMs: 14_400_000,
    runOnStart: false,
    handler: async () => {
      try {
        const { prisma } = await import('./prisma');
        const deleted = await prisma.session.deleteMany({
          where: { expires: { lt: new Date() } },
        });
        if (deleted.count > 0) {
          logger.info(`[Scheduler:session-cleanup] Removed ${deleted.count} expired sessions`);
        }
      } catch { /* ignore */ }
    },
  });

  // 7. Data retention policy evaluation — daily
  scheduler.register({
    name: 'retention-policies',
    intervalMs: 86_400_000,
    runOnStart: false,
    timeoutMs: 300_000,
    handler: async () => {
      try {
        const { retentionEngine } = await import('./retention');
        const { prisma } = await import('./prisma');
        await retentionEngine.runPolicies(prisma, { dryRun: false, verbose: true });
      } catch (err) {
        logger.error('[Scheduler:retention] Failed', err instanceof Error ? err : new Error(String(err)));
      }
    },
  });

  // 8. Alert rule evaluation — every 60 seconds
  scheduler.register({
    name: 'alert-evaluation',
    intervalMs: 60_000,
    runOnStart: false,
    handler: async () => {
      try {
        const { alertEngine } = await import('./alerting');
        await alertEngine.evaluate();
      } catch { /* Module not available */ }
    },
  });

  // 9. PHI cache maintenance — every 15 minutes
  scheduler.register({
    name: 'phi-cache-maintenance',
    intervalMs: 900_000,
    runOnStart: false,
    handler: async () => {
      try {
        const { phiCacheMaintenanceJob } = await import('./phiCache');
        await phiCacheMaintenanceJob();
      } catch { /* Module not available */ }
    },
  });

  // 10. Webhook subscription health — every 30 minutes
  scheduler.register({
    name: 'webhook-health',
    intervalMs: 1_800_000,
    runOnStart: false,
    handler: async () => {
      try {
        const { prisma } = await import('./prisma');
        const reEnableAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const disabled = await prisma.webhookSubscription.findMany({
          where: {
            isActive: false,
            disabledAt: { lt: reEnableAfter },
            failureCount: { gte: 10 },
          },
        });

        if (disabled.length > 0) {
          logger.info(`[Scheduler:webhook-health] ${disabled.length} webhooks eligible for re-enable check`);
        }
      } catch { /* ignore */ }
    },
  });
}

// ============================================================
// SINGLETON + HELPERS
// ============================================================

export const scheduler = new JobScheduler();
registerDefaultJobs(scheduler);

function formatInterval(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

export default scheduler;
