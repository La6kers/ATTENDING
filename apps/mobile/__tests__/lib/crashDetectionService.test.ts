// ============================================================
// ATTENDING AI — Crash Detection Service Tests
// ============================================================

import { CrashDetectionService, type CrashState, type CrashEvent } from '../../lib/crash/crashDetectionService';
import { Accelerometer } from 'expo-sensors';

describe('CrashDetectionService', () => {
  let service: CrashDetectionService;
  let events: CrashEvent[];
  let accelerometerCallback: ((data: { x: number; y: number; z: number }) => void) | null;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CrashDetectionService();
    events = [];
    accelerometerCallback = null;

    // Capture the listener callback
    (Accelerometer.addListener as jest.Mock).mockImplementation((cb) => {
      accelerometerCallback = cb;
      return { remove: jest.fn() };
    });

    service.onEvent((event) => events.push(event));
  });

  afterEach(() => {
    service.stop();
  });

  it('starts in IDLE state', () => {
    expect(service.getState()).toBe('IDLE');
  });

  it('transitions to MONITORING on start', () => {
    service.start();
    expect(service.getState()).toBe('MONITORING');
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(100);
    expect(Accelerometer.addListener).toHaveBeenCalled();
  });

  it('transitions to IMPACT_DETECTED on high G-force', () => {
    service.start();
    expect(accelerometerCallback).not.toBeNull();

    // Simulate a 5G impact
    accelerometerCallback!({ x: 3, y: 3, z: 2.5 }); // sqrt(9+9+6.25) ≈ 4.92G

    expect(service.getState()).toBe('STILLNESS_CHECK');
    const stateChanges = events.filter((e) => e.type === 'state_change');
    expect(stateChanges).toContainEqual({ type: 'state_change', state: 'IMPACT_DETECTED' });
  });

  it('does NOT trigger on normal acceleration', () => {
    service.start();
    // Normal gravity: ~1G
    accelerometerCallback!({ x: 0, y: 0, z: 1 });
    expect(service.getState()).toBe('MONITORING');
  });

  it('transitions back to IDLE on stop', () => {
    service.start();
    service.stop();
    expect(service.getState()).toBe('IDLE');
  });

  it('transitions to CANCELLED on cancel', () => {
    service.start();
    accelerometerCallback!({ x: 3, y: 3, z: 2.5 });
    service.cancel();
    expect(service.getState()).toBe('CANCELLED');
  });

  it('uses custom G-force threshold from settings', () => {
    service.updateSettings({
      enabled: true,
      gForceThreshold: 8.0,
      sensitivityPreset: 'low',
      activityAware: false,
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
    });

    service.start();
    // 5G should NOT trigger with 8G threshold
    accelerometerCallback!({ x: 3, y: 3, z: 2.5 });
    expect(service.getState()).toBe('MONITORING');
  });
});
