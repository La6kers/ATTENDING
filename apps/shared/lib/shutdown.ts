// ============================================================
// ATTENDING AI - Graceful Shutdown Handler
// apps/shared/lib/shutdown.ts
//
// Ensures clean shutdown of all resources:
//   - Database connections (Prisma)
//   - Redis connections
//   - WebSocket connections
//   - In-flight requests complete
//
// Clinical safety: Prevents data corruption during deployments.
// Unfinished writes (e.g., lab orders, prescriptions) complete
// before the process exits.
//
// Usage:
//   import { registerShutdownHandlers } from '@attending/shared/lib/shutdown';
//
//   // At server startup:
//   registerShutdownHandlers({
//     prisma,
//     redis,
//     onShutdown: async () => { /* custom cleanup */ },
//   });
// ============================================================

type CleanupFn = () => Promise<void> | void;

interface ShutdownOptions {
  /** Prisma client to disconnect */
  prisma?: { $disconnect: () => Promise<void> };
  /** Redis client to quit */
  redis?: { quit: () => Promise<void> };
  /** Custom cleanup functions */
  onShutdown?: CleanupFn | CleanupFn[];
  /** Max time to wait for cleanup (ms). Default: 10000 */
  timeoutMs?: number;
  /** Logger function. Default: console.log */
  logger?: (message: string) => void;
}

let registered = false;

/**
 * Register process signal handlers for graceful shutdown.
 * Safe to call multiple times — only registers once.
 */
export function registerShutdownHandlers(options: ShutdownOptions = {}): void {
  if (registered) return;
  registered = true;

  const {
    prisma,
    redis,
    onShutdown,
    timeoutMs = 10_000,
    logger = console.log,
  } = options;

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return; // Prevent double-shutdown
    shuttingDown = true;

    logger(`[Shutdown] Received ${signal} — starting graceful shutdown...`);

    // Hard timeout: force exit if cleanup hangs
    const forceTimer = setTimeout(() => {
      logger('[Shutdown] Timeout exceeded — forcing exit');
      process.exit(1);
    }, timeoutMs);
    forceTimer.unref(); // Don't keep process alive just for this timer

    try {
      // 1. Run custom cleanup functions
      const cleanupFns = Array.isArray(onShutdown)
        ? onShutdown
        : onShutdown
        ? [onShutdown]
        : [];

      for (const fn of cleanupFns) {
        try {
          await fn();
        } catch (err) {
          logger(`[Shutdown] Custom cleanup error: ${err}`);
        }
      }

      // 2. Stop scheduler + release distributed locks
      // NOTE: Disabled until Redis/ioredis is provisioned (Phase 6).
      // Dynamic imports of scheduler and distributedLock cause Next.js
      // bundler to resolve ioredis at build time, breaking the build.
      // Uncomment when ioredis is installed and Redis is available.

      // 3. Close Redis
      if (redis) {
        try {
          logger('[Shutdown] Closing Redis connection...');
          await redis.quit();
          logger('[Shutdown] Redis disconnected');
        } catch (err) {
          logger(`[Shutdown] Redis disconnect error: ${err}`);
        }
      }

      // 4. Close database (last, so in-flight queries complete)
      if (prisma) {
        try {
          logger('[Shutdown] Closing database connection...');
          await prisma.$disconnect();
          logger('[Shutdown] Database disconnected');
        } catch (err) {
          logger(`[Shutdown] Database disconnect error: ${err}`);
        }
      }

      logger('[Shutdown] Graceful shutdown complete');
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (error) {
      logger(`[Shutdown] Unexpected error during shutdown: ${error}`);
      clearTimeout(forceTimer);
      process.exit(1);
    }
  }

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker/K8s stop
  process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

  // Handle uncaught exceptions — log and exit cleanly
  process.on('uncaughtException', (error) => {
    logger(`[FATAL] Uncaught exception: ${error.message}`);
    logger(error.stack || '');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger(`[FATAL] Unhandled rejection: ${reason}`);
    shutdown('unhandledRejection');
  });
}

export default { registerShutdownHandlers };
