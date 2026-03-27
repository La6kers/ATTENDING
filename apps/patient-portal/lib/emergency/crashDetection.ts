// =============================================================================
// ATTENDING AI — Crash Detection (Patent 12: Emergency Access)
// apps/patient-portal/lib/emergency/crashDetection.ts
//
// Monitors device accelerometer via DeviceMotionEvent API to detect
// high-G impacts (vehicle crashes, falls). On detection, triggers a
// consent countdown — if the patient doesn't cancel within the timeout,
// emergency access is granted to first responders.
//
// Backend entities: EmergencyAccessProfile, EmergencyAccessLog
// =============================================================================

export interface CrashDetectionConfig {
  /** G-force threshold to trigger crash detection (default: 4.0G) */
  gForceThreshold: number;
  /** Seconds to wait before auto-granting emergency access (default: 30) */
  autoGrantTimeoutSeconds: number;
  /** Callback when a crash is detected */
  onCrashDetected: (peakGForce: number) => void;
  /** Callback when the countdown expires and access is auto-granted */
  onAutoGrant: (peakGForce: number) => void;
  /** Callback when the user cancels during countdown */
  onCancelled: () => void;
}

const DEFAULT_CONFIG: CrashDetectionConfig = {
  gForceThreshold: 4.0,
  autoGrantTimeoutSeconds: 30,
  onCrashDetected: () => {},
  onAutoGrant: () => {},
  onCancelled: () => {},
};

// Standard gravity in m/s²
const GRAVITY = 9.81;

// Debounce: ignore repeated triggers within this window (ms)
const TRIGGER_COOLDOWN_MS = 60_000;

export class CrashDetector {
  private config: CrashDetectionConfig;
  private isListening = false;
  private countdownTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTriggerTime = 0;
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null;

  constructor(config: Partial<CrashDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Check if the DeviceMotion API is available */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  /** Request permission (required on iOS 13+) and start listening */
  async start(): Promise<boolean> {
    if (!CrashDetector.isSupported()) {
      console.warn('[CrashDetector] DeviceMotionEvent not supported on this device');
      return false;
    }

    // iOS 13+ requires explicit permission
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      'requestPermission' in DeviceMotionEvent &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('[CrashDetector] Motion permission denied');
          return false;
        }
      } catch {
        console.warn('[CrashDetector] Failed to request motion permission');
        return false;
      }
    }

    this.motionHandler = this.handleMotion.bind(this);
    window.addEventListener('devicemotion', this.motionHandler);
    this.isListening = true;
    console.log('[CrashDetector] Started monitoring (threshold: ' +
      this.config.gForceThreshold + 'G)');
    return true;
  }

  /** Stop listening for motion events and cancel any pending countdown */
  stop(): void {
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
    this.cancelCountdown();
    this.isListening = false;
  }

  /** Cancel an in-progress countdown (user responded — they're OK) */
  cancelCountdown(): void {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
      this.config.onCancelled();
    }
  }

  /** Update configuration (e.g., after fetching profile from backend) */
  updateConfig(config: Partial<CrashDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  get listening(): boolean {
    return this.isListening;
  }

  // ── Internal ──────────────────────────────────────────────

  private handleMotion(event: DeviceMotionEvent): void {
    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

    // Calculate total G-force magnitude
    const totalAccel = Math.sqrt(
      accel.x * accel.x +
      accel.y * accel.y +
      accel.z * accel.z
    );
    const gForce = totalAccel / GRAVITY;

    if (gForce >= this.config.gForceThreshold) {
      const now = Date.now();
      // Debounce: ignore if we triggered recently
      if (now - this.lastTriggerTime < TRIGGER_COOLDOWN_MS) return;
      this.lastTriggerTime = now;

      console.warn(`[CrashDetector] Impact detected: ${gForce.toFixed(1)}G ` +
        `(threshold: ${this.config.gForceThreshold}G)`);

      this.config.onCrashDetected(gForce);
      this.startCountdown(gForce);
    }
  }

  private startCountdown(peakGForce: number): void {
    // Cancel any existing countdown
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
    }

    this.countdownTimer = setTimeout(() => {
      this.countdownTimer = null;
      // Patient did not respond — auto-grant emergency access
      this.config.onAutoGrant(peakGForce);

      // Call backend to create emergency access log
      this.grantEmergencyAccess(peakGForce).catch(err => {
        console.error('[CrashDetector] Failed to grant emergency access:', err);
      });
    }, this.config.autoGrantTimeoutSeconds * 1000);
  }

  private async grantEmergencyAccess(peakGForce: number): Promise<void> {
    try {
      const response = await fetch('/api/emergency/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentMethod: 'AutoGrantTimeout',
          peakGForce: Math.round(peakGForce * 10) / 10,
          detectedAt: new Date().toISOString(),
          deviceInfo: navigator.userAgent,
          location: await this.getLocation(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Emergency access API returned ${response.status}`);
      }
    } catch (err) {
      console.error('[CrashDetector] Emergency access grant failed:', err);
      throw err;
    }
  }

  private getLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        () => resolve(null),
        { timeout: 5000, maximumAge: 30000 }
      );
    });
  }
}
