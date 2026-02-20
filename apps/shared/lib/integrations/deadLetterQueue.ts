// ============================================================
// ATTENDING AI - Dead Letter Queue (DLQ)
// apps/shared/lib/integrations/deadLetterQueue.ts
//
// Failed integration messages that exhaust all retry attempts
// are stored here for manual investigation and replay.
// ============================================================

import { randomUUID } from 'crypto';
import { logger } from '../logging';

export type DLQMessageType = 'webhook' | 'hl7v2' | 'fhir' | 'import' | 'event' | 'custom';
export type DLQStatus = 'pending' | 'replaying' | 'replayed' | 'discarded';

export interface DLQEntry {
  id: string;
  type: DLQMessageType;
  status: DLQStatus;
  payload: unknown;
  destination: string;
  error: string;
  attempts: number;
  originalId?: string;
  organizationId?: string;
  lastStatusCode?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  replayedAt?: string;
  replayResult?: string;
}

export interface DLQEnqueueInput {
  type: DLQMessageType;
  payload: unknown;
  destination: string;
  error: string;
  attempts: number;
  originalId?: string;
  organizationId?: string;
  lastStatusCode?: number;
  metadata?: Record<string, unknown>;
}

export interface DLQListOptions {
  type?: DLQMessageType;
  status?: DLQStatus;
  organizationId?: string;
  limit?: number;
  offset?: number;
  since?: string;
}

export interface DLQStats {
  total: number;
  pending: number;
  replayed: number;
  discarded: number;
  byType: Record<string, number>;
  oldestPending: string | null;
}

class DeadLetterQueue {
  private entries = new Map<string, DLQEntry>();
  private replayHandlers = new Map<DLQMessageType, (entry: DLQEntry) => Promise<boolean>>();

  async enqueue(input: DLQEnqueueInput): Promise<DLQEntry> {
    const entry: DLQEntry = {
      id: randomUUID(),
      type: input.type,
      status: 'pending',
      payload: input.payload,
      destination: input.destination,
      error: input.error,
      attempts: input.attempts,
      originalId: input.originalId,
      organizationId: input.organizationId,
      lastStatusCode: input.lastStatusCode,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const { prisma } = await import('../prisma');
      if (prisma.deadLetterEntry) {
        const dbEntry = await prisma.deadLetterEntry.create({
          data: {
            id: entry.id, type: entry.type, status: entry.status,
            payload: JSON.stringify(entry.payload), destination: entry.destination,
            error: entry.error, attempts: entry.attempts, originalId: entry.originalId,
            organizationId: entry.organizationId, lastStatusCode: entry.lastStatusCode,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          },
        });
        entry.id = dbEntry.id;
      } else {
        this.entries.set(entry.id, entry);
      }
    } catch {
      this.entries.set(entry.id, entry);
    }

    logger.warn('[DLQ] Message enqueued', { id: entry.id, type: entry.type, destination: entry.destination, attempts: entry.attempts });
    return entry;
  }

  async list(options: DLQListOptions = {}): Promise<{ entries: DLQEntry[]; total: number }> {
    const { type, status, organizationId, limit = 50, offset = 0, since } = options;

    try {
      const { prisma } = await import('../prisma');
      if (prisma.deadLetterEntry) {
        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (organizationId) where.organizationId = organizationId;
        if (since) where.createdAt = { gte: new Date(since) };

        const [entries, total] = await Promise.all([
          prisma.deadLetterEntry.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
          prisma.deadLetterEntry.count({ where }),
        ]);
        return {
          entries: entries.map((e: any) => ({
            ...e,
            payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload,
            metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata,
          })),
          total,
        };
      }
    } catch { /* fallback */ }

    let items = Array.from(this.entries.values());
    if (type) items = items.filter(e => e.type === type);
    if (status) items = items.filter(e => e.status === status);
    if (organizationId) items = items.filter(e => e.organizationId === organizationId);
    if (since) items = items.filter(e => e.createdAt >= since);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { entries: items.slice(offset, offset + limit), total: items.length };
  }

