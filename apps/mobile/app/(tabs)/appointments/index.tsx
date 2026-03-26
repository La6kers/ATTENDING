import { View, Text, SectionList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { useApiQuery } from '../../../hooks/useApi';
import { patientApi, type Appointment } from '../../../lib/api/patient';
import { BRAND } from '../../../lib/constants';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const appointments = useApiQuery(() => patientApi.getAppointments(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await appointments.refetch();
    setRefreshing(false);
  }, [appointments]);

  const sections = useMemo(() => {
    const all = appointments.data ?? [];
    const now = new Date();
    const upcoming = all.filter((a) => new Date(a.date) >= now && a.status !== 'cancelled');
    const past = all.filter((a) => new Date(a.date) < now || a.status === 'completed');
    const cancelled = all.filter((a) => a.status === 'cancelled' && new Date(a.date) >= now);

    const result = [];
    if (upcoming.length > 0) result.push({ title: 'Upcoming', data: upcoming });
    if (past.length > 0) result.push({ title: 'Past', data: past.slice(0, 10) });
    if (cancelled.length > 0) result.push({ title: 'Cancelled', data: cancelled });
    return result;
  }, [appointments.data]);

  const statusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return { name: 'checkmark-circle' as const, color: BRAND.success };
      case 'scheduled': return { name: 'time-outline' as const, color: BRAND.primary };
      case 'completed': return { name: 'checkmark-done' as const, color: BRAND.gray400 };
      case 'cancelled': return { name: 'close-circle-outline' as const, color: BRAND.error };
    }
  };

  if (appointments.loading && !appointments.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={sections.length === 0 ? styles.center : styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      renderItem={({ item }) => {
        const icon = statusIcon(item.status);
        const date = new Date(item.date);
        return (
          <Pressable
            style={({ pressed }) => [styles.apptCard, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/(tabs)/appointments/${item.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`${item.provider} on ${date.toLocaleDateString()}`}
          >
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{date.getDate()}</Text>
              <Text style={styles.dateMonth}>{date.toLocaleString('default', { month: 'short' })}</Text>
            </View>
            <View style={styles.apptContent}>
              <Text style={styles.apptProvider}>{item.provider}</Text>
              <Text style={styles.apptDetail}>{item.specialty} · {item.type}</Text>
              <Text style={styles.apptDetail}>{item.time} · {item.location}</Text>
            </View>
            <Ionicons name={icon.name} size={22} color={icon.color} />
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={BRAND.gray300} />
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.emptyText}>Schedule your next visit with your care provider.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  listContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: {
    fontSize: 15, fontWeight: '600', color: BRAND.gray500, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10, marginTop: 8, marginLeft: 4,
  },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  dateBox: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: BRAND.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 22, fontWeight: '700', color: BRAND.primary },
  dateMonth: { fontSize: 11, fontWeight: '600', color: BRAND.primary, textTransform: 'uppercase' },
  apptContent: { flex: 1, marginLeft: 12 },
  apptProvider: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy },
  apptDetail: { fontSize: 13, color: BRAND.gray500, marginTop: 2 },
  emptyContainer: { alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: BRAND.deepNavy, marginTop: 16 },
  emptyText: { fontSize: 14, color: BRAND.gray400, textAlign: 'center', marginTop: 8 },
});
