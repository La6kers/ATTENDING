import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApiQuery } from '../../../hooks/useApi';
import { patientApi } from '../../../lib/api/patient';
import { BRAND } from '../../../lib/constants';
import { ActivityIndicator } from 'react-native';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointments = useApiQuery(() => patientApi.getAppointments(), []);

  const appt = (appointments.data ?? []).find((a) => a.id === id);

  if (appointments.loading && !appointments.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND.primary} />
      </View>
    );
  }

  if (!appt) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={BRAND.gray300} />
        <Text style={styles.notFoundText}>Appointment not found</Text>
      </View>
    );
  }

  const date = new Date(appt.date);
  const statusColors = {
    scheduled: BRAND.primary,
    confirmed: BRAND.success,
    completed: BRAND.gray400,
    cancelled: BRAND.error,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[appt.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[appt.status] }]}>
            {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.providerName}>{appt.provider}</Text>
        <Text style={styles.specialty}>{appt.specialty}</Text>
        <Text style={styles.type}>{appt.type}</Text>
      </View>

      {/* Details */}
      <View style={styles.detailsCard}>
        <DetailRow icon="calendar-outline" label="Date" value={date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
        <DetailRow icon="time-outline" label="Time" value={appt.time} />
        <DetailRow icon="location-outline" label="Location" value={appt.location} />
      </View>

      {appt.notes ? (
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{appt.notes}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.85 }]}
          onPress={() => {
            const address = encodeURIComponent(appt.location);
            Linking.openURL(`https://maps.google.com/?q=${address}`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Get directions"
        >
          <Ionicons name="navigate-outline" size={20} color={BRAND.primary} />
          <Text style={styles.actionText}>Get Directions</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.85 }]}
          onPress={() => {
            // Add to device calendar (expo-calendar in future)
            Linking.openURL(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appt.type + ' - ' + appt.provider)}&dates=${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(appt.location)}`);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add to calendar"
        >
          <Ionicons name="add-circle-outline" size={20} color={BRAND.primary} />
          <Text style={styles.actionText}>Add to Calendar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={20} color={BRAND.primary} style={{ marginRight: 12 }} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: BRAND.gray400, marginTop: 12 },
  headerCard: {
    backgroundColor: BRAND.white, borderRadius: 16, padding: 20, marginBottom: 12,
    alignItems: 'center',
  },
  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  statusText: { fontSize: 13, fontWeight: '600' },
  providerName: { fontSize: 22, fontWeight: '700', color: BRAND.deepNavy },
  specialty: { fontSize: 15, color: BRAND.gray500, marginTop: 4 },
  type: { fontSize: 14, color: BRAND.primary, marginTop: 4, fontWeight: '500' },
  detailsCard: { backgroundColor: BRAND.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BRAND.gray100 },
  detailLabel: { fontSize: 12, color: BRAND.gray400, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 15, color: BRAND.deepNavy, marginTop: 2 },
  notesCard: { backgroundColor: BRAND.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  notesTitle: { fontSize: 15, fontWeight: '600', color: BRAND.deepNavy, marginBottom: 8 },
  notesText: { fontSize: 14, color: BRAND.gray500, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND.white, borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: BRAND.gray200,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: BRAND.primary },
});
