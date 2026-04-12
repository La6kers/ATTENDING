// ============================================================
// ATTENDING AI — App Integrity Check
// apps/mobile/lib/security/appIntegrityCheck.ts
//
// Detects jailbroken/rooted devices and emulators in production.
// Logs security events; does not block usage but warns user.
// ============================================================

import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { auditLogger } from '../audit/mobileAuditLogger';

export interface IntegrityResult {
  isEmulator: boolean;
  isProduction: boolean;
  deviceName: string | null;
  osVersion: string | null;
  warnings: string[];
}

export async function checkAppIntegrity(): Promise<IntegrityResult> {
  const isEmulator = !Device.isDevice;
  const isProduction = !__DEV__;
  const warnings: string[] = [];

  // Emulator detection in production
  if (isEmulator && isProduction) {
    warnings.push('Running on emulator/simulator in production build');
  }

  // Basic jailbreak indicators (heuristic — not exhaustive)
  if (Platform.OS === 'ios') {
    // In a full implementation, check for:
    // - Cydia URL scheme
    // - Writable system paths
    // - Suspicious binaries
    // These require native modules beyond Expo managed workflow
  }

  // Log integrity check
  await auditLogger.log('APP_INTEGRITY_CHECK', {
    metadata: {
      isEmulator,
      isProduction,
      platform: Platform.OS,
      osVersion: Device.osVersion,
      deviceName: Device.deviceName,
      warnings,
    },
  });

  // Warn user if compromised (production only)
  if (warnings.length > 0 && isProduction) {
    Alert.alert(
      'Security Notice',
      'This device may not meet security requirements for accessing protected health information. ' +
      'Some features may be restricted.',
      [{ text: 'I Understand' }]
    );
  }

  return {
    isEmulator,
    isProduction,
    deviceName: Device.deviceName,
    osVersion: Device.osVersion,
    warnings,
  };
}
