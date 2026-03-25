// =============================================================================
// ATTENDING AI - Clinical Services Hook
// apps/provider-portal/hooks/useClinicalServices.ts
//
// Unified hook for accessing clinical services from React components.
// Handles API calls, loading states, and error handling.
// =============================================================================

import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface VitalSigns {
  heartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  painLevel?: number;
}

interface TriageRequest {
  chiefComplaint: string;
  vitalSigns?: VitalSigns;
  patientAge?: number;
  symptoms?: string[];
  redFlags?: string[];
  mentalStatus?: 'alert' | 'confused' | 'lethargic' | 'unresponsive';
}

interface TriageResult {
  esiLevel: 1 | 2 | 3 | 4 | 5;
  disposition: string;
  rationale: string[];
  recommendedArea: string;
  estimatedWaitTime?: string;
}

interface LabRequest {
  chiefComplaint: string;
  workingDiagnosis?: string;
  symptoms?: string[];
  redFlags?: string[];
  vitalSigns?: VitalSigns;
  patientAge?: number;
  patientSex?: 'male' | 'female' | 'other';
}

interface LabRecommendation {
  testCode: string;
  testName: string;
  category: 'critical' | 'recommended' | 'consider';
  priority: 'STAT' | 'ASAP' | 'ROUTINE';
  rationale: string;
  clinicalEvidence: string[];
  bundle?: string;
}

interface LabResult {
  recommendations: LabRecommendation[];
  bundlesSuggested: string[];
  criticalCount: number;
  recommendedCount: number;
  considerCount: number;
  clinicalContext: string;
}

interface RedFlagRequest {
  symptoms: string[];
  chiefComplaint?: string;
  vitalSigns?: VitalSigns;
  patientAge?: number;
  mentalStatus?: string;
  progression?: 'improving' | 'stable' | 'worsening' | 'rapidly-worsening';
}

interface RedFlagMatch {
  symptom: string;
  severity: 'critical' | 'emergent' | 'urgent' | 'moderate';
  category: string;
  immediateAction?: string;
}

interface RedFlagResult {
  hasRedFlags: boolean;
  urgencyLevel: 'critical' | 'emergent' | 'urgent' | 'moderate' | 'routine';
  redFlags: RedFlagMatch[];
  immediateActions: string[];
  escalationRequired: boolean;
  escalationReason?: string;
  disposition: string;
  timeToAction?: string;
  emergencyProtocol?: string;
}

interface DrugCheckRequest {
  proposedMedication: {
    name: string;
    class?: string;
    dose?: string;
    route?: string;
  };
  currentMedications: { name: string; class?: string }[];
  allergies: { allergen: string; reaction?: string; severity?: string }[];
  patientAge?: number;
  renalFunction?: string;
  hepaticFunction?: string;
  pregnancyStatus?: string;
}

interface DrugCheckResult {
  safeToAdminister: boolean;
  requiresReview: boolean;
  interactions: any[];
  allergyAlerts: any[];
  contraindications: string[];
  dosageAdjustments: string[];
  monitoringRequired: string[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'contraindicated';
  clinicalGuidance: string;
}

interface ProtocolRequest {
  condition: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  setting?: 'emergency' | 'inpatient' | 'outpatient' | 'icu';
  patientAge?: number;
}

interface ClinicalProtocol {
  name: string;
  condition: string;
  steps: {
    order: number;
    action: string;
    timeframe?: string;
    priority: 'immediate' | 'urgent' | 'routine';
  }[];
  medications?: any[];
  labs?: string[];
  imaging?: string[];
  dispositionCriteria: any;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useClinicalServices() {
  const [triageState, setTriageState] = useState<ApiState<TriageResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [labsState, setLabsState] = useState<ApiState<LabResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [redFlagsState, setRedFlagsState] = useState<ApiState<RedFlagResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [drugCheckState, setDrugCheckState] = useState<ApiState<DrugCheckResult>>({
    data: null,
    loading: false,
    error: null,
  });

  const [protocolState, setProtocolState] = useState<ApiState<ClinicalProtocol>>({
    data: null,
    loading: false,
    error: null,
  });

  // Base API call function
  const apiCall = useCallback(async <T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
    token?: string
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/clinical/${endpoint}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }

    return result.data;
  }, []);

