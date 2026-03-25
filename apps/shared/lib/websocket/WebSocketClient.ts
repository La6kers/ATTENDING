// =============================================================================
// ATTENDING AI - WebSocket Client
// apps/shared/lib/websocket/WebSocketClient.ts
//
// Core WebSocket client with auto-reconnect, heartbeat, and message queuing
// =============================================================================

import {
  WebSocketConfig, DEFAULT_WEBSOCKET_CONFIG, ConnectionState, ConnectionStatus,
  WebSocketChannel, WebSocketMessage, MessageType, EventHandler, EventSubscription,
  ChannelSubscription, PendingRequest, QueuedMessage,
} from './types';

type ConnectionEventType = 'connected' | 'disconnected' | 'reconnecting' | 'error' | 'stateChange';
type ConnectionEventHandler = (state: ConnectionState) => void;

export class WebSocketClient {
  private config: WebSocketConfig;
  private socket: WebSocket | null = null;
  private state: ConnectionState;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private channelSubscriptions: Map<WebSocketChannel, ChannelSubscription> = new Map();
  private connectionListeners: Map<ConnectionEventType, Set<ConnectionEventHandler>> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageId = 0;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
    this.state = {
      status: 'disconnected',
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      reconnectAttempts: 0,
      error: null,
    };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (token) this.config.token = token;
      this.updateState({ status: 'connecting', error: null });

      const url = this.buildUrl();
      this.log('Connecting to:', url);

