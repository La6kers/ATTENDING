// ============================================================
// ATTENDING AI - Observability Metrics
// apps/shared/lib/metrics.ts
//
// Prometheus-compatible metrics collection for:
//   - HTTP request counts + latency histograms
//   - Error rates by endpoint + code
//   - Integration health (FHIR, HL7v2, webhooks)
//   - Background job execution stats
//
// Endpoints:
//   GET /api/metrics           → Prometheus text format
//   GET /api/admin/dashboard   → JSON dashboard data
// ============================================================

// ============================================================
// TYPES
// ============================================================

export interface Counter {
  name: string;
  help: string;
  labels: Record<string, number>;
}

export interface Histogram {
  name: string;
  help: string;
  buckets: number[];
  observations: Map<string, number[]>;
}

export interface Gauge {
  name: string;
  help: string;
  values: Record<string, number>;
}

export interface DashboardData {
  uptime: { seconds: number; human: string };
  requests: {
    total: number;
    errors: number;
    errorRate: string;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    topEndpoints: Array<{ path: string; count: number }>;
  };
  latency: { p50: number; p95: number; p99: number; avg: number };
  integrations: Record<string, number>;
  scheduler: any;
}

// ============================================================
// METRICS REGISTRY
// ============================================================

class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();
  private gauges = new Map<string, Gauge>();
  private startTime = Date.now();

  // ---- Counters ----

  counter(name: string, help: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, labels: {} });
    }
    return this.counters.get(name)!;
  }

  inc(name: string, labels: string = '', value: number = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;
    counter.labels[labels] = (counter.labels[labels] || 0) + value;
  }

  // ---- Histograms ----

  histogram(name: string, help: string, buckets?: number[]): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        buckets: buckets || [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
        observations: new Map(),
      });
    }
    return this.histograms.get(name)!;
  }

  observe(name: string, labels: string, value: number): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;
    if (!histogram.observations.has(labels)) {
      histogram.observations.set(labels, []);
    }
    const obs = histogram.observations.get(labels)!;
    obs.push(value);
    if (obs.length > 10000) obs.splice(0, obs.length - 10000);
  }

  // ---- Gauges ----

  gauge(name: string, help: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, values: {} });
    }
    return this.gauges.get(name)!;
  }

  set(name: string, labels: string, value: number): void {
    const gauge = this.gauges.get(name);
    if (!gauge) return;
    gauge.values[labels] = value;
  }

  // ---- Export: Prometheus text format ----

  toPrometheus(): string {
    const lines: string[] = [];

    lines.push(`# HELP attending_uptime_seconds Server uptime in seconds`);
    lines.push(`# TYPE attending_uptime_seconds gauge`);
    lines.push(`attending_uptime_seconds ${Math.round((Date.now() - this.startTime) / 1000)}`);
    lines.push('');

    for (const counter of this.counters.values()) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const [labels, value] of Object.entries(counter.labels)) {
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${counter.name}${labelStr} ${value}`);
      }
      lines.push('');
    }

    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      for (const [labels, observations] of histogram.observations) {
        const sorted = [...observations].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const labelStr = labels ? `${labels},` : '';

        for (const bucket of histogram.buckets) {
          const le = sorted.filter(v => v <= bucket).length;
          lines.push(`${histogram.name}_bucket{${labelStr}le="${bucket}"} ${le}`);
        }
        lines.push(`${histogram.name}_bucket{${labelStr}le="+Inf"} ${count}`);
        lines.push(`${histogram.name}_sum{${labels || ''}} ${sum}`);
        lines.push(`${histogram.name}_count{${labels || ''}} ${count}`);
      }
      lines.push('');
    }

    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const [labels, value] of Object.entries(gauge.values)) {
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${gauge.name}${labelStr} ${value}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ---- Export: JSON dashboard ----

  toDashboard(): DashboardData {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);

    const requestCounter = this.counters.get('http_requests_total');
    const totalRequests = requestCounter
      ? Object.values(requestCounter.labels).reduce((a, b) => a + b, 0)
      : 0;

    const errorCounter = this.counters.get('http_errors_total');
    const totalErrors = errorCounter
      ? Object.values(errorCounter.labels).reduce((a, b) => a + b, 0)
      : 0;

    const latencyHist = this.histograms.get('http_request_duration_ms');
    const allLatencies: number[] = [];
    if (latencyHist) {
      for (const obs of latencyHist.observations.values()) {
        allLatencies.push(...obs);
      }
    }
    allLatencies.sort((a, b) => a - b);

    return {
      uptime: { seconds: uptimeSeconds, human: formatUptime(uptimeSeconds) },
      requests: {
        total: totalRequests,
        errors: totalErrors,
        errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%' : '0%',
        byMethod: groupLabelValues(requestCounter, 'method'),
        byStatus: groupLabelValues(requestCounter, 'status'),
        topEndpoints: getTopEndpoints(requestCounter, 10),
      },
      latency: {
        p50: percentile(allLatencies, 50),
        p95: percentile(allLatencies, 95),
        p99: percentile(allLatencies, 99),
        avg: allLatencies.length > 0 ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length) : 0,
      },
      integrations: {
        hl7v2MessagesReceived: getCounterValue(this.counters.get('hl7v2_messages_total')),
        webhooksDelivered: getCounterValue(this.counters.get('webhooks_delivered_total')),
        webhooksFailed: getCounterValue(this.counters.get('webhooks_failed_total')),
        fhirRequests: getCounterValue(this.counters.get('fhir_requests_total')),
      },
      scheduler: [],
    };
  }
}

// ============================================================
// SINGLETON + METRIC DEFINITIONS
// ============================================================

export const metrics = new MetricsRegistry();

metrics.counter('http_requests_total', 'Total HTTP requests');
metrics.counter('http_errors_total', 'Total HTTP errors');
metrics.counter('hl7v2_messages_total', 'Total HL7v2 messages received');
metrics.counter('webhooks_delivered_total', 'Total webhooks delivered');
metrics.counter('webhooks_failed_total', 'Total webhook delivery failures');
metrics.counter('fhir_requests_total', 'Total FHIR API requests');
metrics.counter('auth_failures_total', 'Total authentication failures');
metrics.counter('rate_limit_hits_total', 'Total rate limit hits');
metrics.counter('import_records_total', 'Total records imported');
metrics.counter('export_jobs_total', 'Total bulk export jobs');

metrics.histogram('http_request_duration_ms', 'HTTP request duration in milliseconds');
metrics.histogram('db_query_duration_ms', 'Database query duration in milliseconds', [1, 5, 10, 25, 50, 100, 250, 500, 1000]);
metrics.histogram('fhir_request_duration_ms', 'FHIR API call duration in milliseconds');
metrics.histogram('webhook_delivery_duration_ms', 'Webhook delivery duration in milliseconds');

metrics.gauge('active_connections', 'Active WebSocket connections');
metrics.gauge('integration_health', 'Integration connection health (1=healthy, 0.5=degraded, 0=down)');

// ============================================================
// MIDDLEWARE HELPERS
// ============================================================

/**
 * Record HTTP request metrics. Call at end of every request.
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  const normalizedPath = normalizePath(path);

  metrics.inc('http_requests_total', `method="${method}",path="${normalizedPath}",status="${statusCode}"`);

  if (statusCode >= 400) {
    metrics.inc('http_errors_total', `method="${method}",path="${normalizedPath}",status="${statusCode}"`);
  }

  if (statusCode === 429) {
    metrics.inc('rate_limit_hits_total', `path="${normalizedPath}"`);
  }

  if (statusCode === 401 || statusCode === 403) {
    metrics.inc('auth_failures_total', `path="${normalizedPath}",status="${statusCode}"`);
  }

  metrics.observe('http_request_duration_ms', `method="${method}",path="${normalizedPath}"`, durationMs);
}

/** Record integration-specific metrics */
export function recordIntegrationMetric(type: 'hl7v2' | 'webhook' | 'fhir', success: boolean, durationMs?: number): void {
  switch (type) {
    case 'hl7v2':
      metrics.inc('hl7v2_messages_total', success ? 'status="success"' : 'status="error"');
      break;
    case 'webhook':
      metrics.inc(success ? 'webhooks_delivered_total' : 'webhooks_failed_total');
      if (durationMs) metrics.observe('webhook_delivery_duration_ms', '', durationMs);
      break;
    case 'fhir':
      metrics.inc('fhir_requests_total', success ? 'status="success"' : 'status="error"');
      if (durationMs) metrics.observe('fhir_request_duration_ms', '', durationMs);
      break;
  }
}

// ============================================================
// UTILITIES
// ============================================================

function normalizePath(path: string): string {
  return path
    .split('?')[0]
    .replace(/\/[a-f0-9-]{36}/g, '/:id')
    .replace(/\/[A-Z]+-\d+/g, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/P-\d+/g, '/:patientId');
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getCounterValue(counter?: Counter): number {
  if (!counter) return 0;
  return Object.values(counter.labels).reduce((a, b) => a + b, 0);
}

function groupLabelValues(counter: Counter | undefined, labelKey: string): Record<string, number> {
  if (!counter) return {};
  const result: Record<string, number> = {};
  for (const [labels, value] of Object.entries(counter.labels)) {
    const match = labels.match(new RegExp(`${labelKey}="([^"]+)"`));
    if (match) {
      const key = match[1];
      result[key] = (result[key] || 0) + value;
    }
  }
  return result;
}

function getTopEndpoints(counter: Counter | undefined, limit: number): Array<{ path: string; count: number }> {
  if (!counter) return [];
  const pathCounts: Record<string, number> = {};
  for (const [labels, value] of Object.entries(counter.labels)) {
    const match = labels.match(/path="([^"]+)"/);
    if (match) {
      pathCounts[match[1]] = (pathCounts[match[1]] || 0) + value;
    }
  }
  return Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }));
}

export default metrics;
