// ============================================================
// ATTENDING AI - Health Check API
// apps/provider-portal/pages/api/health.ts
//
// Comprehensive system health monitoring
// Checks: Database, Redis, External Services
//
// Security: Limited information exposure in production
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { checkDatabaseHealth } from '@attending/shared/lib/database';
import { checkRedisHealth } from '@attending/shared/lib/redis';

// ============================================================
// TYPES
// ============================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

// ============================================================
// UPTIME TRACKING
// ============================================================

const startTime = Date.now();

function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

// ============================================================
// HEALTH CHECKS
// ============================================================

async function checkDatabase(): Promise<ComponentHealth> {
  try {
    const result = await checkDatabaseHealth();
    
    return {
      status: result.healthy ? 'up' : 'down',
      latencyMs: result.latencyMs,
      message: result.error,
      details: process.env.NODE_ENV === 'development' ? {
        provider: result.provider,
      } : undefined,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  try {
    const result = await checkRedisHealth();
    
    return {
      status: result.healthy ? 'up' : 'down',
      latencyMs: result.latencyMs,
      message: result.error,
      details: process.env.NODE_ENV === 'development' ? {
        mode: result.mode,
      } : undefined,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkMemory(): ComponentHealth {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const heapPercentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);
  
  let status: 'up' | 'degraded' | 'down' = 'up';
  if (heapPercentage > 90) {
    status = 'down';
  } else if (heapPercentage > 75) {
    status = 'degraded';
  }
  
  return {
    status,
    details: process.env.NODE_ENV === 'development' ? {
      heapUsedMB,
      heapTotalMB,
      heapPercentage,
      rssMB: Math.round(usage.rss / 1024 / 1024),
    } : undefined,
  };
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus | { error: string }>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Require secret for detailed health info
  const secret = req.headers['x-health-secret'] || req.query.secret;
  const isAuthorized = secret === process.env.HEALTH_CHECK_SECRET;
  
  // Run all health checks in parallel
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  
  const memory = checkMemory();
  
  // Determine overall status
  const checks = { database, redis, memory };
  const allStatuses = Object.values(checks).map(c => c.status);
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (allStatuses.includes('down')) {
    // Database down = unhealthy, others = degraded
    overallStatus = database.status === 'down' ? 'unhealthy' : 'degraded';
  } else if (allStatuses.includes('degraded')) {
    overallStatus = 'degraded';
  }
  
  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: getUptime(),
    checks: isAuthorized ? checks : {
      // Limited info for unauthorized requests
      database: { status: database.status },
      redis: { status: redis.status },
      memory: { status: memory.status },
    },
  };
  
  // Set appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 200 : 503;
  
  // Cache control - don't cache health checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(statusCode).json(response);
}
