import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MobileAuthProvider } from '../lib/auth/MobileAuthProvider';
import { BRAND } from '../lib/constants';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileAuthProvider>
          <StatusBar style="light" backgroundColor={BRAND.deepNavy} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="compass"
              options={{
                headerShown: true,
                title: 'COMPASS Assessment',
                headerStyle: { backgroundColor: BRAND.deepNavy },
                headerTintColor: BRAND.white,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
          </Stack>
        </MobileAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
