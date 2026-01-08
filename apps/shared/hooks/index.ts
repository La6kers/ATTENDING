// ============================================================
// Shared Hooks - @attending/shared
// apps/shared/hooks/index.ts
//
// Export all shared React hooks
// ============================================================

// WebSocket hook for real-time communication
export { 
  useWebSocket, 
  type WebSocketConfig, 
  type WebSocketState,
  type WebSocketActions,
  type ProviderWSEvents,
  type PatientWSEvents,
} from './useWebSocket';

// Local storage hook for persistence
export { useLocalStorage } from './useLocalStorage';

// Debounce hook for rate-limiting
export { useDebounce } from './useDebounce';

// Browser notifications hook
export { 
  useNotifications, 
  type NotificationOptions,
  type UseNotificationsReturn,
} from './useNotifications';
