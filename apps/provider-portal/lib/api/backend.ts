/**
 * ATTENDING AI - API Module
 * 
 * Central export for all backend integration components.
 */

// API Client
export { default as api, apiClient, ApiError } from './backendClient';
export type {
  PatientSummary,
  ProviderSummary,
  LabOrderResponse,
  LabOrderSummary,
  LabResultResponse,
  CreateLabOrderRequest,
  CreateLabOrderResponse,
  ImagingOrderResponse,
  ImagingResultResponse,
  RadiationDoseResponse,
  CreateImagingOrderRequest,
  MedicationOrderResponse,
  DrugInteractionResponse,
  CreateMedicationOrderRequest,
  ReferralResponse,
  CreateReferralRequest,
  AssessmentResponse,
  AssessmentSummary,
  HpiResponse,
  RedFlagResponse,
} from './backendClient';

// Notification Client
export { 
  default as notificationClient,
  playAlert,
  initializeAlerts,
} from './notificationClient';
export type {
  CriticalResultNotification,
  EmergencyAssessmentNotification,
  OrderStatusNotification,
  NewAssessmentNotification,
  RedFlagNotification,
  PlayAlertCommand,
  NotificationHandlers,
} from './notificationClient';

// React Hooks
export {
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
  // Utilities
  usePolling,
  useCriticalAlertPolling,
} from './hooks';

// Notification Context
export {
  NotificationProvider,
  useNotifications,
  usePatientNotifications,
  useEmergencyMonitor,
} from './NotificationContext';
