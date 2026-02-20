// ============================================================
// ATTENDING AI - Redis Module Exports
// apps/shared/lib/redis/index.ts
// ============================================================

export {
  redis,
  initializeRedis,
  checkRedisHealth,
  type RedisHealthCheck,
} from './client';

export {
  clinicalCache,
  type CacheConfig,
  type CacheStats,
  type CachedDifferential,
  type CachedDrugInteraction,
} from './cacheService';

export { default } from './client';
