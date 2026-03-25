// ============================================================
// Dashboard Layout Sync Service
// apps/provider-portal/lib/dashboardSync.ts
//
// Syncs dashboard layouts across devices via WebSocket
// Provides persistence and cross-device consistency
// ============================================================

import { getConnection, isWebSocketConnected } from './websocket';
import { HubConnectionState } from '@microsoft/signalr';
import { Layouts } from 'react-grid-layout';

// ============================================================
// Types
// ============================================================

export interface LayoutSyncPayload {
  userId: string;
  storageKey: string;
  layouts: Layouts;
  hiddenWidgets: string[];
  timestamp: number;
  deviceId: string;
}

export interface LayoutSyncOptions {
  onSyncReceived?: (payload: LayoutSyncPayload) => void;
  onSyncError?: (error: Error) => void;
  debounceMs?: number;
}

// ============================================================
// Device ID (unique per browser/device)
// ============================================================

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('dashboard-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dashboard-device-id', deviceId);
  }
  return deviceId;
}

// ============================================================
// Layout Sync Service
// ============================================================

class DashboardSyncService {
  private listeners: Map<string, (payload: LayoutSyncPayload) => void> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private initialized = false;

  /**
   * Initialize the sync service (call once on app mount)
   */
  initialize() {
    if (this.initialized) return;
    
    const connection = getConnection();
    if (!connection) {
      console.warn('[DashboardSync] No connection available');
      return;
    }

    // Listen for layout sync events from other devices (PascalCase for SignalR/.NET)
    connection.on('DashboardLayoutSync', (payload: LayoutSyncPayload) => {
      // Ignore updates from this device
      if (payload.deviceId === getDeviceId()) return;

      console.log('[DashboardSync] Received layout sync from another device');

      // Notify all registered listeners
      this.listeners.forEach((callback, key) => {
        if (key === payload.storageKey || key === '*') {
          callback(payload);
        }
      });
    });

    // Listen for layout request (when another device needs current layout)
    connection.on('DashboardLayoutRequest', (data: { storageKey: string; requesterId: string }) => {
      const localLayout = this.getLocalLayout(data.storageKey);
      if (localLayout) {
        this.broadcastLayout(data.storageKey, localLayout.layouts, localLayout.hidden);
      }
    });

    this.initialized = true;
    console.log('[DashboardSync] Service initialized');
  }

  /**
   * Subscribe to layout changes
   */
  subscribe(storageKey: string, callback: (payload: LayoutSyncPayload) => void): () => void {
    this.listeners.set(storageKey, callback);
    return () => this.listeners.delete(storageKey);
  }

  /**
   * Broadcast layout change to other devices
   */
  broadcastLayout(
    storageKey: string,
    layouts: Layouts,
    hiddenWidgets: string[],
    debounceMs = 1000
  ) {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(storageKey);
    if (existingTimer) clearTimeout(existingTimer);

    // Debounce to avoid flooding during resize
    const timer = setTimeout(() => {
      const connection = getConnection();
      if (!connection || !isWebSocketConnected()) {
        console.warn('[DashboardSync] Cannot broadcast - not connected');
        return;
      }

      const payload: LayoutSyncPayload = {
        userId: this.getUserId(),
        storageKey,
        layouts,
        hiddenWidgets,
        timestamp: Date.now(),
        deviceId: getDeviceId(),
      };

      connection.invoke('DashboardLayoutUpdate', payload)
        .catch(err => console.error('[DashboardSync] Broadcast failed:', err));
      console.log('[DashboardSync] Broadcast layout update');
    }, debounceMs);

    this.debounceTimers.set(storageKey, timer);
  }

  /**
   * Request latest layout from other devices
   */
  requestLatestLayout(storageKey: string) {
    const connection = getConnection();
    if (!connection || !isWebSocketConnected()) return;

    connection.invoke('DashboardLayoutRequest', {
      storageKey,
      requesterId: getDeviceId(),
    }).catch(err => console.error('[DashboardSync] Layout request failed:', err));
  }

  /**
   * Get local layout from localStorage
   */
  private getLocalLayout(storageKey: string): { layouts: Layouts; hidden: string[] } | null {
    try {
      const data = localStorage.getItem(`grid-${storageKey}`);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return { layouts: parsed.layouts, hidden: parsed.hidden || [] };
    } catch {
      return null;
    }
  }

  /**
   * Get current user ID
   */
  private getUserId(): string {
    // Try to get from session or fallback
    if (typeof window !== 'undefined') {
      const session = (window as any).__NEXT_DATA__?.props?.pageProps?.session;
      return session?.user?.id || 'anonymous';
    }
    return 'anonymous';
  }
}

// Singleton instance
export const dashboardSync = new DashboardSyncService();

// ============================================================
// React Hook for Dashboard Sync
// ============================================================

import { useEffect, useCallback, useRef } from 'react';

export interface UseDashboardSyncOptions {
  storageKey: string;
  onExternalChange?: (layouts: Layouts, hidden: string[]) => void;
  enabled?: boolean;
}

export function useDashboardSync({
  storageKey,
  onExternalChange,
  enabled = true,
}: UseDashboardSyncOptions) {
  const callbackRef = useRef(onExternalChange);
  callbackRef.current = onExternalChange;

  // Initialize sync service
  useEffect(() => {
    if (!enabled) return;
    dashboardSync.initialize();
  }, [enabled]);

  // Subscribe to external changes
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = dashboardSync.subscribe(storageKey, (payload) => {
      callbackRef.current?.(payload.layouts, payload.hiddenWidgets);
    });

    // Request latest from other devices on mount
    dashboardSync.requestLatestLayout(storageKey);

    return unsubscribe;
  }, [storageKey, enabled]);

  // Broadcast local changes
  const broadcastChange = useCallback(
    (layouts: Layouts, hidden: string[]) => {
      if (!enabled) return;
      dashboardSync.broadcastLayout(storageKey, layouts, hidden);
    },
    [storageKey, enabled]
  );

  return { broadcastChange };
}

export default dashboardSync;
