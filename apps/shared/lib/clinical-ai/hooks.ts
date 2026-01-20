// =============================================================================
// ATTENDING AI - Clinical AI Hooks
// apps/shared/lib/clinical-ai/hooks.ts
//
// React hooks for clinical AI features
// =============================================================================

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useClinicalAIContext } from './ClinicalAIProvider';
import { evaluateRedFlags, hasImmediateRedFlags, getActionableRedFlags, RED_FLAGS } from './redFlagDetection';
import {
  PatientContext, ClinicalAssessment, ClinicalAIOptions, ClinicalAIResponse,
  RedFlagEvaluation, RedFlagMatch, DifferentialDiagnosisResult, DifferentialDiagnosis,
  TreatmentPlan, TreatmentRecommendation, RecommendedTest, RedFlag,
} from './types';

// =============================================================================
// Analysis Hooks
// =============================================================================

export function useClinicalAnalysis() {
  const { analyzeCase, isAnalyzing, lastAnalysis, error, clearAnalysis, clearError } = useClinicalAIContext();
  return { analyzeCase, isAnalyzing, lastAnalysis, error, clearAnalysis, clearError };
}

export function useRedFlagEvaluation(
  patientContext: PatientContext | null,
  assessment: ClinicalAssessment | null,
  enabled = true
): {
  evaluation: RedFlagEvaluation | null;
  hasRedFlags: boolean;
  hasCritical: boolean;
  actionableFlags: RedFlagMatch[];
  reevaluate: () => void;
} {
  const [evaluation, setEvaluation] = useState<RedFlagEvaluation | null>(null);

  const evaluate = useCallback(() => {
    if (!enabled || !patientContext || !assessment) {
      setEvaluation(null);
      return;
    }
    const result = evaluateRedFlags(patientContext, assessment);
    setEvaluation(result);
  }, [patientContext, assessment, enabled]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  const hasRedFlags = evaluation?.hasRedFlags ?? false;
  const hasCritical = evaluation?.overallSeverity === 'critical';
  const actionableFlags = evaluation ? getActionableRedFlags(evaluation) : [];

  return { evaluation, hasRedFlags, hasCritical, actionableFlags, reevaluate: evaluate };
}

export function useImmediateRedFlagCheck(
  patientContext: PatientContext | null,
  assessment: ClinicalAssessment | null
): boolean {
  const { evaluation } = useRedFlagEvaluation(patientContext, assessment);
  return evaluation ? hasImmediateRedFlags(evaluation) : false;
}

// =============================================================================
// Differential Diagnosis Hooks
// =============================================================================

export function useDifferentialDiagnosis(
  patientContext: PatientContext | null,
  assessment: ClinicalAssessment | null,
  options?: ClinicalAIOptions
): {
  differential: DifferentialDiagnosisResult | null;
  isLoading: boolean;
  error: Error | null;
  generate: () => Promise<void>;
  primaryDiagnosis: DifferentialDiagnosis | null;
  mustNotMiss: DifferentialDiagnosis[];
} {
  const { generateDifferential } = useClinicalAIContext();
  const [differential, setDifferential] = useState<DifferentialDiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async () => {
    if (!patientContext || !assessment) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateDifferential(patientContext, assessment, options);
      setDifferential(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate differential'));
    } finally {
      setIsLoading(false);
    }
  }, [patientContext, assessment, options, generateDifferential]);

  const primaryDiagnosis = differential?.primaryDiagnoses[0] ?? null;
  const mustNotMiss = differential?.mustNotMissDiagnoses ?? [];

  return { differential, isLoading, error, generate, primaryDiagnosis, mustNotMiss };
}

export function useDiagnosisProbabilities(differential: DifferentialDiagnosisResult | null): {
  diagnosis: string;
  probability: number;
  mustNotMiss: boolean;
}[] {
  return useMemo(() => {
    if (!differential) return [];

    const allDiagnoses = [
      ...differential.primaryDiagnoses,
      ...differential.mustNotMissDiagnoses,
      ...differential.lessLikelyDiagnoses,
    ];

    return allDiagnoses
      .map((d) => ({
        diagnosis: d.diagnosis.name,
        probability: d.diagnosis.probability,
        mustNotMiss: d.diagnosis.mustNotMiss ?? false,
      }))
      .sort((a, b) => b.probability - a.probability);
  }, [differential]);
}

// =============================================================================
// Treatment Plan Hooks
// =============================================================================

