/**
 * ATTENDING AI - Service Registry
 * 
 * Enables plug-and-play architecture for clinical services.
 * Services can be enabled/disabled per deployment, tier-gated,
 * and have dependencies automatically resolved.
 * 
 * @module @attending/shared/services/registry
 * @author ATTENDING AI Team
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ServiceStatus = 'enabled' | 'disabled' | 'beta' | 'degraded' | 'error';
export type ServiceTier = 'free' | 'pro' | 'enterprise';
export type ServiceCategory = 
  | 'clinical-ai'
  | 'documentation'
  | 'integration'
  | 'patient-engagement'
  | 'analytics'
  | 'communication'
  | 'safety'
  | 'ordering'
  | 'workflow';

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  lastCheck: Date;
  errorCount: number;
  message?: string;
}

export interface ServiceMetrics {
  invocationCount: number;
  averageLatency: number;
  errorRate: number;
  lastInvocation?: Date;
}

export interface ServiceDefinition<T = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ServiceCategory;
  service: T;
  status: ServiceStatus;
  tier: ServiceTier;
  dependencies: string[];
  healthCheck?: () => Promise<ServiceHealth>;
  config?: Record<string, any>;
}

export interface RegistryConfig {
  defaultTier: ServiceTier;
  enableHealthChecks: boolean;
  healthCheckInterval: number; // ms
  enableMetrics: boolean;
}

export interface ServiceQuery {
  category?: ServiceCategory;
  tier?: ServiceTier;
  status?: ServiceStatus;
  ids?: string[];
}

export interface ServiceManifestEntry {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  status: ServiceStatus;
  tier: ServiceTier;
  available: boolean;
  health?: ServiceHealth;
  metrics?: ServiceMetrics;
}

// ============================================================================
// Service Registry Implementation
// ============================================================================

export class ServiceRegistry extends EventEmitter {
  private services = new Map<string, ServiceDefinition>();
  private health = new Map<string, ServiceHealth>();
  private metrics = new Map<string, ServiceMetrics>();
  private config: RegistryConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: Partial<RegistryConfig> = {}) {
    super();
    this.config = {
      defaultTier: 'free',
      enableHealthChecks: true,
      healthCheckInterval: 60000, // 1 minute
      enableMetrics: true,
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a service with the registry
   */
  register<T>(definition: ServiceDefinition<T>): void {
    if (!definition.id || !definition.service) {
      throw new Error(`Service registration requires 'id' and 'service'`);
    }

    if (this.services.has(definition.id)) {
      console.warn(`[ServiceRegistry] Service '${definition.id}' is being re-registered`);
    }

    this.services.set(definition.id, definition);

    if (this.config.enableMetrics) {
      this.metrics.set(definition.id, {
        invocationCount: 0,
        averageLatency: 0,
        errorRate: 0,
      });
    }

    this.health.set(definition.id, {
      status: 'healthy',
      lastCheck: new Date(),
      errorCount: 0,
    });

    this.emit('service:registered', definition);
    console.log(`[ServiceRegistry] ✓ Registered: ${definition.name} (${definition.id}) [${definition.tier}]`);
  }

  /**
   * Register multiple services at once
   */
  registerAll(definitions: ServiceDefinition[]): void {
    definitions.forEach(def => this.register(def));
  }

  /**
   * Unregister a service
   */
  unregister(id: string): boolean {
    const service = this.services.get(id);
    if (!service) return false;

    this.services.delete(id);
    this.health.delete(id);
    this.metrics.delete(id);

    this.emit('service:unregistered', { id });
    return true;
  }

  // --------------------------------------------------------------------------
  // Service Retrieval
  // --------------------------------------------------------------------------

  /**
   * Get a service by ID (returns null if disabled or unavailable for tier)
   */
  get<T>(id: string, requiredTier?: ServiceTier): T | null {
    const definition = this.services.get(id);
    
    if (!definition) {
      console.warn(`[ServiceRegistry] Service '${id}' not found`);
      return null;
    }

    if (definition.status === 'disabled') {
      return null;
    }

    const currentTier = requiredTier || this.config.defaultTier;
    if (!this.tierAllows(definition.tier, currentTier)) {
      console.warn(`[ServiceRegistry] Service '${id}' requires '${definition.tier}' tier (current: ${currentTier})`);
      return null;
    }

    for (const depId of definition.dependencies) {
      if (!this.isAvailable(depId, currentTier)) {
        console.warn(`[ServiceRegistry] Service '${id}' dependency '${depId}' is unavailable`);
        return null;
      }
    }

    if (this.config.enableMetrics) {
      const metrics = this.metrics.get(id);
      if (metrics) {
        metrics.invocationCount++;
        metrics.lastInvocation = new Date();
      }
    }

    return definition.service as T;
  }

  /**
   * Get a service, throwing if unavailable
   */
  getRequired<T>(id: string, requiredTier?: ServiceTier): T {
    const service = this.get<T>(id, requiredTier);
    if (!service) {
      throw new Error(`[ServiceRegistry] Required service '${id}' is not available`);
    }
    return service;
  }

  /**
   * Check if a service is available
   */
  isAvailable(id: string, tier?: ServiceTier): boolean {
    const definition = this.services.get(id);
    if (!definition) return false;
    if (definition.status === 'disabled') return false;
    
    const currentTier = tier || this.config.defaultTier;
    return this.tierAllows(definition.tier, currentTier);
  }

  /**
   * Get service definition (metadata only)
   */
  getDefinition(id: string): ServiceDefinition | undefined {
    return this.services.get(id);
  }

  // --------------------------------------------------------------------------
  // Query & Discovery
  // --------------------------------------------------------------------------

  /**
   * Query services by criteria
   */
  query(query: ServiceQuery): ServiceDefinition[] {
    let results = Array.from(this.services.values());

    if (query.category) {
      results = results.filter(s => s.category === query.category);
    }

    if (query.tier) {
      results = results.filter(s => this.tierAllows(s.tier, query.tier!));
    }

    if (query.status) {
      results = results.filter(s => s.status === query.status);
    }

    if (query.ids && query.ids.length > 0) {
      results = results.filter(s => query.ids!.includes(s.id));
    }

    return results;
  }

  /**
   * Get all enabled services for a tier
   */
  getEnabledServices(tier: ServiceTier): ServiceDefinition[] {
    return this.query({ tier, status: 'enabled' });
  }

  /**
   * Get services by category
   */
  getByCategory(category: ServiceCategory, tier?: ServiceTier): ServiceDefinition[] {
    return this.query({ category, tier: tier || this.config.defaultTier });
  }

  /**
   * List all registered service IDs
   */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service manifest (for UI display)
   */
  getManifest(tier?: ServiceTier): ServiceManifestEntry[] {
    const currentTier = tier || this.config.defaultTier;
    
    return Array.from(this.services.values()).map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      status: def.status,
      tier: def.tier,
      available: this.tierAllows(def.tier, currentTier),
      health: this.health.get(def.id),
      metrics: this.metrics.get(def.id),
    }));
  }

  // --------------------------------------------------------------------------
  // Health Monitoring
  // --------------------------------------------------------------------------

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (!this.config.enableHealthChecks) return;
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckInterval
    );

    this.runHealthChecks();
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Run health checks on all services
   */
  async runHealthChecks(): Promise<Map<string, ServiceHealth>> {
    const results = new Map<string, ServiceHealth>();

    for (const [id, definition] of this.services) {
      if (definition.healthCheck) {
        try {
          const startTime = Date.now();
          const health = await definition.healthCheck();
          health.latency = Date.now() - startTime;
          health.lastCheck = new Date();
          
          this.health.set(id, health);
          results.set(id, health);

          const previousHealth = this.health.get(id);
          if (previousHealth?.status !== health.status) {
            this.emit('service:health-changed', { id, health, previous: previousHealth });
          }
        } catch (error) {
          const errorHealth: ServiceHealth = {
            status: 'unhealthy',
            lastCheck: new Date(),
            errorCount: (this.health.get(id)?.errorCount || 0) + 1,
            message: error instanceof Error ? error.message : 'Health check failed',
          };
          this.health.set(id, errorHealth);
          results.set(id, errorHealth);
          
          this.emit('service:health-error', { id, error });
        }
      }
    }

    return results;
  }

  /**
   * Get health status for a service
   */
  getHealth(id: string): ServiceHealth | undefined {
    return this.health.get(id);
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): { status: string; services: number; healthy: number; degraded: number; unhealthy: number } {
    let healthy = 0, degraded = 0, unhealthy = 0;

    for (const health of this.health.values()) {
      switch (health.status) {
        case 'healthy': healthy++; break;
        case 'degraded': degraded++; break;
        case 'unhealthy': unhealthy++; break;
      }
    }

    const status = unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

    return {
      status,
      services: this.services.size,
      healthy,
      degraded,
      unhealthy,
    };
  }

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  /**
   * Get metrics for a service
   */
  getMetrics(id: string): ServiceMetrics | undefined {
    return this.metrics.get(id);
  }

  /**
   * Record a service invocation with latency
   */
  recordInvocation(id: string, latency: number, success: boolean): void {
    const metrics = this.metrics.get(id);
    if (!metrics) return;

    metrics.invocationCount++;
    metrics.lastInvocation = new Date();
    
    metrics.averageLatency = (
      (metrics.averageLatency * (metrics.invocationCount - 1) + latency) / 
      metrics.invocationCount
    );

    if (!success) {
      const currentErrors = metrics.errorRate * (metrics.invocationCount - 1);
      metrics.errorRate = (currentErrors + 1) / metrics.invocationCount;
    }
  }

  // --------------------------------------------------------------------------
  // Tier Management
  // --------------------------------------------------------------------------

  /**
   * Check if a tier allows access to a required tier level
   */
  private tierAllows(requiredTier: ServiceTier, currentTier: ServiceTier): boolean {
    const tierLevels: Record<ServiceTier, number> = {
      'free': 0,
      'pro': 1,
      'enterprise': 2,
    };

    return tierLevels[currentTier] >= tierLevels[requiredTier];
  }

  /**
   * Set the default tier for the registry
   */
  setDefaultTier(tier: ServiceTier): void {
    this.config.defaultTier = tier;
    this.emit('tier:changed', { tier });
  }

  /**
   * Get current default tier
   */
  getDefaultTier(): ServiceTier {
    return this.config.defaultTier;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Initialize the registry and start health checks
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ServiceRegistry] Initializing...');
    
    for (const [id, definition] of this.services) {
      for (const depId of definition.dependencies) {
        if (!this.services.has(depId)) {
          console.warn(`[ServiceRegistry] Service '${id}' has missing dependency '${depId}'`);
        }
      }
    }

    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    this.initialized = true;
    this.emit('registry:initialized');
    console.log(`[ServiceRegistry] Initialized with ${this.services.size} services`);
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    this.stopHealthChecks();
    this.emit('registry:shutdown');
    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: ServiceRegistry | null = null;

export function getServiceRegistry(config?: Partial<RegistryConfig>): ServiceRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry(config);
  }
  return registryInstance;
}

export function resetRegistry(): void {
  if (registryInstance) {
    registryInstance.shutdown();
    registryInstance = null;
  }
}

export default ServiceRegistry;
