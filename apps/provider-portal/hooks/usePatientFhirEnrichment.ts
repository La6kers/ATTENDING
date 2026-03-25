// =============================================================================
// ATTENDING AI — FHIR Patient Enrichment Hook
// apps/provider-portal/hooks/usePatientFhirEnrichment.ts
//
// When a provider is connected to Epic/Cerner, this hook fetches real EHR
// data for a patient and returns it in a shape compatible with PreVisitData.
//
// Designed as a progressive enrichment layer:
//   - If FHIR is disconnected → returns null (caller uses assessment data)
//   - If FHIR is connected but patient not found → returns null gracefully
//   - If FHIR is connected and data loads → returns enriched fields
//
// The caller merges returned fields over assessment data so EHR is the
// authoritative source when available, with assessment data as fallback.
// =============================================================================

import { useMemo } from 'react';
import {
  useFhirConnected,
  useAllergies,
  useActiveMedications,
  useVitalSigns,
  useProblemList,
  useLabResults,
} from '@attending/shared/lib/fhir/hooks';
import { useFhirContext } from '@attending/shared/lib/fhir/FhirProvider';

// ---------------------------------------------------------------------------
// Output shape — caller picks what they need
// ---------------------------------------------------------------------------

export interface FhirEnrichmentData {
  isConnected: boolean;
  isLoading: boolean;
  source: 'epic' | 'cerner' | 'ehr' | null;

  /** Active medications from EHR */
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    status: 'active' | 'on-hold' | 'completed' | 'stopped';
  }> | null;

  /** Active allergies from EHR */
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'unknown';
  }> | null;

  /** Latest vitals from EHR */
  vitals: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  } | null;

  /** Active problems/diagnoses from EHR */
  conditions: Array<{
    id: string;
    name: string;
    code?: string;
    status: string;
  }> | null;

  /** Recent lab results from EHR */
  recentLabs: Array<{
    id: string;
    testName: string;
    value: string;
    unit?: string;
    interpretation?: string;
    resultedAt: string;
  }> | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePatientFhirEnrichment(fhirPatientId?: string | null): FhirEnrichmentData {
  const isConnected = useFhirConnected();
  const { vendor } = useFhirContext();

  // Only fetch if connected and we have a patient ID
  const opts = { enabled: isConnected && !!fhirPatientId };

  const meds = useActiveMedications(fhirPatientId || undefined);
  const allergies = useAllergies(fhirPatientId || undefined, opts);
  const vitals = useVitalSigns(fhirPatientId || undefined, opts);
  const problems = useProblemList(fhirPatientId || undefined);
  const labs = useLabResults(fhirPatientId || undefined, opts);

  const isLoading = meds.isLoading || allergies.isLoading || vitals.isLoading || problems.isLoading;

  // Map vitals to a flat object keyed by type
  const flatVitals = useMemo(() => {
    if (!vitals.data?.length) return null;
    const latest: Record<string, number> = {};
    // vitals are sorted newest-first; take first of each type
    for (const v of vitals.data) {
      if (latest[v.type] !== undefined) continue;
      const num = parseFloat(v.value);
      if (!isNaN(num)) latest[v.type] = num;
    }
    if (Object.keys(latest).length === 0) return null;

    // Find blood pressure (has systolic + diastolic)
    const bpVital = vitals.data.find((v) => v.type === 'blood_pressure');

    return {
      bloodPressure: bpVital?.systolic && bpVital?.diastolic
        ? { systolic: bpVital.systolic, diastolic: bpVital.diastolic }
        : undefined,
      heartRate: latest['heart_rate'],
      temperature: latest['temperature'],
      respiratoryRate: latest['respiratory_rate'],
      oxygenSaturation: latest['oxygen_saturation'],
      weight: latest['weight'],
      height: latest['height'],
      bmi: latest['bmi'],
    };
  }, [vitals.data]);

  const mappedMeds = useMemo(() => {
    if (!meds.data?.length) return null;
    return meds.data.map((m) => ({
      id: m.id,
      name: m.medicationName,
      dosage: m.dosage || '',
      frequency: m.frequency || '',
      status: (m.status === 'active' ? 'active'
        : m.status === 'on-hold' ? 'on-hold'
        : m.status === 'completed' ? 'completed'
        : 'stopped') as 'active' | 'on-hold' | 'completed' | 'stopped',
    }));
  }, [meds.data]);

  const mappedAllergies = useMemo(() => {
    if (!allergies.data?.length) return null;
    return allergies.data.map((a) => ({
      id: a.id,
      allergen: a.allergen,
      reaction: a.reactions?.[0]?.manifestation || 'Unknown reaction',
      severity: (a.reactions?.[0]?.severity || 'moderate') as 'mild' | 'moderate' | 'severe' | 'unknown',
    }));
  }, [allergies.data]);

  const mappedConditions = useMemo(() => {
    if (!problems.data?.length) return null;
    return problems.data.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      status: c.clinicalStatus,
    }));
  }, [problems.data]);

  const mappedLabs = useMemo(() => {
    if (!labs.data?.length) return null;
    return labs.data.slice(0, 20).map((l) => ({
      id: l.id,
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      interpretation: l.interpretation,
      resultedAt: l.resultedAt,
    }));
  }, [labs.data]);

  if (!isConnected) {
    return {
      isConnected: false,
      isLoading: false,
      source: null,
      medications: null,
      allergies: null,
      vitals: null,
      conditions: null,
      recentLabs: null,
    };
  }

  return {
    isConnected: true,
    isLoading,
    source: vendor === 'epic' ? 'epic' : vendor === 'cerner' ? 'cerner' : 'ehr',
    medications: mappedMeds,
    allergies: mappedAllergies,
    vitals: flatVitals,
    conditions: mappedConditions,
    recentLabs: mappedLabs,
  };
}

export default usePatientFhirEnrichment;
