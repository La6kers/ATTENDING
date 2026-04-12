// =============================================================================
// ATTENDING AI — useFhirEnrichment
// apps/provider-portal/hooks/useFhirEnrichment.ts
//
// Single hook that overlays real Epic/Cerner data on top of ATTENDING's
// native assessment/patient data.  Any page can call this with a patientId
// and get back enriched data without knowing whether Epic is connected.
//
// When Epic is disconnected → returns null for all FHIR fields.
// When Epic is connected    → returns real data from the EHR.
// Always non-blocking        → never delays page render.
//
// Usage:
//   const { vitals, medications, allergies, problems, labs, isConnected } =
//     useFhirEnrichment(patientFhirId);
// =============================================================================

import { useMemo } from 'react';
import {
  useVitalSigns,
  useLatestVitals,
  useActiveMedications,
  useAllergies,
  useProblemList,
  useLabResults,
  useFhirConnected,
} from '@attending/shared/lib/fhir/hooks';
import type {
  AttendingVitalSign,
  AttendingMedication,
  AttendingAllergy,
  AttendingCondition,
  AttendingLabResult,
} from '@attending/shared/lib/fhir/resourceMappers';

// ---------------------------------------------------------------------------
// Types returned to consumers
// ---------------------------------------------------------------------------

export interface FhirVitals {
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedAt?: string;
}

export interface FhirEnrichment {
  /** True when an EHR is connected and patientId is set */
  isConnected: boolean;
  isLoading: boolean;
  /** Parsed vitals ready for the UI (null when not connected) */
  vitals: FhirVitals | null;
  /** Active medication list from EHR */
  medications: AttendingMedication[];
  /** Allergy list from EHR */
  allergies: AttendingAllergy[];
  /** Active problem list from EHR */
  problems: AttendingCondition[];
  /** Recent lab results from EHR (most recent 20) */
  labs: AttendingLabResult[];
  /** Critical/abnormal labs only */
  criticalLabs: AttendingLabResult[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFhirEnrichment(fhirPatientId?: string | null): FhirEnrichment {
  const connected = useFhirConnected();

  // Only fetch when we have both a connection and a patient ID
  const opts = { enabled: connected && !!fhirPatientId };

  const latestVitals = useLatestVitals(fhirPatientId || undefined);
  const { data: medications = [], isLoading: medsLoading } = useActiveMedications(fhirPatientId || undefined);
  const { data: allergies = [], isLoading: allergiesLoading } = useAllergies(fhirPatientId || undefined, opts);
  const { data: problems = [], isLoading: problemsLoading } = useProblemList(fhirPatientId || undefined);
  const { data: labsRaw = [], isLoading: labsLoading } = useLabResults(fhirPatientId || undefined, opts);

  const isLoading = medsLoading || allergiesLoading || problemsLoading || labsLoading;

  // Parse vitals into a simple flat structure
  const vitals: FhirVitals | null = useMemo(() => {
    if (!connected || !fhirPatientId || Object.keys(latestVitals).length === 0) return null;

    const bp = latestVitals['blood_pressure'];
    const hr = latestVitals['heart_rate'];
    const temp = latestVitals['temperature'];
    const rr = latestVitals['respiratory_rate'];
    const spo2 = latestVitals['oxygen_saturation'];
    const wt = latestVitals['weight'];
    const ht = latestVitals['height'];
    const bmi = latestVitals['bmi'];

    const result: FhirVitals = {};

    if (bp?.systolic && bp?.diastolic) {
      result.bloodPressure = { systolic: bp.systolic, diastolic: bp.diastolic };
    }
    if (hr) result.heartRate = parseFloat(hr.value);
    if (temp) result.temperature = parseFloat(temp.value);
    if (rr) result.respiratoryRate = parseFloat(rr.value);
    if (spo2) result.oxygenSaturation = parseFloat(spo2.value);
    if (wt) result.weight = parseFloat(wt.value);
    if (ht) result.height = parseFloat(ht.value);
    if (bmi) result.bmi = parseFloat(bmi.value);

    // Use the most recent recorded time
    const mostRecent = Object.values(latestVitals)
      .filter(Boolean)
      .sort((a, b) => (b!.recordedAt > a!.recordedAt ? 1 : -1))[0];
    if (mostRecent) result.recordedAt = mostRecent.recordedAt;

    return Object.keys(result).length > 0 ? result : null;
  }, [latestVitals, connected, fhirPatientId]);

  const labs = useMemo(() => labsRaw.slice(0, 20), [labsRaw]);

  const criticalLabs = useMemo(
    () => labs.filter((l) => l.interpretation === 'critical' || l.interpretation === 'abnormal'),
    [labs]
  );

  return {
    isConnected: connected,
    isLoading,
    vitals,
    medications: connected ? medications : [],
    allergies: connected ? allergies : [],
    problems: connected ? problems : [],
    labs,
    criticalLabs,
  };
}
