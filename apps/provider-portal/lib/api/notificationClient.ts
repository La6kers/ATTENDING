/**
 * ATTENDING AI - SignalR Notification Client
 * 
 * Real-time notification handling for clinical alerts.
 */

import * as signalR from '@microsoft/signalr';

// Development-only logger — suppresses noisy SignalR diagnostics in production
const log = {
  info: (...args: unknown[]) => { if (process.env.NODE_ENV === 'development') console.log(...args); },
  warn: (...args: unknown[]) => { if (process.env.NODE_ENV === 'development') console.warn(...args); },
  error: (...args: unknown[]) => console.error(...args), // always log errors
};

// Configuration
const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5000/hubs/notifications';

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface CriticalResultNotification {
  patientId: string;
  patientName: string;
  patientMrn: string;
  labOrderId: string;
  orderNumber: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  resultedAt: string;
  orderingProviderName?: string;
}

export interface EmergencyAssessmentNotification {
  assessmentId: string;
  assessmentNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  chiefComplaint: string;
  emergencyReason: string;
  redFlagCategories: string[];
  detectedAt: string;
}

export interface OrderStatusNotification {
  orderId: string;
  orderNumber: string;
  orderType: 'Lab' | 'Imaging' | 'Medication' | 'Referral';
  patientId: string;
  patientName: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

export interface NewAssessmentNotification {
  assessmentId: string;
  assessmentNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  patientAge: number;
  chiefComplaint: string;
  triageLevel?: string;
  hasRedFlags: boolean;
  startedAt: string;
}

export interface RedFlagNotification {
  assessmentId: string;
  patientId: string;
  patientName: string;
  category: string;
  matchedKeyword: string;
  severity: string;
  clinicalReason: string;
  detectedAt: string;
}

export interface PlayAlertCommand {
  type: 'critical' | 'emergency' | 'urgent' | 'info';
  repeat: number;
}

// =============================================================================
// EVENT HANDLERS TYPE
// =============================================================================

export interface NotificationHandlers {
  onCriticalResult?: (notification: CriticalResultNotification) => void;
  onEmergencyAssessment?: (notification: EmergencyAssessmentNotification) => void;
  onOrderStatusChange?: (notification: OrderStatusNotification) => void;
  onNewAssessment?: (notification: NewAssessmentNotification) => void;
  onRedFlagDetected?: (notification: RedFlagNotification) => void;
  onPlayAlert?: (command: PlayAlertCommand) => void;
  onConnected?: () => void;
  onDisconnected?: (error?: Error) => void;
  onReconnecting?: (error?: Error) => void;
  onReconnected?: (connectionId?: string) => void;
}

// =============================================================================
// NOTIFICATION CLIENT CLASS
// =============================================================================

class NotificationClient {
  private connection: signalR.HubConnection | null = null;
  private handlers: NotificationHandlers = {};
  private accessToken: string | null = null;
  private isConnecting = false;
  private watchedPatients: Set<string> = new Set();

  /**
   * Configure the notification client
   */
  configure(handlers: NotificationHandlers, accessToken?: string) {
    this.handlers = handlers;
    if (accessToken) {
      this.accessToken = accessToken;
    }
  }

  /**
   * Set the access token for authentication
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Connect to the SignalR hub
   */
  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      log.info('Already connected to notification hub');
      return;
    }

    if (this.isConnecting) {
      log.info('Connection already in progress');
      return;
    }

    this.isConnecting = true;

    try {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => this.accessToken || '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0, 2, 4, 8, 16, 32 seconds
            if (retryContext.previousRetryCount < 6) {
              return Math.pow(2, retryContext.previousRetryCount) * 1000;
            }
            return 30000; // Max 30 seconds
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Register event handlers
      this.registerHandlers();

      // Start connection
      await this.connection.start();
      log.info('Connected to notification hub');

      // Re-watch any previously watched patients
      for (const patientId of this.watchedPatients) {
        await this.watchPatient(patientId);
      }

      this.handlers.onConnected?.();
    } catch (error) {
      log.error('Failed to connect to notification hub:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      log.info('Disconnected from notification hub');
    }
  }

  /**
   * Watch a specific patient for notifications
   */
  async watchPatient(patientId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      // Store for later when connected
      this.watchedPatients.add(patientId);
      return;
    }

