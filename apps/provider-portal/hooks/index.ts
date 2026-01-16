// =============================================================================
// ATTENDING AI - Provider Portal Hooks
// apps/provider-portal/hooks/index.ts
//
// Barrel exports for all custom hooks
// =============================================================================

// Clinical Safety - Red flags, triage, drug interactions
export { 
  useClinicalSafety,
  clinicalSafety,
  type ClinicalSafetyResult,
  type PatientPresentation,
} from './useClinicalSafety';

// Clinical Orders - Unified ordering interface
export {
  useClinicalOrders,
  type OrderType,
  type OrderSummary,
  type ClinicalOrdersState,
  type SafetyValidation,
} from './useClinicalOrders';

// Clinical Services - API integration
export { default as useClinicalServices } from './useClinicalServices';

// Real-time Notifications
export { default as useNotifications } from './useNotifications';

// WebSocket Communication
export { default as useWebSocket } from './useWebSocket';
