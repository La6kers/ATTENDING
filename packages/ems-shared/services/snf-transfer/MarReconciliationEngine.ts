/**
 * MAR Reconciliation Engine
 *
 * Tier 0-1 service implementing medication reconciliation between
 * SNF Medication Administration Records and hospital formulary.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 4
 */

import type {
  SNFMedicationRecord,
  FormularyEntry,
  FormularyMatchResult,
  FormularyMatchType,
  MedicationDiscrepancy,
  DiscrepancyType,
  DiscrepancySeverity,
  ReconciliationResult,
  ReconciliationConfig,
} from '../../types/mar-reconciliation.types';
import {
  DEFAULT_RECONCILIATION_CONFIG,
  HIGH_RISK_MEDICATIONS,
  isHighRiskMedication,
  hasRecentChange,
} from '../../types/mar-reconciliation.types';

export interface IMarReconciliationEngine {
  reconcile(transferId: string): Promise<ReconciliationResult>;
  checkFormularyMatch(medication: SNFMedicationRecord, formulary: FormularyEntry[]): FormularyMatchResult;
  detectTherapeuticDuplications(medications: SNFMedicationRecord[], formulary: FormularyEntry[]): MedicationDiscrepancy[];
  flagHighRiskMedications(medications: SNFMedicationRecord[]): MedicationDiscrepancy[];
  flagRecentChanges(medications: SNFMedicationRecord[], days?: number): MedicationDiscrepancy[];
}

export class MarReconciliationEngine implements IMarReconciliationEngine {
  private config: ReconciliationConfig;

  constructor(config: Partial<ReconciliationConfig> = {}) {
    this.config = { ...DEFAULT_RECONCILIATION_CONFIG, ...config };
  }

  async reconcile(transferId: string): Promise<ReconciliationResult> {
    // In production, fetches medications and formulary from data layer.
    // For now, this shows the reconciliation algorithm structure.
    throw new Error('Not implemented — requires data layer integration');
  }

  checkFormularyMatch(
    medication: SNFMedicationRecord,
    formulary: FormularyEntry[]
  ): FormularyMatchResult {
    // Priority 1: Exact RxNorm match
    if (this.config.enableRxnormMatching && medication.rxnormCode) {
      const rxnormMatch = formulary.find(
        (f) => f.rxnormCode === medication.rxnormCode && f.isOnFormulary
      );
      if (rxnormMatch) {
        return { snfMedication: medication, matchType: 'EXACT_RXNORM', matchedEntry: rxnormMatch, confidence: 1.0 };
      }
    }

    // Priority 2: Generic name match
    if (this.config.enableGenericMatching) {
      const genericName = medication.genericName ?? medication.medicationName;
      const genericMatch = formulary.find(
        (f) => f.genericName.toLowerCase() === genericName.toLowerCase() && f.isOnFormulary
      );
      if (genericMatch) {
        return { snfMedication: medication, matchType: 'GENERIC_MATCH', matchedEntry: genericMatch, confidence: 0.9 };
      }
    }

    // Priority 3: Therapeutic class match
    if (this.config.enableTherapeuticClassMatching && medication.rxnormCode) {
      const offFormulary = formulary.find(
        (f) => f.rxnormCode === medication.rxnormCode && !f.isOnFormulary && f.formularyAlternative
      );
      if (offFormulary) {
        const alternative = formulary.find((f) => f.rxnormCode === offFormulary.formularyAlternativeRxnorm);
        return {
          snfMedication: medication,
          matchType: 'CLASS_MATCH',
          matchedEntry: offFormulary,
          alternativeEntry: alternative ?? offFormulary,
          confidence: 0.7,
        };
      }
    }

    return { snfMedication: medication, matchType: 'NO_MATCH', confidence: 0.0 };
  }

  detectTherapeuticDuplications(
    medications: SNFMedicationRecord[],
    formulary: FormularyEntry[]
  ): MedicationDiscrepancy[] {
    const discrepancies: MedicationDiscrepancy[] = [];
    const medsByClass = new Map<string, SNFMedicationRecord[]>();

    for (const med of medications.filter((m) => m.status === 'ACTIVE')) {
      const entry = formulary.find(
        (f) =>
          f.rxnormCode === med.rxnormCode ||
          f.genericName.toLowerCase() === (med.genericName ?? med.medicationName).toLowerCase()
      );
      if (entry?.therapeuticClass) {
        const existing = medsByClass.get(entry.therapeuticClass) ?? [];
        existing.push(med);
        medsByClass.set(entry.therapeuticClass, existing);
      }
    }

    for (const [className, meds] of medsByClass) {
      if (meds.length <= 1) continue;

      for (let i = 1; i < meds.length; i++) {
        discrepancies.push({
          id: crypto.randomUUID(),
          reconciliationId: '',
          snfMedicationId: meds[i].id,
          discrepancyType: 'THERAPEUTIC_DUPLICATION',
          severity: 'WARNING',
          description: `Potential therapeutic duplication: ${meds[i].medicationName} and ${meds[0].medicationName} are both in class '${className}'`,
          snfMedicationName: meds[i].medicationName,
          snfDose: meds[i].dose,
          snfFrequency: meds[i].frequency,
          interactingMedication: meds[0].medicationName,
          resolution: 'PENDING',
        });
      }
    }

    return discrepancies;
  }

  flagHighRiskMedications(medications: SNFMedicationRecord[]): MedicationDiscrepancy[] {
    return medications
      .filter((m) => m.status === 'ACTIVE' && isHighRiskMedication(m))
      .map((med) => ({
        id: crypto.randomUUID(),
        reconciliationId: '',
        snfMedicationId: med.id,
        discrepancyType: 'HIGH_RISK_MEDICATION' as DiscrepancyType,
        severity: 'WARNING' as DiscrepancySeverity,
        description: `${med.medicationName} is a high-risk medication requiring verification upon hospital admission${med.isControlled ? ` (DEA Schedule ${med.deaSchedule})` : ''}`,
        snfMedicationName: med.medicationName,
        snfDose: med.dose,
        snfFrequency: med.frequency,
        snfRoute: med.route,
        resolution: 'PENDING' as const,
      }));
  }

  flagRecentChanges(medications: SNFMedicationRecord[], days: number = 7): MedicationDiscrepancy[] {
    return medications
      .filter((m) => hasRecentChange(m, days))
      .map((med) => ({
        id: crypto.randomUUID(),
        reconciliationId: '',
        snfMedicationId: med.id,
        discrepancyType: 'RECENT_CHANGE' as DiscrepancyType,
        severity: 'INFO' as DiscrepancySeverity,
        description: `${med.medicationName} had a dose change within the last ${days} days: previous dose ${med.previousDose ?? 'unknown'} → current dose ${med.dose}`,
        snfMedicationName: med.medicationName,
        snfDose: med.dose,
        snfFrequency: med.frequency,
        resolution: 'PENDING' as const,
      }));
  }
}