    try {
      await this.connection.invoke('WatchPatient', patientId);
      this.watchedPatients.add(patientId);
      log.info(`Now watching patient: ${patientId}`);
    } catch (error) {
      log.error(`Failed to watch patient ${patientId}:`, error);
    }
  }

  /**
   * Stop watching a specific patient
   */
  async unwatchPatient(patientId: string): Promise<void> {
    this.watchedPatients.delete(patientId);

    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('UnwatchPatient', patientId);
      log.info(`Stopped watching patient: ${patientId}`);
    } catch (error) {
      log.error(`Failed to unwatch patient ${patientId}:`, error);
    }
  }

  /**
   * Join the emergency alerts group
   */
  async joinEmergencyAlerts(): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      log.warn('Cannot join emergency alerts - not connected');
      return;
    }

    try {
      await this.connection.invoke('JoinEmergencyAlerts');
      log.info('Joined emergency alerts group');
    } catch (error) {
      log.error('Failed to join emergency alerts:', error);
    }
  }

  /**
   * Leave the emergency alerts group
   */
  async leaveEmergencyAlerts(): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.connection.invoke('LeaveEmergencyAlerts');
      log.info('Left emergency alerts group');
    } catch (error) {
      log.error('Failed to leave emergency alerts:', error);
    }
  }

  /**
   * Get connection state
   */
  get connectionState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private registerHandlers(): void {
    if (!this.connection) return;

    // Critical lab result
    this.connection.on('CriticalResult', (notification: CriticalResultNotification) => {
      log.info('Critical result received:', notification);
      this.handlers.onCriticalResult?.(notification);
    });

    // Emergency assessment
    this.connection.on('EmergencyAssessment', (notification: EmergencyAssessmentNotification) => {
      log.info('Emergency assessment received:', notification);
      this.handlers.onEmergencyAssessment?.(notification);
    });

    // Order status change
    this.connection.on('OrderStatusChange', (notification: OrderStatusNotification) => {
      log.info('Order status change received:', notification);
      this.handlers.onOrderStatusChange?.(notification);
    });

    // New assessment
    this.connection.on('NewAssessment', (notification: NewAssessmentNotification) => {
      log.info('New assessment received:', notification);
      this.handlers.onNewAssessment?.(notification);
    });

    // Red flag detected
    this.connection.on('RedFlagDetected', (notification: RedFlagNotification) => {
      log.info('Red flag detected:', notification);
      this.handlers.onRedFlagDetected?.(notification);
    });

    // Play alert command
    this.connection.on('PlayAlert', (command: PlayAlertCommand) => {
      log.info('Play alert command received:', command);
      this.handlers.onPlayAlert?.(command);
    });

    // Connection lifecycle events
    this.connection.onclose((error) => {
      log.info('Connection closed', error);
      this.handlers.onDisconnected?.(error);
    });

    this.connection.onreconnecting((error) => {
      log.info('Reconnecting...', error);
      this.handlers.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      log.info('Reconnected', connectionId);
      this.handlers.onReconnected?.(connectionId);
    });
  }
}

// =============================================================================
// AUDIO ALERT UTILITIES
// =============================================================================

const alertSounds: Record<string, HTMLAudioElement | null> = {
  critical: null,
  emergency: null,
  urgent: null,
  info: null,
};

/**
 * Initialize audio alerts
 */
export function initializeAlerts(): void {
  if (typeof window === 'undefined') return;

  // Create audio elements (you would replace these with actual audio file paths)
  alertSounds.critical = new Audio('/sounds/critical-alert.mp3');
  alertSounds.emergency = new Audio('/sounds/emergency-alert.mp3');
  alertSounds.urgent = new Audio('/sounds/urgent-alert.mp3');
  alertSounds.info = new Audio('/sounds/info-alert.mp3');
}

/**
 * Play an alert sound
 */
export async function playAlert(type: PlayAlertCommand['type'], repeat = 1): Promise<void> {
  const sound = alertSounds[type];
  if (!sound) return;

  for (let i = 0; i < repeat; i++) {
    try {
      sound.currentTime = 0;
      await sound.play();
      if (i < repeat - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      log.warn('Could not play alert sound:', error);
      break;
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const notificationClient = new NotificationClient();

export default notificationClient;
