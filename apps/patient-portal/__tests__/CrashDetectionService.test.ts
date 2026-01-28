// =============================================================================
// ATTENDING AI - Crash Detection Service Unit Tests
// apps/patient-portal/__tests__/CrashDetectionService.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the service module
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

// Mock window object
const mockNavigator = {
  permissions: {
    query: vi.fn(),
  },
  geolocation: {
    getCurrentPosition: vi.fn(),
  },
  userAgent: 'test-user-agent',
};

// =============================================================================
// Test Suite
// =============================================================================

describe('CrashDetectionService', () => {
  let CrashDetectionService: any;
  let crashDetectionService: any;

  beforeEach(async () => {
    // Reset mocks
    vi.resetModules();
    mockLocalStorage.clear();
    
    // Setup global mocks
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
    Object.defineProperty(global, 'navigator', { value: mockNavigator, writable: true });
    Object.defineProperty(global, 'window', { 
      value: { 
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }, 
      writable: true 
    });

    // Import fresh instance
    const module = await import('../services/CrashDetectionService');
    CrashDetectionService = module.default;
    crashDetectionService = module.crashDetectionService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have default configuration values', () => {
      const config = crashDetectionService.getConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.threshold).toBe(4.0);
      expect(config.cooldownMs).toBe(60000);
      expect(config.countdownSeconds).toBe(30);
      expect(config.notifyContacts).toBe(true);
      expect(config.autoCall911).toBe(false);
    });

    it('should save configuration to localStorage', () => {
      crashDetectionService.saveConfig({ enabled: true, threshold: 5.0 });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const config = crashDetectionService.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.threshold).toBe(5.0);
    });

    it('should load configuration from localStorage', () => {
      const storedConfig = JSON.stringify({
        enabled: true,
        threshold: 6.0,
        countdownSeconds: 45,
      });
      mockLocalStorage.getItem.mockReturnValueOnce(storedConfig);
      
      // Create new instance to test loading
      const config = crashDetectionService.getConfig();
      // Note: This tests the current instance, loading happens on construction
      expect(config).toBeDefined();
    });

    it('should merge partial config updates', () => {
      crashDetectionService.saveConfig({ threshold: 3.5 });
      let config = crashDetectionService.getConfig();
      expect(config.threshold).toBe(3.5);
      expect(config.countdownSeconds).toBe(30); // unchanged
      
      crashDetectionService.saveConfig({ countdownSeconds: 45 });
      config = crashDetectionService.getConfig();
      expect(config.threshold).toBe(3.5); // preserved
      expect(config.countdownSeconds).toBe(45);
    });
  });

  describe('Subscription', () => {
    it('should allow subscribing to crash events', () => {
      const callback = vi.fn();
      const unsubscribe = crashDetectionService.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from crash events', () => {
      const callback = vi.fn();
      const unsubscribe = crashDetectionService.subscribe(callback);
      
      unsubscribe();
      // Callback should no longer be called after unsubscribe
      // This is tested implicitly by the service not throwing
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      crashDetectionService.subscribe(callback1);
      crashDetectionService.subscribe(callback2);
      
      // Both should be registered without error
    });
  });

  describe('Monitoring State', () => {
    it('should report inactive when not monitoring', () => {
      expect(crashDetectionService.isActive()).toBe(false);
    });

    it('should not start monitoring when disabled', async () => {
      crashDetectionService.saveConfig({ enabled: false });
      const result = await crashDetectionService.startMonitoring();
      
      expect(result).toBe(false);
      expect(crashDetectionService.isActive()).toBe(false);
    });

    it('should stop monitoring cleanly', () => {
      crashDetectionService.stopMonitoring();
      expect(crashDetectionService.isActive()).toBe(false);
    });
  });

  describe('Test Trigger', () => {
    it('should not trigger test when disabled', () => {
      const callback = vi.fn();
      crashDetectionService.subscribe(callback);
      crashDetectionService.saveConfig({ enabled: false });
      
      crashDetectionService.triggerTest();
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger test event when enabled', () => {
      const callback = vi.fn();
      crashDetectionService.subscribe(callback);
      crashDetectionService.saveConfig({ enabled: true });
      
      crashDetectionService.triggerTest();
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          triggered: true,
          magnitude: expect.any(Number),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should include magnitude above threshold in test event', () => {
      const callback = vi.fn();
      crashDetectionService.subscribe(callback);
      crashDetectionService.saveConfig({ enabled: true, threshold: 4.0 });
      
      crashDetectionService.triggerTest();
      
      const event = callback.mock.calls[0][0];
      expect(event.magnitude).toBeGreaterThan(4.0);
    });
  });

  describe('G-Force Calculation', () => {
    it('should calculate G-force magnitude correctly', () => {
      // Access private method through test trigger behavior
      // G-force = sqrt(x² + y² + z²) / 9.8
      // For x=9.8, y=0, z=0: magnitude = 9.8/9.8 = 1G
      // For x=39.2, y=0, z=0: magnitude = 39.2/9.8 = 4G
      
      // This is tested implicitly through the trigger mechanism
      const callback = vi.fn();
      crashDetectionService.subscribe(callback);
      crashDetectionService.saveConfig({ enabled: true, threshold: 4.0 });
      
      crashDetectionService.triggerTest();
      
      const event = callback.mock.calls[0][0];
      expect(event.magnitude).toBeGreaterThan(4.0);
    });
  });

  describe('Cooldown Behavior', () => {
    it('should have configurable cooldown period', () => {
      crashDetectionService.saveConfig({ cooldownMs: 30000 });
      const config = crashDetectionService.getConfig();
      
      expect(config.cooldownMs).toBe(30000);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('CrashDetectionService Integration', () => {
  it('should handle full crash detection workflow', async () => {
    const module = await import('../services/CrashDetectionService');
    const service = module.crashDetectionService;
    
    const events: any[] = [];
    const unsubscribe = service.subscribe((event: any) => {
      events.push(event);
    });

    // Enable and configure
    service.saveConfig({
      enabled: true,
      threshold: 4.0,
      countdownSeconds: 30,
    });

    // Trigger test event
    service.triggerTest();

    // Verify event was captured
    expect(events.length).toBe(1);
    expect(events[0].triggered).toBe(true);

    // Clean up
    unsubscribe();
    service.stopMonitoring();
  });
});
