// ============================================================
// ATTENDING AI — useEmergencySettings Hook
// apps/patient-portal/hooks/useEmergencySettings.ts
//
// Manages emergency access settings, crash detection config,
// emergency contacts, and access history. Persists to both
// API and localStorage for offline reliability.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { emergencyApi } from '../lib/api';
import type {
  EmergencyContact,
  AccessSettings,
  CrashDetectionSettings,
  AccessEvent,
} from '../lib/api';

// ============================================================
// Default Values
// ============================================================

const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  enabled: true,
  pin: '0000',
  countdownSeconds: 30,
  accessDurationMinutes: 10,
  requirePhoto: true,
  lockScreenWidget: true,
  notifyOnAccess: true,
  notifyContacts: true,
  showAllergies: true,
  showConditions: true,
  showMedications: true,
  showBloodType: true,
  showEmergencyContacts: true,
  showVitals: true,
  showAdvancedDirective: true,
};

const DEFAULT_CRASH_SETTINGS: CrashDetectionSettings = {
  enabled: false,
  gForceThreshold: 4.0,
  sensitivityPreset: 'standard',
  activityAware: true,
  ignoreWhileStationary: true,
  countdownSeconds: 30,
  countdownAudio: true,
  countdownHaptic: true,
  alertSiren: true,
  extendedResponseMode: false,
  extendedCountdownSeconds: 120,
  drivingMode: true,
  cyclingMode: false,
  hikingMode: false,
};

// ============================================================
// Local persistence (offline fallback)
//
// SECURITY NOTE: Emergency settings are stored in localStorage without encryption.
// In production, sensitive fields (contacts, PIN config) should be stored server-side
// and fetched on demand. localStorage is accessible to any script on this origin.
// TODO: Move sensitive emergency data to server-side storage with API access.
// ============================================================

const STORAGE_KEYS = {
  access: 'attending-emergency-access',
  crash: 'attending-crash-detection',
  contacts: 'attending-emergency-contacts',
};

function loadLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ============================================================
// Types
// ============================================================

interface UseEmergencySettingsReturn {
  // Access settings
  accessSettings: AccessSettings;
  setAccessSettings: (settings: AccessSettings) => void;
  saveAccessSettings: () => Promise<boolean>;

  // Crash detection
  crashSettings: CrashDetectionSettings;
  setCrashSettings: (settings: CrashDetectionSettings) => void;
  saveCrashSettings: () => Promise<boolean>;

  // Contacts
  contacts: EmergencyContact[];
  setContacts: (contacts: EmergencyContact[]) => void;
  saveContacts: () => Promise<boolean>;

  // History
  accessHistory: AccessEvent[];
  loadAccessHistory: () => Promise<void>;

  // State
  loading: boolean;
  saving: boolean;
  error: string | null;
}

// ============================================================
// Hook
// ============================================================

export function useEmergencySettings(): UseEmergencySettingsReturn {
  const [accessSettings, setAccessSettings] = useState<AccessSettings>(
    () => loadLocal<AccessSettings>(STORAGE_KEYS.access) ?? DEFAULT_ACCESS_SETTINGS
  );
  const [crashSettings, setCrashSettings] = useState<CrashDetectionSettings>(
    () => loadLocal<CrashDetectionSettings>(STORAGE_KEYS.crash) ?? DEFAULT_CRASH_SETTINGS
  );
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    () => loadLocal<EmergencyContact[]>(STORAGE_KEYS.contacts) ?? []
  );
  const [accessHistory, setAccessHistory] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  // Load from API on mount
  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      setLoading(true);
      try {
        const [accessRes, crashRes, contactsRes] = await Promise.allSettled([
          emergencyApi.getAccessSettings(),
          emergencyApi.getCrashSettings(),
          emergencyApi.getContacts(),
        ]);

        if (!mountedRef.current) return;

        if (accessRes.status === 'fulfilled' && accessRes.value.ok && accessRes.value.data) {
          setAccessSettings(accessRes.value.data);
          saveLocal(STORAGE_KEYS.access, accessRes.value.data);
        }

        if (crashRes.status === 'fulfilled' && crashRes.value.ok && crashRes.value.data) {
          setCrashSettings(crashRes.value.data);
          saveLocal(STORAGE_KEYS.crash, crashRes.value.data);
        }

        if (contactsRes.status === 'fulfilled' && contactsRes.value.ok && contactsRes.value.data) {
          setContacts(contactsRes.value.data);
          saveLocal(STORAGE_KEYS.contacts, contactsRes.value.data);
        }
      } catch {
        // Fall back to local storage (already loaded in initial state)
      }

      if (mountedRef.current) setLoading(false);
    };

    load();
    return () => { mountedRef.current = false; };
  }, []);

  // Save access settings
  const saveAccessSettingsFn = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    saveLocal(STORAGE_KEYS.access, accessSettings);

    const res = await emergencyApi.saveAccessSettings(accessSettings);
    setSaving(false);

    if (!res.ok) {
      setError(res.error?.message ?? 'Failed to save access settings');
      return false;
    }
    return true;
  }, [accessSettings]);

  // Save crash settings
  const saveCrashSettingsFn = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    saveLocal(STORAGE_KEYS.crash, crashSettings);

    const res = await emergencyApi.saveCrashSettings(crashSettings);
    setSaving(false);

    if (!res.ok) {
      setError(res.error?.message ?? 'Failed to save crash settings');
      return false;
    }
    return true;
  }, [crashSettings]);

  // Save contacts
  const saveContactsFn = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    saveLocal(STORAGE_KEYS.contacts, contacts);

    const res = await emergencyApi.saveContacts(contacts);
    setSaving(false);

    if (!res.ok) {
      setError(res.error?.message ?? 'Failed to save contacts');
      return false;
    }
    return true;
  }, [contacts]);

  // Load access history
  const loadAccessHistory = useCallback(async () => {
    const res = await emergencyApi.getAccessHistory({ limit: 50 });
    if (res.ok && res.data) {
      setAccessHistory(res.data);
    }
  }, []);

  return {
    accessSettings,
    setAccessSettings,
    saveAccessSettings: saveAccessSettingsFn,
    crashSettings,
    setCrashSettings,
    saveCrashSettings: saveCrashSettingsFn,
    contacts,
    setContacts,
    saveContacts: saveContactsFn,
    accessHistory,
    loadAccessHistory,
    loading,
    saving,
    error,
  };
}

export default useEmergencySettings;
