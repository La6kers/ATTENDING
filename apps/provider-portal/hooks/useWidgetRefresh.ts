// ============================================================
// Widget Refresh Hook
// apps/provider-portal/hooks/useWidgetRefresh.ts
//
// Hook for widgets to listen for auto-refresh events
// ============================================================

import { useEffect, useCallback, useRef } from 'react';

interface UseWidgetRefreshOptions {
  widgetId: string;
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
}

/**
 * Hook for widgets to subscribe to auto-refresh events
 * 
 * @example
 * ```tsx
 * function PatientQueue() {
 *   const { data, refetch } = useQuery(...);
 *   
 *   useWidgetRefresh({
 *     widgetId: 'patientQueue',
 *     onRefresh: refetch,
 *   });
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWidgetRefresh({
  widgetId,
  onRefresh,
  enabled = true,
}: UseWidgetRefreshOptions): void {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const handleRefreshEvent = useCallback((event: CustomEvent<{ widgetId: string }>) => {
    if (event.detail.widgetId === widgetId) {
      onRefreshRef.current();
    }
  }, [widgetId]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('widget:refresh', handleRefreshEvent as EventListener);
    
    return () => {
      window.removeEventListener('widget:refresh', handleRefreshEvent as EventListener);
    };
  }, [enabled, handleRefreshEvent]);
}

/**
 * Manually trigger a widget refresh
 */
export function triggerWidgetRefresh(widgetId: string): void {
  window.dispatchEvent(
    new CustomEvent('widget:refresh', { detail: { widgetId } })
  );
}

/**
 * Trigger refresh for all widgets
 */
export function triggerAllWidgetsRefresh(): void {
  window.dispatchEvent(
    new CustomEvent('widget:refresh', { detail: { widgetId: '*' } })
  );
}

export default useWidgetRefresh;
