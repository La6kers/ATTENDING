// ============================================================
// ATTENDING AI - Instrumentation (Server Startup Hook)
// apps/provider-portal/instrumentation.ts
//
// Runs once when the Next.js server starts.
// Validates environment and logs startup diagnostics.
//
// NOTE: Enterprise services (Redis, distributed locks, PHI cache,
// alert engine, scheduler) are disabled until infrastructure is
// provisioned. Enable them in Phase 6 when Azure is configured.
// ============================================================

export async function register() {
  if (typeof window !== 'undefined') return;

  // 1. Validate environment configuration
  try {
    const { validateEnv } = await import('@attending/shared/lib/envValidation');
    const result = validateEnv({ fatal: process.env.NODE_ENV === 'production' });

    if (result.valid) {
      console.log(`[ATTENDING AI] Server starting in ${result.environment} mode`);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.warn('[ATTENDING AI] Env validation errors (non-fatal in dev):', error);
  }

  // 2. Register graceful shutdown handlers
  try {
    const { registerShutdownHandlers } = await import('@attending/shared/lib/shutdown');

    let prisma: any = null;
    try {
      const db = await import('@attending/shared/lib/database');
      prisma = db.prisma;
    } catch { /* Database module not available */ }

    registerShutdownHandlers({
      prisma,
      redis: null,
      timeoutMs: 15_000,
      logger: (msg: string) => console.log(msg),
    });
  } catch (err) {
    console.warn('[ATTENDING AI] Could not register shutdown handlers:', err);
  }

  // 3. Wire webhook event dispatcher (if database is available)
  try {
    const db = await import('@attending/shared/lib/database');
    if (db.prisma) {
      const { wireWebhookDispatcher } = await import('@attending/shared/lib/integrations/events');
      wireWebhookDispatcher(db.prisma);
      console.log('[ATTENDING AI] Webhook event dispatcher wired');
    }
  } catch {
    // Database or webhook module not available — fine in dev
  }

  // ── Enterprise services (Phase 6) ──────────────────────────
  // The following are disabled until Redis and Azure infrastructure
  // are provisioned. Uncomment when ready:
  //
  // - Distributed lock (requires ioredis)
  // - PHI cache (requires Redis)
  // - Alert engine (requires Redis)
  // - Background scheduler (requires database + Redis)

  console.log('[ATTENDING AI] Server initialization complete');
}
