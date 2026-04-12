// =============================================================================
// ATTENDING AI - Clinical AI Provider
// apps/shared/lib/clinical-ai/ClinicalAIProvider.tsx
//
// React context provider for clinical AI decision support
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { BioMistralClient, getClinicalAIClient } from './BioMistralClient';
import {
  ClinicalAIConfig, ClinicalAIResponse, PatientContext, ClinicalAssessment,
  ClinicalAIOptions, RedFlagEvaluation, DifferentialDiagnosisResult, TreatmentPlan,
} from './types';
import { evaluateRedFlags } from './redFlagDetection';

// =============================================================================
// Context Types
// =============================================================================

interface ClinicalAIContextValue {
  client: BioMistralClient;
  isAnalyzing: boolean;
  lastAnalysis: ClinicalAIResponse | null;
  error: Error | null;

  // Quick Actions
  analyzeCase: (patientContext: PatientContext, assessment: ClinicalAssessment, options?: ClinicalAIOptions) => Promise<ClinicalAIResponse>;
  evaluateRedFlagsOnly: (patientContext: PatientContext, assessment: ClinicalAssessment) => RedFlagEvaluation;
  generateDifferential: (patientContext: PatientContext, assessment: ClinicalAssessment, options?: ClinicalAIOptions) => Promise<DifferentialDiagnosisResult>;
  generateTreatmentPlan: (patientContext: PatientContext, diagnosis: string, options?: ClinicalAIOptions) => Promise<TreatmentPlan>;

  // State Management
  clearAnalysis: () => void;
  clearError: () => void;
}

const ClinicalAIContext = createContext<ClinicalAIContextValue | null>(null);

// =============================================================================
// Provider Props
// =============================================================================

interface ClinicalAIProviderProps {
  children: ReactNode;
  config?: Partial<ClinicalAIConfig>;
  onRedFlagDetected?: (evaluation: RedFlagEvaluation) => void;
  onAnalysisComplete?: (response: ClinicalAIResponse) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

export function ClinicalAIProvider({
  children,
  config,
  onRedFlagDetected,
  onAnalysisComplete,
  onError,
}: ClinicalAIProviderProps): JSX.Element {
  const clientRef = useRef<BioMistralClient>(getClinicalAIClient(config));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<ClinicalAIResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // ===========================================================================
  // Full Case Analysis
  // ===========================================================================

  const analyzeCase = useCallback(async (
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): Promise<ClinicalAIResponse> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await clientRef.current.analyzeCase(patientContext, assessment, options);
      setLastAnalysis(response);

      // Notify about red flags
      if (response.redFlagEvaluation?.hasRedFlags) {
        onRedFlagDetected?.(response.redFlagEvaluation);
      }

      onAnalysisComplete?.(response);
      return response;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Analysis failed');
      setError(error);
      onError?.(error);
      throw error;

    } finally {
      setIsAnalyzing(false);
    }
  }, [onRedFlagDetected, onAnalysisComplete, onError]);

  // ===========================================================================
  // Red Flag Evaluation Only (Fast, Local)
  // ===========================================================================

  const evaluateRedFlagsOnly = useCallback((
    patientContext: PatientContext,
    assessment: ClinicalAssessment
  ): RedFlagEvaluation => {
    const evaluation = evaluateRedFlags(patientContext, assessment);

    if (evaluation.hasRedFlags) {
      onRedFlagDetected?.(evaluation);
    }

    return evaluation;
  }, [onRedFlagDetected]);

  // ===========================================================================
  // Differential Diagnosis Only
  // ===========================================================================

  const generateDifferential = useCallback(async (
    patientContext: PatientContext,
    assessment: ClinicalAssessment,
    options?: ClinicalAIOptions
  ): Promise<DifferentialDiagnosisResult> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      return await clientRef.current.generateDifferentialDiagnosis(patientContext, assessment, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Differential generation failed');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [onError]);

  // ===========================================================================
  // Treatment Plan Only
  // ===========================================================================

  const generateTreatmentPlan = useCallback(async (
    patientContext: PatientContext,
    diagnosis: string,
    options?: ClinicalAIOptions
  ): Promise<TreatmentPlan> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      return await clientRef.current.generateTreatmentPlan(patientContext, diagnosis, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Treatment plan generation failed');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [onError]);

  // ===========================================================================
  // State Management
  // ===========================================================================

  const clearAnalysis = useCallback(() => {
    setLastAnalysis(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue: ClinicalAIContextValue = {
    client: clientRef.current,
    isAnalyzing,
    lastAnalysis,
    error,
    analyzeCase,
    evaluateRedFlagsOnly,
    generateDifferential,
    generateTreatmentPlan,
    clearAnalysis,
    clearError,
  };

  return (
    <ClinicalAIContext.Provider value={contextValue}>
      {children}
    </ClinicalAIContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useClinicalAIContext(): ClinicalAIContextValue {
  const context = useContext(ClinicalAIContext);
  if (!context) {
    throw new Error('useClinicalAIContext must be used within a ClinicalAIProvider');
  }
  return context;
}

// =============================================================================
// Red Flag Alert Component
// =============================================================================

interface RedFlagAlertProps {
  evaluation: RedFlagEvaluation;
  onDismiss?: () => void;
  onAcknowledge?: () => void;
}

export function RedFlagAlert({ evaluation, onDismiss, onAcknowledge }: RedFlagAlertProps): JSX.Element | null {
  if (!evaluation.hasRedFlags) return null;

  const severityColors = {
    critical: 'bg-red-600 border-red-700',
    high: 'bg-orange-500 border-orange-600',
    moderate: 'bg-yellow-500 border-yellow-600',
  };

  const bgColor = evaluation.overallSeverity 
    ? severityColors[evaluation.overallSeverity] 
    : 'bg-gray-500';

  return (
    <div className={`${bgColor} text-white rounded-lg border-2 p-4 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold text-lg">
              {evaluation.overallSeverity?.toUpperCase()} RED FLAG{evaluation.matches.length > 1 ? 'S' : ''} DETECTED
            </h3>
            <p className="text-sm opacity-90">{evaluation.summary}</p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-white opacity-70 hover:opacity-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {evaluation.matches.slice(0, 3).map((match, index) => (
          <div key={index} className="bg-white/10 rounded p-2">
            <div className="font-semibold">{match.redFlag.name}</div>
            <div className="text-sm opacity-90">Action: {match.redFlag.recommendedAction}</div>
            <div className="text-xs opacity-75">Timeframe: {match.redFlag.timeframe}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="px-3 py-1 bg-white/20 rounded text-sm">
          Recommended: {evaluation.recommendedDisposition.replace('_', ' ').toUpperCase()}
        </div>
        {onAcknowledge && (
          <button
            onClick={onAcknowledge}
            className="px-3 py-1 bg-white text-gray-800 rounded text-sm font-medium hover:bg-gray-100"
          >
            Acknowledge
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Analysis Status Component
// =============================================================================

interface AnalysisStatusProps {
  className?: string;
}

export function AnalysisStatus({ className = '' }: AnalysisStatusProps): JSX.Element {
  const { isAnalyzing, lastAnalysis, error } = useClinicalAIContext();

  if (isAnalyzing) {
    return (
      <div className={`flex items-center gap-2 text-blue-600 ${className}`}>
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Analyzing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${className}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Error: {error.message}</span>
      </div>
    );
  }

  if (lastAnalysis) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Analysis complete ({lastAnalysis.processingTime}ms)</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Ready for analysis</span>
    </div>
  );
}

export { ClinicalAIContext };
