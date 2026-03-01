// ============================================================
// ATTENDING AI — Emergency API Service
// apps/patient-portal/lib/api/emergency.ts
//
// Emergency access settings, medical ID, contacts,
// crash detection config, and access audit log.
// ============================================================

import api from './client';

// ============================================================
// Types
// ============================================================

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

export interface QuickAccessData {
  fullName: string;
  age: number;
  sex: string;
  bloodType: string;
  allergies: { name: string; severity: string }[];
  emergencyContacts: { name: string; phone: string; relationship: string }[];
}

export interface FacesheetData extends QuickAccessData {
  conditions: { name: string; since: string }[];
  medications: { name: string; dosage: string; frequency: string }[];
  vitals: { label: string; value: string; recordedAt: string }[];
  emergencyNotes: string;
  advancedDirective?: string;
}

// ============================================================
// API Functions
// ============================================================

export const emergencyApi = {
  // --- Contacts ---
  getContacts: () =>
    api.get<EmergencyContact[]>('/emergency/contacts'),

  saveContacts: (contacts: EmergencyContact[]) =>
    api.put('/emergency/contacts', { contacts }, { offlineQueue: true }),

  // --- Access Settings ---
  getAccessSettings: () =>
    api.get<AccessSettings>('/emergency/access-settings'),

  saveAccessSettings: (settings: AccessSettings) =>
    api.put('/emergency/access-settings', settings),

  // --- Crash Detection ---
  getCrashSettings: () =>
    api.get<CrashDetectionSettings>('/emergency/crash-settings'),

  saveCrashSettings: (settings: CrashDetectionSettings) =>
    api.put('/emergency/crash-settings', settings),

  // --- Access History (audit log) ---
  getAccessHistory: (params?: { limit?: number }) =>
    api.get<AccessEvent[]>(`/emergency/access-history${params?.limit ? `?limit=${params.limit}` : ''}`),

  // --- Emergency Data Retrieval (for first responders) ---
  /** Quick access: minimal data, no PIN required */
  getQuickAccess: (patientToken: string) =>
    api.get<QuickAccessData>(`/emergency/medical-info?token=${patientToken}&level=quick`, { noAuth: true }),

  /** Full facesheet: requires PIN verification */
  getFacesheet: (patientToken: string, pin: string) =>
    api.post<FacesheetData>('/emergency/medical-info', { token: patientToken, pin, level: 'full' }, { noAuth: true }),

  // --- Emergency event logging ---
  /** Log an access event (called when responder views data) */
  logAccess: (data: {
    patientToken: string;
    accessType: string;
    accessorInfo?: string;
    location?: { lat: number; lng: number };
    photoData?: string;
  }) =>
    api.post('/emergency/log-access', data, { noAuth: true }),

  /** Notify emergency contacts (crash detected) */
  notifyContacts: (data: {
    patientId: string;
    eventType: 'crash' | 'manual' | 'fall';
    location?: { lat: number; lng: number };
  }) =>
    api.post('/emergency/notify', data, { offlineQueue: true }),
};

export default emergencyApi;
