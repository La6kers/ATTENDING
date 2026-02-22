// ============================================================
// ATTENDING AI - Instrumentation (Server Startup Hook)
// apps/provider-portal/instrumentation.ts
//
// Runs once when the Next.js server starts.
// Used for environment validation and startup diagnostics.
//
// Requires: next.config.js → experimental.instrumentationHook = true
// (or Next.js 15+ where it is enabled by default)
// ============================================================

export async function register() {
  // Only run on the server
  if (typeof window !== 'undefined') return;

  // 1. Validate environment configuration
  const { validateEnv } = await import('@attending/shared/lib/envValidation');

  try {
    const result = validateEnv({ fatal: process.env.NODE_ENV === 'production' });

    if (result.valid) {
      console.log(
        `[ATTENDING AI] Server starting in ${result.environment} mode`
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.warn('[ATTENDING AI] Env validation errors (non-fatal in dev):', error);
  }

  // 2. Register graceful shutdown handlers
  const { registerShutdownHandlers } = await import('@attending/shared/lib/shutdown');

  // Dynamic imports for optional services
  let prisma: any = null;
  let redis: any = null;

  try {
    const db = await import('@attending/shared/lib/database');
    prisma = db.prisma;
  } catch { /* Database module not available */ }

  try {
    const redisModule = await import('@attending/shared/lib/redis');
    redis = redisModule.redis;
  } catch { /* Redis module not available */ }

  registerShutdownHandlers({
    prisma,
    redis,
    timeoutMs: 15_000, // 15s for clinical data to finish writing
    logger: (msg) => console.log(msg),
  });

  // 3. Wire webhook event dispatcher
  if (prisma) {
    try {
      const { wireWebhookDispatcher } = await import('@attending/shared/lib/integrations/events');
      wireWebhookDispatcher(prisma);
      console.log('[ATTENDING AI] Webhook event dispatcher wired');
    } catch (err) {
      console.warn('[ATTENDING AI] Could not wire webhook dispatcher:', err);
    }
  }

  // 4. Initialize distributed lock service (multi-pod job coordination)
  try {
    const { distributedLock } = await import('@attending/shared/lib/distributedLock');
    await distributedLock.initialize(redis || undefined);
    console.log('[ATTENDING AI] Distributed lock initialized (instance:', distributedLock.getInstanceId(), ')');
  } catch (err) {
    console.warn('[ATTENDING AI] Could not initialize distributed lock:', err);
  }

  // 5. Initialize PHI cache service
  try {
    const { phiCache } = await import('@attending/shared/lib/phiCache');
    await phiCache.initialize(redis || undefined);
    console.log('[ATTENDING AI] PHI cache initialized (TTL:', process.env.PHI_CACHE_TTL_SECONDS || '14400', 'seconds)');
  } catch (err) {
    console.warn('[ATTENDING AI] Could not initialize PHI cache:', err);
  }

  // 6. Initialize alert engine with Redis persistence
  try {
    const { alertEngine } = await import('@attending/shared/lib/alerting');
    await alertEngine.initialize(redis || undefined);
    console.log('[ATTENDING AI] Alert engine initialized with Redis persistence');
  } catch (err) {
    console.warn('[ATTENDING AI] Could not initialize alert engine:', err);
  }

  // 7. Start background job scheduler
  try {
    const { scheduler } = await import('@attending/shared/lib/scheduler');
    scheduler.start();
    console.log('[ATTENDING AI] Background scheduler started');
  } catch (err) {
    console.warn('[ATTENDING AI] Could not start scheduler:', err);
  }

  console.log('[ATTENDING AI] Server initialization complete');
}
