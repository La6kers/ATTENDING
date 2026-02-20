// ============================================================
// ATTENDING AI - Request Correlation & Distributed Tracing
// apps/shared/lib/tracing.ts
//
// Propagates a unique trace/correlation ID through every layer:
// middleware → handler → database → integrations → webhooks → logs
//
// Headers: X-Request-ID, X-Correlation-ID, traceparent (W3C)
// ============================================================

import { randomUUID, randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export interface TraceContext {
  requestId: string;
  traceId: string;
  parentSpanId?: string;
  spanId: string;
  startTime: number;
  method?: string;
  path?: string;
  userId?: string;
  organizationId?: string;
  spans: SpanRecord[];
}

export interface SpanRecord {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  error?: string;
}

export interface Span {
  spanId: string;
  name: string;
  setAttribute(key: string, value: string | number | boolean): void;
  setError(error: Error | string): void;
  end(): void;
}

// ============================================================
// ASYNC LOCAL STORAGE
// ============================================================

const traceStorage = new AsyncLocalStorage<TraceContext>();

export function getCurrentTrace(): TraceContext | null {
  return traceStorage.getStore() || null;
}

export function getRequestId(): string | null {
  return getCurrentTrace()?.requestId || null;
}

// ============================================================
// TRACE CONTEXT CREATION
// ============================================================

export function getTraceContext(req: {
  headers: Record<string, any>;
  method?: string;
  url?: string;
}): TraceContext {
  const incomingRequestId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const incomingTraceParent = req.headers['traceparent'] as string;

  let traceId: string;
  let parentSpanId: string | undefined;

  if (incomingTraceParent) {
    const parts = incomingTraceParent.split('-');
    if (parts.length >= 3) {
      traceId = parts[1];
      parentSpanId = parts[2];
    } else {
      traceId = generateTraceId();
    }
  } else {
    traceId = generateTraceId();
  }

  return {
    requestId: (incomingRequestId as string) || randomUUID(),
    traceId,
    parentSpanId,
    spanId: generateSpanId(),
    startTime: performance.now(),
    method: req.method,
    path: req.url?.split('?')[0],
    spans: [],
  };
}

export function withTrace<T>(trace: TraceContext, fn: () => T | Promise<T>): T | Promise<T> {
  return traceStorage.run(trace, fn);
}

// ============================================================
// SPAN MANAGEMENT
// ============================================================

export function startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
  const trace = getCurrentTrace();
  const spanId = generateSpanId();
  const startTime = performance.now();

  const record: SpanRecord = {
    spanId,
    parentSpanId: trace?.spanId,
    name,
    startTime,
    status: 'ok',
    attributes: attributes || {},
  };

  if (trace) trace.spans.push(record);

  return {
    spanId,
    name,
    setAttribute(key: string, value: string | number | boolean) { record.attributes[key] = value; },
    setError(error: Error | string) {
      record.status = 'error';
      record.error = error instanceof Error ? error.message : error;
    },
    end() {
      record.endTime = performance.now();
      record.durationMs = Math.round(record.endTime - record.startTime);
    },
  };
}

export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn(span);
    span.end();
    return result;
  } catch (error) {
    span.setError(error instanceof Error ? error : new Error(String(error)));
    span.end();
    throw error;
  }
}

// ============================================================
// RESPONSE / PROPAGATION HEADERS
// ============================================================

export function setTraceHeaders(
  res: { setHeader: (name: string, value: string) => void },
  trace: TraceContext
): void {
  res.setHeader('X-Request-ID', trace.requestId);
  res.setHeader('X-Trace-ID', trace.traceId);
  res.setHeader('traceresponse', `00-${trace.traceId}-${trace.spanId}-01`);
}

export function getOutboundHeaders(trace?: TraceContext | null): Record<string, string> {
  const t = trace || getCurrentTrace();
  if (!t) return {};
  return {
    'X-Request-ID': t.requestId,
    'X-Correlation-ID': t.requestId,
    'traceparent': `00-${t.traceId}-${t.spanId}-01`,
  };
}

// ============================================================
// TRACE SUMMARY
// ============================================================

export function getTraceSummary(trace: TraceContext) {
  return {
    requestId: trace.requestId,
    traceId: trace.traceId,
    method: trace.method,
    path: trace.path,
    totalDurationMs: Math.round(performance.now() - trace.startTime),
    spanCount: trace.spans.length,
    spans: trace.spans.map(s => ({ name: s.name, durationMs: s.durationMs, status: s.status })),
  };
}

// ============================================================
// HELPERS
// ============================================================

function generateTraceId(): string { return randomBytes(16).toString('hex'); }
function generateSpanId(): string { return randomBytes(8).toString('hex'); }

export default {
  getTraceContext, withTrace, getCurrentTrace, getRequestId,
  startSpan, traceAsync, setTraceHeaders, getOutboundHeaders, getTraceSummary,
};
