// ============================================================
// ATTENDING AI — Crash Detection Service
// apps/mobile/lib/crash/crashDetectionService.ts
//
// State machine:
//   IDLE → MONITORING → IMPACT_DETECTED → STILLNESS_CHECK
//     → COUNTDOWN → ALERTING / CANCELLED
//
// Uses expo-sensors Accelerometer for real-time G-force monitoring.
// ============================================================

import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { AppState, AppStateStatus } from 'react-native';
import type { CrashDetectionSettings } from '../api/emergency';

// ============================================================
// Types
// ============================================================

export type CrashState =
  | 'IDLE'
  | 'MONITORING'
  | 'IMPACT_DETECTED'
  | 'STILLNESS_CHECK'
  | 'COUNTDOWN'
  | 'ALERTING'
  | 'CANCELLED';

export type CrashEvent =
  | { type: 'state_change'; state: CrashState }
  | { type: 'countdown_tick'; remaining: number }
  | { type: 'alert_triggered'; location?: { lat: number; lng: number } };

type CrashListener = (event: CrashEvent) => void;

// ============================================================
// Defaults
// ============================================================

const DEFAULT_SETTINGS: CrashDetectionSettings = {
  enabled: false,
  gForceThreshold: 4.0,
  sensitivityPreset: 'standard',
  activityAware: true,
  ignoreWhileStationary: false,
  countdownSeconds: 30,
  countdownAudio: true,
  countdownHaptic: true,
  alertSiren: true,
  extendedResponseMode: false,
  extendedCountdownSeconds: 60,
  drivingMode: false,
  cyclingMode: false,
  hikingMode: false,
};

const STILLNESS_THRESHOLD_G = 1.2;
const STILLNESS_DURATION_MS = 5000;
const SAMPLE_INTERVAL_MS = 100;

// ============================================================
// Service
// ============================================================

export class CrashDetectionService {
  private state: CrashState = 'IDLE';
  private settings: CrashDetectionSettings = DEFAULT_SETTINGS;
  private listeners: Set<CrashListener> = new Set();
  private subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private stillnessTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private countdownRemaining = 0;
  private stillnessStartedAt = 0;
  private isStill = true;

  getState(): CrashState {
    return this.state;
  }

  updateSettings(settings: CrashDetectionSettings): void {
    this.settings = settings;
  }

  onEvent(listener: CrashListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  start(): void {
    if (this.state !== 'IDLE') return;
    this.setState('MONITORING');

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    this.subscription = Accelerometer.addListener(this.handleAcceleration);

    // Pause when backgrounded to save battery
    this.appStateSubscription = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'background' && this.state === 'MONITORING') {
        this.subscription?.remove();
        this.subscription = null;
      } else if (s === 'active' && this.state === 'MONITORING') {
        if (!this.subscription) {
          this.subscription = Accelerometer.addListener(this.handleAcceleration);
        }
      }
    });
  }

  stop(): void {
    this.cleanup();
    this.setState('IDLE');
  }

  cancel(): void {
    this.cleanup();
    this.setState('CANCELLED');
    // Return to monitoring after cancel
    setTimeout(() => this.start(), 2000);
  }

  private handleAcceleration = (data: AccelerometerMeasurement): void => {
    const totalG = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);

    if (this.state === 'MONITORING') {
      if (totalG > this.settings.gForceThreshold) {
        this.setState('IMPACT_DETECTED');
        this.startStillnessCheck();
      }
    } else if (this.state === 'STILLNESS_CHECK') {
      if (totalG > STILLNESS_THRESHOLD_G) {
        // Movement detected — cancel stillness check
        this.isStill = false;
      }
    }
  };

  private startStillnessCheck(): void {
    this.isStill = true;
    this.stillnessStartedAt = Date.now();
    this.setState('STILLNESS_CHECK');

    this.stillnessTimer = setTimeout(() => {
      if (this.isStill) {
        this.startCountdown();
      } else {
        // Person is moving — false alarm, back to monitoring
        this.setState('MONITORING');
      }
    }, STILLNESS_DURATION_MS);
  }

  private startCountdown(): void {
    this.countdownRemaining = this.settings.countdownSeconds;
    this.setState('COUNTDOWN');
    this.emit({ type: 'countdown_tick', remaining: this.countdownRemaining });

    this.countdownTimer = setInterval(() => {
      this.countdownRemaining--;
      this.emit({ type: 'countdown_tick', remaining: this.countdownRemaining });

      if (this.countdownRemaining <= 0) {
        this.triggerAlert();
      }
    }, 1000);
  }

  private async triggerAlert(): Promise<void> {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    this.setState('ALERTING');

    // Get location if possible
    let location: { lat: number; lng: number } | undefined;
    try {
      const { getCurrentPositionAsync } = await import('expo-location');
      const pos = await getCurrentPositionAsync({ accuracy: 3 }); // Balanced
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch { /* location unavailable */ }

    this.emit({ type: 'alert_triggered', location });
  }

  private setState(state: CrashState): void {
    this.state = state;
    this.emit({ type: 'state_change', state });
  }

  private emit(event: CrashEvent): void {
    this.listeners.forEach((fn) => fn(event));
  }

  private cleanup(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    if (this.stillnessTimer) clearTimeout(this.stillnessTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.stillnessTimer = null;
    this.countdownTimer = null;
  }
}

export const crashDetectionService = new CrashDetectionService();
