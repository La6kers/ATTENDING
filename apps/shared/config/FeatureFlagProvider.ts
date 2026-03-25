// ============================================================
// ATTENDING AI - Remote Feature Flag Provider
// apps/shared/config/FeatureFlagProvider.ts
//
// Integrates the local FeatureFlags system with remote providers
// like LaunchDarkly, Unleash, or a custom backend.
//
// This enables:
//   - Disabling modules per pilot site (e.g., imaging orders)
//   - A/B testing UI variants across sites
//   - Gradual rollout without code deploys
//   - Emergency kill switches for production features
//
// Usage:
//   await initializeRemoteFlags({ provider: 'unleash', url: '...' });
//   const flags = getFeatureFlags();
//   if (flags.isEnabled('clinical.smart-orders')) { ... }
// ============================================================

import { 
  getFeatureFlags, 
  type FeatureFlagContext, 
  type FeatureDefinition,
  type FeatureStatus 
} from './FeatureFlags';

// ============================================================
// TYPES
// ============================================================

export type RemoteProviderType = 'unleash' | 'launchdarkly' | 'custom' | 'static';

export interface RemoteProviderConfig {
  /** Which provider to use */
  provider: RemoteProviderType;
  /** API URL for the feature flag service */
  url?: string;
  /** API key / client key */
  apiKey?: string;
  /** Refresh interval in seconds (default: 60) */
  refreshInterval?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Environment name (maps to provider environments) */
  environment?: string;
  /** Custom headers for the provider API */
  headers?: Record<string, string>;
}

export interface RemoteFlagOverride {
  featureId: string;
  enabled: boolean;
  /** Optional: site-specific override */
  siteId?: string;
  /** Optional: variant for A/B testing */
  variant?: string;
  /** When this override was last synced */
  syncedAt: string;
}

export interface RemoteFlagState {
  initialized: boolean;
  provider: RemoteProviderType;
  lastSyncAt: string | null;
  overrides: RemoteFlagOverride[];
  error: string | null;
  syncCount: number;
}

// ============================================================
// REMOTE FLAG PROVIDER
// ============================================================

class RemoteFeatureFlagProvider {
  private config: RemoteProviderConfig | null = null;
  private state: RemoteFlagState;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isClient: boolean;

  constructor() {
    this.isClient = typeof window !== 'undefined';
    this.state = {
      initialized: false,
      provider: 'static',
      lastSyncAt: null,
      overrides: [],
      error: null,
      syncCount: 0,
    };
  }

