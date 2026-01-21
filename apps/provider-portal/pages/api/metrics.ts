// ============================================================
// Prometheus Metrics Endpoint
// apps/provider-portal/pages/api/metrics.ts
//
// Exposes application metrics in Prometheus format
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { monitoring, ClinicalMetrics } from '@attending/shared';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  // Check for metrics authorization (optional - can be secured)
  const metricsToken = req.headers['x-metrics-token'];
  const expectedToken = process.env.METRICS_TOKEN;
  
  if (expectedToken && metricsToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get Prometheus-formatted metrics
    const metrics = monitoring.metrics.getPrometheusMetrics();

    // Add some default process metrics
    const processMetrics = getProcessMetrics();

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(`${metrics}\n${processMetrics}`);
  } catch (error) {
    console.error('[Metrics] Error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
}

function getProcessMetrics(): string {
  const used = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const lines = [
    '# HELP process_memory_heap_bytes Process heap memory in bytes',
    '# TYPE process_memory_heap_bytes gauge',
    `process_memory_heap_bytes ${used.heapUsed}`,
    '',
    '# HELP process_memory_rss_bytes Process RSS memory in bytes',
    '# TYPE process_memory_rss_bytes gauge',
    `process_memory_rss_bytes ${used.rss}`,
    '',
    '# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds',
    '# TYPE process_cpu_user_seconds_total counter',
    `process_cpu_user_seconds_total ${cpuUsage.user / 1000000}`,
    '',
    '# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds',
    '# TYPE process_cpu_system_seconds_total counter',
    `process_cpu_system_seconds_total ${cpuUsage.system / 1000000}`,
    '',
    '# HELP nodejs_version_info Node.js version info',
    '# TYPE nodejs_version_info gauge',
    `nodejs_version_info{version="${process.version}"} 1`,
  ];

  return lines.join('\n');
}
