// =============================================================================
// ATTENDING AI - FHIR Module Exports
// apps/shared/lib/fhir/index.ts
// =============================================================================

// Types
export * from './types';

// Client
export { FhirClient, createFhirClient, createEpicClient, createCernerClient } from './FhirClient';

// Resource Mappers
export {
  // Types
  type AttendingPatient,
  type AttendingLabResult,
  type AttendingVitalSign,
  type AttendingCondition,
  type AttendingMedication,
  type AttendingAllergy,
  type AttendingEncounter,
  // Patient mappers
  mapFhirPatientToAttending,
  // Observation mappers
  mapFhirObservationToLabResult,
  mapFhirObservationToVitalSign,
  // Clinical mappers
  mapFhirConditionToAttending,
  mapFhirMedicationRequestToAttending,
  mapFhirAllergyToAttending,
  mapFhirEncounterToAttending,
  // Bundle extractors
  extractResourcesFromBundle,
  extractPatientsFromBundle,
  extractLabResultsFromBundle,
  extractVitalsFromBundle,
  extractConditionsFromBundle,
  extractMedicationsFromBundle,
  extractAllergiesFromBundle,
  extractEncountersFromBundle,
} from './resourceMappers';

// Provider
export { FhirProvider, useFhirContext, FhirConnectionStatus, FhirContext } from './FhirProvider';

// Hooks - Connection
export { useFhirConnection, useFhirConnected } from './hooks';

// Hooks - Patient
export { useFhirPatient, usePatientSearch } from './hooks';

// Hooks - Labs & Vitals
export { useLabResults, useCriticalLabResults, useVitalSigns, useLatestVitals } from './hooks';

// Hooks - Conditions
export { useConditions, useProblemList } from './hooks';

// Hooks - Medications
export { useMedications, useActiveMedications } from './hooks';

// Hooks - Allergies
export { useAllergies, useDrugAllergies } from './hooks';

// Hooks - Encounters
export { useEncounters } from './hooks';

// Hooks - Comprehensive
export { usePatientSummary, type PatientSummary } from './hooks';
