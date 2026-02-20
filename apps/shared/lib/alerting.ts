// ============================================================
// ATTENDING AI - Real-Time Alerting Rules
// apps/shared/lib/alerting.ts
//
// Configurable alert rules that fire when thresholds are
// breached. Supports PagerDuty, Slack, email, and webhook
// notification channels.
//
// Usage:
//   import { alertEngine } from '@attending/shared/lib/alerting';
//   await alertEngine.evaluate(); // Called from scheduler
// ============================================================

import { logger } from './logging';
import { metrics } from './metrics';

// ============================================================
// TYPES
// ============================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'pagerduty' | 'slack' | 'email' | 'webhook' | 'log';
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  /** Evaluation function — returns true if alert should fire */
  condition: () => Promise<boolean> | boolean;
  /** Cooldown between firings (ms) */
  cooldownMs: number;
  /** Tags for filtering */
  tags: string[];
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  firedAt: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationConfig {
  pagerduty?: { routingKey: string; };
  slack?: { webhookUrl: string; channel?: string; };
  email?: { to: string[]; from?: string; };
  webhook?: { url: string; secret?: string; };
}

// ============================================================
// ALERT ENGINE
// ============================================================

class AlertEngine {
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, AlertEvent>();
  private lastFired = new Map<string, number>();
  private history: AlertEvent[] = [];
  private config: NotificationConfig = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.config = {
      pagerduty: process.env.PAGERDUTY_ROUTING_KEY
        ? { routingKey: process.env.PAGERDUTY_ROUTING_KEY }
        : undefined,
      slack: process.env.SLACK_ALERT_WEBHOOK
        ? { webhookUrl: process.env.SLACK_ALERT_WEBHOOK, channel: process.env.SLACK_ALERT_CHANNEL }
        : undefined,
      email: process.env.ALERT_EMAIL_TO
        ? { to: process.env.ALERT_EMAIL_TO.split(','), from: process.env.ALERT_EMAIL_FROM }
        : undefined,
      webhook: process.env.ALERT_WEBHOOK_URL
        ? { url: process.env.ALERT_WEBHOOK_URL, secret: process.env.ALERT_WEBHOOK_SECRET }
        : undefined,
    };
  }

  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Evaluate all alert rules. Called from scheduler.
   */
  async evaluate(): Promise<{ fired: string[]; resolved: string[] }> {
    const fired: string[] = [];
    const resolved: string[] = [];

    for (const [id, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        const shouldFire = await rule.condition();
        const isCurrentlyFiring = this.activeAlerts.has(id);

        if (shouldFire && !isCurrentlyFiring) {
          // Check cooldown
          const lastTime = this.lastFired.get(id) || 0;
          if (Date.now() - lastTime < rule.cooldownMs) continue;

          const event = await this.fire(rule);
          fired.push(event.ruleName);
        } else if (!shouldFire && isCurrentlyFiring) {
          await this.resolve(id);
          resolved.push(rule.name);
        }
      } catch (err) {
        logger.error(`[Alerting] Rule evaluation failed: ${rule.name}`, err instanceof Error ? err : new Error(String(err)));
      }
    }

    return { fired, resolved };
  }

  private async fire(rule: AlertRule): Promise<AlertEvent> {
    const event: AlertEvent = {
      id: `alert-${Date.now()}-${rule.id}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'firing',
      message: `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.description}`,
      firedAt: new Date().toISOString(),
    };

    this.activeAlerts.set(rule.id, event);
    this.lastFired.set(rule.id, Date.now());
    this.history.push(event);
    if (this.history.length > 1000) this.history.splice(0, this.history.length - 1000);

    logger.warn(`[Alerting] FIRING: ${event.message}`);

    // Send to channels
    for (const channel of rule.channels) {
      try {
        await this.notify(channel, event);
      } catch (err) {
        logger.error(`[Alerting] Notification failed: ${channel}`, err instanceof Error ? err : new Error(String(err)));
      }
    }

    return event;
  }

  private async resolve(ruleId: string): Promise<void> {
    const event = this.activeAlerts.get(ruleId);
    if (!event) return;

    event.status = 'resolved';
    event.resolvedAt = new Date().toISOString();
    this.activeAlerts.delete(ruleId);

    logger.info(`[Alerting] RESOLVED: ${event.ruleName}`);
  }

  acknowledge(ruleId: string, userId: string): boolean {
    const event = this.activeAlerts.get(ruleId);
    if (!event) return false;
    event.status = 'acknowledged';
    event.acknowledgedBy = userId;
    return true;
  }

  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  getHistory(limit: number = 50): AlertEvent[] {
    return this.history.slice(-limit).reverse();
  }

  getRules(): Array<AlertRule & { isActive: boolean }> {
    return Array.from(this.rules.values()).map(r => ({
      ...r,
      condition: undefined as any,
      isActive: this.activeAlerts.has(r.id),
    }));
  }

  // ---- Notification Channels ----

  private async notify(channel: AlertChannel, event: AlertEvent): Promise<void> {
    switch (channel) {
      case 'log':
        // Already logged above
        break;

      case 'slack':
        if (this.config.slack) {
          await fetch(this.config.slack.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channel: this.config.slack.channel,
              text: event.message,
              attachments: [{
                color: event.severity === 'critical' ? '#FF0000' : event.severity === 'warning' ? '#FFA500' : '#0088FF',
                fields: [
                  { title: 'Severity', value: event.severity, short: true },
                  { title: 'Status', value: event.status, short: true },
                  { title: 'Time', value: event.firedAt, short: true },
                ],
              }],
            }),
            signal: AbortSignal.timeout(5000),
          });
        }
        break;

      case 'pagerduty':
        if (this.config.pagerduty) {
          await fetch('https://events.pagerduty.com/v2/enqueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              routing_key: this.config.pagerduty.routingKey,
              event_action: 'trigger',
              payload: {
                summary: event.message,
                severity: event.severity,
                source: 'attending-ai',
                timestamp: event.firedAt,
              },
            }),
            signal: AbortSignal.timeout(5000),
          });
        }
        break;

      case 'webhook':
        if (this.config.webhook) {
          await fetch(this.config.webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Alert-Secret': this.config.webhook.secret || '' },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(5000),
          });
        }
        break;

      case 'email':
        // Email integration placeholder — wire to SendGrid/SES
        logger.info(`[Alerting] Email would be sent to: ${this.config.email?.to?.join(', ')}`);
        break;
    }
  }
}

// ============================================================
// SINGLETON + DEFAULT RULES
// ============================================================

export const alertEngine = new AlertEngine();

// --- Default alert rules ---

alertEngine.registerRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  description: 'HTTP error rate exceeds 5%',
  severity: 'critical',
  channels: ['log', 'slack', 'pagerduty'],
  enabled: true,
  cooldownMs: 300_000, // 5 min
  tags: ['reliability'],
  condition: () => {
    const dashboard = metrics.toDashboard();
    const errorRate = parseFloat(dashboard.requests.errorRate);
    return errorRate > 5 && dashboard.requests.total > 100;
  },
});

alertEngine.registerRule({
  id: 'high-latency',
  name: 'High P95 Latency',
  description: 'P95 response time exceeds 2 seconds',
  severity: 'warning',
  channels: ['log', 'slack'],
  enabled: true,
  cooldownMs: 600_000, // 10 min
  tags: ['performance'],
  condition: () => {
    const dashboard = metrics.toDashboard();
    return dashboard.latency.p95 > 2000 && dashboard.requests.total > 50;
  },
});

alertEngine.registerRule({
  id: 'high-memory',
  name: 'High Memory Usage',
  description: 'Heap usage exceeds 90% of total',
  severity: 'warning',
  channels: ['log', 'slack'],
  enabled: true,
  cooldownMs: 600_000,
  tags: ['infrastructure'],
  condition: () => {
    const mem = process.memoryUsage();
    return mem.heapUsed / mem.heapTotal > 0.9;
  },
});

alertEngine.registerRule({
  id: 'scheduler-failures',
  name: 'Multiple Scheduler Job Failures',
  description: '3+ background jobs have errors',
  severity: 'warning',
  channels: ['log', 'slack'],
  enabled: true,
  cooldownMs: 1_800_000, // 30 min
  tags: ['scheduler'],
  condition: async () => {
    try {
      const { scheduler } = await import('./scheduler');
      const status = scheduler.getStatus();
      const failed = status.filter(j => j.lastError);
      return failed.length >= 3;
    } catch { return false; }
  },
});

alertEngine.registerRule({
  id: 'rate-limit-storm',
  name: 'Rate Limit Storm',
  description: 'Excessive rate limit hits (possible abuse/DDoS)',
  severity: 'critical',
  channels: ['log', 'slack', 'pagerduty'],
  enabled: true,
  cooldownMs: 300_000,
  tags: ['security'],
  condition: () => {
    const dashboard = metrics.toDashboard();
    // If >10% of requests are hitting rate limits
    const rateLimitHits = dashboard.integrations?.['rateLimitHits'] || 0;
    return rateLimitHits > 100 && dashboard.requests.total > 200;
  },
});

alertEngine.registerRule({
  id: 'webhook-delivery-failure',
  name: 'Webhook Delivery Failures',
  description: 'Webhook failure rate exceeds 20%',
  severity: 'warning',
  channels: ['log', 'slack'],
  enabled: true,
  cooldownMs: 900_000, // 15 min
  tags: ['integration'],
  condition: () => {
    const dashboard = metrics.toDashboard();
    const delivered = dashboard.integrations?.webhooksDelivered || 0;
    const failed = dashboard.integrations?.webhooksFailed || 0;
    const total = delivered + failed;
    return total > 10 && (failed / total) > 0.2;
  },
});

export default alertEngine;
