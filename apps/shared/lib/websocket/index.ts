// =============================================================================
// ATTENDING AI - WebSocket Module Exports
// apps/shared/lib/websocket/index.ts
// =============================================================================

// Types
export * from './types';

// Client
export { WebSocketClient, getWebSocketClient, resetWebSocketClient } from './WebSocketClient';

// Provider
export { WebSocketProvider, useWebSocketContext, ConnectionStatus, WebSocketContext } from './WebSocketProvider';

// Hooks - Connection
export {
  useConnectionState,
  useIsConnected,
  useReconnect,
  useSubscription,
} from './hooks';

// Hooks - Assessments
export {
  useAssessmentQueue,
  useUrgentAssessments,
  useAssessmentStatus,
} from './hooks';

// Hooks - Emergency
export { useEmergencyAlerts } from './hooks';

// Hooks - Results
export {
  useCriticalResults,
  useLabResults,
  useImagingResults,
} from './hooks';

// Hooks - Orders
export { useOrderUpdates } from './hooks';

// Hooks - Patients
export {
  usePatientStatus,
  usePatientCheckins,
} from './hooks';

// Hooks - Providers
export {
  useProviderPresence,
  useProviderMessages,
  useHandoffs,
} from './hooks';

// Hooks - System
export { useSystemNotifications } from './hooks';

// Hooks - Audio
export { useAudioAlerts } from './hooks';
