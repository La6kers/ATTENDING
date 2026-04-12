// ============================================================
// ATTENDING AI — useOffline Hook
// apps/mobile/hooks/useOffline.ts
//
// Monitors network connectivity via NetInfo.
// Triggers sync on reconnect.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { mobileSyncManager } from '../lib/offline/mobileSyncManager';

interface UseOffline {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

export function useOffline(): UseOffline {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setIsInternetReachable(state.isInternetReachable);

      if (!connected) {
        setWasOffline(true);
      } else if (wasOffline) {
        // Reconnected — trigger sync
        setWasOffline(false);
        mobileSyncManager.syncAll();
      }
    });

    return unsubscribe;
  }, [wasOffline]);

  useEffect(() => {
    const unsubscribe = mobileSyncManager.onEvent((event) => {
      if (event.type === 'sync-start') setIsSyncing(true);
      if (event.type === 'sync-complete' || event.type === 'sync-error') setIsSyncing(false);
    });
    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    await mobileSyncManager.syncAll();
  }, []);

  return { isConnected, isInternetReachable, isSyncing, triggerSync };
}
