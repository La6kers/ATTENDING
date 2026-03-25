// ============================================================
// ATTENDING AI - Admin Dashboard Endpoint
// apps/provider-portal/pages/api/admin/dashboard.ts
//
// GET /api/admin/dashboard → JSON dashboard data
//
// Returns: uptime, request stats, latency percentiles,
//          integration health, scheduler status, rate limits.
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { metrics } from '@attending/shared/lib/metrics';
import { scheduler } from '@attending/shared/lib/scheduler';

export default createHandler({
  methods: ['GET'],
  auth: 'admin',

  handler: async (req, ctx) => {
    const dashboard = metrics.toDashboard();

    // Augment with live scheduler status
    dashboard.scheduler = scheduler.getStatus();

    // Add system info
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpuUsage: process.cpuUsage(),
    };

    ctx.success({
      ...dashboard,
      system: systemInfo,
    });
  },
});
