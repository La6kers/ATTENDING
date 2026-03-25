// ============================================================
// COMPASS - PWA Hooks
// apps/patient-portal/hooks/usePWA.ts
//
// React hooks for PWA functionality including:
// - Service worker registration
// - Install prompt handling
// - Update notifications
// - Offline status
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '../lib/offline/syncManager';
import { getStorageStats, type StorageStats } from '../lib/offline/indexedDB';

// ============================================================
// SERVICE WORKER HOOK
// ============================================================

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, hasUpdate: true }));
            }
          });
        });

        // Check immediately if there's an update waiting
        if (registration.waiting) {
          setState((prev) => ({ ...prev, hasUpdate: true }));
        }

      } catch (error) {
        console.error('[usePWA] Service worker registration failed:', error);
        setState((prev) => ({ ...prev, error: error as Error }));
      }
    };

    registerServiceWorker();

    // Listen for controller changes (new service worker took over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

  }, []);

  const updateServiceWorker = useCallback(async () => {
    if (!state.registration?.waiting) return;

    setState((prev) => ({ ...prev, isUpdating: true }));

    // Tell the waiting service worker to skip waiting
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

  }, [state.registration]);

  const checkForUpdates = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
    } catch (error) {
      console.error('[usePWA] Update check failed:', error);
    }
  }, [state.registration]);

  return {
    ...state,
    updateServiceWorker,
    checkForUpdates,
  };
}

// ============================================================
// INSTALL PROMPT HOOK
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  installOutcome: 'accepted' | 'dismissed' | null;
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    canInstall: false,
    isInstalled: false,
    isInstalling: false,
    installOutcome: null,
  });

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      
      if (isStandalone || isIosStandalone) {
        setState((prev) => ({ ...prev, isInstalled: true }));
      }
    };

    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setState((prev) => ({
        ...prev,
        canInstall: false,
        isInstalled: true,
        isInstalling: false,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPromptRef.current) {
      console.warn('[usePWA] No install prompt available');
      return false;
    }

    setState((prev) => ({ ...prev, isInstalling: true }));

    try {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      setState((prev) => ({
        ...prev,
        isInstalling: false,
        installOutcome: outcome,
        canInstall: outcome === 'dismissed', // Can try again if dismissed
      }));

      if (outcome === 'accepted') {
        deferredPromptRef.current = null;
      }

      return outcome === 'accepted';
    } catch (error) {
      console.error('[usePWA] Install prompt failed:', error);
      setState((prev) => ({ ...prev, isInstalling: false }));
      return false;
    }
  }, []);

  return {
    ...state,
    promptInstall,
  };
}

// ============================================================
// ONLINE STATUS HOOK
// ============================================================

interface OnlineState {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
}

export function useOnlineStatus() {
  const [state, setState] = useState<OnlineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline,
        lastOnlineAt: new Date(),
      }));
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return state;
}

// ============================================================
// SYNC STATUS HOOK
// ============================================================

interface SyncState {
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  pendingCount: number;
  lastSyncAt: Date | null;
  error: string | null;
}

export function useSyncStatus() {
  const [state, setState] = useState<SyncState>({
    status: 'idle',
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((event) => {
      switch (event.type) {
        case 'sync-start':
          setState((prev) => ({
            ...prev,
            status: 'syncing',
            error: null,
          }));
          break;

        case 'sync-complete':
          const result = event.data as { synced: number; failed: number };
          setState((prev) => ({
            ...prev,
            status: result.failed > 0 ? 'failed' : 'completed',
            pendingCount: result.failed,
            lastSyncAt: new Date(),
          }));
          break;

        case 'sync-error':
          const errorData = event.data as { error: string };
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: errorData.error,
          }));
          break;
      }
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    return syncManager.forcSync();
  }, []);

  return {
    ...state,
    triggerSync,
  };
}

// ============================================================
// STORAGE STATS HOOK
// ============================================================

export function useStorageStats() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const storageStats = await getStorageStats();
        setStats(storageStats);
      } catch (error) {
        console.error('[usePWA] Failed to load storage stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Refresh stats periodically
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    const storageStats = await getStorageStats();
    setStats(storageStats);
  }, []);

  return { stats, loading, refresh };
}

// ============================================================
// COMBINED PWA HOOK
// ============================================================

export function usePWA() {
  const serviceWorker = useServiceWorker();
  const installPrompt = useInstallPrompt();
  const onlineStatus = useOnlineStatus();
  const syncStatus = useSyncStatus();
  const storageStats = useStorageStats();

  return {
    serviceWorker,
    installPrompt,
    onlineStatus,
    syncStatus,
    storageStats,
  };
}

export default usePWA;
