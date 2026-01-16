// PatientEncounterContext.tsx
// Shared patient and encounter state across all provider portal pages
// apps/provider-portal/contexts/PatientEncounterContext.tsx

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================
// Types
// ============================================================

export interface PatientDemographics {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  dob?: string;
  weight?: number;
  height?: number;
}

export interface ClinicalAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface PatientContext {
  // Demographics
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  dob?: string;
  
  // Clinical Info
  chiefComplaint: string;
  primaryDiagnosis?: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  redFlags: string[];
  
  // Safety Info (for imaging/contrast)
  weight?: number;
  creatinine?: number;
  gfr?: number;
  pregnant?: boolean;
  breastfeeding?: boolean;
  
  // Insurance/Admin
  insurancePlan?: string;
  pcp?: string;
}

export interface EncounterContext {
  id: string;
  patientId: string;
  providerId: string;
  providerName: string;
  startTime: Date;
  type: 'office-visit' | 'telehealth' | 'urgent' | 'follow-up';
  status: 'in-progress' | 'completed' | 'cancelled';
  
  // Orders placed during encounter
  labOrders: string[];
  imagingOrders: string[];
  medicationOrders: string[];
  referralOrders: string[];
}

export interface PatientEncounterState {
  // Current patient and encounter
  patient: PatientContext | null;
  encounter: EncounterContext | null;
  
