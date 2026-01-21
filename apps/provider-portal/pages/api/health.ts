// ============================================================
// Health Check API Endpoint
// apps/provider-portal/pages/api/health.ts
//
// Kubernetes-compatible health/readiness probe
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    [key: string]: HealthCheck;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  latency?: number;
  message?: string;
}

const startTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
    memory: checkMemory(),
  };

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus: HealthStatus['status'] = 'healthy';
  
  if (statuses.includes('fail')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('warn')) {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  
  res.status(statusCode).json(healthStatus);
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'pass',
      latency: Date.now() - start,
    };
  } catch (error: any) {
    return {
      status: 'fail',
      latency: Date.now() - start,
      message: error.message,
    };
  }
}

function checkMemory(): HealthCheck {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = (used.heapUsed / used.heapTotal) * 100;

  if (usagePercent > 90) {
    return {
      status: 'fail',
      message: `Memory usage critical: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
    };
  }
  
  if (usagePercent > 75) {
    return {
      status: 'warn',
      message: `Memory usage high: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
    };
  }

  return {
    status: 'pass',
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
  };
}
