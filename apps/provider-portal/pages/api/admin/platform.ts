// ============================================================
// ATTENDING AI - Platform Health Summary
// apps/provider-portal/pages/api/admin/platform.ts
//
// Single endpoint showing overall system health for investors,
// demos, and operational monitoring.
//
// GET /api/admin/platform         → Full platform health
// GET /api/admin/platform?view=investor → Investor metrics
// ============================================================

import { createHandler } from '@attending/shared/lib/api/handler';
import { metrics } from '@attending/shared/lib/metrics';
import { scheduler } from '@attending/shared/lib/scheduler';
import { meter } from '@attending/shared/lib/billing';

export default createHandler({
  methods: ['GET'],
  auth: 'admin',

  handler: async (req, ctx) => {
    const view = req.query.view as string;
    const dashboard = metrics.toDashboard();

    // Core health
    const health = {
      status: determineOverallStatus(dashboard),
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    if (view === 'investor') {
      // Investor-focused metrics
      const platformStats = await meter.getPlatformStats();

      ctx.success({
        ...health,
        platform: {
          organizations: platformStats.totalOrganizations,
          monthlyActiveUsers: platformStats.monthlyActiveUsers,
          monthlyApiCalls: platformStats.monthlyApiCalls,
          monthlyAiInferences: platformStats.monthlyAiInferences,
          estimatedMRR: platformStats.estimatedMRR,
          trends: platformStats.trends,
        },
        reliability: {
          uptime: dashboard.uptime,
          errorRate: dashboard.requests.errorRate,
          p95Latency: `${dashboard.latency.p95}ms`,
          p99Latency: `${dashboard.latency.p99}ms`,
        },
        capabilities: {
          aiModules: 6,
          integrationProtocols: ['HL7v2', 'FHIR R4', 'Webhooks', 'REST API', 'CSV/JSON Import'],
          complianceCertifications: ['HIPAA', 'SOC2-ready', 'Field-Level Encryption'],
          enterpriseFeatures: [
            'Multi-tenant RLS', 'SSO (SAML/OIDC)', 'API Key Auth (20+ scopes)',
            'Role-Based Access Control', 'Audit Trail (7yr retention)',
            'Data Retention Engine', 'Dead Letter Queue', 'Feature Flags',
          ],
        },
      });
      return;
    }

    // Full operational health
    const schedulerStatus = scheduler.getStatus();
    const failedJobs = schedulerStatus.filter(j => j.lastError);
    const runningJobs = schedulerStatus.filter(j => j.isRunning);

    // Component health checks
    const components: Record<string, { status: string; latency?: number; details?: string }> = {};

    // Database
    try {
      const { prisma } = await import('@attending/shared/lib/prisma');
      const dbStart = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      components.database = { status: 'healthy', latency: Math.round(performance.now() - dbStart) };
    } catch (err) {
      components.database = { status: 'unhealthy', details: err instanceof Error ? err.message : 'Connection failed' };
    }

    // Redis
    try {
      const { redis } = await import('@attending/shared/lib/redis');
      if (redis) {
        const redisStart = performance.now();
        await redis.ping();
        components.redis = { status: 'healthy', latency: Math.round(performance.now() - redisStart) };
      } else {
        components.redis = { status: 'degraded', details: 'Not configured' };
      }
    } catch {
      components.redis = { status: 'unhealthy', details: 'Connection failed' };
    }

    // Scheduler
    components.scheduler = {
      status: failedJobs.length > 2 ? 'degraded' : 'healthy',
      details: `${schedulerStatus.length} jobs, ${runningJobs.length} running, ${failedJobs.length} with errors`,
    };

    ctx.success({
      ...health,
      uptime: dashboard.uptime,
      requests: {
        total: dashboard.requests.total,
        errors: dashboard.requests.errors,
        errorRate: dashboard.requests.errorRate,
        topEndpoints: dashboard.requests.topEndpoints.slice(0, 5),
      },
      latency: dashboard.latency,
      integrations: dashboard.integrations,
      components,
      scheduler: {
        totalJobs: schedulerStatus.length,
        activeJobs: schedulerStatus.filter(j => j.enabled).length,
        runningJobs: runningJobs.length,
        failedJobs: failedJobs.map(j => ({ name: j.name, error: j.lastError, lastRun: j.lastRun })),
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        },
        cpuUsage: process.cpuUsage(),
      },
    });
  },
});

function determineOverallStatus(dashboard: any): 'healthy' | 'degraded' | 'unhealthy' {
  const errorRate = parseFloat(dashboard.requests.errorRate);
  if (errorRate > 10) return 'unhealthy';
  if (errorRate > 5 || dashboard.latency.p95 > 5000) return 'degraded';
  return 'healthy';
}
