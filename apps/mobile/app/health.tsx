import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BRAND = {
  primary: "#1A8FA8",
  deepNavy: "#0C3547",
  coral: "#E87461",
  lightTeal: "#4FD1C5",
  white: "#FFFFFF",
  background: "#F0FAFA",
};

type VitalCard = {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: "normal" | "warning" | "alert";
};

const PLACEHOLDER_VITALS: VitalCard[] = [
  {
    label: "Heart Rate",
    value: "72",
    unit: "bpm",
    icon: "heart",
    status: "normal",
  },
  {
    label: "Blood Pressure",
    value: "120/80",
    unit: "mmHg",
    icon: "pulse",
    status: "normal",
  },
  {
    label: "Temperature",
    value: "98.6",
    unit: "\u00B0F",
    icon: "thermometer-outline",
    status: "normal",
  },
  {
    label: "O2 Saturation",
    value: "98",
    unit: "%",
    icon: "water-outline",
    status: "normal",
  },
];

const statusColor = {
  normal: BRAND.primary,
  warning: "#F59E0B",
  alert: BRAND.coral,
};

export default function HealthScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Vitals Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Vitals</Text>
        <View style={styles.vitalsGrid}>
          {PLACEHOLDER_VITALS.map((vital) => (
            <View
              key={vital.label}
              style={styles.vitalCard}
              accessibilityRole="summary"
              accessibilityLabel={`${vital.label}: ${vital.value} ${vital.unit}`}
            >
              <View
                style={[
                  styles.vitalIconBg,
                  { backgroundColor: statusColor[vital.status] + "18" },
                ]}
              >
                <Ionicons
                  name={vital.icon}
                  size={22}
                  color={statusColor[vital.status]}
                />
              </View>
              <Text style={styles.vitalValue}>
                {vital.value}
                <Text style={styles.vitalUnit}> {vital.unit}</Text>
              </Text>
              <Text style={styles.vitalLabel}>{vital.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications</Text>
        <View style={styles.placeholderCard}>
          <Ionicons name="medkit-outline" size={32} color="#94A3B8" />
          <Text style={styles.placeholderTitle}>No medications loaded</Text>
          <Text style={styles.placeholderText}>
            Medication data will sync from your care provider once connected.
          </Text>
        </View>
      </View>

      {/* Care Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Care Plan</Text>
        <View style={styles.placeholderCard}>
          <Ionicons name="clipboard-outline" size={32} color="#94A3B8" />
          <Text style={styles.placeholderTitle}>Care plan pending</Text>
          <Text style={styles.placeholderText}>
            Your personalized care plan will appear here after your COMPASS
            assessment is completed and reviewed by your care team.
          </Text>
        </View>
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <View style={styles.placeholderCard}>
          <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
          <Text style={styles.placeholderTitle}>No upcoming appointments</Text>
          <Text style={styles.placeholderText}>
            Schedule your next visit through the Appointments section.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 16,
    width: "48%",
    flexGrow: 1,
    minWidth: 150,
  },
  vitalIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  vitalValue: {
    fontSize: 26,
    fontWeight: "700",
    color: BRAND.deepNavy,
  },
  vitalUnit: {
    fontSize: 14,
    fontWeight: "400",
    color: "#94A3B8",
  },
  vitalLabel: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  placeholderCard: {
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.deepNavy,
    marginTop: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
});
