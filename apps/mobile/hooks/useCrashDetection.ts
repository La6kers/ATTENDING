// ============================================================
// ATTENDING AI — useCrashDetection Hook
// apps/mobile/hooks/useCrashDetection.ts
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { crashDetectionService, type CrashState, type CrashEvent } from '../lib/crash/crashDetectionService';
import { emergencyApi, type CrashDetectionSettings } from '../lib/api/emergency';

interface UseCrashDetection {
  state: CrashState;
  countdownRemaining: number;
  isMonitoring: boolean;
  settings: CrashDetectionSettings | null;
  enable: () => void;
  disable: () => void;
  cancel: () => void;
}

export function useCrashDetection(): UseCrashDetection {
  const [state, setState] = useState<CrashState>(crashDetectionService.getState());
  const [countdown, setCountdown] = useState(0);
  const [settings, setSettings] = useState<CrashDetectionSettings | null>(null);
  const alertHandledRef = useRef(false);

  useEffect(() => {
    // Load settings
    emergencyApi.getCrashSettings().then((result) => {
      if (result.ok && result.data) {
        setSettings(result.data);
        crashDetectionService.updateSettings(result.data);
        if (result.data.enabled) {
          crashDetectionService.start();
        }
      }
    });

    const unsubscribe = crashDetectionService.onEvent((event: CrashEvent) => {
      if (event.type === 'state_change') {
        setState(event.state);
      } else if (event.type === 'countdown_tick') {
        setCountdown(event.remaining);
      } else if (event.type === 'alert_triggered' && !alertHandledRef.current) {
        alertHandledRef.current = true;
        // Notify emergency contacts via API
        emergencyApi.notifyContacts({
          patientId: 'self',
          eventType: 'crash',
          location: event.location,
        }).finally(() => {
          alertHandledRef.current = false;
        });
      }
    });

    return unsubscribe;
  }, []);

  const enable = useCallback(() => {
    crashDetectionService.start();
  }, []);

  const disable = useCallback(() => {
    crashDetectionService.stop();
  }, []);

  const cancel = useCallback(() => {
    crashDetectionService.cancel();
    setCountdown(0);
  }, []);

  return {
    state,
    countdownRemaining: countdown,
    isMonitoring: state === 'MONITORING',
    settings,
    enable,
    disable,
    cancel,
  };
}
