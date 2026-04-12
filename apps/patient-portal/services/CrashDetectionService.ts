// =============================================================================
// ATTENDING AI - Crash Detection Service
// apps/patient-portal/services/CrashDetectionService.ts
//
// Uses device accelerometer to detect significant G-forces indicating
// potential accidents (car crashes, falls, etc.)
// =============================================================================

export interface CrashEvent {
  timestamp: Date;
  magnitude: number; // G-force magnitude
  location?: {
    latitude: number;
    longitude: number;
  };
  triggered: boolean;
}

export interface CrashDetectionConfig {
  enabled: boolean;
  threshold: number; // G-force threshold (default 4G for car crash)
  cooldownMs: number; // Prevent repeated triggers
  countdownSeconds: number; // Time before activating emergency mode
  notifyContacts: boolean;
  autoCall911: boolean;
}

const DEFAULT_CONFIG: CrashDetectionConfig = {
  enabled: false,
  threshold: 4.0, // 4G is typical for a significant car crash
  cooldownMs: 60000, // 1 minute cooldown
  countdownSeconds: 30, // 30 second countdown before activation
  notifyContacts: true,
  autoCall911: false,
};

type CrashCallback = (event: CrashEvent) => void;

class CrashDetectionService {
  private config: CrashDetectionConfig;
  private isMonitoring: boolean = false;
  private lastTriggerTime: number = 0;
  private callbacks: Set<CrashCallback> = new Set();
  private accelerometer: any = null;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  // Load configuration from storage
  private loadConfig() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crash-detection-config');
      if (stored) {
        try {
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch {
          // Use defaults
        }
      }
    }
  }

  // Save configuration
  public saveConfig(config: Partial<CrashDetectionConfig>) {
    this.config = { ...this.config, ...config };
    if (typeof window !== 'undefined') {
      localStorage.setItem('crash-detection-config', JSON.stringify(this.config));
    }
  }

  // Get current configuration
  public getConfig(): CrashDetectionConfig {
    return { ...this.config };
  }

  // Subscribe to crash events
  public subscribe(callback: CrashCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Notify all subscribers
  private notifySubscribers(event: CrashEvent) {
    this.callbacks.forEach(callback => callback(event));
  }

  // Calculate G-force magnitude from acceleration values
  private calculateGForce(x: number, y: number, z: number): number {
    // Remove gravity (approximately 9.8 m/s²)
    const GRAVITY = 9.8;
    const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
    return totalAcceleration / GRAVITY;
  }

  // Check if crash should trigger
  private shouldTrigger(gForce: number): boolean {
    if (!this.config.enabled) return false;
    if (gForce < this.config.threshold) return false;
    
    const now = Date.now();
    if (now - this.lastTriggerTime < this.config.cooldownMs) return false;
    
    return true;
  }

  // Handle accelerometer reading
  private handleAccelerometerReading = async (event: any) => {
    const { x, y, z } = event;
    const gForce = this.calculateGForce(x, y, z);

    if (this.shouldTrigger(gForce)) {
      this.lastTriggerTime = Date.now();

      // Get location if available
      let location;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      } catch {
        // Location not available
      }

      const crashEvent: CrashEvent = {
        timestamp: new Date(),
        magnitude: gForce,
        location,
        triggered: true,
      };

      console.log('⚠️ Crash detected!', crashEvent);
      this.notifySubscribers(crashEvent);
    }
  };

  // Start monitoring for crashes
  public async startMonitoring(): Promise<boolean> {
    if (this.isMonitoring) return true;
    if (!this.config.enabled) return false;

    // Check for accelerometer support
    if (typeof window === 'undefined') return false;

    try {
      // Try to use the Accelerometer API (modern browsers)
      if ('Accelerometer' in window) {
        // Request permission first
        const permissionResult = await navigator.permissions.query({
          name: 'accelerometer' as PermissionName,
        });

        if (permissionResult.state === 'denied') {
          console.warn('Accelerometer permission denied');
          return false;
        }

        // @ts-ignore - Accelerometer API
        this.accelerometer = new Accelerometer({ frequency: 60 });
        this.accelerometer.addEventListener('reading', this.handleAccelerometerReading);
        this.accelerometer.start();
        this.isMonitoring = true;
        console.log('🚗 Crash detection started (Accelerometer API)');
        return true;
      }

      // Fallback to DeviceMotionEvent (older browsers, iOS)
      if ('DeviceMotionEvent' in window) {
        // iOS 13+ requires permission
        // @ts-ignore
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          // @ts-ignore
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission !== 'granted') {
            console.warn('DeviceMotion permission denied');
            return false;
          }
        }

        window.addEventListener('devicemotion', this.handleDeviceMotion);
        this.isMonitoring = true;
        console.log('🚗 Crash detection started (DeviceMotion)');
        return true;
      }

      console.warn('No accelerometer API available');
      return false;
    } catch (error) {
      console.error('Failed to start crash detection:', error);
      return false;
    }
  }

  // Handle DeviceMotionEvent (fallback)
  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    const acceleration = event.accelerationIncludingGravity;
    if (acceleration?.x != null && acceleration?.y != null && acceleration?.z != null) {
      this.handleAccelerometerReading({
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z,
      });
    }
  };

  // Stop monitoring
  public stopMonitoring() {
    if (!this.isMonitoring) return;

    if (this.accelerometer) {
      this.accelerometer.stop();
      this.accelerometer.removeEventListener('reading', this.handleAccelerometerReading);
      this.accelerometer = null;
    }

    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    this.isMonitoring = false;
    console.log('🛑 Crash detection stopped');
  }

  // Check if currently monitoring
  public isActive(): boolean {
    return this.isMonitoring;
  }

  // Manually trigger for testing
  public triggerTest() {
    if (!this.config.enabled) {
      console.warn('Crash detection is disabled');
      return;
    }

    const testEvent: CrashEvent = {
      timestamp: new Date(),
      magnitude: this.config.threshold + 1,
      triggered: true,
    };

    console.log('🧪 Test crash triggered');
    this.notifySubscribers(testEvent);
  }
}

// Singleton instance
export const crashDetectionService = new CrashDetectionService();
export default crashDetectionService;
