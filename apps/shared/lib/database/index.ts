// ============================================================
// ATTENDING AI - Database Module Exports
// apps/shared/lib/database/index.ts
// ============================================================

export {
  prisma,
  checkDatabaseHealth,
  connectDatabase,
  disconnectDatabase,
  getDatabaseConfig,
  type DatabaseConfig,
} from './config';

export { default } from './config';
