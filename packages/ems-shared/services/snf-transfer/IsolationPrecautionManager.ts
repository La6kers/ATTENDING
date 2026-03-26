/**
 * Isolation Precaution Manager
 *
 * Tier 0 service — assembles isolation precaution data from SNF infection
 * control records for structured transmission to the receiving hospital.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 6
 */

import type {
  InteractIsolationEntry,
  InteractIsolationPrecautions,
  IsolationPrecautionType,
  CultureSource,
} from '../../types/interact.types';

export interface IsolationRecord {
  id: string;
  patientId: string;
  precautionType: IsolationPrecautionType;
  organism?: string;
  organismCode?: string;
  cultureDate?: string;
  cultureSource?: CultureSource;
  susceptibilities?: Record<string, string>;
  ppeRequirements: string[];
  roomRequirements: string;
  clearanceCriteria?: string;
  status: 'ACTIVE' | 'CLEARED' | 'PENDING_CLEARANCE';
  startDate: string;
  endDate?: string;
}

export interface IIsolationPrecautionManager {
  assembleIsolationData(patientId: string, records: IsolationRecord[]): InteractIsolationPrecautions;
  determineRoomRequirements(precautions: InteractIsolationEntry[]): string;
  isMDRO(organism: string): boolean;
  getPpeForPrecautionType(type: IsolationPrecautionType): string[];
}

export class IsolationPrecautionManager implements IIsolationPrecautionManager {
  private static readonly MDRO_ORGANISMS = [
    'MRSA', 'VRE', 'CRE', 'ESBL', 'CRKP',
    'carbapenem-resistant', 'multidrug-resistant',
  ];

  assembleIsolationData(
    patientId: string,
    records: IsolationRecord[]
  ): InteractIsolationPrecautions {
    const activeRecords = records.filter((r) => r.status === 'ACTIVE');

    const precautions: InteractIsolationEntry[] = activeRecords.map((record) => ({
      precautionType: record.precautionType,
      organism: record.organism ?? 'Unspecified',
      organismCode: record.organismCode,
      cultureDate: record.cultureDate ?? 'Unknown',
      cultureSource: record.cultureSource ?? 'nares',
      susceptibilities: record.susceptibilities,
      ppeRequirements: record.ppeRequirements.length > 0
        ? record.ppeRequirements
        : this.getPpeForPrecautionType(record.precautionType),
      roomRequirements: record.roomRequirements,
      clearanceCriteria: record.clearanceCriteria,
    }));

    return {
      hasActiveIsolation: precautions.length > 0,
      precautions,
    };
  }

  determineRoomRequirements(precautions: InteractIsolationEntry[]): string {
    // Most restrictive requirement wins
    if (precautions.some((p) => p.roomRequirements === 'NEGATIVE_PRESSURE')) {
      return 'NEGATIVE_PRESSURE';
    }
    if (precautions.some((p) => p.roomRequirements === 'ANTEROOM')) {
      return 'ANTEROOM';
    }
    if (precautions.length > 0) {
      return 'PRIVATE';
    }
    return 'STANDARD';
  }

  isMDRO(organism: string): boolean {
    const lower = organism.toLowerCase();
    return IsolationPrecautionManager.MDRO_ORGANISMS.some((o) =>
      lower.includes(o.toLowerCase())
    );
  }

  getPpeForPrecautionType(type: IsolationPrecautionType): string[] {
    switch (type) {
      case 'CONTACT':
        return ['gown', 'gloves'];
      case 'DROPLET':
        return ['surgical_mask', 'gloves'];
      case 'AIRBORNE':
        return ['N95', 'gloves', 'gown', 'eye_protection'];
      case 'CONTACT_PLUS':
        return ['gown', 'gloves', 'surgical_mask'];
      case 'ENTERIC':
        return ['gown', 'gloves'];
      case 'NEUTROPENIC_REVERSE':
        return ['gown', 'gloves', 'surgical_mask'];
      default:
        return ['gloves'];
    }
  }
}
