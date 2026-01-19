// ============================================================
// Toast Components - @attending/shared
// apps/shared/components/ui/Toast.tsx
//
// Re-exports from @attending/ui-primitives
// ============================================================

import { useToast as useToastBase } from '@attending/ui-primitives';

// Re-export all toast components from ui-primitives
export {
  ToastProvider,
  ToastContainer,
  useToast,
  type Toast,
  type ToastType,
} from '@attending/ui-primitives';

// Type alias for backward compatibility
export type ToastContextType = ReturnType<typeof useToastBase>;

// Helper hook for common toast actions
export const useToastActions = () => {
  const { addToast, removeToast } = useToastBase();

  return {
    success: (message: string, title?: string) =>
      addToast({ type: 'success', message, title }),
    error: (message: string, title?: string) =>
      addToast({ type: 'error', message, title }),
    warning: (message: string, title?: string) =>
      addToast({ type: 'warning', message, title }),
    info: (message: string, title?: string) =>
      addToast({ type: 'info', message, title }),
    loading: (message: string, title?: string) =>
      addToast({ type: 'loading', message, title, duration: 0 }),
    dismiss: removeToast,
  };
};
