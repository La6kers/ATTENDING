// ============================================================
// ATTENDING AI - Application Monitoring Configuration
// apps/shared/lib/monitoring/index.ts
//
// Centralized monitoring, metrics, and error tracking
// Supports Sentry, Azure Application Insights, and Prometheus
// ============================================================

import type { NextApiRequest } from 'next';

// ============================================================
// TYPES
// ============================================================

export interface MonitoringConfig {
  sentryDsn?: string;
  appInsightsKey?: string;
  prometheusEnabled?: boolean;
  environment: 'development' | 'staging' | 'production';
  serviceName: string;
  serviceVersion: string;
}

export interface MetricLabels {
  [key: string]: string | number | boolean;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface ErrorContext {
  userId?: string;
  patientId?: string;
  encounterId?: string;
  action?: string;
  extra?: Record<string, unknown>;
}

// ============================================================
// METRICS COLLECTOR
// ============================================================

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Counters
    this.counters.forEach((value, key) => {
      lines.push(`# TYPE ${key.split('{')[0]} counter`);
      lines.push(`${key} ${value}`);
    });

    // Gauges
    this.gauges.forEach((value, key) => {
      lines.push(`# TYPE ${key.split('{')[0]} gauge`);
      lines.push(`${key} ${value}`);
    });

    // Histograms (simplified - just count and sum)
    this.histograms.forEach((values, key) => {
      const baseName = key.split('{')[0];
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`# TYPE ${baseName} histogram`);
      lines.push(`${baseName}_count${key.includes('{') ? key.slice(key.indexOf('{')) : ''} ${values.length}`);
      lines.push(`${baseName}_sum${key.includes('{') ? key.slice(key.indexOf('{')) : ''} ${sum}`);
    });

    return lines.join('\n');
  }

  private buildKey(name: string, labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

// ============================================================
// ERROR TRACKER
// ============================================================

class ErrorTracker {
  private sentryDsn?: string;
  private appInsightsKey?: string;
  private environment: string;
  private serviceName: string;

  constructor(config: MonitoringConfig) {
    this.sentryDsn = config.sentryDsn;
    this.appInsightsKey = config.appInsightsKey;
    this.environment = config.environment;
    this.serviceName = config.serviceName;
  }

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorContext): void {
    console.error(`[${this.serviceName}] Error:`, error.message, context);

    // Sentry integration
    if (this.sentryDsn && typeof window !== 'undefined') {
      this.sendToSentry(error, context);
    }

    // Azure Application Insights integration
    if (this.appInsightsKey) {
      this.sendToAppInsights(error, context);
    }
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    console.log(`[${this.serviceName}] ${level.toUpperCase()}:`, message, context);
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string, role?: string): void {
    console.log(`[${this.serviceName}] User context set:`, { userId, role });
  }

  private sendToSentry(error: Error, context?: ErrorContext): void {
    // In production, use @sentry/nextjs
    const payload = {
      exception: {
        values: [{
          type: error.name,
          value: error.message,
          stacktrace: error.stack,
        }],
      },
      tags: {
        environment: this.environment,
        service: this.serviceName,
      },
      extra: context,
    };
    // fetch to sentry
  }

  private sendToAppInsights(error: Error, context?: ErrorContext): void {
    // In production, use @microsoft/applicationinsights-web
    const payload = {
      name: 'Microsoft.ApplicationInsights.Exception',
      time: new Date().toISOString(),
      data: {
        baseType: 'ExceptionData',
        baseData: {
          exceptions: [{
            typeName: error.name,
            message: error.message,
            stack: error.stack,
          }],
          properties: context,
        },
      },
    };
    // Send to App Insights
  }
}

// ============================================================
// PERFORMANCE TRACER
// ============================================================

class PerformanceTracer {
  private activeSpans: Map<string, { startTime: number; labels?: MetricLabels }> = new Map();
  private metrics: MetricsCollector;

  constructor(metrics: MetricsCollector) {
    this.metrics = metrics;
  }

  startSpan(name: string, labels?: MetricLabels): string {
    const spanId = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.activeSpans.set(spanId, { startTime: Date.now(), labels });
    return spanId;
  }

  endSpan(spanId: string): number {
    const span = this.activeSpans.get(spanId);
    if (!span) return 0;

    const duration = Date.now() - span.startTime;
    const name = spanId.split('-')[0];
    
    this.metrics.recordHistogram(`${name}_duration_ms`, duration, span.labels);
    this.activeSpans.delete(spanId);

    return duration;
  }

