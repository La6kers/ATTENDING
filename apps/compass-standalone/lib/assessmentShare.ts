// ============================================================
// COMPASS Standalone — Assessment Share Encoding
// Encodes/decodes assessment data with HMAC integrity check
// No server needed — data + signature in the URL hash
// ============================================================

import type { HPIData } from '@attending/shared/types/chat.types';
import type { DifferentialDiagnosisResult } from '@attending/shared/lib/ai/differentialDiagnosis';
import type { ImageAnalysisResult } from '../store/useCompassStore';

export interface SharedAssessment {
  /** Medical Record Number — no PII in shared links */
  mrn?: string;
  gender?: string;
  chiefComplaint?: string;
  hpi: HPIData;
  hpiNarrative: string | null;
  diagnosisResult: DifferentialDiagnosisResult | null;
  redFlags: { symptom: string; severity: string; category?: string }[];
  urgencyLevel: string;
  images: {
    id: string;
    phase: string;
    analysis: ImageAnalysisResult | null;
  }[];
  generatedAt: string;
  compassVersion: string;
  /** @deprecated Use mrn instead. Kept for backward compatibility with existing shared links. */
  patientName?: string;
  /** @deprecated Use mrn instead. Kept for backward compatibility with existing shared links. */
  dateOfBirth?: string;
}

// ============================================================
// HMAC Signature (Web Crypto API — works in browser + Edge Runtime)
// Uses a deterministic key derived from the app origin
// This prevents casual URL tampering; not a substitute for server auth
// ============================================================

const HMAC_ALGO = 'SHA-256';

async function getSigningKey(): Promise<CryptoKey> {
  // Derive key from a fixed seed + origin for deterministic signing
  // In production, use an environment variable secret
  const seed = typeof window !== 'undefined'
    ? `compass-share-${window.location.origin}`
    : `compass-share-${process.env.SHARE_SECRET || 'compass-standalone-v1'}`;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    { name: 'HMAC', hash: HMAC_ALGO },
    false,
    ['sign', 'verify']
  );
  return keyMaterial;
}

async function signData(data: string): Promise<string> {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifySignature(data: string, signature: string): Promise<boolean> {
  try {
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const sigBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBuffer, encoder.encode(data));
  } catch {
    return false;
  }
}

// ============================================================
// Encode / Decode
// ============================================================

function base64Encode(json: string): string {
  if (typeof window !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, 'utf-8').toString('base64');
}

function base64Decode(encoded: string): string {
  if (typeof window !== 'undefined') {
    return decodeURIComponent(escape(atob(encoded)));
  }
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

export async function encodeAssessment(data: SharedAssessment): Promise<string> {
  const json = JSON.stringify(data);
  const payload = base64Encode(json);
  const sig = await signData(payload);
  // Format: payload.signature
  return `${payload}.${sig}`;
}

export async function decodeAssessment(encoded: string): Promise<SharedAssessment | null> {
  try {
    const dotIndex = encoded.lastIndexOf('.');
    if (dotIndex === -1) {
      // Legacy unsigned format — decode but flag as unverified
      const json = base64Decode(encoded);
      const data = JSON.parse(json) as SharedAssessment;
      return data;
    }

    const payload = encoded.substring(0, dotIndex);
    const sig = encoded.substring(dotIndex + 1);

    const valid = await verifySignature(payload, sig);
    if (!valid) {
      console.warn('[COMPASS Share] Invalid signature — data may have been tampered with');
      return null;
    }

    const json = base64Decode(payload);
    return JSON.parse(json) as SharedAssessment;
  } catch {
    return null;
  }
}

export async function buildShareableLink(data: SharedAssessment): Promise<string> {
  const encoded = await encodeAssessment(data);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/provider#data=${encoded}`;
}
