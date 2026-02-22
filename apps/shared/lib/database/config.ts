// ============================================================
// ATTENDING AI - Database Configuration
// apps/shared/lib/database/config.ts
//
// Supports both SQLite (development) and PostgreSQL (production)
// Production database MUST have encryption at rest enabled
//
// HIPAA Requirement: 164.312(a)(2)(iv) - Encryption and Decryption
// ============================================================

import { PrismaClient } from '@prisma/client';

// ============================================================
// TYPES
// ============================================================

export interface DatabaseConfig {
  provider: 'sqlite' | 'postgresql' | 'sqlserver';
  url: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeout: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

function getDatabaseConfig(): DatabaseConfig {
  // Auto-detect provider from DATABASE_URL
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  let provider: 'sqlite' | 'postgresql' | 'sqlserver';
  if (url.startsWith('sqlserver://')) {
    provider = 'sqlserver';
  } else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    provider = 'postgresql';
  } else {
    provider = 'sqlite';
  }
  
  // Production should always use SQL Server (Azure SQL) or PostgreSQL
  if (process.env.NODE_ENV === 'production' && provider === 'sqlite') {
    console.warn('[DATABASE] WARNING: Using SQLite in production is not HIPAA-compliant!');
    console.warn('[DATABASE] Please configure SQL Server or PostgreSQL with encryption at rest.');
  }
  
  return {
    provider,
    url,
    ssl: (provider === 'postgresql' || provider === 'sqlserver') && process.env.NODE_ENV === 'production',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '5', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10),
  };
}

// ============================================================
// PRISMA CLIENT SINGLETON
// ============================================================

// Global singleton to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();
  
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    datasources: {
      db: {
        url: config.url,
      },
    },
  });
  
  // Log connection info (without sensitive details)
  console.log(`[DATABASE] Connecting to ${config.provider} database`);
  if (config.ssl) {
    console.log('[DATABASE] SSL/TLS enabled');
  }
  
  return prisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ============================================================
// DATABASE HEALTH CHECK
// ============================================================

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  provider: string;
  latencyMs: number;
  error?: string;
}> {
  const config = getDatabaseConfig();
  const start = Date.now();
  
  try {
    // Simple query to check connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      healthy: true,
      provider: config.provider,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      provider: config.provider,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// CONNECTION MANAGEMENT
// ============================================================

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[DATABASE] Connected successfully');
  } catch (error) {
    console.error('[DATABASE] Connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[DATABASE] Disconnected');
  } catch (error) {
    console.error('[DATABASE] Disconnect error:', error);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

// ============================================================
// EXPORTS
// ============================================================

export { getDatabaseConfig };
export default prisma;
