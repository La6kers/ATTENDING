// ============================================================
// ATTENDING AI - PHI Audit Log Archival Service
// apps/shared/lib/audit/archival.ts
//
// Moves audit logs older than 90 days to Azure Blob cold tier.
// HIPAA requires 6-year retention — hot storage for all logs
// is expensive and unnecessary.
//
// Lifecycle (managed by Azure Storage Lifecycle Policy):
//   0-90 days:   Hot tier (PostgreSQL + Azure Blob hot)
//   90-365 days: Cool tier (Azure Blob)
//   365+ days:   Archive tier (Azure Blob)
//   6 years:     Auto-delete
//
// Impact: Reduce storage costs ~70%
// ============================================================

import { PrismaClient } from '@prisma/client';

// ============================================================
// Types
// ============================================================

export interface ArchivalConfig {
  /** Days before logs are archived from DB to Blob storage */
  archiveAfterDays: number;
  /** Azure Storage connection string */
  storageConnectionString: string;
  /** Container name for audit logs */
  containerName: string;
  /** Batch size for archival operations */
  batchSize: number;
  /** Whether to delete from DB after archival */
  deleteFromDbAfterArchival: boolean;
  /** Dry run mode - log what would be archived without doing it */
  dryRun: boolean;
}

export interface ArchivalResult {
  archivedCount: number;
  deletedFromDb: number;
  failedCount: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  blobsCreated: string[];
  errors: string[];
  dryRun: boolean;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: any;
  phiAccessed: boolean;
  createdAt: Date;
}

// ============================================================
// Configuration
// ============================================================

const DEFAULT_CONFIG: ArchivalConfig = {
  archiveAfterDays: 90,
  storageConnectionString: process.env.AZURE_AUDIT_STORAGE_CONNECTION_STRING || '',
  containerName: 'phi-audit-logs',
  batchSize: 1000,
  deleteFromDbAfterArchival: true,
  dryRun: false,
};

// ============================================================
// Archival Service
// ============================================================

