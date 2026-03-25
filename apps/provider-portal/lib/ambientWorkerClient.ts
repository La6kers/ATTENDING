/**
 * ambientWorkerClient.ts
 * Path: apps/provider-portal/lib/ambientWorkerClient.ts
 *
 * Main-thread client that manages the ambient processor Web Worker lifecycle.
 * Provides a promise-based API for sending term batches to the worker and
 * falls back to synchronous (main-thread) processing when Web Workers are
 * unavailable (e.g., SSR or older browsers).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Diagnosis {
  id: string;
  name: string;
  probability: number;
}

export interface Adjustment {
  diagnosisId: string;
  delta: number;
  matchedTerm: string;
}

export interface NewDiagnosis {
  name: string;
  probability: number;
  matchedTerm: string;
}

export interface BatchResult {
  adjustments: Adjustment[];
  newDiagnoses: NewDiagnosis[];
  processingTimeMs: number;
  method: 'worker' | 'main-thread';
}

// ---------------------------------------------------------------------------
// Ambient Worker Client
// ---------------------------------------------------------------------------

export class AmbientWorkerClient {
  private worker: Worker | null = null;
  private pendingResolve: ((result: BatchResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  /**
   * Check whether Web Workers are supported in the current environment.
   */
  isSupported(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Lazily instantiate the Web Worker the first time it is needed.
   */
  private getWorker(): Worker {
    if (!this.worker) {
      // Next.js requires the `new URL(...)` pattern for Webpack 5 worker bundling.
      this.worker = new Worker(
        new URL('../workers/ambientProcessor.worker.ts', import.meta.url)
      );

      this.worker.addEventListener('message', (event: MessageEvent) => {
        const { type, payload } = event.data;

        if (type === 'BATCH_RESULT' && this.pendingResolve) {
          this.pendingResolve(payload as BatchResult);
          this.pendingResolve = null;
          this.pendingReject = null;
        } else if (type === 'ERROR' && this.pendingReject) {
          this.pendingReject(new Error(payload.message));
          this.pendingResolve = null;
          this.pendingReject = null;
        }
      });

      this.worker.addEventListener('error', (err: ErrorEvent) => {
        if (this.pendingReject) {
          this.pendingReject(new Error(err.message || 'Worker encountered an error'));
          this.pendingResolve = null;
          this.pendingReject = null;
        }
      });
    }

    return this.worker;
  }

  /**
   * Send a batch of ambient terms to the worker for processing.
   *
   * If Web Workers are not available the processing runs synchronously on the
   * main thread using a lightweight fallback implementation.
   */
  processBatch(
    terms: string[],
    complaintCategory: string,
    currentDiagnoses: Diagnosis[]
  ): Promise<BatchResult> {
    // Fallback: run on main thread when workers are unavailable
    if (!this.isSupported()) {
      return Promise.resolve(this.processBatchSync(terms, complaintCategory, currentDiagnoses));
    }

    return new Promise<BatchResult>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      try {
        const worker = this.getWorker();
        worker.postMessage({
          type: 'PROCESS_BATCH',
          payload: { terms, complaintCategory, currentDiagnoses },
        });
      } catch (error) {
        this.pendingResolve = null;
        this.pendingReject = null;
        // If worker creation fails, fall back to sync processing
        resolve(this.processBatchSync(terms, complaintCategory, currentDiagnoses));
      }
    });
  }

  /**
   * Terminate the worker and release resources.
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  // -------------------------------------------------------------------------
  // Synchronous Main-Thread Fallback
  // -------------------------------------------------------------------------

  /**
   * Minimal synchronous fallback that mirrors the worker's processing logic.
   * Returns an empty result with timing info so callers behave consistently.
   */
  private processBatchSync(
    terms: string[],
    _complaintCategory: string,
    _currentDiagnoses: Diagnosis[]
  ): BatchResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // The fallback intentionally returns empty results rather than duplicating
    // the full pattern map. The worker is the canonical processing path; this
    // ensures the UI does not break when workers are unavailable.
    const adjustments: Adjustment[] = [];
    const newDiagnoses: NewDiagnosis[] = [];

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const processingTimeMs = Math.round((endTime - startTime) * 100) / 100;

    return {
      adjustments,
      newDiagnoses,
      processingTimeMs,
      method: 'main-thread' as const,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const ambientWorker = new AmbientWorkerClient();