  /**
   * Initialize the remote feature flag provider.
   * Call once at application startup.
   */
  async initialize(config: RemoteProviderConfig): Promise<void> {
    this.config = config;
    this.state.provider = config.provider;

    try {
      // Initial sync
      await this.syncFlags();
      this.state.initialized = true;

      // Set up periodic refresh
      const interval = (config.refreshInterval || 60) * 1000;
      this.refreshTimer = setInterval(() => {
        this.syncFlags().catch(err => {
          console.error('[FeatureFlags:Remote] Sync error:', err);
          this.state.error = err.message;
        });
      }, interval);

      console.log(`[FeatureFlags:Remote] Initialized with ${config.provider} provider`);
      console.log(`[FeatureFlags:Remote] Refresh interval: ${interval / 1000}s`);
      console.log(`[FeatureFlags:Remote] ${this.state.overrides.length} remote overrides loaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FeatureFlags:Remote] Failed to initialize:', message);
      this.state.error = message;
      // Don't throw — fall back to local definitions gracefully
    }
  }

  /**
   * Sync flags from the remote provider.
   */
  private async syncFlags(): Promise<void> {
    if (!this.config?.url) {
      console.warn('[FeatureFlags:Remote] No URL configured, using local flags only');
      return;
    }

    try {
      const overrides = await this.fetchRemoteFlags();
      this.applyOverrides(overrides);
      
      this.state.lastSyncAt = new Date().toISOString();
      this.state.syncCount++;
      this.state.error = null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch flags from the remote provider API.
   * Each provider has a different API format.
   */
  private async fetchRemoteFlags(): Promise<RemoteFlagOverride[]> {
    if (!this.config) return [];

    const timeout = this.config.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      switch (this.config.provider) {
        case 'unleash':
          return this.fetchUnleashFlags(controller.signal);
        case 'launchdarkly':
          return this.fetchLaunchDarklyFlags(controller.signal);
        case 'custom':
          return this.fetchCustomFlags(controller.signal);
        default:
          return [];
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch from Unleash Client API.
   * See: https://docs.getunleash.io/reference/api/unleash/client
   */
  private async fetchUnleashFlags(signal: AbortSignal): Promise<RemoteFlagOverride[]> {
    const url = `${this.config!.url}/api/client/features`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': this.config!.apiKey || '',
        'Content-Type': 'application/json',
        ...this.config!.headers,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Unleash API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.features || []).map((feature: any) => ({
      featureId: feature.name,
      enabled: feature.enabled,
      variant: feature.variants?.[0]?.name,
      syncedAt: new Date().toISOString(),
    }));
  }

  /**
   * Fetch from LaunchDarkly Client SDK endpoint.
   */
  private async fetchLaunchDarklyFlags(signal: AbortSignal): Promise<RemoteFlagOverride[]> {
    const url = `${this.config!.url}/sdk/evalx/contexts`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.config!.apiKey || '',
        'Content-Type': 'application/json',
        ...this.config!.headers,
      },
      body: JSON.stringify({
        key: this.config!.environment || 'production',
        kind: 'multi',
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`LaunchDarkly API error: ${response.status}`);
    }

    const data = await response.json();
    
    return Object.entries(data).map(([key, value]: [string, any]) => ({
      featureId: key,
      enabled: !!value?.value,
      variant: value?.variation?.toString(),
      syncedAt: new Date().toISOString(),
    }));
  }

  /**
   * Fetch from a custom ATTENDING AI flag server.
   * Expected format: { flags: [{ id, enabled, siteId?, variant? }] }
   */
  private async fetchCustomFlags(signal: AbortSignal): Promise<RemoteFlagOverride[]> {
    const url = this.config!.url!;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey || ''}`,
        'Content-Type': 'application/json',
        ...this.config!.headers,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Custom flag API error: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.flags || []).map((flag: any) => ({
      featureId: flag.id,
      enabled: flag.enabled,
      siteId: flag.siteId,
      variant: flag.variant,
      syncedAt: new Date().toISOString(),
    }));
  }

  /**
   * Apply remote overrides to the local FeatureFlags service.
   */
  private applyOverrides(overrides: RemoteFlagOverride[]): void {
    const flags = getFeatureFlags();
    
    // Clear previous remote overrides
    this.state.overrides.forEach(override => {
      flags.removeOverride(override.featureId);
    });

    // Apply new overrides
    overrides.forEach(override => {
      flags.setOverride(override.featureId, override.enabled);
    });

    this.state.overrides = overrides;
  }

  /**
   * Manually set an override (for admin UI or site-specific config).
   */
  setLocalOverride(featureId: string, enabled: boolean): void {
    const flags = getFeatureFlags();
    flags.setOverride(featureId, enabled);
  }

  /**
   * Get the current remote flag state.
   */
  getState(): RemoteFlagState {
    return { ...this.state };
  }

  /**
   * Force a manual sync.
   */
  async forceSync(): Promise<void> {
    await this.syncFlags();
  }

  /**
   * Clean up timers on shutdown.
   */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.state.initialized = false;
  }
}

// ============================================================
// SINGLETON & INITIALIZATION
// ============================================================

let remoteProvider: RemoteFeatureFlagProvider | null = null;

export function getRemoteProvider(): RemoteFeatureFlagProvider {
  if (!remoteProvider) {
    remoteProvider = new RemoteFeatureFlagProvider();
  }
  return remoteProvider;
}

/**
 * Initialize remote feature flags.
 * Call at app startup in _app.tsx or middleware.
 */
export async function initializeRemoteFlags(config: RemoteProviderConfig): Promise<void> {
  const provider = getRemoteProvider();
  await provider.initialize(config);
}

/**
 * Initialize from environment variables.
 * Reads FEATURE_FLAG_PROVIDER, FEATURE_FLAG_URL, FEATURE_FLAG_KEY.
 */
export async function initializeRemoteFlagsFromEnv(): Promise<void> {
  const provider = process.env.FEATURE_FLAG_PROVIDER as RemoteProviderType;
  const url = process.env.FEATURE_FLAG_URL;
  const apiKey = process.env.FEATURE_FLAG_KEY;

  if (!provider || !url) {
    console.log('[FeatureFlags:Remote] No remote provider configured (FEATURE_FLAG_PROVIDER/URL)');
    return;
  }

  await initializeRemoteFlags({
    provider,
    url,
    apiKey,
    environment: process.env.NODE_ENV,
    refreshInterval: parseInt(process.env.FEATURE_FLAG_REFRESH_SECONDS || '60', 10),
  });
}

export default RemoteFeatureFlagProvider;
