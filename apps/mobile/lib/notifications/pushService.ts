// ============================================================
// ATTENDING AI — Push Notification Service
// apps/mobile/lib/notifications/pushService.ts
//
// Registers for Expo push notifications, stores token,
// registers with backend, handles incoming notifications.
// ============================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { notificationsApi } from '../api/notifications';
import { STORAGE_KEYS } from '../constants';
import * as SecureStore from 'expo-secure-store';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });
  const token = tokenData.data;

  // Check if we need to re-register with backend
  const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.PUSH_TOKEN);
  if (storedToken !== token) {
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await notificationsApi.registerPushToken(token, platform);
    await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);
  }

  return token;
}

export function setupNotificationListeners() {
  // Handle notification received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener((_notification) => {
    // Notification is displayed automatically via setNotificationHandler
  });

  // Handle notification tap (user interaction)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    routeNotification(data);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

function routeNotification(data: Record<string, unknown>) {
  const type = data?.type as string | undefined;

  switch (type) {
    case 'message':
      if (data.conversationId) {
        router.push(`/(tabs)/messages/${data.conversationId}` as any);
      } else {
        router.push('/(tabs)/messages');
      }
      break;
    case 'appointment':
      if (data.appointmentId) {
        router.push(`/(tabs)/appointments/${data.appointmentId}` as any);
      } else {
        router.push('/(tabs)/appointments');
      }
      break;
    case 'lab-result':
    case 'prescription':
      router.push('/(tabs)/health');
      break;
    case 'emergency':
      router.push('/(tabs)/emergency-access');
      break;
    default:
      router.push('/(tabs)');
  }
}
