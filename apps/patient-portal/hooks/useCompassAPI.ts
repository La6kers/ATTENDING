// ============================================================
// COMPASS Assessment API Hook
// apps/patient-portal/hooks/useCompassAPI.ts
//
// React hook for COMPASS patient portal API interactions
// Uses the @attending/api-client package
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { 
  AttendingApiClient, 
  ApiError,
  Assessment,
  AssessmentSummary,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  RedFlagResult,
  TriageResult,
} from '@attending/api-client';

// =============================================================================
// Types
// =============================================================================

export interface UseCompassAPIOptions {
  baseUrl?: string;
  onError?: (error: ApiError) => void;
  onUnauthorized?: () => void;
}

export interface CompassAPIState {
  isLoading: boolean;
  error: string | null;
  assessment: Assessment | null;
  triageResult: TriageResult | null;
  redFlagResult: RedFlagResult | null;
}

export interface CompassAPIActions {
  createAssessment: (request: CreateAssessmentRequest) => Promise<Assessment>;
  updateAssessment: (id: string, updates: UpdateAssessmentRequest) => Promise<Assessment>;
  submitAssessment: (id: string) => Promise<Assessment>;
  getAssessment: (id: string) => Promise<Assessment>;
  getPatientHistory: (patientId: string) => Promise<AssessmentSummary[]>;
  evaluateRedFlags: (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }) => Promise<RedFlagResult>;
  getTriage: (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }) => Promise<TriageResult>;
  saveProgress: (id: string, data: UpdateAssessmentRequest) => Promise<Assessment>;
  clearError: () => void;
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCompassAPI(options: UseCompassAPIOptions = {}): CompassAPIState & CompassAPIActions {
  const [state, setState] = useState<CompassAPIState>({
    isLoading: false,
    error: null,
    assessment: null,
    triageResult: null,
    redFlagResult: null,
  });

  // Create API client instance
  const [client] = useState(() => new AttendingApiClient({
    baseUrl: options.baseUrl || '/api',
    onError: options.onError,
    onUnauthorized: options.onUnauthorized,
  }));

  // Helper to set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // Helper to set error
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  // ==========================================================================
  // API Actions
  // ==========================================================================

  const createAssessment = useCallback(async (request: CreateAssessmentRequest): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await client.assessments.create(request);
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create assessment';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const updateAssessment = useCallback(async (id: string, updates: UpdateAssessmentRequest): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await client.assessments.update(id, updates);
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to update assessment';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const submitAssessment = useCallback(async (id: string): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await client.assessments.submit(id);
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to submit assessment';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const getAssessment = useCallback(async (id: string): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await client.assessments.get(id);
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get assessment';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const getPatientHistory = useCallback(async (patientId: string): Promise<AssessmentSummary[]> => {
    setLoading(true);
    try {
      const history = await client.assessments.getPatientHistory(patientId);
      setLoading(false);
      return history;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get patient history';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const evaluateRedFlags = useCallback(async (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }): Promise<RedFlagResult> => {
    setLoading(true);
    try {
      const result = await client.clinical.evaluateRedFlags({
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms,
        age: data.age,
      });
      setState(prev => ({ ...prev, redFlagResult: result, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to evaluate red flags';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const getTriage = useCallback(async (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }): Promise<TriageResult> => {
    setLoading(true);
    try {
      const result = await client.clinical.getTriage({
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms,
        age: data.age,
      });
      setState(prev => ({ ...prev, triageResult: result, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get triage';
      setError(message);
      throw error;
    }
  }, [client, setLoading, setError]);

  const saveProgress = useCallback(async (id: string, data: UpdateAssessmentRequest): Promise<Assessment> => {
    // Don't show loading for auto-save
    try {
      const assessment = await client.assessments.saveProgress(id, data);
      setState(prev => ({ ...prev, assessment }));
      return assessment;
    } catch (error) {
      // Don't show error for failed auto-save, just log it
      console.warn('Auto-save failed:', error);
      throw error;
    }
  }, [client]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      assessment: null,
      triageResult: null,
      redFlagResult: null,
    });
  }, []);

  return {
    ...state,
    createAssessment,
    updateAssessment,
    submitAssessment,
    getAssessment,
    getPatientHistory,
    evaluateRedFlags,
    getTriage,
    saveProgress,
    clearError,
    reset,
  };
}

export default useCompassAPI;
