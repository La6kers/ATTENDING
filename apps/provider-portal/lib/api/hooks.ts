/**
 * ATTENDING AI - React Hooks for Backend Integration
 * 
 * Custom hooks for consuming the .NET backend API.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { 
  ApiError,
  LabOrderResponse, 
  LabOrderSummary,
  CreateLabOrderRequest,
  ImagingOrderResponse,
  CreateImagingOrderRequest,
  MedicationOrderResponse,
  CreateMedicationOrderRequest,
  DrugInteractionResponse,
  ReferralResponse,
  CreateReferralRequest,
  AssessmentResponse,
  AssessmentSummary,
} from './backendClient';

// =============================================================================
// GENERIC QUERY HOOK
// =============================================================================

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error', 500, String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    fetch();
  }, deps);

  return { data, isLoading, error, refetch: fetch };
}

// =============================================================================
// GENERIC MUTATION HOOK
// =============================================================================

interface MutationState<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  isLoading: boolean;
  error: ApiError | null;
  reset: () => void;
}

function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
): MutationState<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutationFn(variables);
      setData(result);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Unknown error', 500, String(err));
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, data, isLoading, error, reset };
}

// =============================================================================
// LAB ORDER HOOKS
// =============================================================================

export function useLabOrder(id: string) {
  return useQuery(() => api.labOrders.getById(id), [id]);
}

export function usePatientLabOrders(patientId: string, status?: string) {
  return useQuery(
    () => api.labOrders.getByPatient(patientId, status),
    [patientId, status]
  );
}

export function usePendingLabOrders() {
  return useQuery(() => api.labOrders.getPending(), []);
}

export function useCriticalLabResults() {
  return useQuery(() => api.labOrders.getCritical(), []);
}

export function useCreateLabOrder() {
  return useMutation((request: CreateLabOrderRequest) => api.labOrders.create(request));
}

export function useUpdateLabOrderPriority() {
  return useMutation(({ id, priority }: { id: string; priority: string }) => 
    api.labOrders.updatePriority(id, priority)
  );
}

export function useCancelLabOrder() {
  return useMutation(({ id, reason }: { id: string; reason: string }) => 
    api.labOrders.cancel(id, reason)
  );
}

export function useAddLabResult() {
  return useMutation(({ id, result }: { id: string; result: Parameters<typeof api.labOrders.addResult>[1] }) => 
    api.labOrders.addResult(id, result)
  );
}

// =============================================================================
// IMAGING ORDER HOOKS
// =============================================================================

export function useImagingOrder(id: string) {
  return useQuery(() => api.imagingOrders.getById(id), [id]);
}

export function usePatientImagingOrders(patientId: string) {
  return useQuery(() => api.imagingOrders.getByPatient(patientId), [patientId]);
}

export function usePatientRadiationDose(patientId: string, monthsBack = 12) {
  return useQuery(
    () => api.imagingOrders.getRadiationDose(patientId, monthsBack),
    [patientId, monthsBack]
  );
}

export function useCreateImagingOrder() {
  return useMutation((request: CreateImagingOrderRequest) => api.imagingOrders.create(request));
}

// =============================================================================
// MEDICATION HOOKS
// =============================================================================

export function useMedicationOrder(id: string) {
  return useQuery(() => api.medications.getById(id), [id]);
}

export function usePatientMedications(patientId: string) {
  return useQuery(() => api.medications.getByPatient(patientId), [patientId]);
}

export function useActiveMedications(patientId: string) {
  return useQuery(() => api.medications.getActiveByPatient(patientId), [patientId]);
}

export function useCheckDrugInteractions() {
  return useMutation(({ patientId, medicationName }: { patientId: string; medicationName: string }) =>
    api.medications.checkInteractions(patientId, medicationName)
  );
}

export function useCreateMedicationOrder() {
  return useMutation((request: CreateMedicationOrderRequest) => api.medications.create(request));
}

export function useDiscontinueMedication() {
  return useMutation(({ id, reason }: { id: string; reason: string }) =>
    api.medications.discontinue(id, reason)
  );
}

// =============================================================================
// REFERRAL HOOKS
// =============================================================================

export function useSpecialties() {
  return useQuery(() => api.referrals.getSpecialties(), []);
}

export function useReferral(id: string) {
  return useQuery(() => api.referrals.getById(id), [id]);
}

export function usePatientReferrals(patientId: string) {
  return useQuery(() => api.referrals.getByPatient(patientId), [patientId]);
}

export function usePendingReferralsBySpecialty(specialty: string) {
  return useQuery(
    () => api.referrals.getPendingBySpecialty(specialty),
    [specialty]
  );
}

export function useCreateReferral() {
  return useMutation((request: CreateReferralRequest) => api.referrals.create(request));
}

// =============================================================================
// ASSESSMENT HOOKS
// =============================================================================

export function useAssessment(id: string) {
  return useQuery(() => api.assessments.getById(id), [id]);
}

export function usePatientAssessments(patientId: string) {
  return useQuery(() => api.assessments.getByPatient(patientId), [patientId]);
}

export function usePendingReviewAssessments() {
  return useQuery(() => api.assessments.getPendingReview(), []);
}

export function useRedFlagAssessments() {
  return useQuery(() => api.assessments.getWithRedFlags(), []);
}

export function useStartAssessment() {
  return useMutation((request: { patientId: string; chiefComplaint: string }) =>
    api.assessments.start(request)
  );
}

export function useSubmitAssessmentResponse() {
  return useMutation(({ id, question, response }: { id: string; question: string; response: string }) =>
    api.assessments.submitResponse(id, { question, response })
  );
}

export function useCompleteAssessment() {
  return useMutation(({ id, triageLevel, summary }: { id: string; triageLevel: string; summary?: string }) =>
    api.assessments.complete(id, triageLevel, summary)
  );
}

// =============================================================================
// SYSTEM HOOKS
// =============================================================================

export function useSystemVersion() {
  return useQuery(() => api.system.getVersion(), []);
}

export function useLabCategories() {
  return useQuery(() => api.system.getLabCategories(), []);
}

export function useImagingModalities() {
  return useQuery(() => api.system.getImagingModalities(), []);
}

export function useCacheStats() {
  return useQuery(() => api.system.getCacheStats(), []);
}

export function useResetCacheStats() {
  return useMutation(() => api.system.resetCacheStats());
}

export function useInvalidateCache() {
  return useMutation((category: 'diff' | 'drug' | 'labs' | 'all') =>
    api.system.invalidateCache(category)
  );
}

// =============================================================================
// POLLING HOOK (for real-time updates without WebSocket)
// =============================================================================

export function usePolling<T>(
  queryFn: () => Promise<T>,
  intervalMs: number = 30000,
  enabled: boolean = true
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetch = useCallback(async () => {
    try {
      const result = await queryFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Unknown error', 500, String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    if (!enabled) return;

    fetch();

    intervalRef.current = setInterval(fetch, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetch, intervalMs, enabled]);

  return { data, isLoading, error, refetch: fetch };
}

// =============================================================================
// CRITICAL ALERTS POLLING HOOK
// =============================================================================

export function useCriticalAlertPolling(intervalMs: number = 10000) {
  const criticalLabs = usePolling(() => api.labOrders.getCritical(), intervalMs);
  const emergencyAssessments = usePolling(() => api.assessments.getWithRedFlags(), intervalMs);

  return {
    criticalLabs: criticalLabs.data || [],
    emergencyAssessments: emergencyAssessments.data || [],
    isLoading: criticalLabs.isLoading || emergencyAssessments.isLoading,
    error: criticalLabs.error || emergencyAssessments.error,
    refetch: async () => {
      await Promise.all([criticalLabs.refetch(), emergencyAssessments.refetch()]);
    },
  };
}

export default {
  // Lab Orders
  useLabOrder,
  usePatientLabOrders,
  usePendingLabOrders,
  useCriticalLabResults,
  useCreateLabOrder,
  useUpdateLabOrderPriority,
  useCancelLabOrder,
  useAddLabResult,
  // Imaging Orders
  useImagingOrder,
  usePatientImagingOrders,
  usePatientRadiationDose,
  useCreateImagingOrder,
  // Medications
  useMedicationOrder,
  usePatientMedications,
  useActiveMedications,
  useCheckDrugInteractions,
  useCreateMedicationOrder,
  useDiscontinueMedication,
  // Referrals
  useSpecialties,
  useReferral,
  usePatientReferrals,
  usePendingReferralsBySpecialty,
  useCreateReferral,
  // Assessments
  useAssessment,
  usePatientAssessments,
  usePendingReviewAssessments,
  useRedFlagAssessments,
  useStartAssessment,
  useSubmitAssessmentResponse,
  useCompleteAssessment,
  // System
  useSystemVersion,
  useLabCategories,
  useImagingModalities,
  // Cache
  useCacheStats,
  useResetCacheStats,
  useInvalidateCache,
  // Utilities
  usePolling,
  useCriticalAlertPolling,
};