  // Clinical alerts
  clinicalAlerts: ClinicalAlert[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPatient: (patient: PatientContext | null) => void;
  setEncounter: (encounter: EncounterContext | null) => void;
  addClinicalAlert: (alert: Omit<ClinicalAlert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeClinicalAlert: (alertId: string) => void;
  dismissClinicalAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // Order tracking
  addLabOrder: (orderId: string) => void;
  addImagingOrder: (orderId: string) => void;
  addMedicationOrder: (orderId: string) => void;
  addReferralOrder: (orderId: string) => void;
  
  // Utilities
  hasRedFlags: boolean;
  hasCriticalAlerts: boolean;
  loadPatientFromAssessment: (assessmentId: string) => Promise<void>;
  resetEncounter: () => void;
}

// ============================================================
// Context
// ============================================================

const PatientEncounterContext = createContext<PatientEncounterState | undefined>(undefined);

// ============================================================
// Demo Data (for development)
// ============================================================

const DEMO_PATIENT: PatientContext = {
  id: 'patient-001',
  name: 'Sarah Johnson',
  age: 32,
  gender: 'Female',
  mrn: '78932145',
  dob: '1992-03-15',
  chiefComplaint: 'Severe headache with visual disturbances and confusion for 3 days',
  primaryDiagnosis: 'Headache - Rule out secondary cause',
  allergies: ['Penicillin', 'Sulfa drugs'],
  currentMedications: ['Oral contraceptive', 'Metformin 500mg'],
  medicalHistory: ['Type 2 Diabetes', 'Migraines', 'Anxiety disorder'],
  redFlags: ['Worst headache of life', 'Confusion', 'Visual changes'],
  weight: 68,
  creatinine: 0.9,
  gfr: 95,
  pregnant: false,
  insurancePlan: 'Blue Cross PPO',
  pcp: 'Dr. Robert Johnson',
};

const DEMO_ENCOUNTER: EncounterContext = {
  id: 'encounter-001',
  patientId: 'patient-001',
  providerId: 'provider-001',
  providerName: 'Dr. Thomas Reed',
  startTime: new Date(),
  type: 'office-visit',
  status: 'in-progress',
  labOrders: [],
  imagingOrders: [],
  medicationOrders: [],
  referralOrders: [],
};

const DEMO_ALERTS: ClinicalAlert[] = [
  {
    id: 'alert-001',
    type: 'critical',
    title: 'Clinical Decision Support Alert',
    message: 'Patient reports "worst headache of life" - Consider ruling out subarachnoid hemorrhage',
    action: 'emergency-protocol',
    actionLabel: 'View Emergency Protocol',
    timestamp: new Date(),
    acknowledged: false,
  },
];

// ============================================================
// Provider Component
// ============================================================

interface PatientEncounterProviderProps {
  children: ReactNode;
  initialPatient?: PatientContext | null;
  initialEncounter?: EncounterContext | null;
  useDemoData?: boolean;
}

export function PatientEncounterProvider({
  children,
  initialPatient = null,
  initialEncounter = null,
  useDemoData = true, // Default to demo data for development
}: PatientEncounterProviderProps) {
  // State
  const [patient, setPatientState] = useState<PatientContext | null>(
    initialPatient || (useDemoData ? DEMO_PATIENT : null)
  );
  const [encounter, setEncounterState] = useState<EncounterContext | null>(
    initialEncounter || (useDemoData ? DEMO_ENCOUNTER : null)
  );
  const [clinicalAlerts, setClinicalAlerts] = useState<ClinicalAlert[]>(
    useDemoData ? DEMO_ALERTS : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient actions
  const setPatient = useCallback((p: PatientContext | null) => {
    setPatientState(p);
    // Auto-generate alerts based on red flags
    if (p?.redFlags && p.redFlags.length > 0) {
      const redFlagAlert: ClinicalAlert = {
        id: `alert-redflags-${Date.now()}`,
        type: 'critical',
        title: 'Red Flags Detected',
        message: `Patient has ${p.redFlags.length} red flag(s): ${p.redFlags.join(', ')}`,
        action: 'emergency-protocol',
        actionLabel: 'View Emergency Protocol',
        timestamp: new Date(),
        acknowledged: false,
      };
      setClinicalAlerts(prev => {
        // Don't add duplicate red flag alerts
        const hasRedFlagAlert = prev.some(a => a.id.startsWith('alert-redflags-'));
        if (hasRedFlagAlert) return prev;
        return [redFlagAlert, ...prev];
      });
    }
  }, []);

  const setEncounter = useCallback((e: EncounterContext | null) => {
    setEncounterState(e);
  }, []);

  // Alert actions
  const addClinicalAlert = useCallback((alert: Omit<ClinicalAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: ClinicalAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false,
    };
    setClinicalAlerts(prev => [newAlert, ...prev]);
  }, []);

  const acknowledgeClinicalAlert = useCallback((alertId: string) => {
    setClinicalAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const dismissClinicalAlert = useCallback((alertId: string) => {
    setClinicalAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const clearAlerts = useCallback(() => {
    setClinicalAlerts([]);
  }, []);

  // Order tracking
  const addLabOrder = useCallback((orderId: string) => {
    setEncounterState(prev => {
      if (!prev) return prev;
      return { ...prev, labOrders: [...prev.labOrders, orderId] };
    });
  }, []);

  const addImagingOrder = useCallback((orderId: string) => {
    setEncounterState(prev => {
      if (!prev) return prev;
      return { ...prev, imagingOrders: [...prev.imagingOrders, orderId] };
    });
  }, []);

  const addMedicationOrder = useCallback((orderId: string) => {
    setEncounterState(prev => {
      if (!prev) return prev;
      return { ...prev, medicationOrders: [...prev.medicationOrders, orderId] };
    });
  }, []);

  const addReferralOrder = useCallback((orderId: string) => {
    setEncounterState(prev => {
      if (!prev) return prev;
      return { ...prev, referralOrders: [...prev.referralOrders, orderId] };
    });
  }, []);

  // Load patient from assessment
  const loadPatientFromAssessment = useCallback(async (assessmentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      if (!response.ok) throw new Error('Failed to load assessment');
      const data = await response.json();
      
      // Map assessment data to PatientContext
      const patientData: PatientContext = {
        id: data.patientId || assessmentId,
        name: data.patientName || 'Unknown Patient',
        age: data.age || 0,
        gender: data.gender || 'Unknown',
        mrn: data.mrn || 'N/A',
        chiefComplaint: data.chiefComplaint || data.symptoms?.join(', ') || '',
        allergies: data.allergies || [],
        currentMedications: data.medications || [],
        medicalHistory: data.medicalHistory || [],
        redFlags: data.redFlags || [],
      };
      
      setPatient(patientData);
      
      // Create new encounter
      const newEncounter: EncounterContext = {
        id: `encounter-${Date.now()}`,
        patientId: patientData.id,
        providerId: 'provider-001', // Would come from auth
        providerName: 'Dr. Thomas Reed',
        startTime: new Date(),
        type: 'office-visit',
        status: 'in-progress',
        labOrders: [],
        imagingOrders: [],
        medicationOrders: [],
        referralOrders: [],
      };
      setEncounter(newEncounter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
      // Fall back to demo data
      setPatient(DEMO_PATIENT);
      setEncounter(DEMO_ENCOUNTER);
    } finally {
      setIsLoading(false);
    }
  }, [setPatient, setEncounter]);

  // Reset encounter
  const resetEncounter = useCallback(() => {
    setPatientState(null);
    setEncounterState(null);
    setClinicalAlerts([]);
    setError(null);
  }, []);

  // Computed values
  const hasRedFlags = Boolean(patient?.redFlags && patient.redFlags.length > 0);
  const hasCriticalAlerts = clinicalAlerts.some(a => a.type === 'critical' && !a.acknowledged);

  const value: PatientEncounterState = {
    patient,
    encounter,
    clinicalAlerts,
    isLoading,
    error,
    setPatient,
    setEncounter,
    addClinicalAlert,
    acknowledgeClinicalAlert,
    dismissClinicalAlert,
    clearAlerts,
    addLabOrder,
    addImagingOrder,
    addMedicationOrder,
    addReferralOrder,
    hasRedFlags,
    hasCriticalAlerts,
    loadPatientFromAssessment,
    resetEncounter,
  };

  return (
    <PatientEncounterContext.Provider value={value}>
      {children}
    </PatientEncounterContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function usePatientEncounter(): PatientEncounterState {
  const context = useContext(PatientEncounterContext);
  if (context === undefined) {
    throw new Error('usePatientEncounter must be used within a PatientEncounterProvider');
  }
  return context;
}

// Export types
export type { PatientEncounterState };
