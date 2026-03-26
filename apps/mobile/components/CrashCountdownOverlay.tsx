// ============================================================
// ATTENDING AI — Crash Countdown Overlay
// apps/mobile/components/CrashCountdownOverlay.tsx
//
// Full-screen modal shown during crash countdown.
// "I'm OK" button cancels the alert. Audio + haptic feedback.
// ============================================================

import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { BRAND } from '../lib/constants';

interface Props {
  visible: boolean;
  remaining: number;
  onCancel: () => void;
}

export function CrashCountdownOverlay({ visible, remaining, onCancel }: Props) {
  useEffect(() => {
    if (!visible) return;
    // Haptic feedback each second
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [remaining, visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <Ionicons name="warning" size={64} color={BRAND.white} style={styles.icon} />

        <Text style={styles.title}>Crash Detected</Text>
        <Text style={styles.subtitle}>
          Emergency contacts will be notified in
        </Text>

        <View style={styles.countdownCircle}>
          <Text style={styles.countdownNumber}>{remaining}</Text>
          <Text style={styles.countdownLabel}>seconds</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.9 }]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel emergency alert, I am okay"
        >
          <Ionicons name="checkmark-circle" size={28} color={BRAND.success} />
          <Text style={styles.cancelText}>I'm OK</Text>
        </Pressable>

        <Text style={styles.helpText}>
          If you cannot respond, emergency services and your contacts will be notified automatically.
        </Text>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: BRAND.coral, alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  icon: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: BRAND.white, marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 32 },
  countdownCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: BRAND.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  countdownNumber: { fontSize: 56, fontWeight: '800', color: BRAND.white },
  countdownLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: -4 },
  cancelButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BRAND.white, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 40,
    marginBottom: 24,
  },
  cancelText: { fontSize: 20, fontWeight: '700', color: BRAND.deepNavy },
  helpText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
});
