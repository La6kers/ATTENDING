// ============================================================
// ATTENDING AI - Production Structured Logger
// apps/shared/lib/logging/index.ts
//
// JSON-structured logging with:
//   - Request correlation IDs (X-Request-ID propagation)
//   - PHI masking (HIPAA compliance)
//   - Log level filtering via LOG_LEVEL env
//   - Structured JSON for production log aggregators
//   - Human-readable format for development
//   - Performance timing helpers
//   - HIPAA audit trail support
//
// Usage:
//   import { logger, withRequestId } from '@attending/shared/lib/logging';
//
//   logger.info('Patient chart opened', { patientId: 'P-001' });
//   logger.withRequestId('req-abc').info('Processing request');
//
// In API routes:
//   const log = withRequestId(req);
//   log.info('Lab order created', { orderId: 'L-123' });
// ============================================================

import { randomUUID } from 'crypto';
import type { NextApiRequest } from 'next';

// ============================================================
// TYPES
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  /** Duration in ms (for performance logging) */
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================
// PHI MASKING
// ============================================================

const PHI_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\(\d{3}\)\s*\d{3}[-.]?\d{4}/g, replacement: '[PHONE]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
  { pattern: /\bMRN[:\s]*\d{6,}\b/gi, replacement: '[MRN]' },
];

function maskPHI(text: string): string {
  let masked = text;
  for (const { pattern, replacement } of PHI_PATTERNS) {
    masked = masked.replace(pattern, replacement);
  }
  return masked;
}

function maskContext(ctx: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(maskPHI(JSON.stringify(ctx)));
  } catch {
    return { _maskError: 'Failed to mask context' };
  }
}

// ============================================================
// LOG LEVEL FILTERING
// ============================================================

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

function getMinLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || '').toLowerCase();
  if (env in LEVEL_PRIORITY) return env as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

// ============================================================
// OUTPUT FORMATTING
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';
const SERVICE_NAME = process.env.SERVICE_NAME || 'attending-ai';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

function emit(entry: LogEntry): void {
  if (isProduction) {
    // Structured JSON — one line per entry for log aggregators
    // (Datadog, CloudWatch, ELK, etc.)
    const output = JSON.stringify(entry);
    if (entry.level === 'error' || entry.level === 'critical') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  } else {
    // Human-readable for development
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase().padEnd(8)}]`;
    const reqId = entry.requestId ? ` [${entry.requestId.slice(0, 8)}]` : '';
    const dur = entry.durationMs != null ? ` (${entry.durationMs}ms)` : '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const err = entry.error ? ` ERROR: ${entry.error.message}` : '';

    const line = `${prefix}${reqId} ${entry.message}${dur}${ctx}${err}`;

    if (entry.level === 'error' || entry.level === 'critical') {
      console.error(line);
      if (entry.error?.stack && process.env.LOG_LEVEL === 'debug') {
        console.error(entry.error.stack);
      }
    } else if (entry.level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

// ============================================================
// LOGGER CLASS
// ============================================================

class Logger {
  private requestId?: string;
  private userId?: string;
  private sessionId?: string;
  private defaultContext?: Record<string, unknown>;

  constructor(options?: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    context?: Record<string, unknown>;
  }) {
    this.requestId = options?.requestId;
    this.userId = options?.userId;
    this.sessionId = options?.sessionId;
    this.defaultContext = options?.context;
  }

  /** Create a child logger with a specific request ID */
  withRequestId(requestId: string): Logger {
    return new Logger({
      requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      context: this.defaultContext,
    });
  }

  /** Create a child logger with user context */
  withUser(userId: string, sessionId?: string): Logger {
    return new Logger({
      requestId: this.requestId,
      userId,
      sessionId,
      context: this.defaultContext,
    });
  }

  // ---- Core log methods ----

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: maskPHI(message),
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
    };

    if (this.requestId) entry.requestId = this.requestId;
    if (this.userId) entry.userId = this.userId;
    if (this.sessionId) entry.sessionId = this.sessionId;

    const mergedCtx = { ...this.defaultContext, ...context };
    if (Object.keys(mergedCtx).length > 0) {
      entry.context = maskContext(mergedCtx);
    }

    if (context?.durationMs != null) {
      entry.durationMs = context.durationMs as number;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: maskPHI(error.message),
        stack: isProduction ? undefined : error.stack,
      };
    }

    emit(entry);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.log('error', message, context, err);
  }

  critical(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.log('critical', message, context, err);
  }

  // ---- HIPAA Audit ----

  audit(action: string, details: Record<string, unknown>) {
    this.log('info', `[AUDIT] ${action}`, {
      ...details,
      auditEvent: true,
      auditAction: action,
    });
  }

  // ---- Performance timing ----

  /** Start a timer, returns a function that logs the duration */
  time(label: string, context?: Record<string, unknown>): () => void {
    const start = performance.now();
    return () => {
      const durationMs = Math.round(performance.now() - start);
      this.info(label, { ...context, durationMs });
    };
  }
}

// ============================================================
// REQUEST ID HELPERS
// ============================================================

/**
 * Extract or generate a request ID from a Next.js request.
 * Checks X-Request-ID header first, then generates a new one.
 */
export function getRequestId(req: NextApiRequest): string {
  const existing = req.headers['x-request-id'];
  if (typeof existing === 'string' && existing) return existing;
  return randomUUID();
}

/**
 * Create a logger bound to the current request's correlation ID.
 *
 * @example
 * export default async function handler(req, res) {
 *   const log = withRequestId(req);
 *   log.info('Processing lab order');
 *   res.setHeader('X-Request-ID', getRequestId(req));
 * }
 */
export function withRequestId(req: NextApiRequest): Logger {
  const requestId = getRequestId(req);
  const userId = (req.headers['x-user-id'] as string) || undefined;
  const sessionId = req.cookies?.['session-id'] || undefined;

  return new Logger({ requestId, userId, sessionId });
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

export const logger = new Logger();
export { Logger };
export default logger;
