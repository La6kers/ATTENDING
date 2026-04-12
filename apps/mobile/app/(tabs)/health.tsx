import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useApiQuery } from '../../hooks/useApi';
import { patientApi, type VitalSigns, type Medication, type MedicationCostSummary, type MedicationCostItem } from '../../lib/api/patient';
import { BRAND } from '../../lib/constants';

function formatVitals(v: VitalSigns | null) {
  if (!v) return [];
  return [
    { label: 'Heart Rate', value: String(v.heartRate), unit: 'bpm', icon: 'heart' as const, status: v.heartRate > 100 || v.heartRate < 60 ? 'warning' : 'normal' },
    { label: 'Blood Pressure', value: `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`, unit: 'mmHg', icon: 'pulse' as const, status: v.bloodPressureSystolic > 140 ? 'warning' : 'normal' },
    { label: 'Temperature', value: v.temperature.toFixed(1), unit: '°F', icon: 'thermometer-outline' as const, status: v.temperature > 100.4 ? 'alert' : 'normal' },
    { label: 'O₂ Saturation', value: String(v.oxygenSaturation), unit: '%', icon: 'water-outline' as const, status: v.oxygenSaturation < 95 ? 'alert' : 'normal' },
  ];
}

const statusColor = { normal: BRAND.primary, warning: '#F59E0B', alert: BRAND.coral };