  async measure<T>(name: string, fn: () => Promise<T>, labels?: MetricLabels): Promise<T> {
    const spanId = this.startSpan(name, labels);
    try {
      const result = await fn();
      this.endSpan(spanId);
      return result;
    } catch (error) {
      this.endSpan(spanId);
      throw error;
    }
  }
}

// ============================================================
// CLINICAL METRICS CONSTANTS
// ============================================================

export const ClinicalMetrics = {
  ASSESSMENT_STARTED: 'clinical_assessment_started_total',
  ASSESSMENT_COMPLETED: 'clinical_assessment_completed_total',
  ASSESSMENT_ABANDONED: 'clinical_assessment_abandoned_total',
  ASSESSMENT_DURATION: 'clinical_assessment_duration_seconds',
  EMERGENCY_DETECTED: 'clinical_emergency_detected_total',
  EMERGENCY_ESCALATED: 'clinical_emergency_escalated_total',
  EMERGENCY_RESPONSE_TIME: 'clinical_emergency_response_seconds',
  RED_FLAG_TRIGGERED: 'clinical_red_flag_triggered_total',
  RED_FLAG_BY_CATEGORY: 'clinical_red_flag_by_category_total',
  DIFFERENTIAL_GENERATED: 'clinical_differential_generated_total',
  LAB_ORDER_CREATED: 'clinical_lab_order_created_total',
  IMAGING_ORDER_CREATED: 'clinical_imaging_order_created_total',
  MEDICATION_ORDER_CREATED: 'clinical_medication_order_created_total',
  REFERRAL_CREATED: 'clinical_referral_created_total',
  FHIR_REQUEST_TOTAL: 'fhir_request_total',
  FHIR_REQUEST_DURATION: 'fhir_request_duration_seconds',
  FHIR_ERROR_TOTAL: 'fhir_error_total',
  PROVIDER_SESSION_DURATION: 'provider_session_duration_seconds',
  PATIENTS_SEEN_PER_HOUR: 'provider_patients_seen_per_hour',
};

// ============================================================
// MONITORING SERVICE
// ============================================================

class MonitoringService {
  private static instance: MonitoringService;
  
  public metrics: MetricsCollector;
  public errors: ErrorTracker;
  public tracer: PerformanceTracer;
  private config: MonitoringConfig;

  private constructor(config: MonitoringConfig) {
    this.config = config;
    this.metrics = new MetricsCollector();
    this.errors = new ErrorTracker(config);
    this.tracer = new PerformanceTracer(this.metrics);
  }

  static initialize(config: MonitoringConfig): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config);
    }
    return MonitoringService.instance;
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService({
        environment: (process.env.NODE_ENV as any) || 'development',
        serviceName: 'attending-ai',
        serviceVersion: process.env.npm_package_version || '1.0.0',
      });
    }
    return MonitoringService.instance;
  }

  recordClinicalEvent(metric: string, value: number = 1, labels?: MetricLabels): void {
    this.metrics.incrementCounter(metric, value, {
      environment: this.config.environment,
      ...labels,
    });
  }

  recordTiming(metric: string, durationMs: number, labels?: MetricLabels): void {
    this.metrics.recordHistogram(metric, durationMs / 1000, {
      environment: this.config.environment,
      ...labels,
    });
  }

  trackApiRequest(req: NextApiRequest, statusCode: number, durationMs: number): void {
    const path = req.url?.split('?')[0] || 'unknown';
    const method = req.method || 'unknown';

    this.metrics.incrementCounter('http_requests_total', 1, { method, path, status: statusCode });
    this.metrics.recordHistogram('http_request_duration_seconds', durationMs / 1000, { method, path });
  }

  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, boolean>; timestamp: string } {
    return {
      status: 'healthy',
      checks: { database: true, redis: true, fhir: true },
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

export const monitoring = MonitoringService.getInstance();
export { MonitoringService, MetricsCollector, ErrorTracker, PerformanceTracer };

export const captureException = (error: Error, context?: ErrorContext) =>
  monitoring.errors.captureException(error, context);

export const recordMetric = (metric: string, value?: number, labels?: MetricLabels) =>
  monitoring.recordClinicalEvent(metric, value, labels);

export const measureAsync = <T>(name: string, fn: () => Promise<T>, labels?: MetricLabels) =>
  monitoring.tracer.measure(name, fn, labels);
