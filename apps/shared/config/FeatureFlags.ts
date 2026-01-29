/**
 * ATTENDING AI - Feature Flags System
 * 
 * Enables gradual rollout, A/B testing, and tier-based feature gating.
 * Features can be enabled per environment, per clinic, or per user.
 * 
 * @module @attending/shared/config
 * @author ATTENDING AI Team
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type FeatureStatus = 'enabled' | 'disabled' | 'beta' | 'alpha' | 'deprecated';
export type FeatureTier = 'free' | 'pro' | 'enterprise';
export type FeatureCategory = 
  | 'ai'
  | 'clinical'
  | 'integration'
  | 'ui'
  | 'patient'
  | 'provider'
  | 'admin'
  | 'experimental';

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  tier: FeatureTier;
  defaultEnabled: boolean;
  rolloutPercentage?: number; // 0-100 for gradual rollout
  dependencies?: string[]; // Other features this depends on
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface FeatureFlagContext {
  userId?: string;
  clinicId?: string;
  tier: FeatureTier;
  environment: 'development' | 'staging' | 'production';
  userGroups?: string[];
  overrides?: Record<string, boolean>;
}

export interface FeatureEvaluation {
  enabled: boolean;
  reason: string;
  feature: FeatureDefinition;
}

// ============================================================================
// Feature Definitions - All ATTENDING AI Features
// ============================================================================

export const FEATURE_DEFINITIONS: Record<string, FeatureDefinition> = {
  // ---------------------------------------------------------------------------
  // AI Features
  // ---------------------------------------------------------------------------
  'ai.ambient-scribe': {
    id: 'ai.ambient-scribe',
    name: 'AI Ambient Scribe',
    description: 'Automatic clinical documentation from ambient listening',
    category: 'ai',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'ai.differential-diagnosis': {
    id: 'ai.differential-diagnosis',
    name: 'AI Differential Diagnosis',
    description: 'AI-powered differential diagnosis suggestions',
    category: 'ai',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'ai.predictive-alerts': {
    id: 'ai.predictive-alerts',
    name: 'Predictive Deterioration Alerts',
    description: 'AI predictions for patient deterioration risk',
    category: 'ai',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'ai.order-recommendations': {
    id: 'ai.order-recommendations',
    name: 'AI Order Recommendations',
    description: 'Smart lab and imaging order suggestions',
    category: 'ai',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'ai.drug-interactions': {
    id: 'ai.drug-interactions',
    name: 'AI Drug Interaction Checking',
    description: 'Advanced drug interaction analysis',
    category: 'ai',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'ai.clinical-trials': {
    id: 'ai.clinical-trials',
    name: 'Clinical Trials Matcher',
    description: 'Match patients to eligible clinical trials',
    category: 'ai',
    status: 'beta',
    tier: 'enterprise',
    defaultEnabled: false,
    rolloutPercentage: 50,
  },
  'ai.image-analysis': {
    id: 'ai.image-analysis',
    name: 'Medical Image Analysis',
    description: 'AI-assisted radiology image interpretation',
    category: 'ai',
    status: 'alpha',
    tier: 'enterprise',
    defaultEnabled: false,
    rolloutPercentage: 10,
  },
  'ai.diagnostic-solver': {
    id: 'ai.diagnostic-solver',
    name: 'Diagnostic Problem Solver',
    description: 'Complex diagnostic reasoning with step-by-step explanation',
    category: 'ai',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // Clinical Features
  // ---------------------------------------------------------------------------
  'clinical.smart-orders': {
    id: 'clinical.smart-orders',
    name: 'Smart Order Assistant',
    description: 'Intelligent order entry with clinical decision support',
    category: 'clinical',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'clinical.care-gaps': {
    id: 'clinical.care-gaps',
    name: 'Care Gap Detection',
    description: 'Identify missing preventive care and screenings',
    category: 'clinical',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'clinical.medication-optimizer': {
    id: 'clinical.medication-optimizer',
    name: 'Medication Optimizer',
    description: 'Optimize medication regimens for efficacy and cost',
    category: 'clinical',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'clinical.red-flag-detection': {
    id: 'clinical.red-flag-detection',
    name: 'Red Flag Detection',
    description: 'Automatic detection of critical symptoms',
    category: 'clinical',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'clinical.prior-auth': {
    id: 'clinical.prior-auth',
    name: 'Prior Authorization Automation',
    description: 'Automated prior authorization submission',
    category: 'clinical',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'clinical.quality-measures': {
    id: 'clinical.quality-measures',
    name: 'Quality Measures Dashboard',
    description: 'HEDIS and quality measure tracking',
    category: 'clinical',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'clinical.care-coordination': {
    id: 'clinical.care-coordination',
    name: 'Care Coordination Hub',
    description: 'Multi-provider care coordination tools',
    category: 'clinical',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'clinical.sdoh-screening': {
    id: 'clinical.sdoh-screening',
    name: 'SDOH Screening',
    description: 'Social determinants of health screening and resources',
    category: 'clinical',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // Integration Features
  // ---------------------------------------------------------------------------
  'integration.epic-fhir': {
    id: 'integration.epic-fhir',
    name: 'Epic FHIR Integration',
    description: 'Bidirectional Epic EHR integration via FHIR',
    category: 'integration',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'integration.oracle-health': {
    id: 'integration.oracle-health',
    name: 'Oracle Health Integration',
    description: 'Cerner/Oracle Health EHR integration',
    category: 'integration',
    status: 'beta',
    tier: 'enterprise',
    defaultEnabled: false,
  },
  'integration.smart-on-fhir': {
    id: 'integration.smart-on-fhir',
    name: 'SMART on FHIR Launch',
    description: 'Launch from EHR as SMART app',
    category: 'integration',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'integration.lab-interfaces': {
    id: 'integration.lab-interfaces',
    name: 'Lab Result Interfaces',
    description: 'Direct lab result integration',
    category: 'integration',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'integration.e-prescribing': {
    id: 'integration.e-prescribing',
    name: 'E-Prescribing (EPCS)',
    description: 'Electronic prescribing including controlled substances',
    category: 'integration',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'integration.fhir-sync': {
    id: 'integration.fhir-sync',
    name: 'FHIR Data Sync',
    description: 'Bidirectional patient data synchronization',
    category: 'integration',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // Patient Portal Features
  // ---------------------------------------------------------------------------
  'patient.compass-chat': {
    id: 'patient.compass-chat',
    name: 'COMPASS AI Chat',
    description: 'AI-powered symptom assessment chatbot',
    category: 'patient',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'patient.voice-input': {
    id: 'patient.voice-input',
    name: 'Voice Input',
    description: 'Voice-based symptom entry',
    category: 'patient',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'patient.emergency-access': {
    id: 'patient.emergency-access',
    name: 'Emergency Medical Access',
    description: 'Emergency medical information access for first responders',
    category: 'patient',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'patient.medication-buddy': {
    id: 'patient.medication-buddy',
    name: 'Medication Buddy',
    description: 'Medication reminder and adherence tracking',
    category: 'patient',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'patient.rpm': {
    id: 'patient.rpm',
    name: 'Remote Patient Monitoring',
    description: 'Wearables and home device integration',
    category: 'patient',
    status: 'beta',
    tier: 'enterprise',
    defaultEnabled: false,
    rolloutPercentage: 25,
  },
  'patient.telehealth': {
    id: 'patient.telehealth',
    name: 'Telehealth Video Visits',
    description: 'Integrated video visit capability',
    category: 'patient',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'patient.health-coaching': {
    id: 'patient.health-coaching',
    name: 'AI Health Coaching',
    description: 'Personalized health coaching and education',
    category: 'patient',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'patient.family-hub': {
    id: 'patient.family-hub',
    name: 'Family Health Hub',
    description: 'Family health management and sharing',
    category: 'patient',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // Provider Portal Features
  // ---------------------------------------------------------------------------
  'provider.smart-inbox': {
    id: 'provider.smart-inbox',
    name: 'Smart Inbox',
    description: 'AI-prioritized message inbox',
    category: 'provider',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'provider.smart-scheduling': {
    id: 'provider.smart-scheduling',
    name: 'Smart Scheduling',
    description: 'AI-optimized appointment scheduling',
    category: 'provider',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'provider.peer-consult': {
    id: 'provider.peer-consult',
    name: 'Peer Consultation',
    description: 'Request specialist consultations',
    category: 'provider',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'provider.population-health': {
    id: 'provider.population-health',
    name: 'Population Health Dashboard',
    description: 'Population-level health analytics',
    category: 'provider',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },
  'provider.previsit-summary': {
    id: 'provider.previsit-summary',
    name: 'Pre-Visit Summary',
    description: 'AI-generated pre-visit patient summaries',
    category: 'provider',
    status: 'enabled',
    tier: 'pro',
    defaultEnabled: true,
  },
  'provider.command-center': {
    id: 'provider.command-center',
    name: 'Clinical Command Center',
    description: 'Real-time clinical operations dashboard',
    category: 'provider',
    status: 'enabled',
    tier: 'enterprise',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // UI Features
  // ---------------------------------------------------------------------------
  'ui.dark-mode': {
    id: 'ui.dark-mode',
    name: 'Dark Mode',
    description: 'Dark theme for the interface',
    category: 'ui',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'ui.compact-view': {
    id: 'ui.compact-view',
    name: 'Compact View',
    description: 'High-density information display',
    category: 'ui',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },
  'ui.keyboard-shortcuts': {
    id: 'ui.keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Power-user keyboard shortcuts',
    category: 'ui',
    status: 'enabled',
    tier: 'free',
    defaultEnabled: true,
  },

  // ---------------------------------------------------------------------------
  // Experimental Features
  // ---------------------------------------------------------------------------
  'experimental.llm-agent': {
    id: 'experimental.llm-agent',
    name: 'LLM Clinical Agent',
    description: 'Autonomous AI agent for clinical tasks',
    category: 'experimental',
    status: 'alpha',
    tier: 'enterprise',
    defaultEnabled: false,
    rolloutPercentage: 5,
  },
  'experimental.voice-assistant': {
    id: 'experimental.voice-assistant',
    name: 'Voice Clinical Assistant',
    description: 'Hands-free voice-controlled clinical interface',
    category: 'experimental',
    status: 'alpha',
    tier: 'enterprise',
    defaultEnabled: false,
    rolloutPercentage: 10,
  },
};

// ============================================================================
// Feature Flags Service
// ============================================================================

export class FeatureFlagsService {
  private definitions: Map<string, FeatureDefinition>;
  private overrides: Map<string, boolean>;
  private context: FeatureFlagContext;

  constructor(context?: Partial<FeatureFlagContext>) {
    this.definitions = new Map(Object.entries(FEATURE_DEFINITIONS));
    this.overrides = new Map();
    this.context = {
      tier: 'free',
      environment: (process.env.NODE_ENV as any) || 'development',
      ...context,
    };
  }

  // --------------------------------------------------------------------------
  // Core Methods
  // --------------------------------------------------------------------------

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureId: string): boolean {
    return this.evaluate(featureId).enabled;
  }

  /**
   * Evaluate a feature with detailed reasoning
   */
  evaluate(featureId: string): FeatureEvaluation {
    const feature = this.definitions.get(featureId);
    
    if (!feature) {
      return {
        enabled: false,
        reason: `Feature '${featureId}' not found`,
        feature: this.createUnknownFeature(featureId),
      };
    }

    // Check for explicit override
    if (this.overrides.has(featureId)) {
      return {
        enabled: this.overrides.get(featureId)!,
        reason: 'Explicit override',
        feature,
      };
    }

    // Check context overrides
    if (this.context.overrides?.[featureId] !== undefined) {
      return {
        enabled: this.context.overrides[featureId],
        reason: 'Context override',
        feature,
      };
    }

    // Check feature status
    if (feature.status === 'disabled' || feature.status === 'deprecated') {
      return {
        enabled: false,
        reason: `Feature is ${feature.status}`,
        feature,
      };
    }

    // Check tier
    if (!this.tierAllows(feature.tier)) {
      return {
        enabled: false,
        reason: `Requires ${feature.tier} tier (current: ${this.context.tier})`,
        feature,
      };
    }

    // Check date range
    const now = new Date();
    if (feature.startDate && now < feature.startDate) {
      return {
        enabled: false,
        reason: `Feature available from ${feature.startDate.toISOString()}`,
        feature,
      };
    }
    if (feature.endDate && now > feature.endDate) {
      return {
        enabled: false,
        reason: `Feature deprecated as of ${feature.endDate.toISOString()}`,
        feature,
      };
    }

    // Check rollout percentage
    if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
      const inRollout = this.isInRollout(featureId, feature.rolloutPercentage);
      if (!inRollout) {
        return {
          enabled: false,
          reason: `Not in ${feature.rolloutPercentage}% rollout`,
          feature,
        };
      }
    }

    // Check dependencies
    if (feature.dependencies && feature.dependencies.length > 0) {
      for (const depId of feature.dependencies) {
        if (!this.isEnabled(depId)) {
          return {
            enabled: false,
            reason: `Dependency '${depId}' is not enabled`,
            feature,
          };
        }
      }
    }

    // Alpha/beta in production need explicit opt-in
    if (this.context.environment === 'production') {
      if (feature.status === 'alpha' && !feature.defaultEnabled) {
        return {
          enabled: false,
          reason: 'Alpha features disabled in production',
          feature,
        };
      }
    }

    return {
      enabled: feature.defaultEnabled,
      reason: 'Default enabled state',
      feature,
    };
  }

  /**
   * Get all features for a category
   */
  getByCategory(category: FeatureCategory): FeatureEvaluation[] {
    const features: FeatureEvaluation[] = [];
    
    for (const [id, def] of this.definitions) {
      if (def.category === category) {
        features.push(this.evaluate(id));
      }
    }

    return features;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(): FeatureEvaluation[] {
    const enabled: FeatureEvaluation[] = [];
    
    for (const id of this.definitions.keys()) {
      const evaluation = this.evaluate(id);
      if (evaluation.enabled) {
        enabled.push(evaluation);
      }
    }

    return enabled;
  }

  /**
   * Get feature manifest for UI display
   */
  getManifest(): Array<FeatureEvaluation & { available: boolean }> {
    const manifest: Array<FeatureEvaluation & { available: boolean }> = [];
    
    for (const [id, def] of this.definitions) {
      const evaluation = this.evaluate(id);
      manifest.push({
        ...evaluation,
        available: this.tierAllows(def.tier),
      });
    }

    return manifest.sort((a, b) => a.feature.name.localeCompare(b.feature.name));
  }

  // --------------------------------------------------------------------------
  // Override Management
  // --------------------------------------------------------------------------

  setOverride(featureId: string, enabled: boolean): void {
    this.overrides.set(featureId, enabled);
  }

  removeOverride(featureId: string): void {
    this.overrides.delete(featureId);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  getOverrides(): Record<string, boolean> {
    return Object.fromEntries(this.overrides);
  }

  // --------------------------------------------------------------------------
  // Context Management
  // --------------------------------------------------------------------------

  setContext(context: Partial<FeatureFlagContext>): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): FeatureFlagContext {
    return { ...this.context };
  }

  setTier(tier: FeatureTier): void {
    this.context.tier = tier;
  }

  // --------------------------------------------------------------------------
  // Feature Definition Management
  // --------------------------------------------------------------------------

  register(definition: FeatureDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  getDefinition(featureId: string): FeatureDefinition | undefined {
    return this.definitions.get(featureId);
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private tierAllows(requiredTier: FeatureTier): boolean {
    const tierLevels: Record<FeatureTier, number> = {
      'free': 0,
      'pro': 1,
      'enterprise': 2,
    };
    return tierLevels[this.context.tier] >= tierLevels[requiredTier];
  }

  private isInRollout(featureId: string, percentage: number): boolean {
    const id = this.context.userId || this.context.clinicId || 'anonymous';
    const hash = this.hashString(`${featureId}:${id}`);
    return (hash % 100) < percentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private createUnknownFeature(id: string): FeatureDefinition {
    return {
      id,
      name: 'Unknown Feature',
      description: 'This feature is not defined',
      category: 'experimental',
      status: 'disabled',
      tier: 'enterprise',
      defaultEnabled: false,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let featureFlagsInstance: FeatureFlagsService | null = null;

export function getFeatureFlags(context?: Partial<FeatureFlagContext>): FeatureFlagsService {
  if (!featureFlagsInstance) {
    featureFlagsInstance = new FeatureFlagsService(context);
  } else if (context) {
    featureFlagsInstance.setContext(context);
  }
  return featureFlagsInstance;
}

export function resetFeatureFlags(): void {
  featureFlagsInstance = null;
}

// ============================================================================
// Convenience Constants for Direct Import
// ============================================================================

/**
 * Quick access to feature flags (for use in components)
 * 
 * Usage:
 *   import { FEATURES } from '@attending/shared/config';
 *   if (FEATURES.AI_AMBIENT_SCRIBE) { ... }
 */
export const FEATURES = new Proxy({} as Record<string, boolean>, {
  get(_, prop: string) {
    const featureId = prop.toLowerCase().replace(/_/g, '.');
    return getFeatureFlags().isEnabled(featureId);
  },
});

export default FeatureFlagsService;
