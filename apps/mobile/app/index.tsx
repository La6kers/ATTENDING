import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const BRAND = {
  primary: "#1A8FA8",
  deepNavy: "#0C3547",
  coral: "#E87461",
  lightTeal: "#4FD1C5",
  white: "#FFFFFF",
  background: "#F0FAFA",
};

type CardItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  urgent?: boolean;
};

const cards: CardItem[] = [
  {
    title: "COMPASS Assessment",
    subtitle: "Complete your care needs assessment",
    icon: "compass-outline",
    route: "/compass",
    color: BRAND.primary,
  },
  {
    title: "Health Dashboard",
    subtitle: "View vitals, medications, and care plan",
    icon: "heart-outline",
    route: "/health",
    color: BRAND.primary,
  },
  {
    title: "Emergency Access",
    subtitle: "Crash detection and emergency contacts",
    icon: "warning-outline",
    route: "/emergency-access",
    color: BRAND.coral,
    urgent: true,
  },
  {
    title: "Messages",
    subtitle: "Communicate with your care team",
    icon: "chatbubbles-outline",
    route: "/health",
    color: BRAND.deepNavy,
  },
  {
    title: "Appointments",
    subtitle: "Upcoming visits and scheduling",
    icon: "calendar-outline",
    route: "/health",
    color: BRAND.deepNavy,
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back</Text>
        <Text style={styles.greetingSubtext}>
          Your health companion, always attending.
        </Text>
      </View>

      {cards.map((card) => (
        <Pressable
          key={card.title}
          style={({ pressed }) => [
            styles.card,
            card.urgent && styles.cardUrgent,
            pressed && styles.cardPressed,
          ]}
          onPress={() => router.push(card.route as any)}
          accessibilityRole="button"
          accessibilityLabel={card.title}
          accessibilityHint={card.subtitle}
        >
          <View
            style={[styles.cardIconContainer, { backgroundColor: card.color }]}
          >
            <Ionicons name={card.icon} size={28} color={BRAND.white} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#94A3B8"
            style={styles.cardChevron}
          />
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ATTENDING AI v0.1.0
        </Text>
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
  greeting: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "700",
    color: BRAND.deepNavy,
  },
  greetingSubtext: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: BRAND.coral,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.deepNavy,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  cardChevron: {
    marginLeft: 8,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});
