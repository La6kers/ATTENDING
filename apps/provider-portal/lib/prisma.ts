// =============================================================================
// ATTENDING AI - Prisma Client Instance
// apps/provider-portal/lib/prisma.ts
// =============================================================================

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.LOG_SQL_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
