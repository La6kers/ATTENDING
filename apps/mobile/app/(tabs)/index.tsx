import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useAuth } from '../../lib/auth/MobileAuthProvider';
import { useApiQuery } from '../../hooks/useApi';
import { messagesApi } from '../../lib/api/messages';
import { patientApi } from '../../lib/api/patient';
import { BRAND } from '../../lib/constants';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const unread = useApiQuery(() => messagesApi.getUnreadCount(), []);
  const appointments = useApiQuery(() => patientApi.getAppointments({ upcoming: true }), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([unread.refetch(), appointments.refetch()]);
    setRefreshing(false);
  }, [unread, appointments]);

  const upcomingCount = appointments.data?.length ?? 0;
  const unreadCount = unread.data?.count ?? 0;

  const cards = [
    {
      title: 'COMPASS Assessment',
      subtitle: 'Complete your care needs assessment',
      icon: 'compass-outline' as const,
      route: '/compass',
      color: BRAND.primary,
    },
    {
      title: 'Health Dashboard',
      subtitle: 'View vitals, medications, and care plan',
      icon: 'heart-outline' as const,
      route: '/(tabs)/health',
      color: BRAND.primary,
    },
    {
      title: 'Messages',
      subtitle: unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Communicate with your care team',
      icon: 'chatbubbles-outline' as const,
      route: '/(tabs)/messages',
      color: BRAND.deepNavy,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: 'Appointments',
      subtitle: upcomingCount > 0 ? `${upcomingCount} upcoming visit${upcomingCount > 1 ? 's' : ''}` : 'No upcoming visits',
      icon: 'calendar-outline' as const,
      route: '/(tabs)/appointments',
      color: BRAND.deepNavy,
    },
    {
      title: 'Emergency Access',
      subtitle: 'Crash detection and emergency contacts',
      icon: 'warning-outline' as const,
      route: '/(tabs)/emergency-access',
      color: BRAND.coral,
      urgent: true,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
    >
      <View style={styles.greeting}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
            </Text>
            <Text style={styles.greetingSubtext}>
              Your health companion, always attending.
            </Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={22} color={BRAND.gray500} />
          </Pressable>
        </View>
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
          <View style={[styles.cardIconContainer, { backgroundColor: card.color }]}>
            <Ionicons name={card.icon} size={28} color={BRAND.white} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </View>
          {card.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{card.badge > 99 ? '99+' : card.badge}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={BRAND.gray400} />
          )}
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>ATTENDING AI v0.1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { marginBottom: 24, paddingVertical: 8 },
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start' },
  greetingText: { fontSize: 28, fontWeight: '700', color: BRAND.deepNavy },
  greetingSubtext: { fontSize: 15, color: BRAND.gray500, marginTop: 4 },
  logoutButton: { padding: 8, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white,
    borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: BRAND.coral },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  cardIconContainer: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy },
  cardSubtitle: { fontSize: 13, color: BRAND.gray500, marginTop: 2 },
  badge: {
    backgroundColor: BRAND.coral, borderRadius: 12, minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: BRAND.white, fontSize: 12, fontWeight: '700' },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 12, color: BRAND.gray400 },
});
