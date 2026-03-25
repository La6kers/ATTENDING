/**
 * ATTENDING AI - Service Registration Bootstrap
 * 
 * This file registers all clinical services with the Service Registry.
 * Import this early in your application to ensure services are available.
 * 
 * Usage:
 *   // In _app.tsx or layout.tsx
 *   import '@attending/shared/services/registerServices';
 * 
 * @module @attending/shared/services
 * @author ATTENDING AI Team
 */

import { getServiceRegistry, ServiceDefinition, ServiceTier, ServiceCategory } from './registry';

// ==========================================================================
// PRODUCTION-READY Services (registered by default)
// ==========================================================================
import { diagnosticSolverService } from './diagnostic-solver/DiagnosticSolverService';
import { smartInboxService } from './smart-inbox/SmartInboxService';
import { careGapsService } from './care-gaps/CareGapsService';
import { clinicalDecisionEngine } from './clinical-decision/ClinicalDecisionEngine';

// ==========================================================================
// PARTIALLY IMPLEMENTED Services (registered only when feature-flagged)
// ==========================================================================
import { ambientScribeService } from './ai-scribe/AmbientScribeService';
import { deteriorationAlertService } from './predictive-alerts/DeteriorationAlertService';
import { imageAnalysisService } from './clinical-imaging/ImageAnalysisService';

// ==========================================================================
// FUTURE Services — moved to _future/ directory
// To re-enable: move service back from _future/ and add to registrations below
// Previously registered:
//   - smartSchedulingService, peerConsultService
//   - medicationBuddyService, healthCoachingService, familyHealthHubService, postDischargeConciergeService
//   - mentalHealthService, socialSupportService, endOfLifeService
//   - medicalInterpreterService, populationHealthService, wearablesService
// ==========================================================================

// ============================================================================
// Service Definitions
// ============================================================================

type ServiceRegistration = {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ServiceCategory;
  tier: ServiceTier;
  dependencies: string[];
  service: any;
};

// ==========================================================================
// PRODUCTION-READY SERVICES — always registered
// ==========================================================================
const PRODUCTION_SERVICES: ServiceRegistration[] = [
  {
    id: 'ai.diagnostic-solver',
    name: 'Diagnostic Solver',
    description: 'AI differential diagnosis generation',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'pro',
    dependencies: [],
    service: diagnosticSolverService,
  },
  {
    id: 'ai.clinical-decision',
    name: 'Clinical Decision Engine',
    description: 'Evidence-based clinical decision support',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'pro',
    dependencies: [],
    service: clinicalDecisionEngine,
  },
  {
    id: 'workflow.smart-inbox',
    name: 'Smart Inbox',
    description: 'AI-prioritized message inbox',
    version: '1.0.0',
    category: 'workflow',
    tier: 'pro',
    dependencies: [],
    service: smartInboxService,
  },
  {
    id: 'workflow.care-gaps',
    name: 'Care Gap Detection',
    description: 'Identify missing preventive care and screenings',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'pro',
    dependencies: [],
    service: careGapsService,
  },
];

// ==========================================================================
// PARTIAL SERVICES — registered when feature flag is enabled
// These have real implementations but depend on external APIs not yet connected
// ==========================================================================
const PARTIAL_SERVICES: ServiceRegistration[] = [
  {
    id: 'ai.ambient-scribe',
    name: 'AI Ambient Scribe',
    description: 'Automatic clinical documentation from ambient listening',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'enterprise',
    dependencies: [],
    service: ambientScribeService,
  },
  {
    id: 'ai.deterioration-alerts',
    name: 'Deterioration Alerts',
    description: 'Early warning system for patient deterioration',
    version: '1.0.0',
    category: 'safety',
    tier: 'enterprise',
    dependencies: [],
    service: deteriorationAlertService,
  },
  {
    id: 'ai.image-analysis',
    name: 'Medical Image Analysis',
    description: 'AI-assisted radiology image interpretation',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'enterprise',
    dependencies: [],
    service: imageAnalysisService,
  },
];

// Combined registrations (production + feature-flagged partial services)
const SERVICE_REGISTRATIONS: ServiceRegistration[] = [
  ...PRODUCTION_SERVICES,
  ...PARTIAL_SERVICES,
];

// ============================================================================
// Registration Function
// ============================================================================

let isRegistered = false;

export function registerAllServices(): void {
  if (isRegistered) {
    console.log('[registerServices] Services already registered, skipping...');
    return;
  }

  const registry = getServiceRegistry();

  console.log('[registerServices] Registering ATTENDING AI services...');

  for (const reg of SERVICE_REGISTRATIONS) {
    try {
      registry.register({
        id: reg.id,
        name: reg.name,
        description: reg.description,
        version: reg.version,
        category: reg.category,
        status: 'enabled',
        tier: reg.tier,
        dependencies: reg.dependencies,
        service: reg.service,
      });
    } catch (error) {
      console.error(`[registerServices] Failed to register ${reg.id}:`, error);
    }
  }

  isRegistered = true;
  console.log(`[registerServices] Registered ${SERVICE_REGISTRATIONS.length} services`);
}

// Auto-register on import (can be disabled by setting env var)
if (typeof process !== 'undefined' && process.env.SKIP_AUTO_REGISTER !== 'true') {
  registerAllServices();
}

export default registerAllServices;
