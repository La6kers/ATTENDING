// =============================================================================
// ATTENDING AI - BioMistral Configuration
// apps/shared/config/biomistral.config.ts
//
// Centralized configuration for BioMistral AI integration
// Supports multiple providers: HuggingFace, Ollama, Replicate
// =============================================================================

export type BioMistralProvider = 'huggingface' | 'ollama' | 'replicate' | 'openai-compatible';
export type FallbackMode = 'rule-based' | 'error' | 'cache';

export interface BioMistralEndpointConfig {
  url: string;
  headers?: Record<string, string>;
  model?: string;
}

export interface BioMistralConfig {
  // Provider selection
  provider: BioMistralProvider;
  apiKey?: string;
  
  // Model settings
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  
  // Endpoint configurations by provider
  endpoints: Record<BioMistralProvider, BioMistralEndpointConfig>;
  
  // Fallback strategy
  fallbackMode: FallbackMode;
  fallbackOrder: BioMistralProvider[];
  
  // Confidence thresholds for different tasks
  thresholds: {
    differential: number;
    treatment: number;
    medication: number;
    labRecommendation: number;
    imagingRecommendation: number;
  };
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
  
  // Caching
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  
  // Audit settings
  audit: {
    enabled: boolean;
    logPrompts: boolean;
    logResponses: boolean;
  };
  
  // Feature flags
  features: {
    differentialDiagnosis: boolean;
    treatmentPlanning: boolean;
    labRecommendations: boolean;
    imagingRecommendations: boolean;
    clinicalNoteGeneration: boolean;
    patientEducation: boolean;
    priorAuthLetters: boolean;
  };
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_BIOMISTRAL_CONFIG: BioMistralConfig = {
  // Default to Ollama for local development
  provider: (process.env.BIOMISTRAL_PROVIDER as BioMistralProvider) || 'ollama',
  apiKey: process.env.BIOMISTRAL_API_KEY || process.env.NEXT_PUBLIC_BIOMISTRAL_API_KEY,
  
  // Model settings - conservative for clinical accuracy
  model: process.env.BIOMISTRAL_MODEL || 'biomistral:7b',
  temperature: parseFloat(process.env.BIOMISTRAL_TEMPERATURE || '0.3'),
  maxTokens: parseInt(process.env.BIOMISTRAL_MAX_TOKENS || '2048', 10),
  topP: 0.9,
  
  // Endpoint configurations
  endpoints: {
    huggingface: {
      url: process.env.BIOMISTRAL_HF_ENDPOINT || 'https://api-inference.huggingface.co/models/BioMistral/BioMistral-7B',
      headers: {
        'Authorization': `Bearer ${process.env.BIOMISTRAL_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
    },
    ollama: {
      url: process.env.BIOMISTRAL_OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate',
      model: 'biomistral:7b',
    },
    replicate: {
      url: 'https://api.replicate.com/v1/predictions',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
      model: 'biomistral/biomistral-7b',
    },
    'openai-compatible': {
      url: process.env.BIOMISTRAL_OPENAI_ENDPOINT || 'http://localhost:8000/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${process.env.BIOMISTRAL_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      model: 'biomistral-7b',
    },
  },
  
  // Fallback strategy
  fallbackMode: (process.env.AI_FALLBACK_MODE as FallbackMode) || 'rule-based',
  fallbackOrder: ['ollama', 'huggingface', 'replicate'],
  
  // Confidence thresholds - higher for medication safety
  thresholds: {
    differential: parseFloat(process.env.AI_THRESHOLD_DIFFERENTIAL || '0.70'),
    treatment: parseFloat(process.env.AI_THRESHOLD_TREATMENT || '0.75'),
    medication: parseFloat(process.env.AI_THRESHOLD_MEDICATION || '0.85'),
    labRecommendation: parseFloat(process.env.AI_THRESHOLD_LABS || '0.75'),
    imagingRecommendation: parseFloat(process.env.AI_THRESHOLD_IMAGING || '0.75'),
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_RPM || '60', 10),
    tokensPerMinute: parseInt(process.env.AI_RATE_LIMIT_TPM || '100000', 10),
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
  
  // Caching
  cache: {
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
    ttlSeconds: parseInt(process.env.AI_CACHE_TTL || '3600', 10), // 1 hour
  },
  
  // Audit settings
  audit: {
    enabled: process.env.AI_AUDIT_ENABLED !== 'false',
    logPrompts: process.env.NODE_ENV === 'development',
    logResponses: process.env.NODE_ENV === 'development',
  },
  
  // Feature flags - all enabled by default
  features: {
    differentialDiagnosis: process.env.FEATURE_AI_DIFFERENTIAL !== 'false',
    treatmentPlanning: process.env.FEATURE_AI_TREATMENT !== 'false',
    labRecommendations: process.env.FEATURE_AI_LABS !== 'false',
    imagingRecommendations: process.env.FEATURE_AI_IMAGING !== 'false',
    clinicalNoteGeneration: process.env.FEATURE_AI_NOTES !== 'false',
    patientEducation: process.env.FEATURE_AI_EDUCATION !== 'false',
    priorAuthLetters: process.env.FEATURE_AI_PRIOR_AUTH !== 'false',
  },
};

// =============================================================================
// Configuration Loader
// =============================================================================

let configInstance: BioMistralConfig | null = null;

export function getBioMistralConfig(): BioMistralConfig {
  if (!configInstance) {
    configInstance = { ...DEFAULT_BIOMISTRAL_CONFIG };
  }
  return configInstance;
}

export function updateBioMistralConfig(updates: Partial<BioMistralConfig>): BioMistralConfig {
  configInstance = { ...getBioMistralConfig(), ...updates };
  return configInstance;
}

// =============================================================================
// Validation
// =============================================================================

export function validateConfig(config: BioMistralConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check API key for cloud providers
  if (['huggingface', 'replicate'].includes(config.provider) && !config.apiKey) {
    errors.push(`API key required for ${config.provider} provider`);
  }
  
  // Check endpoint URL
  const endpoint = config.endpoints[config.provider];
  if (!endpoint?.url) {
    errors.push(`Endpoint URL not configured for ${config.provider}`);
  }
  
  // Validate thresholds are in range
  Object.entries(config.thresholds).forEach(([key, value]) => {
    if (value < 0 || value > 1) {
      errors.push(`Threshold ${key} must be between 0 and 1`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Health Check
// =============================================================================

export async function checkBioMistralHealth(): Promise<{
  available: boolean;
  provider: BioMistralProvider;
  latencyMs?: number;
  error?: string;
}> {
  const config = getBioMistralConfig();
  const endpoint = config.endpoints[config.provider];
  const startTime = Date.now();
  
  try {
    // Different health check based on provider
    if (config.provider === 'ollama') {
      const response = await fetch(endpoint.url.replace('/api/generate', '/api/tags'), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      
      const data = await response.json();
      const hasModel = data.models?.some((m: any) => 
        m.name.includes('biomistral') || m.name.includes('mistral')
      );
      
      if (!hasModel) {
        return {
          available: false,
          provider: config.provider,
          error: 'BioMistral model not found in Ollama',
        };
      }
    } else {
      // For cloud providers, just check endpoint is reachable
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        headers: endpoint.headers,
        signal: AbortSignal.timeout(5000),
      });
      
      // HuggingFace returns 400 for HEAD, but that means it's reachable
      if (response.status >= 500) {
        throw new Error(`Provider returned ${response.status}`);
      }
    }
    
    return {
      available: true,
      provider: config.provider,
      latencyMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      available: false,
      provider: config.provider,
      error: error.message,
    };
  }
}
