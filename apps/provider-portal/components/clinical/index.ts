/**
 * ATTENDING AI - Clinical Components
 * 
 * Central export for all clinical workflow components.
 */

// Order Panels
export { default as LabOrderPanel } from './LabOrderPanel';
export { default as MedicationOrderPanel } from './MedicationOrderPanel';
export { default as AssessmentQueue } from './AssessmentQueue';

// Re-export types from backend
export type {
  LabOrderResponse,
  LabOrderSummary,
  CreateLabOrderRequest,
  MedicationOrderResponse,
  CreateMedicationOrderRequest,
  DrugInteractionResponse,
  AssessmentResponse,
  AssessmentSummary,
} from '../../lib/api/backend';
