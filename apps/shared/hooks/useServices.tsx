/**
 * ATTENDING AI - Service & Feature Hooks
 * 
 * React hooks for Service Registry, AI Provider, and Feature Flags.
 * 
 * @module @attending/shared/hooks
 * @author ATTENDING AI Team
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  useMemo,
  ReactNode 
} from 'react';

import { 
  ServiceRegistry, 
  getServiceRegistry, 
  ServiceTier,
  ServiceCategory,
  ServiceManifestEntry,
  ServiceHealth,
} from '../services/registry';

import {
  AIProviderFactory,
  IClinicalAIProvider,
  AIProviderType,
} from '../services/ai-providers';

import {
  FeatureFlagsService,
  getFeatureFlags,
  FeatureFlagContext,
  FeatureEvaluation,
  FeatureTier,
  FeatureCategory,
} from '../config/FeatureFlags';

// ============================================================================
// Types
// ============================================================================

export interface ServicesContextValue {
  // Service Registry
  registry: ServiceRegistry;
  services: ServiceManifestEntry[];
  getService: <T>(id: string) => T | null;
  isServiceAvailable: (id: string) => boolean;
  serviceHealth: Map<string, ServiceHealth>;
  
  // AI Provider
  aiProvider: IClinicalAIProvider;
  switchAIProvider: (type: AIProviderType) => void;
  currentAIProvider: AIProviderType;
  
  // Feature Flags
  featureFlags: FeatureFlagsService;
  isFeatureEnabled: (featureId: string) => boolean;
  getFeatureEvaluation: (featureId: string) => FeatureEvaluation;
  
  // Tier Management
  currentTier: ServiceTier;
  setTier: (tier: ServiceTier) => void;
  
  // Loading & Health
  isInitialized: boolean;
  systemHealth: { status: string; services: number; healthy: number; degraded: number; unhealthy: number };
}

export interface ServicesProviderProps {
  children: ReactNode;
  initialTier?: ServiceTier;
  userId?: string;
  clinicId?: string;
  environment?: 'development' | 'staging' | 'production';
  aiProvider?: AIProviderType;
}

// ============================================================================
// Context
// ============================================================================

const ServicesContext = createContext<ServicesContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function ServicesProvider({
  children,
  initialTier = 'free',
  userId,
  clinicId,
  environment = 'development',
  aiProvider: initialAIProvider = 'mock',
}: ServicesProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTier, setCurrentTier] = useState<ServiceTier>(initialTier);
  const [currentAIProvider, setCurrentAIProvider] = useState<AIProviderType>(initialAIProvider);
  const [services, setServices] = useState<ServiceManifestEntry[]>([]);
  const [serviceHealth, setServiceHealth] = useState<Map<string, ServiceHealth>>(new Map());
  const [systemHealth, setSystemHealth] = useState({ 
    status: 'healthy', 
    services: 0,
    healthy: 0, 
    degraded: 0, 
    unhealthy: 0 
  });

  const registry = useMemo(() => getServiceRegistry(), []);
  
  const featureFlags = useMemo(() => {
    return getFeatureFlags({
      tier: currentTier as FeatureTier,
      environment,
      userId,
      clinicId,
    });
  }, [currentTier, environment, userId, clinicId]);

  const aiProviderInstance = useMemo(() => {
    return AIProviderFactory.getProvider(currentAIProvider) as IClinicalAIProvider;
  }, [currentAIProvider]);

  useEffect(() => {
    const init = async () => {
      try {
        registry.setDefaultTier(currentTier);
        await registry.initialize();
        setServices(registry.getManifest(currentTier));
        
        registry.on('service:health-changed', ({ id, health }: { id: string; health: ServiceHealth }) => {
          setServiceHealth(prev => new Map(prev).set(id, health));
        });
        
        setSystemHealth(registry.getSystemHealth());
        setIsInitialized(true);
      } catch (error) {
        console.error('[ServicesProvider] Failed to initialize:', error);
      }
    };

    init();

    return () => {
      registry.stopHealthChecks();
    };
  }, [registry, currentTier]);

  useEffect(() => {
    if (isInitialized) {
      registry.setDefaultTier(currentTier);
      featureFlags.setTier(currentTier as FeatureTier);
      setServices(registry.getManifest(currentTier));
    }
  }, [currentTier, isInitialized, registry, featureFlags]);

  const getService = useCallback(<T,>(id: string): T | null => {
    return registry.get<T>(id, currentTier);
  }, [registry, currentTier]);

  const isServiceAvailable = useCallback((id: string): boolean => {
    return registry.isAvailable(id, currentTier);
  }, [registry, currentTier]);

  const switchAIProvider = useCallback((type: AIProviderType) => {
    AIProviderFactory.clearProviders();
    setCurrentAIProvider(type);
  }, []);

  const isFeatureEnabled = useCallback((featureId: string): boolean => {
    return featureFlags.isEnabled(featureId);
  }, [featureFlags]);

  const getFeatureEvaluation = useCallback((featureId: string): FeatureEvaluation => {
    return featureFlags.evaluate(featureId);
  }, [featureFlags]);

  const setTier = useCallback((tier: ServiceTier) => {
    setCurrentTier(tier);
  }, []);

  const contextValue: ServicesContextValue = {
    registry,
    services,
    getService,
    isServiceAvailable,
    serviceHealth,
    aiProvider: aiProviderInstance,
    switchAIProvider,
    currentAIProvider,
    featureFlags,
    isFeatureEnabled,
    getFeatureEvaluation,
    currentTier,
    setTier,
    isInitialized,
    systemHealth,
  };

  return (
    <ServicesContext.Provider value={contextValue}>
      {children}
    </ServicesContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the full services context
 */
