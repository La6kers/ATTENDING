// ============================================================
// ATTENDING AI - FHIR Bulk Data Export Endpoints
// apps/provider-portal/pages/api/fhir/export.ts
//
// POST   /api/fhir/export          → Start export job
// GET    /api/fhir/export?jobId=x  → Poll job status
// DELETE /api/fhir/export?jobId=x  → Cancel job
//
// Conforms to FHIR Bulk Data Access IG pattern.
// Authenticated via API key (system-to-system) or admin session.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHandler } from '@attending/shared/lib/api/handler';
import {
  startExportJob,
  getExportJob,
  cancelExportJob,
  listExportJobs,
} from '@attending/shared/lib/integrations/bulkExport';
import { AuditActions } from '@attending/shared/lib/audit';

export default createHandler({
  methods: ['GET', 'POST', 'DELETE'],
  auth: 'admin',
  audit: AuditActions.DATA_EXPORT,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const orgId = ctx.user!.organizationId || 'default';

    switch (req.method) {
      case 'POST': {
        const { _type, _since, patientIds, _outputFormat } = req.body || {};

        const job = startExportJob(
          { _type, _since, organizationId: orgId, patientIds, _outputFormat },
          ctx.user!.id
        );

        ctx.log.info('Bulk export started', { jobId: job.id, types: _type });

        // FHIR spec: 202 Accepted with Content-Location header
        ctx.raw.res.setHeader('Content-Location', `/api/fhir/export?jobId=${job.id}`);
        ctx.success(202, {
          jobId: job.id,
          status: job.status,
          pollingUrl: `/api/fhir/export?jobId=${job.id}`,
          message: 'Export job started. Poll the status URL for progress.',
        });
        break;
      }

      case 'GET': {
        const jobId = req.query.jobId as string;

        // List all jobs if no jobId
        if (!jobId) {
          const allJobs = listExportJobs(orgId);
          ctx.success(allJobs.map(j => ({
            id: j.id,
            status: j.status,
            progress: j.progress,
            resourceCounts: j.resourceCounts,
            fileCount: j.files.length,
            startedAt: j.startedAt,
            completedAt: j.completedAt,
          })));
          return;
        }

        const job = getExportJob(jobId);
        if (!job) {
          ctx.error(404, 'NOT_FOUND' as any, 'Export job not found');
          return;
        }

        if (job.request.organizationId !== orgId) {
          ctx.error(403, 'ROLE_FORBIDDEN' as any, 'Access denied');
          return;
        }

        if (job.status === 'completed') {
          // FHIR Bulk Data spec: 200 with output manifest
          ctx.success({
            transactionTime: job.completedAt,
            request: `/api/fhir/export`,
            requiresAccessToken: true,
            output: job.files.map(f => ({
              type: f.resourceType,
              url: f.url,
              count: f.count,
              sizeBytes: f.sizeBytes,
            })),
            error: [],
          });
        } else if (job.status === 'failed') {
          ctx.error(500, 'INTERNAL_ERROR' as any, job.error || 'Export failed');
        } else {
          // FHIR spec: 202 with progress
          ctx.raw.res.setHeader('X-Progress', `${job.progress}%`);
          ctx.raw.res.setHeader('Retry-After', '5');
          ctx.success(202, {
            status: job.status,
            progress: job.progress,
            resourceCounts: job.resourceCounts,
            message: `Export ${job.progress}% complete`,
          });
        }
        break;
      }

      case 'DELETE': {
        const jobId = req.query.jobId as string;
        if (!jobId) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing jobId');
          return;
        }

        const cancelled = cancelExportJob(jobId);
        if (!cancelled) {
          ctx.error(404, 'NOT_FOUND' as any, 'Job not found or already completed');
          return;
        }

        ctx.log.info('Bulk export cancelled', { jobId });
        ctx.success({ jobId, status: 'cancelled' });
        break;
      }
    }
  },
});
