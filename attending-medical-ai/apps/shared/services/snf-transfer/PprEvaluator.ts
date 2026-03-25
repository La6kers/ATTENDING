/**
 * PPR (Potentially Preventable Readmission) Evaluator
 *
 * Tier 0 service — evaluates transfer reasons against the CMS Potentially
 * Preventable Readmission diagnosis list and generates quality flags.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 8
 */

import type { PPRFlag, PPRCategory } from '../../types/interact.types';
import { PPR_DIAGNOSIS_CATEGORIES } from '../../catalogs/ppr-diagnoses';

export interface PPREvaluationInput {
  patientId: string;
  transferReason: string;
  icdCodes: string[];
  transferHistory?: TransferHistoryEntry[];
  snfAdmissionDate?: string;
  lastHospitalDischargeDate?: string;
}

export interface TransferHistoryEntry {
  date: string;
  reason: string;
  hospital: string;
  returnDate?: string;
}

export interface IPprEvaluator {
  evaluate(patientId: string, transferReason: string, icdCodes: string[]): Promise<PPRFlag>;
  matchDiagnosisCategory(icdCode: string): PPRCategory | null;
  isWithin30DayWindow(lastDischargeDate: string): boolean;
}

export class PprEvaluator implements IPprEvaluator {
  async evaluate(
    patientId: string,
    transferReason: string,
    icdCodes: string[]
  ): Promise<PPRFlag> {
    const matchedCategories: PPRCategory[] = [];

    // Check ICD-10 codes against PPR diagnosis list
    for (const code of icdCodes) {
      const match = this.matchDiagnosisCategory(code);
      if (match) {
        matchedCategories.push(match);
      }
    }

    // Also check transfer reason text against PPR keywords
    const textMatches = this.matchReasonText(transferReason);
    for (const match of textMatches) {
      if (!matchedCategories.some((m) => m.code === match.code)) {
        matchedCategories.push(match);
      }
    }

    return {
      transferRequestId: '', // Set by caller
      isFlagged: matchedCategories.length > 0,
      matchedCategories,
      thirtyDayHistory: [], // Would be populated from patient transfer history
      clinicalIndicators: icdCodes,
    };
  }

  matchDiagnosisCategory(icdCode: string): PPRCategory | null {
    const normalizedCode = icdCode.toUpperCase().replace(/\./g, '');

    for (const category of PPR_DIAGNOSIS_CATEGORIES) {
      for (const pprCode of category.icd10Codes) {
        const normalizedPpr = pprCode.toUpperCase().replace(/\./g, '');
        // Match exact code or code prefix (e.g., J18 matches J18.0, J18.1, etc.)
        if (normalizedCode === normalizedPpr || normalizedCode.startsWith(normalizedPpr)) {
          return {
            ...category,
            matchedDiagnosis: icdCode,
          };
        }
      }
    }

    return null;
  }

  isWithin30DayWindow(lastDischargeDate: string): boolean {
    const discharge = new Date(lastDischargeDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - discharge.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30;
  }

  private matchReasonText(reason: string): PPRCategory[] {
    const lower = reason.toLowerCase();
    const matches: PPRCategory[] = [];

    for (const category of PPR_DIAGNOSIS_CATEGORIES) {
      for (const keyword of category.keywords ?? []) {
        if (lower.includes(keyword.toLowerCase())) {
          matches.push({ ...category, matchedDiagnosis: `Text match: "${keyword}"` });
          break;
        }
      }
    }

    return matches;
  }
}