export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
}

/**
 * Get a specific service by ID
 */
export function useService<T>(serviceId: string): T | null {
  const { getService, isInitialized } = useServices();
  return useMemo(() => {
    if (!isInitialized) return null;
    return getService<T>(serviceId);
  }, [serviceId, getService, isInitialized]);
}

/**
 * Check if a service is available
 */
export function useServiceAvailable(serviceId: string): boolean {
  const { isServiceAvailable, isInitialized } = useServices();
  return useMemo(() => {
    if (!isInitialized) return false;
    return isServiceAvailable(serviceId);
  }, [serviceId, isServiceAvailable, isInitialized]);
}

/**
 * Get the AI provider
 */
export function useAIProvider(): IClinicalAIProvider {
  const { aiProvider } = useServices();
  return aiProvider;
}

/**
 * Check if a feature is enabled
 */
export function useFeatureFlag(featureId: string): boolean {
  const { isFeatureEnabled, isInitialized } = useServices();
  return useMemo(() => {
    if (!isInitialized) return false;
    return isFeatureEnabled(featureId);
  }, [featureId, isFeatureEnabled, isInitialized]);
}

/**
 * Get detailed feature evaluation
 */
export function useFeatureEvaluation(featureId: string): FeatureEvaluation | null {
  const { getFeatureEvaluation, isInitialized } = useServices();
  return useMemo(() => {
    if (!isInitialized) return null;
    return getFeatureEvaluation(featureId);
  }, [featureId, getFeatureEvaluation, isInitialized]);
}

/**
 * Get features by category
 */
export function useFeaturesByCategory(category: FeatureCategory): FeatureEvaluation[] {
  const { featureFlags, isInitialized } = useServices();
  return useMemo(() => {
    if (!isInitialized) return [];
    return featureFlags.getByCategory(category);
  }, [category, featureFlags, isInitialized]);
}

/**
 * Get services by category
 */
export function useServicesByCategory(category: ServiceCategory): ServiceManifestEntry[] {
  const { services } = useServices();
  return useMemo(() => {
    return services.filter(s => s.category === category);
  }, [services, category]);
}

/**
 * Get the current subscription tier
 */
export function useTier(): [ServiceTier, (tier: ServiceTier) => void] {
  const { currentTier, setTier } = useServices();
  return [currentTier, setTier];
}

/**
 * Get system health status
 */
export function useSystemHealth() {
  const { systemHealth, isInitialized } = useServices();
  return { ...systemHealth, isInitialized };
}

// ============================================================================
// Component Wrappers
// ============================================================================

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on feature flag
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(feature);
  return <>{isEnabled ? children : fallback}</>;
}

interface TierGateProps {
  requiredTier: ServiceTier;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on subscription tier
 */
export function TierGate({ requiredTier, children, fallback = null }: TierGateProps) {
  const [currentTier] = useTier();
  
  const tierLevels: Record<ServiceTier, number> = {
    'free': 0,
    'pro': 1,
    'enterprise': 2,
  };
  
  const hasAccess = tierLevels[currentTier] >= tierLevels[requiredTier];
  return <>{hasAccess ? children : fallback}</>;
}

interface ServiceGateProps {
  service: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on service availability
 */
export function ServiceGate({ service, children, fallback = null }: ServiceGateProps) {
  const isAvailable = useServiceAvailable(service);
  return <>{isAvailable ? children : fallback}</>;
}

// ============================================================================
// Upgrade Prompt Component
// ============================================================================

interface UpgradePromptProps {
  feature: string;
  className?: string;
}

/**
 * Display upgrade prompt for locked features
 */
export function UpgradePrompt({ feature, className = '' }: UpgradePromptProps) {
  const evaluation = useFeatureEvaluation(feature);
  
  if (!evaluation || evaluation.enabled) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-purple-900">
            {evaluation.feature.name}
          </h3>
          <p className="text-sm text-purple-700 mt-1">
            {evaluation.reason}
          </p>
          <p className="text-xs text-purple-600 mt-2">
            Upgrade to <span className="font-semibold capitalize">{evaluation.feature.tier}</span> to unlock this feature.
          </p>
        </div>
        <button className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors">
          Upgrade
        </button>
      </div>
    </div>
  );
}

export default ServicesProvider;
