// =============================================================================
// ATTENDING AI - Prisma Consent Storage Adapter
// packages/consent/src/adapters/prisma-consent-storage.ts
//
// Implements ConsentStorage interface backed by Prisma PatientConsent model
// Handles JSON serialization for dataCategories, networkIds, auditTrail
// =============================================================================

import type { ConsentStorage } from '../consent-manager';
import type {
  ConsentRecord,
  ConsentAuditEntry,
  ConsentType,
  ConsentStatus,
  DataCategory,
} from '../types';

// =============================================================================
// Prisma Client Interface (duck-typed to avoid direct @prisma/client dep)
// =============================================================================

export interface PrismaPatientConsentDelegate {
  create(args: { data: Record<string, unknown> }): Promise<PrismaPatientConsent>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<PrismaPatientConsent[]>;
  findUnique(args: { where: { id: string } }): Promise<PrismaPatientConsent | null>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<PrismaPatientConsent>;
}

export interface PrismaPatientConsent {
  id: string;
  patientId: string;
  organizationId: string;
  consentType: string;
  status: string;
  dataCategories: string; // JSON
  networkIds: string | null; // JSON
  purpose: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  expiresAt: Date | null;
  grantedBy: string;
  revokedBy: string | null;
  auditTrail: string | null; // JSON
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaClientLike {
  patientConsent: PrismaPatientConsentDelegate;
}

// =============================================================================
// Prisma Consent Storage
// =============================================================================

export class PrismaConsentStorage implements ConsentStorage {
  private prisma: PrismaClientLike;

  constructor(prisma: PrismaClientLike) {
    this.prisma = prisma;
  }

  async create(record: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord> {
    const row = await this.prisma.patientConsent.create({
      data: {
        patientId: record.patientId,
        organizationId: record.organizationId,
        consentType: record.consentType,
        status: record.status,
        dataCategories: JSON.stringify(record.dataCategories),
        networkIds: JSON.stringify(record.networkIds),
        purpose: record.purpose ?? null,
        grantedAt: record.grantedAt,
        revokedAt: record.revokedAt ?? null,
        expiresAt: record.expiresAt ?? null,
        grantedBy: record.grantedBy,
        revokedBy: record.revokedBy ?? null,
        auditTrail: JSON.stringify(record.auditTrail),
      },
    });

    return this.toDomain(row);
  }

  async findByPatient(patientId: string, organizationId: string): Promise<ConsentRecord[]> {
    const rows = await this.prisma.patientConsent.findMany({
      where: {
        patientId,
        organizationId,
        deletedAt: null, // Respect soft-delete
      },
      orderBy: { grantedAt: 'desc' },
    });

    return rows.map(row => this.toDomain(row));
  }

  async findById(id: string): Promise<ConsentRecord | null> {
    const row = await this.prisma.patientConsent.findUnique({
      where: { id },
    });

    if (!row || row.deletedAt) return null;

    return this.toDomain(row);
  }

  async update(id: string, updates: Partial<ConsentRecord>): Promise<ConsentRecord> {
    const data: Record<string, unknown> = {};

    if (updates.status !== undefined) data.status = updates.status;
    if (updates.dataCategories !== undefined) data.dataCategories = JSON.stringify(updates.dataCategories);
    if (updates.networkIds !== undefined) data.networkIds = JSON.stringify(updates.networkIds);
    if (updates.purpose !== undefined) data.purpose = updates.purpose;
    if (updates.revokedAt !== undefined) data.revokedAt = updates.revokedAt;
    if (updates.revokedBy !== undefined) data.revokedBy = updates.revokedBy;
    if (updates.expiresAt !== undefined) data.expiresAt = updates.expiresAt;

    const row = await this.prisma.patientConsent.update({
      where: { id },
      data,
    });

    return this.toDomain(row);
  }

  async appendAudit(id: string, entry: ConsentAuditEntry): Promise<void> {
    const row = await this.prisma.patientConsent.findUnique({ where: { id } });
    if (!row) throw new Error(`Consent record ${id} not found`);

    const existing: ConsentAuditEntry[] = row.auditTrail
      ? JSON.parse(row.auditTrail)
      : [];

    existing.push(entry);

    await this.prisma.patientConsent.update({
      where: { id },
      data: { auditTrail: JSON.stringify(existing) },
    });
  }

  // ---------------------------------------------------------------------------
  // Row → Domain mapping
  // ---------------------------------------------------------------------------

  private toDomain(row: PrismaPatientConsent): ConsentRecord {
    return {
      id: row.id,
      patientId: row.patientId,
      organizationId: row.organizationId,
      consentType: row.consentType as ConsentType,
      status: row.status as ConsentStatus,
      dataCategories: JSON.parse(row.dataCategories) as DataCategory[],
      networkIds: row.networkIds ? JSON.parse(row.networkIds) as string[] : [],
      purpose: row.purpose ?? undefined,
      grantedAt: row.grantedAt,
      revokedAt: row.revokedAt ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      grantedBy: row.grantedBy,
      revokedBy: row.revokedBy ?? undefined,
      auditTrail: row.auditTrail ? JSON.parse(row.auditTrail) as ConsentAuditEntry[] : [],
    };
  }
}
