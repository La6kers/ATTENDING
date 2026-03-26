import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

const BRAND = {
  primary: "#1A8FA8",
  deepNavy: "#0C3547",
  coral: "#E87461",
  lightTeal: "#4FD1C5",
  white: "#FFFFFF",
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={BRAND.deepNavy} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: BRAND.deepNavy,
          },
          headerTintColor: BRAND.white,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: "#F0FAFA",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "ATTENDING AI",
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="compass"
          options={{
            title: "COMPASS Assessment",
          }}
        />
        <Stack.Screen
          name="health"
          options={{
            title: "Health Dashboard",
          }}
        />
        <Stack.Screen
          name="emergency-access"
          options={{
            title: "Emergency Access",
            headerStyle: {
              backgroundColor: BRAND.coral,
            },
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
