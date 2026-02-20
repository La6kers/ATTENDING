// ============================================================
// ATTENDING AI - Scheduler Admin Controls
// apps/provider-portal/pages/api/admin/scheduler.ts
//
// GET    /api/admin/scheduler            → Job status list
// POST   /api/admin/scheduler?job=name   → Trigger job manually
// PATCH  /api/admin/scheduler?job=name   → Enable/disable job
//
// Admin-only endpoint.
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { scheduler } from '@attending/shared/lib/scheduler';

export default createHandler({
  methods: ['GET', 'POST', 'PATCH'],
  auth: 'admin',

  handler: async (req, ctx) => {
    switch (req.method) {
      case 'GET': {
        const status = scheduler.getStatus();
        ctx.success({
          jobs: status,
          totalJobs: status.length,
          activeJobs: status.filter(j => j.enabled).length,
          runningJobs: status.filter(j => j.isRunning).length,
        });
        break;
      }

      case 'POST': {
        // Manually trigger a job
        const jobName = req.query.job as string;
        if (!jobName) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Missing job name (query param: job)');
          return;
        }

        const triggered = await scheduler.triggerJob(jobName);
        if (!triggered) {
          ctx.error(404, 'NOT_FOUND' as any, `Job not found: ${jobName}`);
          return;
        }

        ctx.log.info('Job manually triggered', { job: jobName, by: ctx.user?.id });

        const status = scheduler.getJobStatus(jobName);
        ctx.success({ triggered: true, job: status });
        break;
      }

      case 'PATCH': {
        // Enable/disable a job
        const jobName = req.query.job as string;
        const { enabled } = req.body;

        if (!jobName || enabled === undefined) {
          ctx.error(400, 'VALIDATION_ERROR' as any, 'Required: job (query), enabled (body)');
          return;
        }

        scheduler.setEnabled(jobName, enabled);
        ctx.log.info('Job toggled', { job: jobName, enabled, by: ctx.user?.id });

        const status = scheduler.getJobStatus(jobName);
        ctx.success({ job: status });
        break;
      }
    }
  },
});
