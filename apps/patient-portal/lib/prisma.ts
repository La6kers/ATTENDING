// ============================================================
// ATTENDING AI - Prisma Client Singleton
// apps/patient-portal/lib/prisma.ts
//
// This ensures we don't create multiple Prisma client instances
// during development hot reloading.
// ============================================================

// Re-export from shared package
export { prisma } from '@attending/shared/lib/prisma';
export default { prisma: () => import('@attending/shared/lib/prisma').then(m => m.prisma) };