      try {
        this.socket = new WebSocket(url);
        this.setupSocketHandlers(resolve, reject);
        this.setupConnectionTimeout(reject);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Connection failed');
        this.updateState({ status: 'error', error: err });
        reject(err);
      }
    });
  }

  disconnect(): void {
    this.log('Disconnecting...');
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.updateState({
      status: 'disconnected',
      lastDisconnectedAt: new Date(),
      reconnectAttempts: 0,
    });
  }

  private buildUrl(): string {
    const url = new URL(this.config.url);
    if (this.config.token) url.searchParams.set('token', this.config.token);
    return url.toString();
  }

  private setupSocketHandlers(resolve: () => void, reject: (err: Error) => void): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.log('Connected');
      this.updateState({
        status: 'connected',
        lastConnectedAt: new Date(),
        reconnectAttempts: 0,
        error: null,
      });
      this.startHeartbeat();
      this.flushMessageQueue();
      this.resubscribeChannels();
      resolve();
    };

    this.socket.onclose = (event) => {
      this.log('Disconnected:', event.code, event.reason);
      this.stopHeartbeat();
      this.updateState({ status: 'disconnected', lastDisconnectedAt: new Date() });

      if (event.code !== 1000) this.scheduleReconnect();
    };

    this.socket.onerror = (event) => {
      this.log('Error:', event);
      const error = new Error('WebSocket error');
      this.updateState({ status: 'error', error });
      reject(error);
    };

    this.socket.onmessage = (event) => this.handleMessage(event);
  }

  private setupConnectionTimeout(reject: (err: Error) => void): void {
    setTimeout(() => {
      if (this.state.status === 'connecting') {
        const error = new Error('Connection timeout');
        this.updateState({ status: 'error', error });
        this.socket?.close();
        reject(error);
      }
    }, this.config.connectionTimeout);
  }

  // ===========================================================================
  // Reconnection Logic
  // ===========================================================================

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached');
      this.updateState({ status: 'error', error: new Error('Max reconnect attempts reached') });
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.state.reconnectAttempts + 1})`);

    this.updateState({ status: 'reconnecting', reconnectAttempts: this.state.reconnectAttempts + 1 });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ===========================================================================
  // Heartbeat
  // ===========================================================================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ id: this.generateId(), type: 'heartbeat', timestamp: new Date().toISOString() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.log('Received:', message.type, message.channel);

      switch (message.type) {
        case 'heartbeat_ack':
          break;
        case 'subscribed':
        case 'unsubscribed':
          this.handleSubscriptionResponse(message);
          break;
        case 'response':
          this.handleResponse(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        case 'event':
          this.dispatchEvent(message);
          break;
        default:
          this.dispatchEvent(message);
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
  }

  private dispatchEvent(message: WebSocketMessage): void {
    this.subscriptions.forEach((subscription) => {
      const channelMatch = !subscription.channel || subscription.channel === message.channel;
      const eventMatch = !subscription.event || subscription.event === message.event;

      if (channelMatch && eventMatch) {
        try {
          subscription.handler(message.payload, message);
        } catch (error) {
          this.log('Event handler error:', error);
        }
      }
    });
  }

  private handleSubscriptionResponse(message: WebSocketMessage): void {
    const requestId = message.correlationId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      clearTimeout(pending.timeout);
      pending.resolve(message.payload);
      this.pendingRequests.delete(requestId);
    }
  }

  private handleResponse(message: WebSocketMessage): void {
    const requestId = message.correlationId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      clearTimeout(pending.timeout);
      pending.resolve(message.payload);
      this.pendingRequests.delete(requestId);
    }
  }

  private handleError(message: WebSocketMessage): void {
    const requestId = message.correlationId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      clearTimeout(pending.timeout);
      pending.reject(new Error(String(message.payload) || 'Unknown error'));
      this.pendingRequests.delete(requestId);
    }
  }

  // ===========================================================================
  // Sending Messages
  // ===========================================================================

  send<T>(message: WebSocketMessage<T>): boolean {
    if (!this.isConnected()) {
      this.queueMessage(message);
      return false;
    }

    try {
      this.socket!.send(JSON.stringify(message));
      this.log('Sent:', message.type, message.channel);
      return true;
    } catch (error) {
      this.log('Send error:', error);
      this.queueMessage(message);
      return false;
    }
  }

  async request<T, R>(message: Omit<WebSocketMessage<T>, 'id' | 'timestamp'>): Promise<R> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const fullMessage: WebSocketMessage<T> = {
        ...message,
        id,
        type: message.type || 'request',
        timestamp: new Date().toISOString(),
      } as WebSocketMessage<T>;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 10000);

      this.pendingRequests.set(id, { id, resolve: resolve as (v: unknown) => void, reject, timeout });
      this.send(fullMessage);
    });
  }

  private queueMessage<T>(message: WebSocketMessage<T>, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    this.messageQueue.push({ message, priority, addedAt: new Date(), attempts: 0 });
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (this.messageQueue.length > 100) this.messageQueue = this.messageQueue.slice(0, 100);
  }

  private flushMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach((item) => {
      if (item.attempts < 3) {
        item.attempts++;
        if (!this.send(item.message)) this.messageQueue.push(item);
      }
    });
  }

  // ===========================================================================
  // Subscriptions
  // ===========================================================================

  subscribe<T>(channel: WebSocketChannel, handler: EventHandler<T>, event?: string): () => void {
    const id = this.generateId();
    const subscription: EventSubscription = { id, channel, event, handler: handler as EventHandler };

    this.subscriptions.set(id, subscription);

    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, { channel, subscribedAt: new Date() });
      this.sendSubscribe(channel);
    }

    return () => this.unsubscribe(id, channel);
  }

  private unsubscribe(subscriptionId: string, channel: WebSocketChannel): void {
    this.subscriptions.delete(subscriptionId);

    const hasOtherSubscribers = Array.from(this.subscriptions.values()).some((s) => s.channel === channel);

    if (!hasOtherSubscribers) {
      this.channelSubscriptions.delete(channel);
      this.sendUnsubscribe(channel);
    }
  }

  private sendSubscribe(channel: WebSocketChannel): void {
    this.send({
      id: this.generateId(),
      type: 'subscribe',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  private sendUnsubscribe(channel: WebSocketChannel): void {
    this.send({
      id: this.generateId(),
      type: 'unsubscribe',
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  private resubscribeChannels(): void {
    this.channelSubscriptions.forEach((_, channel) => this.sendSubscribe(channel));
  }

  // ===========================================================================
  // Connection Events
  // ===========================================================================

  onConnectionChange(handler: ConnectionEventHandler): () => void {
    const type: ConnectionEventType = 'stateChange';
    if (!this.connectionListeners.has(type)) this.connectionListeners.set(type, new Set());
    this.connectionListeners.get(type)!.add(handler);
    return () => this.connectionListeners.get(type)?.delete(handler);
  }

  private updateState(updates: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.connectionListeners.get('stateChange')?.forEach((handler) => {
      try { handler(this.state); } catch (e) { this.log('Connection listener error:', e); }
    });
  }

  // ===========================================================================
  // Utilities
  // ===========================================================================

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  getSubscribedChannels(): WebSocketChannel[] {
    return Array.from(this.channelSubscriptions.keys());
  }

  private generateId(): string {
    return `${Date.now()}-${++this.messageId}`;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) console.log('[WebSocket]', ...args);
  }
}

// ===========================================================================
// Singleton Instance
// ===========================================================================

let clientInstance: WebSocketClient | null = null;

export function getWebSocketClient(config?: Partial<WebSocketConfig>): WebSocketClient {
  if (!clientInstance) clientInstance = new WebSocketClient(config);
  return clientInstance;
}

export function resetWebSocketClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}
