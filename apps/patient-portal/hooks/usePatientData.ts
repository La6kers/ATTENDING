// ============================================================
// ATTENDING AI — usePatientData Hook
// apps/patient-portal/hooks/usePatientData.ts
//
// SWR-style hook for patient health data. Provides cached,
// auto-refreshing data for vitals, labs, meds, appointments.
// Falls back to local state when offline.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { patientApi } from '../lib/api';
import type {
  PatientProfile,
  HealthSummary,
  LabResult,
  Medication,
  Appointment,
  VitalSigns,
} from '../lib/api';

// ============================================================
// Types
// ============================================================

interface PatientDataState {
  profile: PatientProfile | null;
  health: HealthSummary | null;
  vitals: VitalSigns | null;
  labs: LabResult[];
  medications: Medication[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

interface UsePatientDataReturn extends PatientDataState {
  refresh: () => Promise<void>;
  refreshVitals: () => Promise<void>;
  refreshLabs: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

// ============================================================
// Cache
// ============================================================

const CACHE_KEY = 'attending-patient-data';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function loadCache(): Partial<PatientDataState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached._cachedAt > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function saveCache(state: Partial<PatientDataState>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...state, _cachedAt: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

// ============================================================
// Hook
// ============================================================

export function usePatientData(options?: {
  autoRefreshMs?: number;
  skipInitialLoad?: boolean;
}): UsePatientDataReturn {
  const { autoRefreshMs = 60000, skipInitialLoad = false } = options ?? {};

  const [state, setState] = useState<PatientDataState>(() => {
    const cached = loadCache();
    return {
      profile: (cached?.profile as PatientProfile) ?? null,
      health: (cached?.health as HealthSummary) ?? null,
      vitals: (cached?.vitals as VitalSigns) ?? null,
      labs: (cached?.labs as LabResult[]) ?? [],
      medications: (cached?.medications as Medication[]) ?? [],
      appointments: (cached?.appointments as Appointment[]) ?? [],
      loading: !cached,
      error: null,
      lastFetched: cached ? new Date() : null,
    };
  });

  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    if (!mountedRef.current) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const [profileRes, healthRes, appointmentsRes] = await Promise.allSettled([
        patientApi.getProfile('me'),
        patientApi.getHealthSummary(),
        patientApi.getAppointments({ upcoming: true }),
      ]);

      const profile = profileRes.status === 'fulfilled' && profileRes.value.ok ? profileRes.value.data : state.profile;
      const health = healthRes.status === 'fulfilled' && healthRes.value.ok ? healthRes.value.data : state.health;
      const appointments = appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok
        ? appointmentsRes.value.data ?? []
        : state.appointments;

      const newState: PatientDataState = {
        profile,
        health,
        vitals: health?.vitals ?? state.vitals,
        labs: health?.recentLabs ?? state.labs,
        medications: health?.medications ?? state.medications,
        appointments,
        loading: false,
        error: null,
        lastFetched: new Date(),
      };

      if (mountedRef.current) {
        setState(newState);
        saveCache(newState);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState((s) => ({ ...s, loading: false, error: err.message ?? 'Failed to load health data' }));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshVitals = useCallback(async () => {
    const res = await patientApi.getVitals();
    if (res.ok && res.data && mountedRef.current) {
      setState((s) => {
        const updated = { ...s, vitals: res.data };
        saveCache(updated);
        return updated;
      });
    }
  }, []);

  const refreshLabs = useCallback(async () => {
    const res = await patientApi.getLabResults({ limit: 20 });
    if (res.ok && res.data && mountedRef.current) {
      setState((s) => {
        const updated = { ...s, labs: res.data! };
        saveCache(updated);
        return updated;
      });
    }
  }, []);

  const refreshAppointments = useCallback(async () => {
    const res = await patientApi.getAppointments({ upcoming: true });
    if (res.ok && res.data && mountedRef.current) {
      setState((s) => {
        const updated = { ...s, appointments: res.data! };
        saveCache(updated);
        return updated;
      });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (!skipInitialLoad) fetchAll();
    return () => { mountedRef.current = false; };
  }, [fetchAll, skipInitialLoad]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const interval = setInterval(fetchAll, autoRefreshMs);
    return () => clearInterval(interval);
  }, [fetchAll, autoRefreshMs]);

  return {
    ...state,
    refresh: fetchAll,
    refreshVitals,
    refreshLabs,
    refreshAppointments,
  };
}

export default usePatientData;
