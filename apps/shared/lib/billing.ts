// ============================================================
// ATTENDING AI - API Usage Analytics & Billing Metering
// apps/shared/lib/billing.ts
//
// Tracks per-organization API consumption for:
//   - Usage-based billing (API calls, AI inferences, storage)
//   - Tier enforcement (limits.maxApiCallsPerDay, etc.)
//   - ROI dashboards (cost per encounter, AI utilization)
//   - Investor reporting (MAU, API volume, growth)
//
// Architecture:
//   Real-time: Redis counters (INCR + EXPIRE) → fast writes
//   Durable:   Periodic flush to database → audit trail
//   Dashboard: Aggregated views by org, day, resource type
//
// Usage:
//   import { meter } from '@attending/shared/lib/billing';
//   await meter.record(orgId, 'api.call', { path, method });
//   const usage = await meter.getUsage(orgId, '2026-02');
// ============================================================

import { logger } from './logging';

// ============================================================
// TYPES
// ============================================================

export type MeterEvent =
  | 'api.call'
  | 'ai.triage'
  | 'ai.differential'
  | 'ai.scribe'
  | 'ai.drugCheck'
  | 'ai.riskPrediction'
  | 'fhir.request'
  | 'hl7v2.message'
  | 'webhook.delivery'
  | 'bulk.export'
  | 'csv.import'
  | 'storage.mb'
  | 'user.active';

export interface MeterRecord {
  organizationId: string;
  event: MeterEvent;
  count: number;
  metadata?: Record<string, string>;
  timestamp: string;
}

export interface UsageSummary {
  organizationId: string;
  period: string;
  events: Record<MeterEvent, number>;
  totalApiCalls: number;
  totalAiInferences: number;
  estimatedCost: EstimatedCost;
}

export interface EstimatedCost {
  apiCalls: number;
  aiInferences: number;
  storage: number;
  total: number;
  currency: string;
}

export interface UsageTrend {
  period: string;
  apiCalls: number;
  aiInferences: number;
  activeUsers: number;
}

// ============================================================
// PRICING (configurable per deployment)
// ============================================================

const PRICING = {
  'api.call': parseFloat(process.env.PRICE_API_CALL || '0.0001'),       // $0.0001/call
  'ai.triage': parseFloat(process.env.PRICE_AI_TRIAGE || '0.005'),      // $0.005/inference
  'ai.differential': parseFloat(process.env.PRICE_AI_DIFF || '0.01'),   // $0.01/inference
  'ai.scribe': parseFloat(process.env.PRICE_AI_SCRIBE || '0.05'),       // $0.05/note
  'ai.drugCheck': parseFloat(process.env.PRICE_AI_DRUG || '0.002'),     // $0.002/check
  'ai.riskPrediction': parseFloat(process.env.PRICE_AI_RISK || '0.01'), // $0.01/prediction
  'fhir.request': parseFloat(process.env.PRICE_FHIR || '0.0002'),      // $0.0002/request
  'hl7v2.message': parseFloat(process.env.PRICE_HL7 || '0.001'),       // $0.001/message
  'webhook.delivery': parseFloat(process.env.PRICE_WEBHOOK || '0.0001'),
  'bulk.export': parseFloat(process.env.PRICE_EXPORT || '0.01'),        // $0.01/job
  'csv.import': parseFloat(process.env.PRICE_IMPORT || '0.005'),
  'storage.mb': parseFloat(process.env.PRICE_STORAGE_MB || '0.023'),    // $0.023/MB/mo (S3)
  'user.active': 0, // Not billed per-unit
} as const;

const AI_EVENTS: MeterEvent[] = ['ai.triage', 'ai.differential', 'ai.scribe', 'ai.drugCheck', 'ai.riskPrediction'];

// ============================================================
// IN-MEMORY BUFFER (flushed to DB periodically)
// ============================================================

interface BufferedCount {
  count: number;
  lastFlushed: number;
}

