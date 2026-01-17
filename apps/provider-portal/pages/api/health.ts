// Health Check API
// apps/provider-portal/pages/api/health.ts
//
// Used by load balancers, Kubernetes probes, and monitoring systems

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/api/prisma';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'error';
  };
  details?: {
    dbLatency?: number;
    memoryUsage?: {
      heapUsed: number;
      heapTotal: number;
      percentage: number;
    };
    error?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const _startTime = Date.now();
  
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatency: number | undefined;
  let dbError: string | undefined;

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'error';
    dbError = error instanceof Error ? error.message : 'Database connection failed';
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const heapPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  let memoryStatus: 'ok' | 'warning' | 'error' = 'ok';
  
  if (heapPercentage > 90) {
    memoryStatus = 'error';
  } else if (heapPercentage > 75) {
    memoryStatus = 'warning';
  }

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (dbStatus === 'error') {
    status = 'unhealthy';
  } else if (memoryStatus === 'error') {
    status = 'unhealthy';
  } else if (memoryStatus === 'warning') {
    status = 'degraded';
  }

  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: dbStatus,
      memory: memoryStatus,
    },
    details: {
      dbLatency,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round(heapPercentage),
      },
      ...(dbError && { error: dbError }),
    },
  };

  // Return appropriate status code
  const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return res.status(statusCode).json(response);
}
