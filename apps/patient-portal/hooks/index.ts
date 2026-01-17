// apps/patient-portal/hooks/index.ts
// Export all custom hooks

export { useWebSocket } from './useWebSocket';
export { 
  useEmergencyDetection,
  evaluateForEmergency,
  type EmergencyAlert,
  type EmergencyState,
} from './useEmergencyDetection';
