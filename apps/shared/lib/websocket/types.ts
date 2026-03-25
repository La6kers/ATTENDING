// =============================================================================
// ATTENDING AI - WebSocket Types & Constants
// apps/shared/lib/websocket/types.ts
//
// Type definitions for real-time clinical communication
// =============================================================================

// =============================================================================
// Connection Types
// =============================================================================

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface WebSocketConfig {
  url: string;
  token?: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  debug: boolean;
}

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3003',
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  debug: process.env.NODE_ENV === 'development',
};

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  reconnectAttempts: number;
  error: Error | null;
}

// =============================================================================
// Channel Types - Clinical Event Channels
// =============================================================================

export type WebSocketChannel =
  // Assessment channels
  | 'assessments:queue'
  | 'assessments:urgent'
  | 'assessments:status'
  | 'assessments:assigned'
  // Emergency channels
  | 'emergency:alerts'
  | 'emergency:broadcast'
  | 'emergency:acknowledged'
  // Clinical ordering channels
  | 'orders:labs'
  | 'orders:imaging'
  | 'orders:medications'
  | 'orders:referrals'
  // Results channels
  | 'results:labs'
  | 'results:imaging'
  | 'results:critical'
  // Patient channels
  | 'patients:status'
  | 'patients:updates'
  | 'patients:checkin'
  // Provider channels
  | 'providers:presence'
  | 'providers:messages'
  | 'providers:handoff'
  // System channels
  | 'system:notifications'
  | 'system:maintenance'
  | 'system:broadcast';

export interface ChannelSubscription {
  channel: WebSocketChannel;
  params?: Record<string, string>;
  subscribedAt: Date;
}

// =============================================================================
// Message Types
// =============================================================================

export type MessageType =
  | 'connect'
  | 'disconnect'
  | 'heartbeat'
  | 'heartbeat_ack'
  | 'subscribe'
  | 'unsubscribe'
  | 'subscribed'
  | 'unsubscribed'
  | 'event'
  | 'request'
  | 'response'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  id: string;
  type: MessageType;
  channel?: WebSocketChannel;
  event?: string;
  payload?: T;
  timestamp: string;
  correlationId?: string;
}

// =============================================================================
// Clinical Event Payloads
// =============================================================================

export type UrgencyLevel = 'emergency' | 'high' | 'moderate' | 'standard';

export interface AssessmentQueueEvent {
  action: 'added' | 'updated' | 'removed' | 'reordered';
  assessmentId: string;
  patientId?: string;
  patientName?: string;
  urgencyLevel?: UrgencyLevel;
  status?: string;
  position?: number;
  assignedTo?: string;
  redFlagCount?: number;
  chiefComplaint?: string;
  waitTime?: number;
}

export interface EmergencyAlertEvent {
  alertId: string;
  severity: 'critical' | 'high';
  type: 'patient_emergency' | 'code_blue' | 'rapid_response' | 'facility_emergency' | 'stroke_alert' | 'stemi_alert';
  patientId?: string;
  patientName?: string;
  location?: string;
  room?: string;
  message: string;
  activatedBy: { id: string; name: string; role: string };
  activatedAt: string;
  acknowledgedBy?: string[];
  resolvedAt?: string;
  requiredResponse?: string[];
}

export interface CriticalResultEvent {
  resultId: string;
  orderId: string;
  orderType: 'lab' | 'imaging';
  patientId: string;
  patientName: string;
  testName: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  interpretation: string;
  criticalityLevel: 'panic' | 'critical' | 'abnormal';
  notifiedAt: string;
  requiresAcknowledgment: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface PatientStatusEvent {
  encounterId: string;
  patientId: string;
  patientName: string;
  previousStatus: string;
  newStatus: string;
  room?: string;
  waitTime?: number;
  updatedBy?: string;
  updatedAt: string;
}

export interface ProviderPresenceEvent {
  providerId: string;
  providerName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity?: string;
  currentLocation?: string;
  activePatients?: number;
}

export interface OrderUpdateEvent {
  orderId: string;
  orderType: 'lab' | 'imaging' | 'medication' | 'referral';
  patientId: string;
  patientName: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed' | 'resulted';
  status: string;
  priority?: 'stat' | 'urgent' | 'routine';
  updatedBy: string;
  updatedAt: string;
  details?: Record<string, unknown>;
}

export interface ProviderMessageEvent {
  messageId: string;
  fromProviderId: string;
  fromProviderName: string;
  toProviderId: string;
  subject?: string;
  message: string;
  priority: 'urgent' | 'normal';
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  sentAt: string;
  readAt?: string;
}

export interface SystemNotificationEvent {
  notificationId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  persistent: boolean;
  dismissible: boolean;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
}

export interface HandoffEvent {
  handoffId: string;
  patientId: string;
  patientName: string;
  fromProviderId: string;
  fromProviderName: string;
  toProviderId: string;
  toProviderName: string;
  reason: string;
  summary: string;
  pendingTasks?: string[];
  urgentItems?: string[];
  acceptedAt?: string;
}

// =============================================================================
// Event Handler Types
// =============================================================================

export type EventHandler<T = unknown> = (payload: T, message: WebSocketMessage<T>) => void;

export interface EventSubscription {
  id: string;
  channel: WebSocketChannel;
  event?: string;
  handler: EventHandler;
}

// =============================================================================
// Audio Alert Configuration
// =============================================================================

export type AlertSoundType = 'emergency' | 'critical' | 'urgent' | 'message' | 'notification';

export interface AudioAlertConfig {
  enabled: boolean;
  volume: number;
  alerts: Record<AlertSoundType, string>;
}

export const DEFAULT_AUDIO_ALERTS: AudioAlertConfig = {
  enabled: true,
  volume: 0.7,
  alerts: {
    emergency: '/audio/emergency-alert.mp3',
    critical: '/audio/critical-alert.mp3',
    urgent: '/audio/urgent-alert.mp3',
    message: '/audio/message.mp3',
    notification: '/audio/notification.mp3',
  },
};

// =============================================================================
// Utility Types
// =============================================================================

export interface PendingRequest {
  id: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface QueuedMessage {
  message: WebSocketMessage;
  priority: 'high' | 'normal' | 'low';
  addedAt: Date;
  attempts: number;
}

// =============================================================================
// Clinical Event Map (for type-safe event handling)
// =============================================================================

export interface ClinicalEventMap {
  'assessments:queue': AssessmentQueueEvent;
  'assessments:urgent': AssessmentQueueEvent;
  'assessments:status': AssessmentQueueEvent;
  'assessments:assigned': AssessmentQueueEvent;
  'emergency:alerts': EmergencyAlertEvent;
  'emergency:broadcast': EmergencyAlertEvent;
  'emergency:acknowledged': EmergencyAlertEvent;
  'orders:labs': OrderUpdateEvent;
  'orders:imaging': OrderUpdateEvent;
  'orders:medications': OrderUpdateEvent;
  'orders:referrals': OrderUpdateEvent;
  'results:labs': CriticalResultEvent;
  'results:imaging': CriticalResultEvent;
  'results:critical': CriticalResultEvent;
  'patients:status': PatientStatusEvent;
  'patients:updates': PatientStatusEvent;
  'patients:checkin': PatientStatusEvent;
  'providers:presence': ProviderPresenceEvent;
  'providers:messages': ProviderMessageEvent;
  'providers:handoff': HandoffEvent;
  'system:notifications': SystemNotificationEvent;
  'system:maintenance': SystemNotificationEvent;
  'system:broadcast': SystemNotificationEvent;
}
