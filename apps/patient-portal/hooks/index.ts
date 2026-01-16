// apps/patient-portal/hooks/index.ts
// Export all custom hooks

export { useWebSocket } from './useWebSocket';
export { 
  useEmergencyDetection, 
  useQuickEmergencyCheck, 
  useEmergencyLocation,
  type UseEmergencyDetectionReturn,
  type EmergencyDetectionState,
  type EmergencyDetectionActions,
} from './useEmergencyDetection';
