// Provider Portal Hooks Index
// apps/provider-portal/hooks/index.ts

export { useClinicalServices } from './useClinicalServices';
export { useNotifications } from './useNotifications';
export { useWebSocket } from './useWebSocket';
export { 
  useKeyboardShortcuts,
  createClinicalShortcuts,
  getShortcutHelpItems,
  defaultClinicalShortcuts 
} from './useKeyboardShortcuts';
export type { KeyboardShortcut } from './useKeyboardShortcuts';
