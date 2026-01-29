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

// Import existing service instances
import { ambientScribeService } from './ai-scribe/AmbientScribeService';
import { deteriorationAlertService } from './predictive-alerts/DeteriorationAlertService';
import { diagnosticSolverService } from './diagnostic-solver/DiagnosticSolverService';
import { imageAnalysisService } from './clinical-imaging/ImageAnalysisService';
import { smartInboxService } from './smart-inbox/SmartInboxService';
import { careGapsService } from './care-gaps/CareGapsService';
import { smartSchedulingService } from './smart-scheduling/SmartSchedulingService';
import { peerConsultService } from './peer-consult/PeerConsultService';
import { medicationBuddyService } from './patient-engagement/MedicationBuddyService';
import { healthCoachingService } from './patient-engagement/HealthCoachingService';
import { familyHealthHubService } from './patient-engagement/FamilyHealthHubService';
import { postDischargeConciergeService } from './patient-engagement/PostDischargeConciergeService';
import { mentalHealthService } from './mental-health/MentalHealthService';
import { socialSupportService } from './social-support/SocialSupportService';
import { endOfLifeService } from './end-of-life/EndOfLifeService';
import { medicalInterpreterService } from './interpreter/MedicalInterpreterService';
import { populationHealthService } from './population-health/PopulationHealthService';
import { wearablesService } from './wearables/WearablesService';
import { clinicalDecisionEngine } from './clinical-decision/ClinicalDecisionEngine';

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

const SERVICE_REGISTRATIONS: ServiceRegistration[] = [
  // ---------------------------------------------------------------------------
  // AI Services (Clinical Intelligence)
  // ---------------------------------------------------------------------------
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
    id: 'ai.image-analysis',
    name: 'Medical Image Analysis',
    description: 'AI-assisted radiology image interpretation',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'enterprise',
    dependencies: [],
    service: imageAnalysisService,
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

  // ---------------------------------------------------------------------------
  // Workflow Services
  // ---------------------------------------------------------------------------
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
  {
    id: 'workflow.smart-scheduling',
    name: 'Smart Scheduling',
    description: 'AI-optimized appointment scheduling',
    version: '1.0.0',
    category: 'workflow',
    tier: 'enterprise',
    dependencies: [],
    service: smartSchedulingService,
  },
  {
    id: 'workflow.peer-consult',
    name: 'Peer Consultation',
    description: 'Request specialist consultations',
    version: '1.0.0',
    category: 'communication',
    tier: 'enterprise',
    dependencies: [],
    service: peerConsultService,
  },

  // ---------------------------------------------------------------------------
  // Patient Engagement Services
  // ---------------------------------------------------------------------------
  {
    id: 'patient.medication-buddy',
    name: 'Medication Buddy',
    description: 'Medication reminder and adherence tracking',
    version: '1.0.0',
    category: 'patient-engagement',
    tier: 'pro',
    dependencies: [],
    service: medicationBuddyService,
  },
  {
    id: 'patient.health-coaching',
    name: 'AI Health Coaching',
    description: 'Personalized health coaching and education',
    version: '1.0.0',
    category: 'patient-engagement',
    tier: 'pro',
    dependencies: [],
    service: healthCoachingService,
  },
  {
    id: 'patient.family-hub',
    name: 'Family Health Hub',
    description: 'Family health management and sharing',
    version: '1.0.0',
    category: 'patient-engagement',
    tier: 'pro',
    dependencies: [],
    service: familyHealthHubService,
  },
  {
    id: 'patient.post-discharge',
    name: 'Post-Discharge Concierge',
    description: 'Post-discharge care coordination',
    version: '1.0.0',
    category: 'patient-engagement',
    tier: 'enterprise',
    dependencies: [],
    service: postDischargeConciergeService,
  },

  // ---------------------------------------------------------------------------
  // Specialized Care Services
  // ---------------------------------------------------------------------------
  {
    id: 'care.mental-health',
    name: 'Mental Health Support',
    description: 'Mental health screening and resources',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'pro',
    dependencies: [],
    service: mentalHealthService,
  },
  {
    id: 'care.social-support',
    name: 'Social Support Services',
    description: 'Social determinants of health resources',
    version: '1.0.0',
    category: 'patient-engagement',
    tier: 'pro',
    dependencies: [],
    service: socialSupportService,
  },
  {
    id: 'care.end-of-life',
    name: 'End of Life Care',
    description: 'Palliative and hospice care support',
    version: '1.0.0',
    category: 'clinical-ai',
    tier: 'enterprise',
    dependencies: [],
    service: endOfLifeService,
  },

  // ---------------------------------------------------------------------------
  // Platform Services
  // ---------------------------------------------------------------------------
  {
    id: 'platform.interpreter',
    name: 'Medical Interpreter',
    description: 'Real-time medical translation',
    version: '1.0.0',
    category: 'communication',
    tier: 'enterprise',
    dependencies: [],
    service: medicalInterpreterService,
  },
  {
    id: 'platform.population-health',
    name: 'Population Health',
    description: 'Population-level health analytics',
    version: '1.0.0',
    category: 'analytics',
    tier: 'enterprise',
    dependencies: [],
    service: populationHealthService,
  },
  {
    id: 'platform.wearables',
    name: 'Wearables Integration',
    description: 'Wearable device data integration',
    version: '1.0.0',
    category: 'integration',
    tier: 'enterprise',
    dependencies: [],
    service: wearablesService,
  },
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
