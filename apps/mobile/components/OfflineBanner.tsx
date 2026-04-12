// ============================================================
// ATTENDING AI — Offline Banner
// apps/mobile/components/OfflineBanner.tsx
// ============================================================

import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useOffline } from '../hooks/useOffline';
import { BRAND } from '../lib/constants';

export function OfflineBanner() {
  const { isConnected, isSyncing, triggerSync } = useOffline();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: !isConnected || isSyncing ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, isSyncing, translateY]);

  if (isConnected && !isSyncing) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Ionicons
        name={isSyncing ? 'sync' : 'cloud-offline-outline'}
        size={18}
        color={BRAND.white}
      />
      <Text style={styles.text}>
        {isSyncing ? 'Syncing queued requests...' : 'No internet connection'}
      </Text>
      {!isConnected && (
        <Pressable onPress={triggerSync} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: BRAND.warning, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, gap: 8,
  },
  text: { fontSize: 13, fontWeight: '600', color: BRAND.white },
  retryButton: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  retryText: { fontSize: 12, fontWeight: '600', color: BRAND.white },
});
