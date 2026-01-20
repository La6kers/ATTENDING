// ============================================================
// Dashboard State Hook
// apps/provider-portal/hooks/useDashboard.ts
//
// Centralized hook for managing dashboard state including:
// - Enabled/disabled widgets
// - Layout persistence
// - Auto-refresh intervals
// - Cross-device sync
// ============================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Layouts } from 'react-grid-layout';
import { 
  DASHBOARD_WIDGETS, 
  getDefaultEnabledWidgets,
  WidgetConfig,
  getAllWidgets 
} from '@/lib/dashboardWidgets';
import { useDashboardSync } from '@/lib/dashboardSync';

// ============================================================
// Types
// ============================================================

export interface DashboardState {
  enabledWidgetIds: string[];
  layouts: Layouts | null;
  isLocked: boolean;
  isCustomizerOpen: boolean;
}

export interface UseDashboardOptions {
  storageKey: string;
  enableSync?: boolean;
  onLayoutChange?: (layouts: Layouts, hidden: string[]) => void;
}

export interface UseDashboardReturn {
  // State
  enabledWidgetIds: string[];
  layouts: Layouts | null;
  isLocked: boolean;
  isCustomizerOpen: boolean;
  syncConnected: boolean;
  
  // Derived
  enabledWidgets: WidgetConfig[];
  hiddenWidgets: WidgetConfig[];
  
  // Actions
  toggleWidget: (widgetId: string) => void;
  setLayouts: (layouts: Layouts) => void;
  setIsLocked: (locked: boolean) => void;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  resetLayout: () => void;
  resetWidgets: () => void;
  
  // Handlers for grid
  handleLayoutChange: (layouts: Layouts, hidden: string[]) => void;
}

// ============================================================
// Storage Helpers
// ============================================================

const STORAGE_VERSION = '1.0';

interface StoredDashboardState {
  version: string;
  enabledWidgetIds: string[];
  timestamp: number;
}

function loadStoredState(key: string): StoredDashboardState | null {
  try {
    const data = localStorage.getItem(`dashboard-state-${key}`);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed.version !== STORAGE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredState(key: string, state: Omit<StoredDashboardState, 'version' | 'timestamp'>): void {
  try {
    const data: StoredDashboardState = {
      version: STORAGE_VERSION,
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(`dashboard-state-${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================
// Main Hook
// ============================================================

export function useDashboard(options: UseDashboardOptions): UseDashboardReturn {
  const { storageKey, enableSync = true, onLayoutChange } = options;
  
  // Initialize enabled widgets from storage or defaults
  const [enabledWidgetIds, setEnabledWidgetIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return getDefaultEnabledWidgets().map(w => w.id);
    }
    const stored = loadStoredState(storageKey);
    return stored?.enabledWidgetIds ?? getDefaultEnabledWidgets().map(w => w.id);
  });
  
  const [layouts, setLayouts] = useState<Layouts | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [syncConnected, setSyncConnected] = useState(false);
  
  // Ref for refresh intervals
  const refreshIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  
  // Dashboard sync hook
  const { broadcastChange } = useDashboardSync({
    storageKey,
    onExternalChange: (newLayouts, hidden) => {
      setLayouts(newLayouts);
      // Update enabled widgets based on hidden
      const allIds = getAllWidgets().map(w => w.id);
      const newEnabled = allIds.filter(id => !hidden.includes(id));
      setEnabledWidgetIds(newEnabled);
    },
    enabled: enableSync,
  });
  
  // Persist enabled widgets to storage
  useEffect(() => {
    saveStoredState(storageKey, { enabledWidgetIds });
  }, [storageKey, enabledWidgetIds]);
  
  // Setup auto-refresh intervals for widgets
  useEffect(() => {
    // Clear existing intervals
    refreshIntervalsRef.current.forEach(interval => clearInterval(interval));
    refreshIntervalsRef.current.clear();
    
    // Setup new intervals for enabled widgets with refresh
    enabledWidgetIds.forEach(id => {
      const widget = DASHBOARD_WIDGETS[id];
      if (widget?.refreshInterval && widget.refreshInterval > 0) {
        const interval = setInterval(() => {
          // Trigger refresh by updating a key or dispatching event
          window.dispatchEvent(new CustomEvent('widget:refresh', { detail: { widgetId: id } }));
        }, widget.refreshInterval);
        refreshIntervalsRef.current.set(id, interval);
      }
    });
    
    return () => {
      refreshIntervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, [enabledWidgetIds]);
  
  // Derived state
  const enabledWidgets = useMemo(() => 
    enabledWidgetIds
      .map(id => DASHBOARD_WIDGETS[id])
      .filter(Boolean),
    [enabledWidgetIds]
  );
  
  const hiddenWidgets = useMemo(() => 
    getAllWidgets().filter(w => !enabledWidgetIds.includes(w.id)),
    [enabledWidgetIds]
  );
  
  // Actions
  const toggleWidget = useCallback((widgetId: string) => {
    setEnabledWidgetIds(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      }
      return [...prev, widgetId];
    });
  }, []);
  
  const openCustomizer = useCallback(() => setIsCustomizerOpen(true), []);
  const closeCustomizer = useCallback(() => setIsCustomizerOpen(false), []);
  
  const resetLayout = useCallback(() => {
    // Reset layouts to defaults - this will be handled by the grid component
    setLayouts(null);
    localStorage.removeItem(`grid-${storageKey}`);
  }, [storageKey]);
  
  const resetWidgets = useCallback(() => {
    const defaultIds = getDefaultEnabledWidgets().map(w => w.id);
    setEnabledWidgetIds(defaultIds);
  }, []);
  
  // Handler for grid layout changes
  const handleLayoutChange = useCallback((newLayouts: Layouts, hidden: string[]) => {
    setLayouts(newLayouts);
    
    // Update enabled widgets based on hidden
    const allIds = getAllWidgets().map(w => w.id);
    const newEnabled = allIds.filter(id => !hidden.includes(id));
    setEnabledWidgetIds(newEnabled);
    
    // Broadcast to other devices
    if (enableSync) {
      broadcastChange(newLayouts, hidden);
    }
    
    // Call prop callback
    onLayoutChange?.(newLayouts, hidden);
  }, [enableSync, broadcastChange, onLayoutChange]);
  
  return {
    // State
    enabledWidgetIds,
    layouts,
    isLocked,
    isCustomizerOpen,
    syncConnected,
    
    // Derived
    enabledWidgets,
    hiddenWidgets,
    
    // Actions
    toggleWidget,
    setLayouts,
    setIsLocked,
    openCustomizer,
    closeCustomizer,
    resetLayout,
    resetWidgets,
    
    // Handlers
    handleLayoutChange,
  };
}

export default useDashboard;
