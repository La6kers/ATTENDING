// =============================================================================
// ATTENDING AI - FHIR Hooks
// apps/shared/lib/fhir/hooks.ts
//
// React hooks for FHIR data fetching and caching
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFhirContext } from './FhirProvider';
import {
  AttendingPatient, AttendingLabResult, AttendingVitalSign, AttendingCondition,
  AttendingMedication, AttendingAllergy, AttendingEncounter,
  extractLabResultsFromBundle, extractVitalsFromBundle, extractConditionsFromBundle,
  extractMedicationsFromBundle, extractAllergiesFromBundle, extractEncountersFromBundle,
  mapFhirPatientToAttending,
} from './resourceMappers';
import { FhirBundle } from './types';

// =============================================================================
// Types
// =============================================================================

interface FhirQueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface FhirQueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
}

// =============================================================================
// Connection Hooks
// =============================================================================

export function useFhirConnection() {
  const { status, error, vendor, connect, disconnect, connectEpic, connectCerner } = useFhirContext();
  return { status, error, vendor, connect, disconnect, connectEpic, connectCerner };
}

export function useFhirConnected(): boolean {
  const { status } = useFhirContext();
  return status === 'connected';
}

// =============================================================================
// Patient Hooks
// =============================================================================

export function useFhirPatient(patientId?: string): FhirQueryState<AttendingPatient> {
  const { client, patient: contextPatient, status } = useFhirContext();
  const [data, setData] = useState<AttendingPatient | null>(contextPatient);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!client || status !== 'connected') return;

    setIsLoading(true);
    setError(null);

    try {
      const fhirPatient = await client.getPatient(patientId);
      const mapped = mapFhirPatientToAttending(fhirPatient);
      setData(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch patient'));
    } finally {
      setIsLoading(false);
    }
  }, [client, status, patientId]);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
    } else {
      setData(contextPatient);
    }
  }, [patientId, contextPatient, fetchPatient]);

  return { data, isLoading, error, refetch: fetchPatient };
}

export function usePatientSearch(searchParams: {
  name?: string;
  birthdate?: string;
  identifier?: string;
}): FhirQueryState<AttendingPatient[]> {
  const { client, status } = useFhirContext();
  const [data, setData] = useState<AttendingPatient[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async () => {
    if (!client || status !== 'connected') return;
    if (!searchParams.name && !searchParams.birthdate && !searchParams.identifier) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.searchPatients(searchParams);
      const patients = (bundle.entry || [])
        .map((e) => e.resource)
        .filter((r): r is any => r?.resourceType === 'Patient')
        .map(mapFhirPatientToAttending);
      setData(patients);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Patient search failed'));
    } finally {
      setIsLoading(false);
    }
  }, [client, status, searchParams.name, searchParams.birthdate, searchParams.identifier]);

  useEffect(() => {
    search();
  }, [search]);

  return { data, isLoading, error, refetch: search };
}

// =============================================================================
// Lab Results Hooks
// =============================================================================

export function useLabResults(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingLabResult[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingLabResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchLabs = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getLabResults(effectivePatientId!);
      const labs = extractLabResultsFromBundle(bundle);
      setData(labs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch lab results'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchLabs();
  }, [enabled, fetchLabs]);

  return { data, isLoading, error, refetch: fetchLabs };
}

export function useCriticalLabResults(patientId?: string): AttendingLabResult[] {
  const { data } = useLabResults(patientId);
  return useMemo(() => {
    return (data || []).filter((lab) => lab.interpretation === 'critical' || lab.interpretation === 'abnormal');
  }, [data]);
}

// =============================================================================
// Vital Signs Hooks
// =============================================================================

export function useVitalSigns(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingVitalSign[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingVitalSign[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchVitals = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getVitals(effectivePatientId!);
      const vitals = extractVitalsFromBundle(bundle);
      setData(vitals);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch vital signs'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchVitals();
  }, [enabled, fetchVitals]);

  return { data, isLoading, error, refetch: fetchVitals };
}

export function useLatestVitals(patientId?: string): Record<string, AttendingVitalSign> {
  const { data } = useVitalSigns(patientId);
  return useMemo(() => {
    const latest: Record<string, AttendingVitalSign> = {};
    (data || []).forEach((vital) => {
      if (!latest[vital.type] || vital.recordedAt > latest[vital.type].recordedAt) {
        latest[vital.type] = vital;
      }
    });
    return latest;
  }, [data]);
}

// =============================================================================
// Conditions/Problems Hooks
// =============================================================================