export function useTreatmentPlan(
  patientContext: PatientContext | null,
  diagnosis: string | null,
  options?: ClinicalAIOptions
): {
  plan: TreatmentPlan | null;
  isLoading: boolean;
  error: Error | null;
  generate: () => Promise<void>;
  medications: TreatmentRecommendation[];
  contraindications: string[];
} {
  const { generateTreatmentPlan } = useClinicalAIContext();
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async () => {
    if (!patientContext || !diagnosis) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateTreatmentPlan(patientContext, diagnosis, options);
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate treatment plan'));
    } finally {
      setIsLoading(false);
    }
  }, [patientContext, diagnosis, options, generateTreatmentPlan]);

  const medications = useMemo(() => 
    plan?.recommendations.filter((r) => r.category === 'medication') ?? [],
    [plan]
  );

  const contraindications = plan?.contraindications ?? [];

  return { plan, isLoading, error, generate, medications, contraindications };
}

export function useTreatmentRecommendationsByCategory(plan: TreatmentPlan | null): Record<string, TreatmentRecommendation[]> {
  return useMemo(() => {
    if (!plan) return {};

    const grouped: Record<string, TreatmentRecommendation[]> = {};
    for (const rec of plan.recommendations) {
      if (!grouped[rec.category]) grouped[rec.category] = [];
      grouped[rec.category].push(rec);
    }
    return grouped;
  }, [plan]);
}

// =============================================================================
// Recommended Tests Hooks
// =============================================================================

export function useRecommendedTests(differential: DifferentialDiagnosisResult | null): {
  all: RecommendedTest[];
  stat: RecommendedTest[];
  urgent: RecommendedTest[];
  routine: RecommendedTest[];
  byCategory: Record<string, RecommendedTest[]>;
} {
  return useMemo(() => {
    const all = differential?.recommendedTests ?? [];
    const stat = all.filter((t) => t.priority === 'stat');
    const urgent = all.filter((t) => t.priority === 'urgent');
    const routine = all.filter((t) => t.priority === 'routine');

    const byCategory: Record<string, RecommendedTest[]> = {};
    for (const test of all) {
      if (!byCategory[test.category]) byCategory[test.category] = [];
      byCategory[test.category].push(test);
    }

    return { all, stat, urgent, routine, byCategory };
  }, [differential]);
}

// =============================================================================
// Red Flag Reference Hooks
// =============================================================================

export function useRedFlagReference(category?: string): RedFlag[] {
  return useMemo(() => {
    if (!category) return RED_FLAGS;
    return RED_FLAGS.filter((rf) => rf.category === category);
  }, [category]);
}

export function useRedFlagCategories(): string[] {
  return useMemo(() => {
    const categories = new Set(RED_FLAGS.map((rf) => rf.category));
    return Array.from(categories).sort();
  }, []);
}

// =============================================================================
// Analysis History Hook
// =============================================================================

export function useAnalysisHistory(maxItems = 10): {
  history: ClinicalAIResponse[];
  addToHistory: (response: ClinicalAIResponse) => void;
  clearHistory: () => void;
} {
  const [history, setHistory] = useState<ClinicalAIResponse[]>([]);

  const addToHistory = useCallback((response: ClinicalAIResponse) => {
    setHistory((prev) => [response, ...prev].slice(0, maxItems));
  }, [maxItems]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addToHistory, clearHistory };
}

// =============================================================================
// Real-time Analysis Hook (with debounce)
// =============================================================================

export function useRealTimeRedFlagMonitor(
  patientContext: PatientContext | null,
  assessment: ClinicalAssessment | null,
  debounceMs = 500
): {
  evaluation: RedFlagEvaluation | null;
  isEvaluating: boolean;
} {
  const [evaluation, setEvaluation] = useState<RedFlagEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!patientContext || !assessment) {
      setEvaluation(null);
      return;
    }

    setIsEvaluating(true);

    timeoutRef.current = setTimeout(() => {
      const result = evaluateRedFlags(patientContext, assessment);
      setEvaluation(result);
      setIsEvaluating(false);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [patientContext, assessment, debounceMs]);

  return { evaluation, isEvaluating };
}

// =============================================================================
// Clinical Summary Hook
// =============================================================================

export function useClinicalSummary(response: ClinicalAIResponse | null): {
  summary: string;
  hasRedFlags: boolean;
  topDiagnosis: string | null;
  recommendedTests: number;
  recommendations: number;
} {
  return useMemo(() => {
    if (!response) {
      return {
        summary: '',
        hasRedFlags: false,
        topDiagnosis: null,
        recommendedTests: 0,
        recommendations: 0,
      };
    }

    return {
      summary: response.clinicalSummary,
      hasRedFlags: response.redFlagEvaluation?.hasRedFlags ?? false,
      topDiagnosis: response.differentialDiagnosis?.primaryDiagnoses[0]?.diagnosis.name ?? null,
      recommendedTests: response.differentialDiagnosis?.recommendedTests.length ?? 0,
      recommendations: response.treatmentPlan?.recommendations.length ?? 0,
    };
  }, [response]);
}

// =============================================================================
// Audit Log Hook
// =============================================================================

export function useAuditLog() {
  const { client } = useClinicalAIContext();

  const getAuditLog = useCallback(() => {
    return client.getAuditLog();
  }, [client]);

  return { getAuditLog };
}
