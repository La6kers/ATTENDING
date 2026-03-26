// ============================================================
// ATTENDING AI — Certificate Pinning (Phase 1)
// apps/mobile/lib/security/certificatePinning.ts
//
// Phase 1: Response-level certificate fingerprint validation.
// Phase 2 (pre-production): Native config plugin with TrustKit
// (iOS) and OkHttp CertificatePinner (Android).
//
// Note: True certificate pinning requires native module access.
// In Expo managed workflow, this provides API-level validation
// by checking server certificate info when available.
// ============================================================

import * as Crypto from 'expo-crypto';

// SHA-256 fingerprints of trusted certificates
// Update these when certificates are rotated
const PINNED_CERTIFICATES = {
  primary: '', // TODO: Add your primary cert SHA-256 pin
  backup: '',  // TODO: Add backup cert SHA-256 pin
};

/**
 * Validates that the API response came from a trusted server.
 * In managed Expo, we can't access raw TLS certificates,
 * so this validates a custom server-provided certificate header.
 *
 * The backend should include X-Certificate-Fingerprint in responses.
 * This is a defense-in-depth measure, not a replacement for native pinning.
 */
export async function validateCertificateFingerprint(
  response: Response
): Promise<boolean> {
  // Skip in development
  if (__DEV__) return true;

  // Skip if no pins configured
  if (!PINNED_CERTIFICATES.primary) return true;

  const serverFingerprint = response.headers.get('X-Certificate-Fingerprint');
  if (!serverFingerprint) {
    // Header not present — server may not support this yet
    return true;
  }

  return (
    serverFingerprint === PINNED_CERTIFICATES.primary ||
    serverFingerprint === PINNED_CERTIFICATES.backup
  );
}

/**
 * Hash a public key for pinning comparison.
 * Used during certificate rotation to generate new pin values.
 */
export async function hashPublicKey(publicKeyDer: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, publicKeyDer);
}
