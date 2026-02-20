// ============================================================
// ATTENDING AI - CSV Data Import Endpoint
// apps/provider-portal/pages/api/integrations/import.ts
//
// POST /api/integrations/import → Import CSV/JSON patient data
//
// Supports:
//   - Patient bulk import from CSV/JSON
//   - Lab result import from CSV/JSON
//   - Auto-normalization via transform pipeline
//   - Dry-run mode for validation without writes
//
// Headers:
//   X-API-Key: atnd_xxxxx
//   Content-Type: application/json
//   X-Import-Type: patients | lab-results
//   X-Dry-Run: true (optional)
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHandler } from '@attending/shared/lib/api/handler';
import {
  patientImportPipeline,
  labResultImportPipeline,
} from '@attending/shared/lib/integrations/transforms';
import { events } from '@attending/shared/lib/integrations/events';
import { auditLog, AuditActions } from '@attending/shared/lib/audit';
import { logger } from '@attending/shared/lib/logging';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

export default createHandler({
  methods: ['POST'],
  auth: 'apiKey',
  audit: AuditActions.DATA_IMPORT,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();
    const importType = (req.headers['x-import-type'] as string) || req.body?.importType || 'patients';
    const dryRun = req.headers['x-dry-run'] === 'true' || req.body?.dryRun === true;
    const records: any[] = req.body?.records || req.body?.data || [];

    if (!Array.isArray(records) || records.length === 0) {
      ctx.error(400, 'VALIDATION_ERROR' as any, 'Request body must include a "records" array with at least one item');
      return;
    }

    if (records.length > 1000) {
      ctx.error(400, 'VALIDATION_ERROR' as any, 'Maximum 1000 records per import batch');
      return;
    }

    logger.info('[Import] Starting batch import', {
      importType,
      dryRun,
      recordCount: records.length,
    });

    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ index: number; errors: any[] }>,
      created: [] as string[],
      updated: [] as string[],
    };

    // Select pipeline based on import type
    const pipeline = importType === 'lab-results'
      ? labResultImportPipeline()
      : patientImportPipeline();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Run through transform pipeline
      const transformed = await pipeline.execute(record, {
        sourceFormat: 'csv',
        targetFormat: 'attending',
        organizationId: ctx.user?.organizationId,
      });

      if (!transformed.success || !transformed.data) {
        results.failed++;
        results.errors.push({ index: i, errors: transformed.errors });
        continue;
      }

      if (dryRun) {
        results.successful++;
        continue;
      }

      // Write to database
      try {
        if (importType === 'patients') {
          const data = transformed.data as any;
          const existing = data.mrn
            ? await prisma.patient.findUnique({ where: { mrn: data.mrn } })
            : null;

          if (existing) {
            await prisma.patient.update({
              where: { mrn: data.mrn },
              data: { ...data, mrn: undefined },
            });
            results.updated.push(existing.id);
          } else {
            const created = await prisma.patient.create({ data });
            results.created.push(created.id);
          }
          results.successful++;
        } else if (importType === 'lab-results') {
          const data = transformed.data as any;
          const created = await prisma.labResult.create({ data });

          // Emit event for critical values
          if (data.interpretation === 'CRITICAL_HIGH' || data.interpretation === 'CRITICAL_LOW') {
            await events.emit('lab.result.critical', {
              patientId: data.patientId,
              testCode: data.testCode,
              value: data.value,
              interpretation: data.interpretation,
              source: 'import',
            }, { organizationId: ctx.user?.organizationId });
          }

          results.created.push(created.id);
          results.successful++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push({
          index: i,
          errors: [{ stage: 'database', message: err instanceof Error ? err.message : String(err), severity: 'error' }],
        });
      }
    }

    // Emit summary event
    if (!dryRun && results.successful > 0) {
      await events.emit('data.import.completed', {
        importType,
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        source: 'api',
      }, { organizationId: ctx.user?.organizationId });
    }

    logger.info('[Import] Batch complete', {
      importType,
      dryRun,
      total: results.total,
      successful: results.successful,
      failed: results.failed,
    });

    ctx.success(dryRun ? 200 : 201, {
      ...results,
      dryRun,
      importType,
      message: dryRun
        ? `Validation complete: ${results.successful}/${results.total} records valid`
        : `Import complete: ${results.successful} succeeded, ${results.failed} failed`,
    });
  },
});
