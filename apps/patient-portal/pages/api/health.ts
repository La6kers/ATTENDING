// apps/patient-portal/pages/api/health.ts
// Health check endpoint for Azure App Service probes and Docker HEALTHCHECK
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    const dbMs = Date.now() - start;

    res.status(200).json({
      status: 'healthy',
      service: 'patient-portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: { status: 'ok', latencyMs: dbMs },
      },
    });
  } catch (error) {
    console.error('Health check failed:', (error as Error).message);
    res.status(503).json({
      status: 'unhealthy',
      service: 'patient-portal',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'error', message: 'Service unavailable' },
      },
    });
  }
}
