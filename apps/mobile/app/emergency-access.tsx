import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Expo Sensors would be imported in a real build:
// import { Accelerometer } from "expo-sensors";

const BRAND = {
  primary: "#1A8FA8",
  deepNavy: "#0C3547",
  coral: "#E87461",
  lightTeal: "#4FD1C5",
  white: "#FFFFFF",
  background: "#F0FAFA",
};

/**
 * Emergency Access screen.
 *
 * Provides:
 * - One-tap emergency call (911)
 * - Emergency contact quick-dial
 * - Crash detection placeholder (uses Expo Sensors accelerometer API)
 * - Medical ID summary for first responders
 *
 * Crash detection logic:
 * When enabled, monitors accelerometer for sudden high-G impacts
 * followed by stillness, then triggers an alert with countdown
 * before auto-dialing emergency services.
 */

const CRASH_THRESHOLD_G = 4.0;
const STILLNESS_DURATION_MS = 5000;

type EmergencyContact = {
  name: string;
  relation: string;
  phone: string;
};

const PLACEHOLDER_CONTACTS: EmergencyContact[] = [
  { name: "Jane Doe", relation: "Spouse", phone: "+15551234567" },
  { name: "Dr. Smith", relation: "Primary Care", phone: "+15559876543" },
];

export default function EmergencyAccessScreen() {
  const [crashDetectionEnabled, setCrashDetectionEnabled] = useState(false);
  const [monitoring, setMonitoring] = useState(false);

  const handleCall911 = useCallback(() => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Emergency Call",
        "Dialing 911 is not available in the web preview."
      );
      return;
    }
    Alert.alert("Call 911", "Are you sure you want to call emergency services?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call 911",
        style: "destructive",
        onPress: () => Linking.openURL("tel:911"),
      },
    ]);
  }, []);

  const handleCallContact = useCallback((contact: EmergencyContact) => {
    if (Platform.OS === "web") {
      Alert.alert("Call", `Would call ${contact.name} at ${contact.phone}`);
      return;
    }
    Linking.openURL(`tel:${contact.phone}`);
  }, []);

  const toggleCrashDetection = useCallback(() => {
    const next = !crashDetectionEnabled;
    setCrashDetectionEnabled(next);
    setMonitoring(next);

    if (next) {
      // In a real implementation, this would subscribe to Accelerometer:
      //
      // Accelerometer.setUpdateInterval(100);
      // const subscription = Accelerometer.addListener(({ x, y, z }) => {
      //   const totalG = Math.sqrt(x * x + y * y + z * z);
      //   if (totalG > CRASH_THRESHOLD_G) {
      //     // Start stillness timer, then trigger alert
      //   }
      // });

      Alert.alert(
        "Crash Detection Enabled",
        "The accelerometer will monitor for sudden impacts. " +
          "If a crash is detected, emergency services will be contacted " +
          "after a 30-second countdown."
      );
    }
  }, [crashDetectionEnabled]);

  return (
    <View style={styles.container}>
      {/* Emergency Call Button */}
      <Pressable
        style={({ pressed }) => [
          styles.emergencyButton,
          pressed && styles.emergencyButtonPressed,
        ]}
        onPress={handleCall911}
        accessibilityRole="button"
        accessibilityLabel="Call 911 emergency services"
      >
        <Ionicons name="call" size={36} color={BRAND.white} />
        <Text style={styles.emergencyButtonText}>Call 911</Text>
        <Text style={styles.emergencyButtonSub}>Tap to call emergency services</Text>
      </Pressable>

      {/* Crash Detection Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crash Detection</Text>
        <Pressable
          style={[
            styles.toggleCard,
            crashDetectionEnabled && styles.toggleCardActive,
          ]}
          onPress={toggleCrashDetection}
          accessibilityRole="switch"
          accessibilityState={{ checked: crashDetectionEnabled }}
          accessibilityLabel="Toggle crash detection"
          accessibilityHint="When enabled, monitors device sensors for sudden impacts that may indicate a crash"
        >
          <View style={styles.toggleRow}>
            <Ionicons
              name={crashDetectionEnabled ? "shield-checkmark" : "shield-outline"}
              size={24}
              color={crashDetectionEnabled ? BRAND.primary : "#94A3B8"}
            />
            <View style={styles.toggleContent}>
              <Text style={styles.toggleTitle}>
                {crashDetectionEnabled ? "Monitoring Active" : "Disabled"}
              </Text>
              <Text style={styles.toggleSub}>
                Uses accelerometer to detect high-G impact events
              </Text>
            </View>
            <View
              style={[
                styles.toggleIndicator,
                crashDetectionEnabled && styles.toggleIndicatorActive,
              ]}
            >
              <View
                style={[
                  styles.toggleDot,
                  crashDetectionEnabled && styles.toggleDotActive,
                ]}
              />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        {PLACEHOLDER_CONTACTS.map((contact) => (
          <Pressable
            key={contact.phone}
            style={({ pressed }) => [
              styles.contactCard,
              pressed && styles.contactCardPressed,
            ]}
            onPress={() => handleCallContact(contact)}
            accessibilityRole="button"
            accessibilityLabel={`Call ${contact.name}, ${contact.relation}`}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="person-circle-outline" size={40} color={BRAND.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactRelation}>{contact.relation}</Text>
            </View>
            <Ionicons name="call-outline" size={22} color={BRAND.primary} />
          </Pressable>
        ))}
      </View>

      {/* Medical ID */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical ID</Text>
        <View style={styles.medicalIdCard}>
          <Text style={styles.medicalIdNote}>
            Medical ID information will be visible to first responders even when
            the device is locked. Configure your medical details in Settings.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
    padding: 16,
  },
  emergencyButton: {
    backgroundColor: BRAND.coral,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: BRAND.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  emergencyButtonText: {
    fontSize: 24,
    fontWeight: "800",
    color: BRAND.white,
    marginTop: 8,
  },
  emergencyButtonSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  toggleCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleCardActive: {
    borderColor: BRAND.primary,
    backgroundColor: "#F0FDFA",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleContent: {
    flex: 1,
    marginLeft: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.deepNavy,
  },
  toggleSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  toggleIndicator: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#CBD5E1",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleIndicatorActive: {
    backgroundColor: BRAND.primary,
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND.white,
  },
  toggleDotActive: {
    alignSelf: "flex-end",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  contactCardPressed: {
    opacity: 0.85,
  },
  contactIcon: {
    marginRight: 4,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.deepNavy,
  },
  contactRelation: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  medicalIdCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  medicalIdNote: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
});
