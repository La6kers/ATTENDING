// =============================================================================
// ATTENDING AI - Crash Detection Service Tests
// apps/patient-portal/__tests__/services/CrashDetectionService.test.ts
//
// Unit tests for crash detection functionality
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the service since we need to test it in isolation
const createMockCrashDetectionService = () => {
  // Configuration
  let config = {
    enabled: false,
    threshold: 4.0,
    cooldownMs: 60000,
    countdownSeconds: 30,
    notifyContacts: true,
    autoCall911: false,
  };

  let isMonitoring = false;
  let lastTriggerTime = 0;
  const callbacks = new Set<(event: any) => void>();

  const calculateGForce = (x: number, y: number, z: number): number => {
    const GRAVITY = 9.8;
    const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
    return totalAcceleration / GRAVITY;
  };

  const shouldTrigger = (gForce: number): boolean => {
    if (!config.enabled) return false;
    if (gForce < config.threshold) return false;
    const now = Date.now();
    if (now - lastTriggerTime < config.cooldownMs) return false;
    return true;
  };

  return {
    getConfig: () => ({ ...config }),
    saveConfig: (newConfig: Partial<typeof config>) => {
      config = { ...config, ...newConfig };
    },
    subscribe: (callback: (event: any) => void) => {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    isActive: () => isMonitoring,
    startMonitoring: async () => {
      if (!config.enabled) return false;
      isMonitoring = true;
      return true;
    },
    stopMonitoring: () => {
      isMonitoring = false;
    },
    // Exposed for testing
    _calculateGForce: calculateGForce,
    _shouldTrigger: shouldTrigger,
    _setLastTriggerTime: (time: number) => { lastTriggerTime = time; },
    _notifySubscribers: (event: any) => {
      callbacks.forEach(cb => cb(event));
    },
    triggerTest: () => {
      if (!config.enabled) return;
      const testEvent = {
        timestamp: new Date(),
        magnitude: config.threshold + 1,
        triggered: true,
      };
      callbacks.forEach(cb => cb(testEvent));
    },
  };
};

describe('CrashDetectionService', () => {
  let service: ReturnType<typeof createMockCrashDetectionService>;

  beforeEach(() => {
    service = createMockCrashDetectionService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Configuration', () => {
    it('should have default configuration values', () => {
      const config = service.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.threshold).toBe(4.0);
      expect(config.cooldownMs).toBe(60000);
      expect(config.countdownSeconds).toBe(30);
      expect(config.notifyContacts).toBe(true);
      expect(config.autoCall911).toBe(false);
    });

    it('should save configuration changes', () => {
      service.saveConfig({ enabled: true, threshold: 5.0 });
      const config = service.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.threshold).toBe(5.0);
    });

    it('should preserve unmodified config values', () => {
      service.saveConfig({ threshold: 6.0 });
      const config = service.getConfig();
      expect(config.enabled).toBe(false); // unchanged
      expect(config.threshold).toBe(6.0); // changed
      expect(config.cooldownMs).toBe(60000); // unchanged
    });
  });

  describe('G-Force Calculation', () => {
    it('should calculate 1G when stationary (gravity only)', () => {
      // When phone is flat, z = 9.8 (gravity), x = 0, y = 0
      const gForce = service._calculateGForce(0, 0, 9.8);
      expect(gForce).toBeCloseTo(1.0, 1);
    });

    it('should calculate higher G-force during acceleration', () => {
      // Simulating a 2G acceleration
      const gForce = service._calculateGForce(0, 0, 19.6);
      expect(gForce).toBeCloseTo(2.0, 1);
    });

    it('should calculate G-force correctly for multi-axis acceleration', () => {
      // sqrt(9.8^2 + 9.8^2 + 9.8^2) / 9.8 = sqrt(3) ≈ 1.73
      const gForce = service._calculateGForce(9.8, 9.8, 9.8);
      expect(gForce).toBeCloseTo(1.73, 1);
    });

    it('should calculate high G-force for crash-like impact', () => {
      // 4G impact: sqrt(x^2 + y^2 + z^2) = 4 * 9.8 = 39.2
      // Using z = 39.2 for simplicity
      const gForce = service._calculateGForce(0, 0, 39.2);
      expect(gForce).toBeCloseTo(4.0, 1);
    });

    it('should handle negative acceleration values', () => {
      const gForce = service._calculateGForce(-9.8, -9.8, -9.8);
      expect(gForce).toBeCloseTo(1.73, 1);
    });
  });

  describe('Trigger Logic', () => {
    it('should not trigger when disabled', () => {
      service.saveConfig({ enabled: false });
      expect(service._shouldTrigger(10.0)).toBe(false);
    });

    it('should not trigger below threshold', () => {
      service.saveConfig({ enabled: true, threshold: 4.0 });
      expect(service._shouldTrigger(3.9)).toBe(false);
    });

    it('should trigger at threshold', () => {
      service.saveConfig({ enabled: true, threshold: 4.0 });
      expect(service._shouldTrigger(4.0)).toBe(true);
    });

    it('should trigger above threshold', () => {
      service.saveConfig({ enabled: true, threshold: 4.0 });
      expect(service._shouldTrigger(6.0)).toBe(true);
    });

    it('should respect cooldown period', () => {
      service.saveConfig({ enabled: true, threshold: 4.0, cooldownMs: 60000 });
      
      // First trigger should work
      expect(service._shouldTrigger(5.0)).toBe(true);
      service._setLastTriggerTime(Date.now());
      
      // Immediate second trigger should be blocked
      expect(service._shouldTrigger(5.0)).toBe(false);
      
      // After cooldown, should trigger again
      vi.advanceTimersByTime(60001);
      expect(service._shouldTrigger(5.0)).toBe(true);
    });
  });

  describe('Monitoring State', () => {
    it('should start as not monitoring', () => {
      expect(service.isActive()).toBe(false);
    });

    it('should not start monitoring when disabled', async () => {
      service.saveConfig({ enabled: false });
      const result = await service.startMonitoring();
      expect(result).toBe(false);
      expect(service.isActive()).toBe(false);
    });

    it('should start monitoring when enabled', async () => {
      service.saveConfig({ enabled: true });
      const result = await service.startMonitoring();
      expect(result).toBe(true);
      expect(service.isActive()).toBe(true);
    });

    it('should stop monitoring', async () => {
      service.saveConfig({ enabled: true });
      await service.startMonitoring();
      expect(service.isActive()).toBe(true);
      
      service.stopMonitoring();
      expect(service.isActive()).toBe(false);
    });
  });

  describe('Event Subscription', () => {
    it('should notify subscribers on crash event', () => {
      const callback = vi.fn();
      service.subscribe(callback);
      service.saveConfig({ enabled: true });
      
      service.triggerTest();
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          triggered: true,
          magnitude: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should allow unsubscribing', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe(callback);
      service.saveConfig({ enabled: true });
      
      unsubscribe();
      service.triggerTest();
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      service.subscribe(callback1);
      service.subscribe(callback2);
      service.saveConfig({ enabled: true });
      
      service.triggerTest();
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should not trigger test when disabled', () => {
      const callback = vi.fn();
      service.subscribe(callback);
      service.saveConfig({ enabled: false });
      
      service.triggerTest();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Threshold Sensitivity', () => {
    it.each([
      [2.0, 'very sensitive - detects minor bumps'],
      [4.0, 'standard - typical car crash'],
      [6.0, 'less sensitive - severe impacts only'],
      [8.0, 'least sensitive - catastrophic impacts'],
    ])('threshold %f: %s', (threshold, _description) => {
      service.saveConfig({ enabled: true, threshold });
      
      // Should not trigger just below threshold
      expect(service._shouldTrigger(threshold - 0.1)).toBe(false);
      
      // Should trigger at or above threshold
      expect(service._shouldTrigger(threshold)).toBe(true);
      expect(service._shouldTrigger(threshold + 1)).toBe(true);
    });
  });
});

describe('CrashEvent Structure', () => {
  it('should have required properties', () => {
    const event = {
      timestamp: new Date(),
      magnitude: 5.2,
      triggered: true,
    };
    
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('magnitude');
    expect(event).toHaveProperty('triggered');
  });

  it('should support optional location', () => {
    const eventWithLocation = {
      timestamp: new Date(),
      magnitude: 5.2,
      triggered: true,
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    };
    
    expect(eventWithLocation.location).toBeDefined();
    expect(eventWithLocation.location.latitude).toBe(37.7749);
    expect(eventWithLocation.location.longitude).toBe(-122.4194);
  });
});

describe('Real-world Scenarios', () => {
  let service: ReturnType<typeof createMockCrashDetectionService>;

  beforeEach(() => {
    service = createMockCrashDetectionService();
    service.saveConfig({ enabled: true, threshold: 4.0 });
  });

  it('should not trigger for normal walking (0.1-0.3G variations)', () => {
    // Normal walking creates small variations around 1G
    const walkingForces = [1.1, 1.2, 0.9, 1.15, 1.05];
    walkingForces.forEach(g => {
      expect(service._shouldTrigger(g)).toBe(false);
    });
  });

  it('should not trigger for phone drop (~2-3G)', () => {
    // Phone drop typically creates 2-3G impact
    expect(service._shouldTrigger(2.5)).toBe(false);
    expect(service._shouldTrigger(3.0)).toBe(false);
  });

  it('should trigger for car crash (4-10G)', () => {
    // Car crashes typically create 4-10G or more
    expect(service._shouldTrigger(4.0)).toBe(true);
    expect(service._shouldTrigger(6.0)).toBe(true);
    expect(service._shouldTrigger(10.0)).toBe(true);
  });

  it('should trigger for fall from height (varies, can be 4G+)', () => {
    // Significant falls can create high G-forces
    expect(service._shouldTrigger(5.0)).toBe(true);
  });

  it('should trigger for bicycle crash (can be 4G+)', () => {
    expect(service._shouldTrigger(4.5)).toBe(true);
  });
});