  async replay(entryId: string): Promise<{ success: boolean; result?: string }> {
    const entry = await this.getEntry(entryId);
    if (!entry) return { success: false, result: 'Entry not found' };
    if (entry.status !== 'pending') return { success: false, result: `Cannot replay: status is ${entry.status}` };

    const handler = this.replayHandlers.get(entry.type);
    if (!handler) return { success: false, result: `No replay handler for type: ${entry.type}` };

    await this.updateEntry(entryId, { status: 'replaying', updatedAt: new Date().toISOString() });

    try {
      const success = await handler(entry);
      const result = success ? 'Replay successful' : 'Replay handler returned false';
      await this.updateEntry(entryId, {
        status: success ? 'replayed' : 'pending',
        replayedAt: success ? new Date().toISOString() : undefined,
        replayResult: result,
        updatedAt: new Date().toISOString(),
      });
      logger.info('[DLQ] Message replayed', { id: entryId, type: entry.type, success });
      return { success, result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.updateEntry(entryId, { status: 'pending', replayResult: `Replay failed: ${err.message}`, updatedAt: new Date().toISOString() });
      return { success: false, result: err.message };
    }
  }

  async replayAll(type?: DLQMessageType): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const { entries } = await this.list({ type, status: 'pending', limit: 100 });
    let succeeded = 0, failed = 0;
    for (const entry of entries) {
      const result = await this.replay(entry.id);
      if (result.success) succeeded++; else failed++;
    }
    return { attempted: entries.length, succeeded, failed };
  }

  async discard(entryId: string, reason?: string): Promise<boolean> {
    return this.updateEntry(entryId, { status: 'discarded', replayResult: reason || 'Manually discarded', updatedAt: new Date().toISOString() });
  }

  async getStats(organizationId?: string): Promise<DLQStats> {
    const { entries, total } = await this.list({ organizationId, limit: 10000 });
    const pending = entries.filter(e => e.status === 'pending');
    const byType: Record<string, number> = {};
    for (const e of entries) byType[e.type] = (byType[e.type] || 0) + 1;

    return {
      total, pending: pending.length,
      replayed: entries.filter(e => e.status === 'replayed').length,
      discarded: entries.filter(e => e.status === 'discarded').length,
      byType,
      oldestPending: pending.length > 0 ? pending[pending.length - 1].createdAt : null,
    };
  }

  registerReplayHandler(type: DLQMessageType, handler: (entry: DLQEntry) => Promise<boolean>): void {
    this.replayHandlers.set(type, handler);
    logger.info(`[DLQ] Replay handler registered for: ${type}`);
  }

  async purge(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
    let purged = 0;

    try {
      const { prisma } = await import('../prisma');
      if (prisma.deadLetterEntry) {
        const result = await prisma.deadLetterEntry.deleteMany({
          where: { status: { in: ['replayed', 'discarded'] }, updatedAt: { lt: cutoff } },
        });
        purged = result.count;
      }
    } catch {
      for (const [id, entry] of this.entries) {
        if (['replayed', 'discarded'].includes(entry.status) && entry.updatedAt < cutoff.toISOString()) {
          this.entries.delete(id);
          purged++;
        }
      }
    }
    if (purged > 0) logger.info(`[DLQ] Purged ${purged} old entries`);
    return purged;
  }

  private async getEntry(id: string): Promise<DLQEntry | null> {
    try {
      const { prisma } = await import('../prisma');
      if (prisma.deadLetterEntry) {
        const e = await prisma.deadLetterEntry.findUnique({ where: { id } });
        if (e) return { ...e, payload: typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload, metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata };
      }
    } catch { /* fallback */ }
    return this.entries.get(id) || null;
  }

  private async updateEntry(id: string, updates: Partial<DLQEntry>): Promise<boolean> {
    try {
      const { prisma } = await import('../prisma');
      if (prisma.deadLetterEntry) { await prisma.deadLetterEntry.update({ where: { id }, data: updates as any }); return true; }
    } catch { /* fallback */ }
    const entry = this.entries.get(id);
    if (entry) { Object.assign(entry, updates); return true; }
    return false;
  }
}

export const dlq = new DeadLetterQueue();

// Default replay handlers
dlq.registerReplayHandler('webhook', async (entry) => {
  try {
    const response = await fetch(entry.destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': (entry.metadata?.eventType as string) || 'replay', 'X-DLQ-Replay': 'true' },
      body: JSON.stringify(entry.payload),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch { return false; }
});

export default dlq;
