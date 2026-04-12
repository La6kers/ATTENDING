import { Stack } from 'expo-router';
import { BRAND } from '../../../lib/constants';

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BRAND.deepNavy },
        headerTintColor: BRAND.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Appointment Details' }} />
    </Stack>
  );
}
