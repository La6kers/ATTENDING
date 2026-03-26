import { Stack } from 'expo-router';
import { BRAND } from '../../../lib/constants';

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BRAND.deepNavy },
        headerTintColor: BRAND.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[conversationId]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}