export function useConditions(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingCondition[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingCondition[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchConditions = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getConditions(effectivePatientId!);
      const conditions = extractConditionsFromBundle(bundle);
      setData(conditions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch conditions'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchConditions();
  }, [enabled, fetchConditions]);

  return { data, isLoading, error, refetch: fetchConditions };
}

export function useProblemList(patientId?: string): FhirQueryState<AttendingCondition[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingCondition[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = status === 'connected' && !!effectivePatientId;

  const fetchProblems = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getProblemList(effectivePatientId!);
      const problems = extractConditionsFromBundle(bundle).filter((c) => c.clinicalStatus === 'active');
      setData(problems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch problem list'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchProblems();
  }, [enabled, fetchProblems]);

  return { data, isLoading, error, refetch: fetchProblems };
}

// =============================================================================
// Medications Hooks
// =============================================================================

export function useMedications(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingMedication[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingMedication[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchMedications = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getMedications(effectivePatientId!);
      const medications = extractMedicationsFromBundle(bundle);
      setData(medications);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch medications'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchMedications();
  }, [enabled, fetchMedications]);

  return { data, isLoading, error, refetch: fetchMedications };
}

export function useActiveMedications(patientId?: string): FhirQueryState<AttendingMedication[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingMedication[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = status === 'connected' && !!effectivePatientId;

  const fetchActiveMeds = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getActiveMedications(effectivePatientId!);
      const medications = extractMedicationsFromBundle(bundle);
      setData(medications);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch active medications'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchActiveMeds();
  }, [enabled, fetchActiveMeds]);

  return { data, isLoading, error, refetch: fetchActiveMeds };
}

// =============================================================================
// Allergies Hooks
// =============================================================================

export function useAllergies(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingAllergy[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingAllergy[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchAllergies = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getAllergies(effectivePatientId!);
      const allergies = extractAllergiesFromBundle(bundle);
      setData(allergies);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch allergies'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchAllergies();
  }, [enabled, fetchAllergies]);

  return { data, isLoading, error, refetch: fetchAllergies };
}

export function useDrugAllergies(patientId?: string): AttendingAllergy[] {
  const { data } = useAllergies(patientId);
  return useMemo(() => {
    return (data || []).filter((allergy) => allergy.category === 'medication');
  }, [data]);
}

// =============================================================================
// Encounters Hooks
// =============================================================================

export function useEncounters(patientId?: string, options?: FhirQueryOptions): FhirQueryState<AttendingEncounter[]> {
  const { client, status, patientId: contextPatientId } = useFhirContext();
  const [data, setData] = useState<AttendingEncounter[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const effectivePatientId = patientId || contextPatientId;
  const enabled = options?.enabled !== false && status === 'connected' && !!effectivePatientId;

  const fetchEncounters = useCallback(async () => {
    if (!client || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const bundle = await client.getEncounters(effectivePatientId!);
      const encounters = extractEncountersFromBundle(bundle);
      setData(encounters);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch encounters'));
    } finally {
      setIsLoading(false);
    }
  }, [client, enabled, effectivePatientId]);

  useEffect(() => {
    if (enabled) fetchEncounters();
  }, [enabled, fetchEncounters]);

  return { data, isLoading, error, refetch: fetchEncounters };
}

// =============================================================================
// Comprehensive Patient Summary Hook
// =============================================================================

export interface PatientSummary {
  patient: AttendingPatient | null;
  problems: AttendingCondition[];
  medications: AttendingMedication[];
  allergies: AttendingAllergy[];
  recentLabs: AttendingLabResult[];
  latestVitals: Record<string, AttendingVitalSign>;
  recentEncounters: AttendingEncounter[];
  isLoading: boolean;
  error: Error | null;
  refetchAll: () => Promise<void>;
}

export function usePatientSummary(patientId?: string): PatientSummary {
  const patient = useFhirPatient(patientId);
  const problems = useProblemList(patientId);
  const medications = useActiveMedications(patientId);
  const allergies = useAllergies(patientId);
  const labs = useLabResults(patientId);
  const latestVitals = useLatestVitals(patientId);
  const encounters = useEncounters(patientId);

  const isLoading = patient.isLoading || problems.isLoading || medications.isLoading ||
    allergies.isLoading || labs.isLoading || encounters.isLoading;

  const error = patient.error || problems.error || medications.error ||
    allergies.error || labs.error || encounters.error;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      patient.refetch(),
      problems.refetch(),
      medications.refetch(),
      allergies.refetch(),
      labs.refetch(),
      encounters.refetch(),
    ]);
  }, [patient, problems, medications, allergies, labs, encounters]);

  return {
    patient: patient.data,
    problems: problems.data || [],
    medications: medications.data || [],
    allergies: allergies.data || [],
    recentLabs: (labs.data || []).slice(0, 10),
    latestVitals,
    recentEncounters: (encounters.data || []).slice(0, 5),
    isLoading,
    error,
    refetchAll,
  };
}
