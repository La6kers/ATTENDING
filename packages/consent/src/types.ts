// =============================================================================
// ATTENDING AI - Patient Consent Types
// packages/consent/src/types.ts
//
// CMS HTE patient consent for data access, AI analysis, and network queries
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Consent Types
// =============================================================================

export type ConsentType =
  | 'fhir-data-access'    // Access to FHIR data from CMS-Aligned Networks
  | 'ai-analysis'          // AI-powered analysis of health records
  | 'data-sharing'         // Sharing data with providers
  | 'research'             // De-identified data for research
  | 'emergency-access';    // Emergency override consent

export type ConsentStatus = 'active' | 'revoked' | 'expired' | 'pending';

// =============================================================================
// Data Categories (matches FHIR client)
// =============================================================================

export type DataCategory =
  | 'demographics'
  | 'conditions'
  | 'medications'
  | 'allergies'
  | 'labs'
  | 'vitals'
  | 'encounters'
  | 'procedures'
  | 'immunizations'
  | 'documents'
  | 'claims'
  | 'imaging';

export const ALL_DATA_CATEGORIES: DataCategory[] = [
  'demographics', 'conditions', 'medications', 'allergies',
  'labs', 'vitals', 'encounters', 'procedures',
  'immunizations', 'documents', 'claims', 'imaging',
];

// =============================================================================
// Consent Grant
// =============================================================================

export const ConsentGrantSchema = z.object({
  patientId: z.string().min(1),
  organizationId: z.string().min(1),
  consentType: z.enum([
    'fhir-data-access', 'ai-analysis', 'data-sharing', 'research', 'emergency-access',
  ]),
  dataCategories: z.array(z.enum([
    'demographics', 'conditions', 'medications', 'allergies',
    'labs', 'vitals', 'encounters', 'procedures',
    'immunizations', 'documents', 'claims', 'imaging',
  ])),
  networkIds: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type ConsentGrant = z.infer<typeof ConsentGrantSchema>;

// =============================================================================
// Consent Record (stored in database)
// =============================================================================

export interface ConsentRecord {
  id: string;
  patientId: string;
  organizationId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  dataCategories: DataCategory[];
  networkIds: string[];
  purpose?: string;
  grantedAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  grantedBy: string;   // IAL2-verified identity subject
  revokedBy?: string;
  auditTrail: ConsentAuditEntry[];
}

export interface ConsentAuditEntry {
  action: 'granted' | 'revoked' | 'modified' | 'accessed' | 'expired';
  timestamp: Date;
  actor: string;
  details?: string;
}

// =============================================================================
// Consent Check Result
// =============================================================================

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentId?: string;
  allowedCategories: DataCategory[];
  deniedCategories: DataCategory[];
  allowedNetworks: string[];
  expiresAt?: Date;
}