  // Triage classification
  const classifyTriage = useCallback(async (
    request: TriageRequest,
    token?: string
  ): Promise<TriageResult> => {
    setTriageState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall<TriageResult>('triage', 'POST', request, token);
      setTriageState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Triage classification failed';
      setTriageState({ data: null, loading: false, error: errorMsg });
      throw error;
    }
  }, [apiCall]);

  // Lab recommendations
  const getLabRecommendations = useCallback(async (
    request: LabRequest,
    token?: string
  ): Promise<LabResult> => {
    setLabsState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall<LabResult>('labs', 'POST', request, token);
      setLabsState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lab recommendations failed';
      setLabsState({ data: null, loading: false, error: errorMsg });
      throw error;
    }
  }, [apiCall]);

  // Red flag evaluation (CRITICAL - no auth required for patient safety)
  const evaluateRedFlags = useCallback(async (
    request: RedFlagRequest
  ): Promise<RedFlagResult> => {
    setRedFlagsState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall<RedFlagResult>('red-flags', 'POST', request);
      setRedFlagsState({ data: result, loading: false, error: null });
      
      // If critical red flags, trigger alert
      if (result.urgencyLevel === 'critical' || result.escalationRequired) {
        console.warn('[CLINICAL] Critical red flags detected:', result.redFlags);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Red flag evaluation failed';
      setRedFlagsState({ data: null, loading: false, error: errorMsg });
      // Still throw for red flags - this is safety critical
      throw error;
    }
  }, [apiCall]);

  // Drug interaction check
  const checkDrugInteractions = useCallback(async (
    request: DrugCheckRequest,
    token?: string
  ): Promise<DrugCheckResult> => {
    setDrugCheckState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall<DrugCheckResult>('drug-check', 'POST', request, token);
      setDrugCheckState({ data: result, loading: false, error: null });
      
      // Warn on high-risk or contraindicated
      if (result.overallRiskLevel === 'high' || result.overallRiskLevel === 'contraindicated') {
        console.warn('[CLINICAL] High-risk drug interaction:', result);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Drug check failed';
      setDrugCheckState({ data: null, loading: false, error: errorMsg });
      throw error;
    }
  }, [apiCall]);

  // Protocol retrieval
  const getProtocol = useCallback(async (
    request: ProtocolRequest,
    token?: string
  ): Promise<ClinicalProtocol> => {
    setProtocolState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall<ClinicalProtocol>('protocols', 'POST', request, token);
      setProtocolState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Protocol retrieval failed';
      setProtocolState({ data: null, loading: false, error: errorMsg });
      throw error;
    }
  }, [apiCall]);

  // Clear all states
  const clearAll = useCallback(() => {
    setTriageState({ data: null, loading: false, error: null });
    setLabsState({ data: null, loading: false, error: null });
    setRedFlagsState({ data: null, loading: false, error: null });
    setDrugCheckState({ data: null, loading: false, error: null });
    setProtocolState({ data: null, loading: false, error: null });
  }, []);

  return {
    // Triage
    triage: triageState,
    classifyTriage,
    
    // Labs
    labs: labsState,
    getLabRecommendations,
    
    // Red Flags
    redFlags: redFlagsState,
    evaluateRedFlags,
    
    // Drug Check
    drugCheck: drugCheckState,
    checkDrugInteractions,
    
    // Protocols
    protocol: protocolState,
    getProtocol,
    
    // Utility
    clearAll,
    
    // Convenience - any loading
    isLoading: triageState.loading || labsState.loading || redFlagsState.loading || 
               drugCheckState.loading || protocolState.loading,
  };
}

export default useClinicalServices;
