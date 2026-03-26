import { Stack } from 'expo-router';
import { BRAND } from '../../lib/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BRAND.deepNavy },
        headerTintColor: BRAND.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        contentStyle: { backgroundColor: BRAND.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="mfa" options={{ title: 'Verification' }} />
    </Stack>
  );
}
