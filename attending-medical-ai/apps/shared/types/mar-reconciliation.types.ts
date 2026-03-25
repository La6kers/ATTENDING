/**
 * MAR (Medication Administration Record) Reconciliation Type Definitions
 *
 * Domain types for the medication reconciliation engine that compares
 * SNF medication records against the receiving hospital's formulary.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 4
 * @see prisma/p16-schema-additions.prisma
 */

import type { MedicationStatus, MedicationAdminStatus } from './interact.types';

// ---------------------------------------------------------------------------
// SNF Medication Record
// ---------------------------------------------------------------------------

export interface SNFMedicationRecord {
  id: string;
  patientId: string;
  transferRequestId?: string;

  // Identification
  medicationName: string;
  genericName?: string;
  rxnormCode?: string;
  ndcCode?: string;

  // Dosing
  dose: string;
  doseUnit: string;
  frequency: string;
  route: string;
  scheduledTimes: string[]; // ["0800", "1200", "1700", "2100"]

  // PRN
  isPRN: boolean;
  prnIndication?: string;

  // Controlled
  isControlled: boolean;
  deaSchedule?: string;

  // Status
  status: MedicationStatus;
  startDate: string;
  endDate?: string;

  // Hold
  holdStartDate?: string;
  holdEndDate?: string;
  holdReason?: string;

  // Change tracking
  lastDoseChange?: string;
  previousDose?: string;
  previousFrequency?: string;
  changeReason?: string;

  // Recent administrations
  recentAdministrations: MedicationAdministrationEntry[];
}

export interface MedicationAdministrationEntry {
  id: string;
  scheduledTime: string;
  administeredTime?: string;
  administeredBy?: string;
  dose: string;
  doseUnit: string;
  status: MedicationAdminStatus;
  holdReason?: string;
  refusalReason?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Hospital Formulary
// ---------------------------------------------------------------------------

export interface FormularyEntry {
  id: string;
  organizationId: string;
  medicationName: string;
  genericName: string;
  rxnormCode?: string;
  ndcCode?: string;
  isOnFormulary: boolean;
  formularyTier?: 'PREFERRED' | 'NON_PREFERRED' | 'SPECIALTY';
  therapeuticClass?: string;
  therapeuticSubclass?: string;
  formularyAlternative?: string;
  formularyAlternativeRxnorm?: string;
  restrictions?: FormularyRestrictions;
}

export interface FormularyRestrictions {
  priorAuth?: boolean;
  stepTherapy?: boolean;
  quantityLimit?: string;
  ageRestriction?: string;
  diagnosisRestriction?: string[];
}

// ---------------------------------------------------------------------------
// Formulary Match Result
// ---------------------------------------------------------------------------

export type FormularyMatchType =
  | 'EXACT_RXNORM'     // RxNorm code matches directly
  | 'GENERIC_MATCH'    // Generic name matches
  | 'CLASS_MATCH'      // Same therapeutic class, different medication
  | 'NO_MATCH';        // Not on formulary, no direct alternative

export interface FormularyMatchResult {
  snfMedication: SNFMedicationRecord;
  matchType: FormularyMatchType;
  matchedEntry?: FormularyEntry;
  alternativeEntry?: FormularyEntry;
  confidence: number; // 0-1
}

// ---------------------------------------------------------------------------
// Discrepancy Types
// ---------------------------------------------------------------------------

export type DiscrepancyType =
  | 'MISSING_FROM_FORMULARY'
  | 'DOSE_MISMATCH'
  | 'FREQUENCY_MISMATCH'
  | 'THERAPEUTIC_DUPLICATION'
  | 'DRUG_INTERACTION'
  | 'ALLERGY_CONFLICT'
  | 'RECENT_CHANGE'
  | 'CONTROLLED_SUBSTANCE_VERIFICATION'
  | 'HIGH_RISK_MEDICATION';

export type DiscrepancySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type DiscrepancyResolution =
  | 'PENDING'
  | 'ACCEPTED'
  | 'SUBSTITUTED'
  | 'DISCONTINUED'
  | 'DEFERRED_TO_PROVIDER';

export interface MedicationDiscrepancy {
  id: string;
  reconciliationId: string;
  snfMedicationId: string;

  // Classification
  discrepancyType: DiscrepancyType;
  severity: DiscrepancySeverity;
  description: string;

  // SNF medication details (snapshot)
  snfMedicationName: string;
  snfDose: string;
  snfFrequency: string;
  snfRoute?: string;

  // Hospital alternative
  hospitalAlternative?: string;
  hospitalAlternativeDose?: string;
  hospitalAlternativeRxnorm?: string;

  // Interaction details
  interactingMedication?: string;
  interactionSeverity?: string;
  interactionDescription?: string;

