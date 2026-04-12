// ============================================================
// ATTENDING AI - Circuit Breaker
// apps/shared/lib/circuitBreaker.ts
//
// Prevents cascading failures when external services go down.
// Three states:
//   CLOSED  → Normal operation, requests pass through
//   OPEN    → Service is down, fail fast (no requests sent)
//   HALF_OPEN → Testing if service has recovered
//
// Used for:
//   - AI inference (BioMistral, OpenAI)
//   - FHIR integration (Epic, Cerner)
//   - Drug interaction APIs
//   - External notification services
//
// Usage:
//   const aiBreaker = new CircuitBreaker('biomistral', {
//     failureThreshold: 3,
//     resetTimeoutMs: 30_000,
//   });
//
//   const result = await aiBreaker.execute(() => callBioMistral(prompt));
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit. Default: 5 */
  failureThreshold?: number;
  /** Time in ms before trying again (OPEN → HALF_OPEN). Default: 30000 */
  resetTimeoutMs?: number;
  /** Number of successful calls in HALF_OPEN to close circuit. Default: 2 */
  successThreshold?: number;
  /** Time window in ms for counting failures. Default: 60000 */
  windowMs?: number;
  /** Custom function to determine if an error should count as a failure */
  isFailure?: (error: Error) => boolean;
  /** Called when state changes */
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
}

// ============================================================
// CIRCUIT BREAKER ERROR
// ============================================================

export class CircuitOpenError extends Error {
  public readonly circuitName: string;
  public readonly retryAfterMs: number;

  constructor(name: string, retryAfterMs: number) {
    super(`Circuit breaker "${name}" is OPEN. Retry after ${retryAfterMs}ms.`);
    this.name = 'CircuitOpenError';
    this.circuitName = name;
    this.retryAfterMs = retryAfterMs;
  }
}

// ============================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================

export class CircuitBreaker {
  private readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private windowStart: number = Date.now();
  private totalRequests: number = 0;
  private totalFailures: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly windowMs: number;
  private readonly isFailure: (error: Error) => boolean;
  private readonly onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
    this.windowMs = options.windowMs ?? 60_000;
    this.isFailure = options.isFailure ?? (() => true);
    this.onStateChange = options.onStateChange;
  }

  /** Get current stats */
  getStats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  /** Manually reset the breaker to CLOSED */
  reset(): void {
    this.transition('CLOSED');
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param fn - The async function to protect
   * @param fallback - Optional fallback when circuit is OPEN
   * @returns The result of fn() or fallback()
   * @throws CircuitOpenError if OPEN and no fallback provided
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    this.totalRequests++;

    // Check if failure window has expired → reset counter
    if (Date.now() - this.windowStart > this.windowMs) {
      this.windowStart = Date.now();
      if (this.state === 'CLOSED') {
        this.failures = 0;
      }
    }

    // OPEN: fail fast or use fallback
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime || 0);

      if (elapsed >= this.resetTimeoutMs) {
        // Transition to HALF_OPEN — allow one test request
        this.transition('HALF_OPEN');
      } else {
        // Still in cooldown
        if (fallback) return fallback();
        throw new CircuitOpenError(this.name, this.resetTimeoutMs - elapsed);
      }
    }

    // CLOSED or HALF_OPEN: attempt the call
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.isFailure(err)) {
        this.onFailure();
      }

      throw error;
    }
  }

  // ---- Internal state management ----

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.transition('CLOSED');
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in normal operation
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery test → reopen
      this.transition('OPEN');
      this.successes = 0;
    } else if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      this.transition('OPEN');
    }
  }

  private transition(newState: CircuitState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.onStateChange?.(this.name, oldState, newState);
  }
}

// ============================================================
// PRE-CONFIGURED BREAKERS FOR ATTENDING AI SERVICES
// ============================================================

/** Default state change logger */
function logStateChange(name: string, from: CircuitState, to: CircuitState) {
  const emoji = to === 'OPEN' ? '🔴' : to === 'HALF_OPEN' ? '🟡' : '🟢';
  console.warn(`${emoji} [CircuitBreaker] ${name}: ${from} → ${to}`);
}

/** AI inference services (BioMistral, OpenAI) */
export const aiCircuitBreaker = new CircuitBreaker('ai-inference', {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,   // 30s cooldown
  successThreshold: 2,
  onStateChange: logStateChange,
  isFailure: (err) => {
    // Don't count validation errors as service failures
    if (err.message.includes('validation') || err.message.includes('400')) {
      return false;
    }
    return true;
  },
});

/** FHIR integration (Epic, Cerner) */
export const fhirCircuitBreaker = new CircuitBreaker('fhir-integration', {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,   // 1min cooldown (FHIR outages tend to last longer)
  successThreshold: 3,
  onStateChange: logStateChange,
});

/** Drug interaction API */
export const drugCheckCircuitBreaker = new CircuitBreaker('drug-interaction', {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  successThreshold: 2,
  onStateChange: logStateChange,
});

/**
 * Get stats for all registered breakers.
 * Useful for the health check endpoint.
 */
export function getAllCircuitBreakerStats(): CircuitBreakerStats[] {
  return [
    aiCircuitBreaker.getStats(),
    fhirCircuitBreaker.getStats(),
    drugCheckCircuitBreaker.getStats(),
  ];
}

export default CircuitBreaker;
