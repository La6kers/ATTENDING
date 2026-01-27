// ATTENDING AI - Production Logging with PHI Masking
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

const PHI_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
];

function maskPHI(text: string): string {
  let masked = text;
  for (const { pattern, replacement } of PHI_PATTERNS) masked = masked.replace(pattern, replacement);
  return masked;
}

class Logger {
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: maskPHI(message),
      context: context ? JSON.parse(maskPHI(JSON.stringify(context))) : undefined,
    };
    console.log(`[${entry.timestamp}] [${level.toUpperCase()}]`, entry.message, entry.context || '');
  }

  debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }
  info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
  warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, { ...context, error: error?.message });
  }
  audit(action: string, details: Record<string, unknown>) {
    this.log('info', `[AUDIT] ${action}`, { ...details, auditTimestamp: new Date().toISOString() });
  }
}

export const logger = new Logger();
export default logger;
