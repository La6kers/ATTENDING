// =============================================================================
// ATTENDING AI - Services Index
// apps/shared/services/index.ts
//
// Central export for all ATTENDING AI services
// =============================================================================

// Clinical Intelligence Services
export { AmbientScribeService, ambientScribeService } from './ai-scribe/AmbientScribeService';
export { DeteriorationAlertService, deteriorationAlertService } from './predictive-alerts/DeteriorationAlertService';
export { DiagnosticSolverService, diagnosticSolverService } from './diagnostic-solver/DiagnosticSolverService';
export { ImageAnalysisService, imageAnalysisService } from './clinical-imaging/ImageAnalysisService';

// Workflow Optimization Services
export { SmartInboxService, smartInboxService } from './smart-inbox/SmartInboxService';
export { CareGapsService, careGapsService } from './care-gaps/CareGapsService';
export { SmartSchedulingService, smartSchedulingService } from './smart-scheduling/SmartSchedulingService';
export { PeerConsultService, peerConsultService } from './peer-consult/PeerConsultService';

// Patient Engagement Services
export { MedicationBuddyService, medicationBuddyService } from './patient-engagement/MedicationBuddyService';
export { HealthCoachingService, healthCoachingService } from './patient-engagement/HealthCoachingService';
export { FamilyHealthHubService, familyHealthHubService } from './patient-engagement/FamilyHealthHubService';
export { PostDischargeConciergeService, postDischargeConciergeService } from './patient-engagement/PostDischargeConciergeService';

// Specialized Care Services
export { MentalHealthService, mentalHealthService } from './mental-health/MentalHealthService';
export { SocialSupportService, socialSupportService } from './social-support/SocialSupportService';
export { EndOfLifeService, endOfLifeService } from './end-of-life/EndOfLifeService';

// Platform Services
export { MedicalInterpreterService, medicalInterpreterService } from './interpreter/MedicalInterpreterService';
export { PopulationHealthService, populationHealthService } from './population-health/PopulationHealthService';
export { WearablesService, wearablesService } from './wearables/WearablesService';

// Previously built services
export { ClinicalDecisionEngine, clinicalDecisionEngine } from './clinical-decision/ClinicalDecisionEngine';
export { SmartOrderAssistant, smartOrderAssistant } from './smart-order/SmartOrderAssistant';
export { ClinicalTrialMatcher, clinicalTrialMatcher } from './clinical-trials/ClinicalTrialMatcher';
export { MedicationOptimizer, medicationOptimizer } from './medication-optimizer/MedicationOptimizer';
export { CareCoordinationHub, careCoordinationHub } from './care-coordination/CareCoordinationHub';
export { SDOHService, sdohService } from './sdoh/SDOHService';

// =============================================================================
// Plug-and-Play Architecture
// =============================================================================

// Service Registry - enables modular service management
export * from './registry';
export { getServiceRegistry, resetRegistry, ServiceRegistry } from './registry';

// AI Provider Abstraction - swappable AI backends
export * from './ai-providers';
export { AIProviderFactory, getAIProvider, getCurrentProviderType } from './ai-providers';

// Service Registration Bootstrap
export { registerAllServices } from './registerServices';