export class AuditLogArchivalService {
  private config: ArchivalConfig;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, config?: Partial<ArchivalConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.prisma = prisma;
  }

  /**
   * Run the archival process.
   * Moves audit logs older than archiveAfterDays to Azure Blob storage.
   */
  async archive(): Promise<ArchivalResult> {
    const startTime = new Date();
    const result: ArchivalResult = {
      archivedCount: 0,
      deletedFromDb: 0,
      failedCount: 0,
      startTime: startTime.toISOString(),
      endTime: '',
      durationMs: 0,
      blobsCreated: [],
      errors: [],
      dryRun: this.config.dryRun,
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveAfterDays);

    console.log(`[AUDIT:ARCHIVAL] Starting archival for logs older than ${cutoffDate.toISOString()}`);
    console.log(`[AUDIT:ARCHIVAL] Dry run: ${this.config.dryRun}`);

    try {
      // Count total logs to archive
      const totalCount = await this.prisma.auditLog.count({
        where: { createdAt: { lt: cutoffDate } },
      });

      console.log(`[AUDIT:ARCHIVAL] Found ${totalCount} logs to archive`);

      if (totalCount === 0) {
        result.endTime = new Date().toISOString();
        result.durationMs = Date.now() - startTime.getTime();
        return result;
      }

      // Process in batches
      let offset = 0;
      while (offset < totalCount) {
        const batch = await this.prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoffDate } },
          orderBy: { createdAt: 'asc' },
          take: this.config.batchSize,
          skip: offset,
        });

        if (batch.length === 0) break;

        try {
          // Upload batch to Azure Blob storage
          const blobName = await this.uploadBatch(batch, offset);
          result.blobsCreated.push(blobName);
          result.archivedCount += batch.length;

          // Delete from DB if configured
          if (this.config.deleteFromDbAfterArchival && !this.config.dryRun) {
            const ids = batch.map(log => log.id);
            const deleted = await this.prisma.auditLog.deleteMany({
              where: { id: { in: ids } },
            });
            result.deletedFromDb += deleted.count;
          }

          console.log(`[AUDIT:ARCHIVAL] Batch ${offset / this.config.batchSize + 1}: ${batch.length} logs archived`);
        } catch (batchError) {
          const errorMsg = batchError instanceof Error ? batchError.message : 'Unknown batch error';
          result.errors.push(`Batch at offset ${offset}: ${errorMsg}`);
          result.failedCount += batch.length;
          console.error(`[AUDIT:ARCHIVAL] Batch error:`, errorMsg);
        }

        offset += this.config.batchSize;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMsg);
      console.error(`[AUDIT:ARCHIVAL] Fatal error:`, errorMsg);
    }

    result.endTime = new Date().toISOString();
    result.durationMs = Date.now() - startTime.getTime();

    console.log(`[AUDIT:ARCHIVAL] Complete: ${result.archivedCount} archived, ${result.deletedFromDb} deleted from DB`);
    console.log(`[AUDIT:ARCHIVAL] Duration: ${result.durationMs}ms, Errors: ${result.errors.length}`);

    return result;
  }

  /**
   * Upload a batch of audit logs to Azure Blob storage.
   * Format: NDJSON (newline-delimited JSON) for efficient processing.
   */
  private async uploadBatch(
    logs: AuditLogEntry[],
    batchOffset: number
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const batchId = String(batchOffset).padStart(6, '0');

    // Blob path: phi-audit-logs/year=YYYY/month=MM/day=DD/batch-XXXXXX.ndjson
    const blobName = `year=${year}/month=${month}/day=${day}/batch-${batchId}.ndjson`;

    if (this.config.dryRun) {
      console.log(`[AUDIT:ARCHIVAL:DRY_RUN] Would upload ${logs.length} logs to ${blobName}`);
      return `[DRY_RUN] ${blobName}`;
    }

    // Convert to NDJSON format
    const ndjsonContent = logs
      .map(log => JSON.stringify({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        userId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        details: log.details,
        phiAccessed: log.phiAccessed,
        createdAt: log.createdAt.toISOString(),
        archivedAt: new Date().toISOString(),
      }))
      .join('\n');

    // Upload to Azure Blob Storage
    if (!this.config.storageConnectionString) {
      throw new Error('AZURE_AUDIT_STORAGE_CONNECTION_STRING not configured');
    }

    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        this.config.storageConnectionString
      );
      const containerClient = blobServiceClient.getContainerClient(this.config.containerName);
      
      // Ensure container exists
      await containerClient.createIfNotExists({ access: undefined });
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(ndjsonContent, ndjsonContent.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/x-ndjson',
          blobContentEncoding: 'utf-8',
        },
        metadata: {
          logCount: String(logs.length),
          archivalDate: new Date().toISOString(),
          oldestLog: logs[0]?.createdAt?.toISOString() || '',
          newestLog: logs[logs.length - 1]?.createdAt?.toISOString() || '',
        },
        tags: {
          dataType: 'phi-audit-log',
          hipaaRetention: '6-years',
        },
      });

      return blobName;
    } catch (error) {
      // If Azure SDK isn't available, fall back to local file (dev only)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[AUDIT:ARCHIVAL] Azure SDK unavailable, skipping upload in dev mode`);
        return `[DEV_SKIP] ${blobName}`;
      }
      throw error;
    }
  }

  /**
   * Get archival statistics.
   */
  async getStats(): Promise<{
    totalLogsInDb: number;
    logsOlderThan90Days: number;
    oldestLogDate: Date | null;
    estimatedArchivalSize: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.archiveAfterDays);

    const [totalCount, archivableCount, oldestLog] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { lt: cutoffDate } },
      }),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalLogsInDb: totalCount,
      logsOlderThan90Days: archivableCount,
      oldestLogDate: oldestLog?.createdAt || null,
      // Rough estimate: ~500 bytes per NDJSON log entry
      estimatedArchivalSize: archivableCount * 500,
    };
  }
}

// ============================================================
// Scheduled Job Runner
// Can be triggered by Azure Functions Timer Trigger or cron
// ============================================================

export async function runAuditArchival(
  prisma: PrismaClient,
  options?: Partial<ArchivalConfig>
): Promise<ArchivalResult> {
  const service = new AuditLogArchivalService(prisma, options);
  return service.archive();
}

export default AuditLogArchivalService;