class BillingMeter {
  // orgId:event:YYYY-MM-DD → count
  private buffer = new Map<string, BufferedCount>();
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Record a metered event.
   */
  async record(
    organizationId: string,
    event: MeterEvent,
    metadata?: Record<string, string>
  ): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    const key = `${organizationId}:${event}:${day}`;

    // Increment in-memory buffer
    const existing = this.buffer.get(key);
    if (existing) {
      existing.count++;
    } else {
      this.buffer.set(key, { count: 1, lastFlushed: Date.now() });
    }

    // Also try Redis for real-time accuracy
    try {
      const { redis } = await import('./redis');
      if (redis) {
        const redisKey = `meter:${key}`;
        await redis.incr(redisKey);
        await redis.expire(redisKey, 90 * 86400); // 90-day TTL
      }
    } catch { /* Redis not available */ }
  }

  /**
   * Get usage summary for an organization.
   */
  async getUsage(organizationId: string, period?: string): Promise<UsageSummary> {
    const targetPeriod = period || new Date().toISOString().slice(0, 7); // YYYY-MM
    const events: Record<string, number> = {};
    let totalApiCalls = 0;
    let totalAiInferences = 0;

    // Try Redis first
    try {
      const { redis } = await import('./redis');
      if (redis) {
        const pattern = `meter:${organizationId}:*:${targetPeriod}-*`;
        const keys = await redis.keys(pattern);

        for (const key of keys) {
          const parts = key.split(':');
          const event = parts[2] as MeterEvent;
          const value = parseInt(await redis.get(key) || '0');

          events[event] = (events[event] || 0) + value;

          if (event === 'api.call') totalApiCalls += value;
          if (AI_EVENTS.includes(event)) totalAiInferences += value;
        }
      }
    } catch { /* fallback to buffer */ }

    // Supplement with buffer
    for (const [key, { count }] of this.buffer) {
      if (key.startsWith(organizationId) && key.includes(targetPeriod)) {
        const event = key.split(':')[1] as MeterEvent;
        events[event] = (events[event] || 0) + count;
        if (event === 'api.call') totalApiCalls += count;
        if (AI_EVENTS.includes(event)) totalAiInferences += count;
      }
    }

    return {
      organizationId,
      period: targetPeriod,
      events: events as Record<MeterEvent, number>,
      totalApiCalls,
      totalAiInferences,
      estimatedCost: this.calculateCost(events),
    };
  }

  /**
   * Get usage trends for investor reporting.
   */
  async getTrends(
    organizationId?: string,
    months: number = 6
  ): Promise<UsageTrend[]> {
    const trends: UsageTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = d.toISOString().slice(0, 7);

      if (organizationId) {
        const usage = await this.getUsage(organizationId, period);
        trends.push({
          period,
          apiCalls: usage.totalApiCalls,
          aiInferences: usage.totalAiInferences,
          activeUsers: usage.events['user.active' as MeterEvent] || 0,
        });
      } else {
        // Platform-wide (aggregate all orgs)
        trends.push({
          period,
          apiCalls: await this.getPlatformTotal('api.call', period),
          aiInferences: await this.getPlatformAiTotal(period),
          activeUsers: await this.getPlatformTotal('user.active', period),
        });
      }
    }

    return trends;
  }

  /**
   * Check if an org has exceeded their daily limit.
   */
  async checkLimit(organizationId: string, event: MeterEvent, limit: number): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    const day = new Date().toISOString().slice(0, 10);
    let current = 0;

    try {
      const { redis } = await import('./redis');
      if (redis) {
        const key = `meter:${organizationId}:${event}:${day}`;
        current = parseInt(await redis.get(key) || '0');
      }
    } catch {
      const key = `${organizationId}:${event}:${day}`;
      current = this.buffer.get(key)?.count || 0;
    }

    return {
      allowed: current < limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
    };
  }

  /**
   * Get platform-wide statistics for investor reporting.
   */
  async getPlatformStats(): Promise<{
    totalOrganizations: number;
    monthlyApiCalls: number;
    monthlyAiInferences: number;
    monthlyActiveUsers: number;
    estimatedMRR: number;
    trends: UsageTrend[];
  }> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    let totalOrgs = 0;
    try {
      const { prisma } = await import('./prisma');
      totalOrgs = await prisma.organization?.count() || 0;
    } catch { /* ignore */ }

    const trends = await this.getTrends(undefined, 6);
    const currentTrend = trends.find(t => t.period === currentMonth) || { apiCalls: 0, aiInferences: 0, activeUsers: 0 };

    // Estimate MRR from usage
    const apiRevenue = currentTrend.apiCalls * (PRICING['api.call'] || 0);
    const aiRevenue = currentTrend.aiInferences * 0.01; // Avg AI cost
    const estimatedMRR = apiRevenue + aiRevenue;

    return {
      totalOrganizations: totalOrgs,
      monthlyApiCalls: currentTrend.apiCalls,
      monthlyAiInferences: currentTrend.aiInferences,
      monthlyActiveUsers: currentTrend.activeUsers,
      estimatedMRR: Math.round(estimatedMRR * 100) / 100,
      trends,
    };
  }

  /**
   * Start periodic flush to database.
   */
  startFlush(intervalMs: number = 60_000): void {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => this.flush().catch(() => {}), intervalMs);
  }

  stopFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.size === 0) return;

    const entries = Array.from(this.buffer.entries());
    this.buffer.clear();

    try {
      const { prisma } = await import('./prisma');
      if (prisma.usageRecord) {
        for (const [key, { count }] of entries) {
          const [orgId, event, day] = key.split(':');
          await prisma.usageRecord.upsert({
            where: { organizationId_event_day: { organizationId: orgId, event, day } },
            create: { organizationId: orgId, event, day, count },
            update: { count: { increment: count } },
          }).catch(() => {});
        }
      }
    } catch {
      // Re-buffer on failure
      for (const [key, data] of entries) {
        const existing = this.buffer.get(key);
        if (existing) existing.count += data.count;
        else this.buffer.set(key, data);
      }
    }
  }

  private calculateCost(events: Record<string, number>): EstimatedCost {
    let apiCalls = 0;
    let aiInferences = 0;
    let storage = 0;

    for (const [event, count] of Object.entries(events)) {
      const price = PRICING[event as keyof typeof PRICING] || 0;
      const cost = count * price;

      if (event === 'api.call' || event.startsWith('fhir') || event.startsWith('hl7') || event.startsWith('webhook')) {
        apiCalls += cost;
      } else if (event.startsWith('ai.')) {
        aiInferences += cost;
      } else if (event === 'storage.mb') {
        storage += cost;
      }
    }

    return {
      apiCalls: Math.round(apiCalls * 100) / 100,
      aiInferences: Math.round(aiInferences * 100) / 100,
      storage: Math.round(storage * 100) / 100,
      total: Math.round((apiCalls + aiInferences + storage) * 100) / 100,
      currency: 'USD',
    };
  }

  private async getPlatformTotal(event: string, period: string): Promise<number> {
    let total = 0;
    try {
      const { redis } = await import('./redis');
      if (redis) {
        const keys = await redis.keys(`meter:*:${event}:${period}-*`);
        for (const key of keys) {
          total += parseInt(await redis.get(key) || '0');
        }
      }
    } catch { /* ignore */ }
    return total;
  }

  private async getPlatformAiTotal(period: string): Promise<number> {
    let total = 0;
    for (const event of AI_EVENTS) {
      total += await this.getPlatformTotal(event, period);
    }
    return total;
  }
}

// ============================================================
// SINGLETON
// ============================================================

export const meter = new BillingMeter();

export default meter;
