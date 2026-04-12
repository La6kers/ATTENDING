// =============================================================================
// ATTENDING AI - Push Notification Service
// apps/patient-portal/services/PushNotificationService.ts
//
// Handles push notifications for emergency contacts
// Supports: Firebase Cloud Messaging, Apple Push Notification Service, Expo Push
// =============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  ttl?: number; // Time to live in seconds
  channelId?: string; // Android notification channel
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web' | 'expo';
  deviceId?: string;
  lastUsed?: Date;
  isValid: boolean;
}

export interface NotificationResult {
  success: boolean;
  token: string;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

// =============================================================================
// Push Notification Service Class
// =============================================================================

class PushNotificationService {
  private fcmServerKey?: string;
  private apnsKeyId?: string;
  private apnsTeamId?: string;
  private expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor() {
    // Load configuration from environment
    if (typeof process !== 'undefined') {
      this.fcmServerKey = process.env.FCM_SERVER_KEY;
      this.apnsKeyId = process.env.APNS_KEY_ID;
      this.apnsTeamId = process.env.APNS_TEAM_ID;
    }
  }

  // ==========================================================================
  // Firebase Cloud Messaging (Android & Web)
  // ==========================================================================

  async sendFCM(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const token of tokens) {
      try {
        // In production, use Firebase Admin SDK
        // const message = {
        //   token,
        //   notification: {
        //     title: payload.title,
        //     body: payload.body,
        //   },
        //   data: payload.data,
        //   android: {
        //     priority: payload.priority === 'high' ? 'high' : 'normal',
        //     notification: {
        //       channelId: payload.channelId || 'emergency',
        //       sound: payload.sound || 'emergency_alert',
        //     },
        //   },
        // };
        // const response = await admin.messaging().send(message);

        // Mock implementation
        console.log(`[FCM] Sending to ${token.substring(0, 20)}...`);
        
        results.push({
          success: true,
          token,
          messageId: `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      } catch (error: any) {
        results.push({
          success: false,
          token,
          error: error.message,
          errorCode: error.code,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // Apple Push Notification Service (iOS)
  // ==========================================================================

  async sendAPNS(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const token of tokens) {
      try {
        // In production, use node-apn or @parse/node-apn
        // const notification = new apn.Notification({
        //   alert: {
        //     title: payload.title,
        //     body: payload.body,
        //   },
        //   sound: payload.sound || 'emergency.caf',
        //   badge: payload.badge,
        //   payload: payload.data,
        //   topic: 'com.attendingai.patient',
        //   priority: payload.priority === 'high' ? 10 : 5,
        //   pushType: 'alert',
        // });
        // const response = await apnProvider.send(notification, token);

        // Mock implementation
        console.log(`[APNS] Sending to ${token.substring(0, 20)}...`);
        
        results.push({
          success: true,
          token,
          messageId: `apns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      } catch (error: any) {
        results.push({
          success: false,
          token,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // Expo Push Notifications (Cross-platform)
  // ==========================================================================

  async sendExpo(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Expo accepts batch requests
    const messages = tokens.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound || 'default',
      badge: payload.badge,
      priority: payload.priority || 'high',
      channelId: payload.channelId || 'emergency',
    }));

    try {
      // In production, make actual API call
      // const response = await fetch(this.expoPushUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(messages),
      // });
      // const data = await response.json();

      // Mock implementation
      for (const token of tokens) {
        console.log(`[EXPO] Sending to ${token.substring(0, 20)}...`);
        results.push({
          success: true,
          token,
          messageId: `expo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
    } catch (error: any) {
      for (const token of tokens) {
        results.push({
          success: false,
          token,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // Unified Send Method
  // ==========================================================================

  async send(
    tokens: PushToken[],
    payload: PushNotificationPayload
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Group tokens by platform
    const iosTokens = tokens.filter(t => t.platform === 'ios' && t.isValid).map(t => t.token);
    const androidTokens = tokens.filter(t => t.platform === 'android' && t.isValid).map(t => t.token);
    const webTokens = tokens.filter(t => t.platform === 'web' && t.isValid).map(t => t.token);
    const expoTokens = tokens.filter(t => t.platform === 'expo' && t.isValid).map(t => t.token);

    // Send to each platform
    if (iosTokens.length > 0) {
      const iosResults = await this.sendAPNS(iosTokens, payload);
      results.push(...iosResults);
    }

    if (androidTokens.length > 0 || webTokens.length > 0) {
      const fcmResults = await this.sendFCM([...androidTokens, ...webTokens], payload);
      results.push(...fcmResults);
    }

    if (expoTokens.length > 0) {
      const expoResults = await this.sendExpo(expoTokens, payload);
      results.push(...expoResults);
    }

    return results;
  }

  // ==========================================================================
  // Emergency Alert Methods
  // ==========================================================================

  async sendCrashAlert(
    tokens: PushToken[],
    patientName: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<NotificationResult[]> {
    const locationStr = location?.address || 
      (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown');

    return this.send(tokens, {
      title: '🚨 CRASH DETECTED',
      body: `${patientName}'s phone detected a severe crash. Location: ${locationStr}`,
      data: {
        type: 'crash_detected',
        patientName,
        location,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      sound: 'emergency_alert',
      channelId: 'emergency',
    });
  }

  async sendEmergencyAccessAlert(
    tokens: PushToken[],
    patientName: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<NotificationResult[]> {
    const locationStr = location?.address || 
      (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown');

    return this.send(tokens, {
      title: '🏥 Emergency Medical Info Accessed',
      body: `Someone accessed ${patientName}'s emergency medical information. Location: ${locationStr}`,
      data: {
        type: 'emergency_access',
        patientName,
        location,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      sound: 'alert',
      channelId: 'emergency',
    });
  }

  async sendSOSAlert(
    tokens: PushToken[],
    patientName: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<NotificationResult[]> {
    const locationStr = location?.address || 
      (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown');

    return this.send(tokens, {
      title: '🆘 SOS ALERT',
      body: `${patientName} triggered an emergency SOS! Location: ${locationStr}`,
      data: {
        type: 'sos',
        patientName,
        location,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      sound: 'sos_alert',
      channelId: 'emergency',
    });
  }

  async sendFallAlert(
    tokens: PushToken[],
    patientName: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<NotificationResult[]> {
    const locationStr = location?.address || 
      (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Unknown');

    return this.send(tokens, {
      title: '⚠️ Fall Detected',
      body: `${patientName}'s phone detected a fall and they haven't responded. Location: ${locationStr}`,
      data: {
        type: 'fall_detected',
        patientName,
        location,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      sound: 'alert',
      channelId: 'emergency',
    });
  }

  // ==========================================================================
  // Token Management
  // ==========================================================================

  async registerToken(
    userId: string,
    token: string,
    platform: PushToken['platform'],
    deviceId?: string
  ): Promise<boolean> {
    // In production, store in database
    console.log(`[PUSH] Registered token for user ${userId}: ${token.substring(0, 20)}... (${platform})`);
    return true;
  }

  async unregisterToken(token: string): Promise<boolean> {
    // In production, remove from database
    console.log(`[PUSH] Unregistered token: ${token.substring(0, 20)}...`);
    return true;
  }

  async getTokensForUser(userId: string): Promise<PushToken[]> {
    // In production, fetch from database
    // Mock data
    return [
      {
        token: 'expo-push-token-12345',
        platform: 'expo',
        isValid: true,
        lastUsed: new Date(),
      },
    ];
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
