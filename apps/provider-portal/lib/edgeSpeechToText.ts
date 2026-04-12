/**
 * edgeSpeechToText.ts
 *
 * Edge Speech-to-Text service using the browser's built-in Web Speech API.
 * This provides free, on-device speech recognition before falling back to
 * paid cloud STT services, significantly reducing costs.
 *
 * Brand palette:
 *   Deep navy:  #0C3547
 *   Mid teal:   #1A8FA8
 */

// ---------------------------------------------------------------------------
// Type augmentation for Web Speech API
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface STTConfig {
  /** BCP-47 language tag (default: 'en-US') */
  language: string;
  /** Keep listening after each utterance (default: true) */
  continuous: boolean;
  /** Emit interim (non-final) results (default: true) */
  interimResults: boolean;
  /** Max alternative transcriptions per result (default: 1) */
  maxAlternatives: number;
}

export interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  speaker?: string;
}

export type STTStatus = 'idle' | 'listening' | 'paused' | 'error' | 'unsupported';

export interface STTEventHandlers {
  onTranscript: (segment: TranscriptSegment) => void;
  onStatusChange: (status: STTStatus) => void;
  onError: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: STTConfig = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 1,
};

const ERROR_MAP: Record<string, string> = {
  'no-speech': 'No speech detected',
  'audio-capture': 'Microphone not available',
  'not-allowed': 'Microphone permission denied',
  'network': 'Network error for speech recognition',
};

const MAX_RESTART_RETRIES = 3;
const RESTART_BACKOFF_MS = 500;

// ---------------------------------------------------------------------------
// EdgeSpeechToText
// ---------------------------------------------------------------------------

export class EdgeSpeechToText {
  private recognition: SpeechRecognition | null = null;
  private status: STTStatus = 'idle';
  private config: STTConfig;
  private handlers: STTEventHandlers;
  private sessionTranscript: TranscriptSegment[] = [];

  private explicitStop = false;
  private restartRetries = 0;

  // -----------------------------------------------------------------------
  // Static
  // -----------------------------------------------------------------------

  /** Check whether the browser supports the Web Speech API. */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  constructor(config: Partial<STTConfig> | undefined, handlers: STTEventHandlers) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;

    if (!EdgeSpeechToText.isSupported()) {
      this.setStatus('unsupported');
      return;
    }

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new Ctor();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
  }

  // -----------------------------------------------------------------------
  // Public methods
  // -----------------------------------------------------------------------

  /** Start speech recognition. */
  start(): void {
    if (!this.recognition) {
      this.handlers.onError('Speech recognition is not supported in this browser');
      return;
    }

    this.explicitStop = false;
    this.restartRetries = 0;
    this.bindEvents();

    try {
      this.recognition.start();
      this.setStatus('listening');
    } catch (err) {
      // Already started – ignore DOMException
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        return;
      }
      this.handlers.onError('Failed to start speech recognition');
    }
  }

  /** Stop recognition and clear auto-restart. */
  stop(): void {
    this.explicitStop = true;
    this.restartRetries = 0;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if not started
      }
    }

    this.setStatus('idle');
  }

  /** Pause recognition temporarily. */
  pause(): void {
    this.explicitStop = true; // prevent auto-restart while paused

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if not started
      }
    }

    this.setStatus('paused');
  }

  /** Resume recognition from a paused state. */
  resume(): void {
    if (this.status !== 'paused') return;

    this.explicitStop = false;
    this.restartRetries = 0;

    if (this.recognition) {
      try {
        this.recognition.start();
        this.setStatus('listening');
      } catch {
        this.handlers.onError('Failed to resume speech recognition');
      }
    }
  }

  /** Return all transcript segments from this session. */
  getSessionTranscript(): TranscriptSegment[] {
    return [...this.sessionTranscript];
  }

  /** Clear the accumulated session transcript. */
  clearSession(): void {
    this.sessionTranscript = [];
  }

  /** Get the current status. */
  getStatus(): STTStatus {
    return this.status;
  }

  /** Compute confidence statistics for final segments. */
  getConfidenceStats(): {
    averageConfidence: number;
    totalSegments: number;
    finalSegments: number;
  } {
    const finalSegments = this.sessionTranscript.filter((s) => s.isFinal);
    const totalConfidence = finalSegments.reduce((sum, s) => sum + s.confidence, 0);

    return {
      averageConfidence: finalSegments.length > 0 ? totalConfidence / finalSegments.length : 0,
      totalSegments: this.sessionTranscript.length,
      finalSegments: finalSegments.length,
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private setStatus(status: STTStatus): void {
    this.status = status;
    this.handlers.onStatusChange(status);
  }

  private bindEvents(): void {
    if (!this.recognition) return;

    // --- onresult ---
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result[0];

        const segment: TranscriptSegment = {
          text: alternative.transcript.trim(),
          confidence: alternative.confidence ?? 0,
          isFinal: result.isFinal,
          timestamp: Date.now(),
        };

        this.sessionTranscript.push(segment);
        this.handlers.onTranscript(segment);
      }

      // Reset retry count on successful results
      this.restartRetries = 0;
    };

    // --- onerror ---
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const friendlyMessage =
        ERROR_MAP[event.error] ?? `Speech recognition error: ${event.error}`;

      this.handlers.onError(friendlyMessage);

      // Fatal errors that should not trigger auto-restart
      const fatalErrors = ['not-allowed', 'audio-capture'];
      if (fatalErrors.includes(event.error)) {
        this.explicitStop = true;
        this.setStatus('error');
      }
    };

    // --- onend ---
    this.recognition.onend = () => {
      // Auto-restart in continuous mode unless explicitly stopped
      if (!this.explicitStop && this.config.continuous && this.restartRetries < MAX_RESTART_RETRIES) {
        this.restartRetries++;
        setTimeout(() => {
          if (this.explicitStop || !this.recognition) return;
          try {
            this.recognition.start();
            this.setStatus('listening');
          } catch {
            this.setStatus('error');
            this.handlers.onError('Failed to auto-restart speech recognition');
          }
        }, RESTART_BACKOFF_MS);
      } else if (!this.explicitStop) {
        // Max retries exceeded
        this.setStatus('idle');
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an EdgeSpeechToText instance.
 *
 * @param config  Partial configuration (merged with defaults).
 * @param handlers  Event callbacks for transcript, status, and error events.
 */
export function createEdgeSTT(
  config: Partial<STTConfig> | undefined,
  handlers: STTEventHandlers,
): EdgeSpeechToText {
  return new EdgeSpeechToText(config, handlers);
}