  // Resolution
  resolution: DiscrepancyResolution;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// ---------------------------------------------------------------------------
// Reconciliation Session
// ---------------------------------------------------------------------------

export type ReconciliationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PHARMACIST_REVIEW'
  | 'PROVIDER_REVIEW'
  | 'COMPLETED'
  | 'OVERRIDDEN';

export interface ReconciliationSession {
  id: string;
  organizationId: string;
  transferRequestId: string;
  patientId: string;

  status: ReconciliationStatus;

  // Personnel
  initiatedBy?: string;
  completedBy?: string;
  pharmacistReviewBy?: string;
  providerReviewBy?: string;

  // Timestamps
  initiatedAt?: string;
  completedAt?: string;
  pharmacistReviewAt?: string;
  providerReviewAt?: string;

  // Summary
  totalMedications: number;
  discrepancyCount: number;
  criticalDiscrepancyCount: number;
  resolvedCount: number;

  // Items
  medications: SNFMedicationRecord[];
  discrepancies: MedicationDiscrepancy[];

  // Notes
  notes?: string;
  pharmacistNotes?: string;
  providerNotes?: string;
}

// ---------------------------------------------------------------------------
// Reconciliation Result
// ---------------------------------------------------------------------------

export interface ReconciliationResult {
  sessionId: string;
  status: ReconciliationStatus;

  // Counts
  totalMedications: number;
  formularyMatches: number;
  formularyMisses: number;
  discrepancyCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  resolvedCount: number;
  pendingCount: number;

  // Grouped discrepancies
  discrepanciesByType: Record<DiscrepancyType, MedicationDiscrepancy[]>;
  discrepanciesBySeverity: Record<DiscrepancySeverity, MedicationDiscrepancy[]>;

  // High-risk summary
  highRiskMedications: SNFMedicationRecord[];
  controlledSubstances: SNFMedicationRecord[];
  recentChanges: SNFMedicationRecord[];
  activeHolds: SNFMedicationRecord[];

  // For INTERACT document
  reconciliationSummaryText: string;
  isComplete: boolean;
  requiresPharmacistReview: boolean;
  requiresProviderReview: boolean;
}

// ---------------------------------------------------------------------------
// Reconciliation Engine Configuration
// ---------------------------------------------------------------------------

export interface ReconciliationConfig {
  // Matching
  enableRxnormMatching: boolean;
  enableGenericMatching: boolean;
  enableTherapeuticClassMatching: boolean;

  // Detection
  recentChangeDays: number; // Default: 7
  enableDrugInteractionCheck: boolean;
  enableAllergyConflictCheck: boolean;
  enableTherapeuticDuplicationCheck: boolean;

  // High-risk medication categories (RxNorm codes or therapeutic classes)
  highRiskCategories: string[];

