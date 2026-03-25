// ============================================================
// ATTENDING AI - Integration Registry
// apps/shared/lib/integrations/registry.ts
//
// Config-driven connector management for external systems.
// Each integration connection tracks:
//   - Type (FHIR, HL7V2, WEBHOOK, SFTP, CUSTOM)
//   - Direction (INBOUND, OUTBOUND, BIDIRECTIONAL)
//   - Health status (heartbeat monitoring)
//   - Message counts & error rates
//
// Usage:
//   import { IntegrationRegistry } from '@attending/shared/lib/integrations/registry';
//
//   const registry = new IntegrationRegistry(prisma);
//   await registry.register({ name: 'Epic FHIR', type: 'FHIR', ... });
//   const connections = await registry.list(organizationId);
//   await registry.updateHealth('conn-id', 'HEALTHY');
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type IntegrationType = 'FHIR' | 'HL7V2' | 'WEBHOOK' | 'SFTP' | 'CUSTOM';
export type IntegrationDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export type IntegrationStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export interface IntegrationConfig {
  /** FHIR: Base URL, client ID, etc. */
  fhir?: {
    baseUrl: string;
    clientId: string;
    clientSecret?: string; // Reference to secret manager, never stored here
    scopes: string[];
    version: 'R4' | 'STU3' | 'DSTU2';
  };
  /** HL7v2: TCP listener or sender config */
  hl7v2?: {
    host: string;
    port: number;
    protocol: 'MLLP' | 'TCP' | 'HTTP';
    messageTypes: string[]; // ADT^A01, ORU^R01, etc.
    sendingFacility: string;
    receivingFacility: string;
  };
  /** Webhook: delivery or receiver config */
  webhook?: {
    url?: string;          // Outbound delivery URL
    secret?: string;       // HMAC signing secret ref
    events?: string[];     // Event types to deliver
    listenPath?: string;   // Inbound receiver path
  };
  /** SFTP: file-based exchange */
  sftp?: {
    host: string;
    port: number;
    username: string;
    privateKeyRef?: string; // Reference to key in secret manager
    remotePath: string;
    filePattern: string;    // e.g., '*.hl7', '*.csv'
    pollingIntervalMs: number;
  };
  /** Custom: freeform config for bespoke integrations */
  custom?: Record<string, unknown>;
}

export interface RegisterInput {
  name: string;
  type: IntegrationType;
  direction: IntegrationDirection;
  organizationId: string;
  config: IntegrationConfig;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface ConnectionSummary {
  id: string;
  name: string;
  type: IntegrationType;
  direction: IntegrationDirection;
  status: IntegrationStatus;
  healthStatus: HealthStatus;
  messageCount: number;
  errorCount: number;
  lastSyncAt: Date | null;
  lastErrorAt: Date | null;
  createdAt: Date;
}

// ============================================================
// REGISTRY
// ============================================================

export class IntegrationRegistry {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  /** Register a new integration connection */
  async register(input: RegisterInput): Promise<{ id: string }> {
    const record = await this.prisma.integrationConnection.create({
      data: {
        name: input.name,
        type: input.type,
        direction: input.direction,
        organizationId: input.organizationId,
        config: JSON.stringify(input.config),
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdBy: input.createdBy,
      },
    });
    return { id: record.id };
  }

  /** List all connections for an organization */
  async list(organizationId: string): Promise<ConnectionSummary[]> {
    const records = await this.prisma.integrationConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type as IntegrationType,
      direction: r.direction as IntegrationDirection,
      status: r.status as IntegrationStatus,
      healthStatus: r.healthStatus as HealthStatus,
      messageCount: r.messageCount,
      errorCount: r.errorCount,
      lastSyncAt: r.lastSyncAt,
      lastErrorAt: r.lastErrorAt,
      createdAt: r.createdAt,
    }));
  }

  /** Get connection details (including config) */
  async get(id: string): Promise<(ConnectionSummary & { config: IntegrationConfig }) | null> {
    const r = await this.prisma.integrationConnection.findUnique({ where: { id } });
    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      direction: r.direction,
      status: r.status,
      healthStatus: r.healthStatus,
      messageCount: r.messageCount,
      errorCount: r.errorCount,
      lastSyncAt: r.lastSyncAt,
      lastErrorAt: r.lastErrorAt,
      createdAt: r.createdAt,
      config: JSON.parse(r.config),
    };
  }

  /** Update connection status */
  async updateStatus(id: string, status: IntegrationStatus): Promise<void> {
    await this.prisma.integrationConnection.update({
      where: { id },
      data: { status },
    });
  }

  /** Update health status (called by health check monitors) */
  async updateHealth(id: string, health: HealthStatus, error?: string): Promise<void> {
    await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        healthStatus: health,
        ...(health === 'DOWN' || health === 'DEGRADED' ? {
          lastErrorAt: new Date(),
          lastError: error,
          errorCount: { increment: 1 },
        } : {}),
        ...(health === 'HEALTHY' ? {
          lastSyncAt: new Date(),
        } : {}),
      },
    });
  }

  /** Record a successful message exchange */
  async recordMessage(id: string): Promise<void> {
    await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        messageCount: { increment: 1 },
        lastSyncAt: new Date(),
        healthStatus: 'HEALTHY',
      },
    });
  }

  /** Record a failed message exchange */
  async recordError(id: string, error: string): Promise<void> {
    await this.prisma.integrationConnection.update({
      where: { id },
      data: {
        errorCount: { increment: 1 },
        lastErrorAt: new Date(),
        lastError: error,
        healthStatus: 'DEGRADED',
      },
    });
  }

  /** Delete a connection */
  async remove(id: string): Promise<void> {
    await this.prisma.integrationConnection.delete({ where: { id } });
  }

  /** Get health summary for all connections (for dashboard) */
  async getHealthSummary(organizationId: string): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    down: number;
    unknown: number;
  }> {
    const connections = await this.prisma.integrationConnection.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { healthStatus: true },
    });

    return {
      total: connections.length,
      healthy: connections.filter((c: any) => c.healthStatus === 'HEALTHY').length,
      degraded: connections.filter((c: any) => c.healthStatus === 'DEGRADED').length,
      down: connections.filter((c: any) => c.healthStatus === 'DOWN').length,
      unknown: connections.filter((c: any) => c.healthStatus === 'UNKNOWN').length,
    };
  }
}

export default IntegrationRegistry;
