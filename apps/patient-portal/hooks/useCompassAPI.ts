// ============================================================
// COMPASS Assessment API Hook
// apps/patient-portal/hooks/useCompassAPI.ts
//
// React hook for COMPASS patient portal API interactions
// ============================================================

import { useState, useCallback } from 'react';

// =============================================================================
// Types (defined locally to avoid missing package dependency)
// =============================================================================

export class ApiError extends Error {
  status: number;
  code?: string;
  
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface Assessment {
  id: string;
  patientId: string;
  status: 'in_progress' | 'pending' | 'in_review' | 'completed';
  chiefComplaint?: string;
  hpiData?: Record<string, any>;
  reviewOfSystems?: Record<string, string[]>;
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  socialHistory?: Record<string, string>;
  redFlags?: string[];
  urgencyLevel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentSummary {
  id: string;
  chiefComplaint: string;
  status: string;
  urgencyLevel: string;
  createdAt: string;
}

export interface CreateAssessmentRequest {
  patientId: string;
  chiefComplaint?: string;
}

export interface UpdateAssessmentRequest {
  chiefComplaint?: string;
  hpiData?: Record<string, any>;
  reviewOfSystems?: Record<string, string[]>;
  medicalHistory?: string[];
  medications?: string[];
  allergies?: string[];
  socialHistory?: Record<string, string>;
}

export interface RedFlagResult {
  hasRedFlags: boolean;
  redFlags: Array<{
    symptom: string;
    severity: 'warning' | 'urgent' | 'critical';
    category: string;
  }>;
  recommendedAction: string;
}

export interface TriageResult {
  urgencyLevel: 'standard' | 'moderate' | 'high' | 'emergency';
  score: number;
  recommendations: string[];
}

// =============================================================================
// Hook Types
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
// API Helper Functions
// =============================================================================

async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    onUnauthorized?.();
    throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData.code
    );
  }

  return response.json();
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCompassAPI(options: UseCompassAPIOptions = {}): CompassAPIState & CompassAPIActions {
  const baseUrl = options.baseUrl || '/api';
  
  const [state, setState] = useState<CompassAPIState>({
    isLoading: false,
    error: null,
    assessment: null,
    triageResult: null,
    redFlagResult: null,
  });

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
      const assessment = await apiFetch<Assessment>(
        `${baseUrl}/patient/assessments`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to create assessment';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const updateAssessment = useCallback(async (id: string, updates: UpdateAssessmentRequest): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await apiFetch<Assessment>(
        `${baseUrl}/patient/assessments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to update assessment';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const submitAssessment = useCallback(async (id: string): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await apiFetch<Assessment>(
        `${baseUrl}/patient/assessments/${id}/submit`,
        {
          method: 'POST',
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to submit assessment';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const getAssessment = useCallback(async (id: string): Promise<Assessment> => {
    setLoading(true);
    try {
      const assessment = await apiFetch<Assessment>(
        `${baseUrl}/patient/assessments/${id}`,
        {},
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, assessment, isLoading: false, error: null }));
      return assessment;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get assessment';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const getPatientHistory = useCallback(async (patientId: string): Promise<AssessmentSummary[]> => {
    setLoading(true);
    try {
      const response = await apiFetch<{ assessments: AssessmentSummary[] }>(
        `${baseUrl}/patient/assessments?patientId=${patientId}`,
        {},
        options.onUnauthorized
      );
      setLoading(false);
      return response.assessments || [];
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get patient history';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const evaluateRedFlags = useCallback(async (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }): Promise<RedFlagResult> => {
    setLoading(true);
    try {
      const result = await apiFetch<RedFlagResult>(
        `${baseUrl}/clinical/red-flags`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, redFlagResult: result, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to evaluate red flags';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const getTriage = useCallback(async (data: {
    chiefComplaint: string;
    symptoms: string[];
    age: number;
  }): Promise<TriageResult> => {
    setLoading(true);
    try {
      const result = await apiFetch<TriageResult>(
        `${baseUrl}/clinical/triage`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, triageResult: result, isLoading: false, error: null }));
      return result;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to get triage';
      setError(message);
      options.onError?.(error instanceof ApiError ? error : new ApiError(message, 500));
      throw error;
    }
  }, [baseUrl, setLoading, setError, options]);

  const saveProgress = useCallback(async (id: string, data: UpdateAssessmentRequest): Promise<Assessment> => {
    // Don't show loading for auto-save
    try {
      const assessment = await apiFetch<Assessment>(
        `${baseUrl}/patient/assessments/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
        options.onUnauthorized
      );
      setState(prev => ({ ...prev, assessment }));
      return assessment;
    } catch (error) {
      // Don't show error for failed auto-save, just log it
      console.warn('Auto-save failed:', error);
      throw error;
    }
  }, [baseUrl, options]);

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