  // Auto-resolution rules
  autoResolveInfoDiscrepancies: boolean;
  requirePharmacistForCritical: boolean;
  requireProviderForAll: boolean;
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  enableRxnormMatching: true,
  enableGenericMatching: true,
  enableTherapeuticClassMatching: true,
  recentChangeDays: 7,
  enableDrugInteractionCheck: true,
  enableAllergyConflictCheck: true,
  enableTherapeuticDuplicationCheck: true,
  highRiskCategories: [
    'anticoagulants',
    'insulin',
    'opioids',
    'immunosuppressants',
    'antiarrhythmics',
    'chemotherapy',
    'narrow_therapeutic_index',
  ],
  autoResolveInfoDiscrepancies: false,
  requirePharmacistForCritical: true,
  requireProviderForAll: true,
};

// ---------------------------------------------------------------------------
// High-Risk Medication List
// ---------------------------------------------------------------------------

export const HIGH_RISK_MEDICATIONS: HighRiskMedicationEntry[] = [
  // Anticoagulants
  { genericName: 'warfarin', class: 'anticoagulants', riskReason: 'Bleeding risk, INR monitoring required', rxnormCodes: ['11289'] },
  { genericName: 'apixaban', class: 'anticoagulants', riskReason: 'Bleeding risk, renal dose adjustment', rxnormCodes: ['1364430'] },
  { genericName: 'rivaroxaban', class: 'anticoagulants', riskReason: 'Bleeding risk, renal dose adjustment', rxnormCodes: ['1114195'] },
  { genericName: 'enoxaparin', class: 'anticoagulants', riskReason: 'Bleeding risk, renal dose adjustment', rxnormCodes: ['67108'] },
  { genericName: 'heparin', class: 'anticoagulants', riskReason: 'Bleeding risk, HIT monitoring', rxnormCodes: ['5224'] },

  // Insulin
  { genericName: 'insulin lispro', class: 'insulin', riskReason: 'Hypoglycemia risk, sliding scale coordination', rxnormCodes: ['86009'] },
  { genericName: 'insulin glargine', class: 'insulin', riskReason: 'Hypoglycemia risk, basal dose continuation', rxnormCodes: ['274783'] },
  { genericName: 'insulin aspart', class: 'insulin', riskReason: 'Hypoglycemia risk, meal-time coordination', rxnormCodes: ['86009'] },
  { genericName: 'insulin regular', class: 'insulin', riskReason: 'Hypoglycemia risk', rxnormCodes: ['5856'] },

  // Opioids
  { genericName: 'oxycodone', class: 'opioids', riskReason: 'Respiratory depression, controlled substance', rxnormCodes: ['7804'] },
  { genericName: 'hydrocodone', class: 'opioids', riskReason: 'Respiratory depression, controlled substance', rxnormCodes: ['5489'] },
  { genericName: 'morphine', class: 'opioids', riskReason: 'Respiratory depression, renal adjustment', rxnormCodes: ['7052'] },
  { genericName: 'fentanyl', class: 'opioids', riskReason: 'Respiratory depression, patch continuation', rxnormCodes: ['4337'] },
  { genericName: 'methadone', class: 'opioids', riskReason: 'QT prolongation, complex pharmacokinetics', rxnormCodes: ['6813'] },

  // Immunosuppressants
  { genericName: 'tacrolimus', class: 'immunosuppressants', riskReason: 'Narrow therapeutic index, level monitoring', rxnormCodes: ['42316'] },
  { genericName: 'cyclosporine', class: 'immunosuppressants', riskReason: 'Narrow therapeutic index, level monitoring', rxnormCodes: ['3008'] },
  { genericName: 'mycophenolate', class: 'immunosuppressants', riskReason: 'Bone marrow suppression, CBC monitoring', rxnormCodes: ['68149'] },

  // Other high-risk
  { genericName: 'digoxin', class: 'narrow_therapeutic_index', riskReason: 'Narrow therapeutic index, level and K+ monitoring', rxnormCodes: ['3407'] },
  { genericName: 'lithium', class: 'narrow_therapeutic_index', riskReason: 'Narrow therapeutic index, level and renal monitoring', rxnormCodes: ['6448'] },
  { genericName: 'phenytoin', class: 'narrow_therapeutic_index', riskReason: 'Narrow therapeutic index, level monitoring', rxnormCodes: ['8183'] },
  { genericName: 'amiodarone', class: 'antiarrhythmics', riskReason: 'QT prolongation, thyroid/pulmonary monitoring', rxnormCodes: ['703'] },
];

export interface HighRiskMedicationEntry {
  genericName: string;
  class: string;
  riskReason: string;
  rxnormCodes: string[];
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isCriticalDiscrepancy(d: MedicationDiscrepancy): boolean {
  return d.severity === 'CRITICAL';
}

export function isUnresolved(d: MedicationDiscrepancy): boolean {
  return d.resolution === 'PENDING';
}

export function isControlledSubstance(med: SNFMedicationRecord): boolean {
  return med.isControlled;
}

export function isHighRiskMedication(med: SNFMedicationRecord): boolean {
  const genericLower = (med.genericName ?? med.medicationName).toLowerCase();
  return HIGH_RISK_MEDICATIONS.some(
    (hrm) =>
      hrm.genericName === genericLower ||
      (med.rxnormCode && hrm.rxnormCodes.includes(med.rxnormCode))
  );
}

export function hasRecentChange(med: SNFMedicationRecord, days: number = 7): boolean {
  if (!med.lastDoseChange) return false;
  const changeDate = new Date(med.lastDoseChange);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return changeDate >= cutoff;
}

export function isOnHold(med: SNFMedicationRecord): boolean {
  return med.status === 'HELD' || (!!med.holdStartDate && !med.holdEndDate);
}

export function needsPharmacistReview(session: ReconciliationSession): boolean {
  return session.discrepancies.some(
    (d) => d.severity === 'CRITICAL' && d.resolution === 'PENDING'
  );
}

export function isReconciliationComplete(session: ReconciliationSession): boolean {
  return (
    session.discrepancies.every((d) => d.resolution !== 'PENDING') &&
    session.status === 'COMPLETED'
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function categorizeDiscrepancies(
  discrepancies: MedicationDiscrepancy[]
): Record<DiscrepancyType, MedicationDiscrepancy[]> {
  const result = {} as Record<DiscrepancyType, MedicationDiscrepancy[]>;
  for (const d of discrepancies) {
    if (!result[d.discrepancyType]) {
      result[d.discrepancyType] = [];
    }
    result[d.discrepancyType].push(d);
  }
  return result;
}

export function calculateReconciliationCompleteness(
  session: ReconciliationSession
): number {
  if (session.discrepancies.length === 0) return 100;
  const resolved = session.discrepancies.filter((d) => d.resolution !== 'PENDING').length;
  return Math.round((resolved / session.discrepancies.length) * 100);
}

export function getUnresolvedCritical(
  session: ReconciliationSession
): MedicationDiscrepancy[] {
  return session.discrepancies.filter(
    (d) => d.severity === 'CRITICAL' && d.resolution === 'PENDING'
  );
}
