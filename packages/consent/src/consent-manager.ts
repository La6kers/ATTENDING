// =============================================================================
// ATTENDING AI - Patient Consent Manager
// packages/consent/src/consent-manager.ts
//
// Manages patient consent for CMS HTE data access
// Enforces query specificity — patients control what data is retrieved
// =============================================================================

import type {
  ConsentGrant,
  ConsentRecord,
  ConsentCheckResult,
  ConsentType,
  DataCategory,
  ConsentAuditEntry,
} from './types';
import { ConsentGrantSchema, ALL_DATA_CATEGORIES } from './types';

// =============================================================================
// Consent Storage Interface (implemented by Prisma adapter)
// =============================================================================

export interface ConsentStorage {
  create(record: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord>;
  findByPatient(patientId: string, organizationId: string): Promise<ConsentRecord[]>;
  findById(id: string): Promise<ConsentRecord | null>;
  update(id: string, updates: Partial<ConsentRecord>): Promise<ConsentRecord>;
  appendAudit(id: string, entry: ConsentAuditEntry): Promise<void>;
}

// =============================================================================
// Consent Manager
// =============================================================================

export class ConsentManager {
  private storage: ConsentStorage;

  constructor(storage: ConsentStorage) {
    this.storage = storage;
  }

  // ---------------------------------------------------------------------------
  // Grant Consent
  // ---------------------------------------------------------------------------

  async grantConsent(grant: ConsentGrant, grantedBy: string): Promise<ConsentRecord> {
    // Validate the grant request
    const validated = ConsentGrantSchema.parse(grant);

    // Check for existing active consent of same type
    const existing = await this.getActiveConsent(
      validated.patientId,
      validated.organizationId,
      validated.consentType,
    );

    if (existing) {
      // Update existing consent
      const updated = await this.storage.update(existing.id, {
        dataCategories: validated.dataCategories,
        networkIds: validated.networkIds || [],
        expiresAt: validated.expiresAt,
        status: 'active',
      });

      await this.storage.appendAudit(existing.id, {
        action: 'modified',
        timestamp: new Date(),
        actor: grantedBy,
        details: `Updated categories: ${validated.dataCategories.join(', ')}`,
      });

      return updated;
    }

    // Create new consent record
    const record = await this.storage.create({
      patientId: validated.patientId,
      organizationId: validated.organizationId,
      consentType: validated.consentType,
      status: 'active',
      dataCategories: validated.dataCategories,
      networkIds: validated.networkIds || [],
      purpose: validated.purpose,
      grantedAt: new Date(),
      expiresAt: validated.expiresAt,
      grantedBy,
      auditTrail: [{
        action: 'granted',
        timestamp: new Date(),
        actor: grantedBy,
        details: `Consent granted for: ${validated.dataCategories.join(', ')}`,
      }],
    });

    return record;
  }

  // ---------------------------------------------------------------------------
  // Revoke Consent
  // ---------------------------------------------------------------------------

  async revokeConsent(consentId: string, revokedBy: string, reason?: string): Promise<ConsentRecord> {
    const consent = await this.storage.findById(consentId);
    if (!consent) throw new Error(`Consent ${consentId} not found`);
    if (consent.status === 'revoked') throw new Error(`Consent ${consentId} already revoked`);

    const updated = await this.storage.update(consentId, {
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy,
    });

    await this.storage.appendAudit(consentId, {
      action: 'revoked',
      timestamp: new Date(),
      actor: revokedBy,
      details: reason || 'Patient revoked consent',
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Check Consent
  // ---------------------------------------------------------------------------

  async checkConsent(params: {
    patientId: string;
    organizationId: string;
    consentType: ConsentType;
    requestedCategories?: DataCategory[];
    networkId?: string;
  }): Promise<ConsentCheckResult> {
    const consent = await this.getActiveConsent(
      params.patientId,
      params.organizationId,
      params.consentType,
    );

    if (!consent) {
      return {
        hasConsent: false,
        allowedCategories: [],
        deniedCategories: params.requestedCategories || ALL_DATA_CATEGORIES,
        allowedNetworks: [],
      };
    }

    // Check expiration
    if (consent.expiresAt && new Date() > consent.expiresAt) {
      await this.storage.update(consent.id, { status: 'expired' });
      await this.storage.appendAudit(consent.id, {
        action: 'expired',
        timestamp: new Date(),
        actor: 'system',
      });

      return {
        hasConsent: false,
        consentId: consent.id,
        allowedCategories: [],
        deniedCategories: params.requestedCategories || ALL_DATA_CATEGORIES,
        allowedNetworks: [],
        expiresAt: consent.expiresAt,
      };
    }

    // Filter requested categories against consented categories
    const requested = params.requestedCategories || ALL_DATA_CATEGORIES;
    const allowed = requested.filter(c => consent.dataCategories.includes(c));
    const denied = requested.filter(c => !consent.dataCategories.includes(c));

    // Filter network access
    const allowedNetworks = params.networkId
      ? (consent.networkIds.includes(params.networkId) ? [params.networkId] : [])
      : consent.networkIds;

    // Log the access check
    await this.storage.appendAudit(consent.id, {
      action: 'accessed',
      timestamp: new Date(),
      actor: 'system',
      details: `Consent check: ${allowed.length} categories allowed, ${denied.length} denied`,
    });

    return {
      hasConsent: allowed.length > 0,
      consentId: consent.id,
      allowedCategories: allowed,
      deniedCategories: denied,
      allowedNetworks,
      expiresAt: consent.expiresAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Patient Consents
  // ---------------------------------------------------------------------------

  async getPatientConsents(patientId: string, organizationId: string): Promise<ConsentRecord[]> {
    return this.storage.findByPatient(patientId, organizationId);
  }

  async getActiveConsent(
    patientId: string,
    organizationId: string,
    consentType: ConsentType,
  ): Promise<ConsentRecord | null> {
    const consents = await this.storage.findByPatient(patientId, organizationId);
    return consents.find(c =>
      c.consentType === consentType && c.status === 'active'
    ) || null;
  }
}
