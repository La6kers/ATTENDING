// =============================================================================
// ATTENDING AI - Services Index
// apps/shared/services/index.ts
//
// Central export for all ATTENDING AI services.
//
// Services are organized into three tiers:
//   ACTIVE      — Currently imported and used by provider/patient portals
//   FUTURE      — Built but behind feature flags, ready for activation
//   PLANNED     — Not yet implemented (exports commented out)
//
// See FEATURE_INVENTORY.md for the full audit.
// =============================================================================

// ---------------------------------------------------------------------------
// ACTIVE: Clinical Intelligence Services
// ---------------------------------------------------------------------------
export { AmbientScribeService, ambientScribeService } from './ai-scribe/AmbientScribeService';
export { ClinicalDecisionEngine, clinicalDecisionEngine } from './clinical-decision/ClinicalDecisionEngine';

// ---------------------------------------------------------------------------
// ACTIVE: Intervention Services (under interventions/)
// ---------------------------------------------------------------------------
export { SmartOrderAssistant, smartOrderAssistant } from './interventions/SmartOrderAssistant';
export { ClinicalTrialMatcher, clinicalTrialMatcher } from './interventions/ClinicalTrialMatcher';
export { MedicationOptimizer, medicationOptimizer } from './interventions/MedicationOptimizer';
export { CareCoordinationHub, careCoordinationHub } from './interventions/CareCoordinationHub';
export { SDOHService, sdohService } from './interventions/SDOHService';

// ---------------------------------------------------------------------------
// FUTURE-TOGGLE: Built services, not yet wired to UI
// Activate via FeatureFlags.ts when ready
// ---------------------------------------------------------------------------
export { DeteriorationAlertService, deteriorationAlertService } from './predictive-alerts/DeteriorationAlertService';
export { DiagnosticSolverService, diagnosticSolverService } from './diagnostic-solver/DiagnosticSolverService';
export { ImageAnalysisService, imageAnalysisService } from './clinical-imaging/ImageAnalysisService';
export { SmartInboxService, smartInboxService } from './smart-inbox/SmartInboxService';
export { CareGapsService, careGapsService } from './care-gaps/CareGapsService';

// ---------------------------------------------------------------------------
// PLANNED: Not yet implemented — uncomment when service is built
// ---------------------------------------------------------------------------
// export { SmartSchedulingService } from './smart-scheduling/SmartSchedulingService';
// export { PeerConsultService } from './peer-consult/PeerConsultService';
// export { MedicationBuddyService } from './patient-engagement/MedicationBuddyService';
// export { HealthCoachingService } from './patient-engagement/HealthCoachingService';
// export { FamilyHealthHubService } from './patient-engagement/FamilyHealthHubService';
// export { PostDischargeConciergeService } from './patient-engagement/PostDischargeConciergeService';
// export { MentalHealthService } from './mental-health/MentalHealthService';
// export { SocialSupportService } from './social-support/SocialSupportService';
// export { EndOfLifeService } from './end-of-life/EndOfLifeService';
// export { MedicalInterpreterService } from './interpreter/MedicalInterpreterService';
// export { PopulationHealthService } from './population-health/PopulationHealthService';
// export { WearablesService } from './wearables/WearablesService';

// ---------------------------------------------------------------------------
// Plug-and-Play Architecture
// ---------------------------------------------------------------------------

// Service Registry - enables modular service management
export * from './registry';
export { getServiceRegistry, resetRegistry, ServiceRegistry } from './registry';

// AI Provider Abstraction - swappable AI backends
export * from './ai-providers';
export { AIProviderFactory, getAIProvider, getCurrentProviderType } from './ai-providers';

// Service Registration Bootstrap
export { registerAllServices } from './registerServices';