export default function HealthScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const vitals = useApiQuery(() => patientApi.getVitals(), []);
  const meds = useApiQuery(() => patientApi.getMedications(), []);
  const appointments = useApiQuery(() => patientApi.getAppointments({ upcoming: true }), []);
  const medCosts = useApiQuery(() => patientApi.getMedicationPrices(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([vitals.refetch(), meds.refetch(), appointments.refetch(), medCosts.refetch()]);
    setRefreshing(false);
  }, [vitals, meds, appointments, medCosts]);

  const vitalCards = formatVitals(vitals.data ?? null);
  const activeMeds = (meds.data ?? []).filter((m) => m.isActive);
  const upcomingAppts = appointments.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
    >
      {/* Vitals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Vitals</Text>
        {vitals.loading && !vitals.data ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginVertical: 20 }} />
        ) : vitalCards.length > 0 ? (
          <View style={styles.vitalsGrid}>
            {vitalCards.map((v) => (
              <View key={v.label} style={styles.vitalCard} accessibilityLabel={`${v.label}: ${v.value} ${v.unit}`}>
                <View style={[styles.vitalIconBg, { backgroundColor: statusColor[v.status as keyof typeof statusColor] + '18' }]}>
                  <Ionicons name={v.icon} size={22} color={statusColor[v.status as keyof typeof statusColor]} />
                </View>
                <Text style={styles.vitalValue}>{v.value}<Text style={styles.vitalUnit}> {v.unit}</Text></Text>
                <Text style={styles.vitalLabel}>{v.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <PlaceholderCard icon="pulse-outline" title="No vitals available" text="Vitals will appear here once recorded by your care team." />
        )}
      </View>

      {/* Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications</Text>
        {meds.loading && !meds.data ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginVertical: 20 }} />
        ) : activeMeds.length > 0 ? (
          activeMeds.map((med) => (
            <View key={med.id} style={styles.medCard}>
              <View style={styles.medIcon}>
                <Ionicons name="medkit" size={20} color={BRAND.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDetail}>{med.dosage} · {med.frequency}</Text>
              </View>
            </View>
          ))
        ) : (
          <PlaceholderCard icon="medkit-outline" title="No medications loaded" text="Medication data will sync from your care provider once connected." />
        )}
      </View>

      {/* Medication Costs */}
      {medCosts.data && medCosts.data.medicationCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Costs</Text>
          <View style={styles.costBanner}>
            <View style={styles.costRow}>
              <View>
                <Text style={styles.costLabel}>Monthly Estimate</Text>
                <Text style={styles.costValue}>${medCosts.data.totalMonthlyEstimate.toFixed(2)}</Text>
              </View>
              <View>
                <Text style={styles.costLabel}>Lowest Available</Text>
                <Text style={[styles.costValue, { color: BRAND.primary }]}>${medCosts.data.totalLowestCost.toFixed(2)}</Text>
              </View>
              {medCosts.data.totalSavings > 0 && (
                <View>
                  <Text style={styles.costLabel}>You Could Save</Text>
                  <Text style={[styles.costValue, { color: BRAND.success }]}>${medCosts.data.totalSavings.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>
          {medCosts.data.medications.map((med: MedicationCostItem) => (
            <View key={med.name} style={styles.costMedCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>{med.strength} · Qty {med.quantity}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.costValue, { fontSize: 18, color: BRAND.primary }]}>${med.lowestPrice.toFixed(2)}</Text>
                  {med.savings > 0 && (
                    <Text style={{ fontSize: 11, color: BRAND.success }}>Save ${med.savings.toFixed(2)}</Text>
                  )}
                </View>
              </View>
              <Text style={{ fontSize: 12, color: BRAND.gray400, marginTop: 4 }}>
                Cheapest at {med.cheapestPharmacy}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Appointments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {appointments.loading && !appointments.data ? (
          <ActivityIndicator color={BRAND.primary} style={{ marginVertical: 20 }} />
        ) : upcomingAppts.length > 0 ? (
          upcomingAppts.slice(0, 3).map((appt) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptDateBox}>
                <Text style={styles.apptDateDay}>{new Date(appt.date).getDate()}</Text>
                <Text style={styles.apptDateMonth}>{new Date(appt.date).toLocaleString('default', { month: 'short' })}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.medName}>{appt.provider}</Text>
                <Text style={styles.medDetail}>{appt.specialty} · {appt.time}</Text>
                <Text style={styles.medDetail}>{appt.location}</Text>
              </View>
            </View>
          ))
        ) : (
          <PlaceholderCard icon="calendar-outline" title="No upcoming appointments" text="Schedule your next visit through the Appointments section." />
        )}
      </View>
    </ScrollView>
  );
}

function PlaceholderCard({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return (
    <View style={styles.placeholderCard}>
      <Ionicons name={icon} size={32} color={BRAND.gray400} />
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: BRAND.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalCard: { backgroundColor: BRAND.white, borderRadius: 14, padding: 16, width: '48%', flexGrow: 1, minWidth: 150 },
  vitalIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  vitalValue: { fontSize: 26, fontWeight: '700', color: BRAND.deepNavy },
  vitalUnit: { fontSize: 14, fontWeight: '400', color: BRAND.gray400 },
  vitalLabel: { fontSize: 13, color: BRAND.gray500, marginTop: 4 },
  medCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  medIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: BRAND.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  medName: { fontSize: 15, fontWeight: '600', color: BRAND.deepNavy },
  medDetail: { fontSize: 13, color: BRAND.gray500, marginTop: 2 },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  apptDateBox: { width: 48, height: 48, borderRadius: 10, backgroundColor: BRAND.primary + '15', alignItems: 'center', justifyContent: 'center' },
  apptDateDay: { fontSize: 20, fontWeight: '700', color: BRAND.primary },
  apptDateMonth: { fontSize: 11, fontWeight: '600', color: BRAND.primary, textTransform: 'uppercase' },
  placeholderCard: {
    backgroundColor: BRAND.white, borderRadius: 14, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: BRAND.gray200, borderStyle: 'dashed',
  },
  placeholderTitle: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy, marginTop: 12 },
  placeholderText: { fontSize: 14, color: BRAND.gray400, textAlign: 'center', lineHeight: 20, marginTop: 6 },
  costBanner: {
    backgroundColor: BRAND.primary + '10', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: BRAND.primary + '30',
  },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 11, color: BRAND.gray500, textTransform: 'uppercase', fontWeight: '600' },
  costValue: { fontSize: 20, fontWeight: '700', color: BRAND.deepNavy, marginTop: 2 },
  costMedCard: {
    backgroundColor: BRAND.white, borderRadius: 12, padding: 14, marginBottom: 8,
  },
});
