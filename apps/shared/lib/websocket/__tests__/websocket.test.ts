// =============================================================================
// ATTENDING AI - WebSocket Tests
// apps/shared/lib/websocket/__tests__/websocket.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketClient } from '../WebSocketClient';
import type { WebSocketMessage, AssessmentQueueEvent, EmergencyAlertEvent } from '../types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code || 1000, reason: reason || '' });
  });

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient({
      url: 'ws://localhost:3003',
      maxReconnectAttempts: 3,
      reconnectDelay: 100,
      heartbeatInterval: 1000,
      connectionTimeout: 5000,
      debug: false,
    });
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('connects successfully', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      expect(client.isConnected()).toBe(true);
      expect(client.getState().status).toBe('connected');
    });

    it('sets connection state to connecting initially', () => {
      client.connect();
      expect(client.getState().status).toBe('connecting');
    });
  });

  describe('disconnect', () => {
    it('disconnects and updates state', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      client.disconnect();

      expect(client.isConnected()).toBe(false);
      expect(client.getState().status).toBe('disconnected');
    });
  });

  describe('subscribe', () => {
    it('subscribes to a channel', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      const handler = vi.fn();
      const unsubscribe = client.subscribe('assessments:queue', handler);

      expect(client.getSubscribedChannels()).toContain('assessments:queue');
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribes from a channel', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      const handler = vi.fn();
      const unsubscribe = client.subscribe('assessments:queue', handler);

      unsubscribe();

      expect(client.getSubscribedChannels()).not.toContain('assessments:queue');
    });

    it('calls handler when event is received', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      const handler = vi.fn();
      client.subscribe<AssessmentQueueEvent>('assessments:queue', handler);

      // Simulate incoming message
      const mockWs = (client as any).socket as MockWebSocket;
      const message: WebSocketMessage<AssessmentQueueEvent> = {
        id: '1',
        type: 'event',
        channel: 'assessments:queue',
        payload: {
          action: 'added',
          assessmentId: 'assessment-1',
          patientName: 'John Doe',
          urgencyLevel: 'high',
        },
        timestamp: new Date().toISOString(),
      };
      mockWs.simulateMessage(message);

      expect(handler).toHaveBeenCalledWith(message.payload, message);
    });
  });

  describe('send', () => {
    it('sends message when connected', async () => {
      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      const message: WebSocketMessage = {
        id: '1',
        type: 'event',
        channel: 'assessments:queue',
        timestamp: new Date().toISOString(),
      };

      const result = client.send(message);

      expect(result).toBe(true);
      const mockWs = (client as any).socket as MockWebSocket;
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('queues message when disconnected', () => {
      const message: WebSocketMessage = {
        id: '1',
        type: 'event',
        channel: 'assessments:queue',
        timestamp: new Date().toISOString(),
      };

      const result = client.send(message);

      expect(result).toBe(false);
    });
  });

  describe('connection state', () => {
    it('notifies listeners on state change', async () => {
      const listener = vi.fn();
      client.onConnectionChange(listener);

      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
      expect(lastCall.status).toBe('connected');
    });

    it('removes listener when unsubscribed', async () => {
      const listener = vi.fn();
      const unsubscribe = client.onConnectionChange(listener);

      unsubscribe();

      const connectPromise = client.connect();
      vi.advanceTimersByTime(20);
      await connectPromise;

      // Listener should have been called during connect before unsubscribe
      const callCountAfterUnsubscribe = listener.mock.calls.length;
      
      client.disconnect();
      
      // Should not have additional calls after unsubscribe
      expect(listener.mock.calls.length).toBe(callCountAfterUnsubscribe);
    });
  });
});

describe('Clinical Event Types', () => {
  it('AssessmentQueueEvent has correct structure', () => {
    const event: AssessmentQueueEvent = {
      action: 'added',
      assessmentId: 'assessment-1',
      patientId: 'patient-1',
      patientName: 'John Doe',
      urgencyLevel: 'emergency',
      status: 'pending',
      position: 1,
      redFlagCount: 3,
    };

    expect(event.action).toBe('added');
    expect(event.urgencyLevel).toBe('emergency');
  });

  it('EmergencyAlertEvent has correct structure', () => {
    const event: EmergencyAlertEvent = {
      alertId: 'alert-1',
      severity: 'critical',
      type: 'code_blue',
      patientId: 'patient-1',
      patientName: 'John Doe',
      location: 'Room 101',
      message: 'Code Blue activated',
      activatedBy: { id: 'provider-1', name: 'Dr. Smith', role: 'physician' },
      activatedAt: new Date().toISOString(),
    };

    expect(event.severity).toBe('critical');
    expect(event.type).toBe('code_blue');
  });
});
