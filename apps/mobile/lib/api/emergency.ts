// ============================================================
// ATTENDING AI — Mobile Emergency API
// apps/mobile/lib/api/emergency.ts
// ============================================================

import api from './mobileApiClient';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface AccessSettings {
  enabled: boolean;
  pin: string;
  countdownSeconds: number;
  accessDurationMinutes: number;
  requirePhoto: boolean;
  lockScreenWidget: boolean;
  notifyOnAccess: boolean;
  notifyContacts: boolean;
  showAllergies: boolean;
  showConditions: boolean;
  showMedications: boolean;
  showBloodType: boolean;
  showEmergencyContacts: boolean;
  showVitals: boolean;
  showAdvancedDirective: boolean;
}

export interface CrashDetectionSettings {
  enabled: boolean;
  gForceThreshold: number;
  sensitivityPreset: 'low' | 'standard' | 'high' | 'custom';
  activityAware: boolean;
  ignoreWhileStationary: boolean;
  countdownSeconds: number;
  countdownAudio: boolean;
  countdownHaptic: boolean;
  alertSiren: boolean;
  extendedResponseMode: boolean;
  extendedCountdownSeconds: number;
  drivingMode: boolean;
  cyclingMode: boolean;
  hikingMode: boolean;
}

export interface AccessEvent {
  id: string;
  timestamp: string;
  accessor: string;
  accessorType: 'first-responder' | 'emt' | 'hospital' | 'test';
  accessType: 'quick-access' | 'full-facesheet';
  location: string;
  coordinates?: { lat: number; lng: number };
  duration: string;
  photoUrl?: string;
  dataAccessed: string[];
  verified: boolean;
}

export const emergencyApi = {
  getContacts: () =>
    api.get<EmergencyContact[]>('/emergency/contacts'),

  saveContacts: (contacts: EmergencyContact[]) =>
    api.put('/emergency/contacts', { contacts }, { offlineQueue: true }),

  getAccessSettings: () =>
    api.get<AccessSettings>('/emergency/access-settings'),

  saveAccessSettings: (settings: AccessSettings) =>
    api.put('/emergency/access-settings', settings),

  getCrashSettings: () =>
    api.get<CrashDetectionSettings>('/emergency/crash-settings'),

  saveCrashSettings: (settings: CrashDetectionSettings) =>
    api.put('/emergency/crash-settings', settings),

  getAccessHistory: (params?: { limit?: number }) =>
    api.get<AccessEvent[]>(`/emergency/access-history${params?.limit ? `?limit=${params.limit}` : ''}`),

  notifyContacts: (data: {
    patientId: string;
    eventType: 'crash' | 'manual' | 'fall';
    location?: { lat: number; lng: number };
  }) =>
    api.post('/emergency/notify', data, { offlineQueue: true }),
};
