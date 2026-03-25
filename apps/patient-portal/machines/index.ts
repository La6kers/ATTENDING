// =============================================================================
// ATTENDING AI - State Machines Barrel Export
// apps/patient-portal/machines/index.ts
//
// IMPORTANT: The canonical assessment machine lives in apps/shared/machines/.
// If this file previously had a local copy, it should be replaced with the
// shared version. The local assessmentMachine.ts in this directory can be
// deleted once the shared version has been verified to include all 18 phases.
//
// TODO: Compare local assessmentMachine.ts (30KB) with shared version (26KB)
// and merge any missing phases into the shared version before deleting local.
// =============================================================================

// Re-export from shared for backward compatibility
export { 
  assessmentMachine,
  type AssessmentPhase,
  type AssessmentEvent,
  type AssessmentContext,
  type UrgencyLevel,
  type HPIData,
  type MedicationEntry,
  type AllergyEntry,
  type RedFlag,
  type ChatMessage,
  type VitalSigns,
} from './assessmentMachine';

// NOTE: Once shared version is confirmed complete, replace the above with:
// export { assessmentMachine, type AssessmentPhase, ... } from '../../shared/machines';
