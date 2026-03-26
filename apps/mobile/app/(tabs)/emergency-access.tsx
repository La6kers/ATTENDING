import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useCrashDetection } from '../../hooks/useCrashDetection';
import { CrashCountdownOverlay } from '../../components/CrashCountdownOverlay';
import { useApiQuery } from '../../hooks/useApi';
import { emergencyApi, type EmergencyContact } from '../../lib/api/emergency';
import { patientApi } from '../../lib/api/patient';
import { BRAND } from '../../lib/constants';

export default function EmergencyAccessScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const crash = useCrashDetection();
  const contacts = useApiQuery(() => emergencyApi.getContacts(), []);
  const medicalId = useApiQuery(() => patientApi.getMedicalID(), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([contacts.refetch(), medicalId.refetch()]);
    setRefreshing(false);
  }, [contacts, medicalId]);

  const handleCall911 = useCallback(() => {
    if (Platform.OS === 'web') {
      Alert.alert('Emergency Call', 'Dialing 911 is not available in the web preview.');
      return;
    }
    Alert.alert('Call 911', 'Are you sure you want to call emergency services?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
    ]);
  }, []);

  const handleCallContact = useCallback((contact: EmergencyContact) => {
    if (Platform.OS === 'web') {
      Alert.alert('Call', `Would call ${contact.name} at ${contact.phone}`);
      return;
    }
    Linking.openURL(`tel:${contact.phone}`);
  }, []);

  const toggleCrashDetection = useCallback(() => {
    if (crash.isMonitoring || crash.state !== 'IDLE') {
      crash.disable();
    } else {
      crash.enable();
    }
  }, [crash]);

  const showCountdown = crash.state === 'COUNTDOWN' || crash.state === 'IMPACT_DETECTED' || crash.state === 'STILLNESS_CHECK';
  const contactList = contacts.data ?? [];

  return (
    <View style={{ flex: 1 }}>
      <CrashCountdownOverlay
        visible={showCountdown}
        remaining={crash.countdownRemaining}
        onCancel={crash.cancel}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />}
      >
        {/* Emergency Call */}
        <Pressable
          style={({ pressed }) => [styles.emergencyButton, pressed && { opacity: 0.9 }]}
          onPress={handleCall911}
          accessibilityRole="button"
          accessibilityLabel="Call 911 emergency services"
        >
          <Ionicons name="call" size={36} color={BRAND.white} />
          <Text style={styles.emergencyButtonText}>Call 911</Text>
          <Text style={styles.emergencyButtonSub}>Tap to call emergency services</Text>
        </Pressable>

        {/* Crash Detection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crash Detection</Text>
          <Pressable
            style={[styles.toggleCard, crash.isMonitoring && styles.toggleCardActive]}
            onPress={toggleCrashDetection}
            accessibilityRole="switch"
            accessibilityState={{ checked: crash.isMonitoring }}
          >
            <View style={styles.toggleRow}>
              <Ionicons
                name={crash.isMonitoring ? 'shield-checkmark' : 'shield-outline'}
                size={24}
                color={crash.isMonitoring ? BRAND.primary : BRAND.gray400}
              />
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>
                  {crash.isMonitoring ? 'Monitoring Active' : 'Disabled'}
                </Text>
                <Text style={styles.toggleSub}>
                  Threshold: {crash.settings?.gForceThreshold ?? 4.0}G · {crash.settings?.countdownSeconds ?? 30}s countdown
                </Text>
              </View>
              <View style={[styles.toggleIndicator, crash.isMonitoring && styles.toggleIndicatorActive]}>
                <View style={[styles.toggleDot, crash.isMonitoring && styles.toggleDotActive]} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {contacts.loading && !contacts.data ? (
            <ActivityIndicator color={BRAND.primary} style={{ marginVertical: 20 }} />
          ) : contactList.length > 0 ? (
            contactList.map((contact) => (
              <Pressable
                key={contact.id}
                style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.85 }]}
                onPress={() => handleCallContact(contact)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${contact.name}, ${contact.relationship}`}
              >
                <Ionicons name="person-circle-outline" size={40} color={BRAND.primary} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>{contact.relationship}</Text>
                </View>
                {contact.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <Ionicons name="call-outline" size={22} color={BRAND.primary} />
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No emergency contacts configured. Add contacts in Settings.</Text>
            </View>
          )}
        </View>

        {/* Medical ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical ID</Text>
          {medicalId.data ? (
            <View style={styles.medIdCard}>
              <View style={styles.medIdRow}>
                <Text style={styles.medIdLabel}>Blood Type</Text>
                <Text style={styles.medIdValue}>{medicalId.data.bloodType}</Text>
              </View>
              <View style={styles.medIdRow}>
                <Text style={styles.medIdLabel}>Allergies</Text>
                <Text style={styles.medIdValue}>
                  {medicalId.data.allergies.length > 0
                    ? medicalId.data.allergies.map((a) => a.name).join(', ')
                    : 'None recorded'}
                </Text>
              </View>
              <View style={styles.medIdRow}>
                <Text style={styles.medIdLabel}>Conditions</Text>
                <Text style={styles.medIdValue}>
                  {medicalId.data.conditions.length > 0
                    ? medicalId.data.conditions.map((c) => c.name).join(', ')
                    : 'None recorded'}
                </Text>
              </View>
              {medicalId.data.emergencyNotes ? (
                <View style={[styles.medIdRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.medIdLabel}>Notes</Text>
                  <Text style={styles.medIdValue}>{medicalId.data.emergencyNotes}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Medical ID information will be visible to first responders even when the device is locked.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 16, paddingBottom: 32 },
  emergencyButton: {
    backgroundColor: BRAND.coral, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: BRAND.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  emergencyButtonText: { fontSize: 24, fontWeight: '800', color: BRAND.white, marginTop: 8 },
  emergencyButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: BRAND.gray500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  toggleCard: { backgroundColor: BRAND.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BRAND.gray200 },
  toggleCardActive: { borderColor: BRAND.primary, backgroundColor: '#F0FDFA' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleContent: { flex: 1, marginLeft: 12 },
  toggleTitle: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy },
  toggleSub: { fontSize: 13, color: BRAND.gray500, marginTop: 2 },
  toggleIndicator: { width: 48, height: 28, borderRadius: 14, backgroundColor: BRAND.gray300, justifyContent: 'center', paddingHorizontal: 3 },
  toggleIndicatorActive: { backgroundColor: BRAND.primary },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND.white },
  toggleDotActive: { alignSelf: 'flex-end' },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 8 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: BRAND.deepNavy },
  contactRelation: { fontSize: 13, color: BRAND.gray500, marginTop: 1 },
  primaryBadge: { backgroundColor: BRAND.primary + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 11, fontWeight: '600', color: BRAND.primary },
  emptyCard: { backgroundColor: BRAND.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BRAND.gray200 },
  emptyText: { fontSize: 14, color: BRAND.gray500, lineHeight: 20 },
  medIdCard: { backgroundColor: BRAND.white, borderRadius: 14, overflow: 'hidden' },
  medIdRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: BRAND.gray100 },
  medIdLabel: { fontSize: 14, fontWeight: '600', color: BRAND.gray500 },
  medIdValue: { fontSize: 14, color: BRAND.deepNavy, flex: 1, textAlign: 'right', marginLeft: 12 },
});
