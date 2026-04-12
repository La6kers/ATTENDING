/**
 * POLST Extractor
 *
 * Tier 2 service — extracts advance directive information from both
 * structured EHR data and scanned document images (via OCR/NLP).
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 9
 */

import type {
  InteractAdvanceDirectives,
  CodeStatus,
  AdvanceDirectiveDocumentType,
  TreatmentPreference,
  AntibioticsPreference,
  NutritionDirective,
} from '../../types/interact.types';

export interface AdvanceDirectiveRecord {
  id: string;
  patientId: string;
  documentType: AdvanceDirectiveDocumentType;
  codeStatus: CodeStatus;
  treatmentLimitations?: string[];
  intubationPreference?: TreatmentPreference;
  dialysisPreference?: TreatmentPreference;
  antibioticsPreference?: AntibioticsPreference;
  nutritionDirective?: NutritionDirective;
  effectiveDate: string;
  expirationDate?: string;
  documentUrl?: string;
  ocrProcessed: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  isActive: boolean;
}

export interface OcrExtractionResult {
  codeStatus?: CodeStatus;
  documentType?: AdvanceDirectiveDocumentType;
  treatmentLimitations?: string[];
  signaturePresent: boolean;
  dateExtracted?: string;
  confidence: number;
  rawText: string;
}

export interface IPolstExtractor {
  extractFromRecord(record: AdvanceDirectiveRecord): InteractAdvanceDirectives;
  extractFromScannedDocument(imageData: Buffer | string): Promise<OcrExtractionResult>;
  needsVerification(record: AdvanceDirectiveRecord): boolean;
}

export class PolstExtractor implements IPolstExtractor {
  extractFromRecord(record: AdvanceDirectiveRecord): InteractAdvanceDirectives {
    const verifiedWithinNinetyDays = this.isVerifiedWithinDays(record.verifiedAt, 90);

    return {
      codeStatus: record.codeStatus,
      documentType: record.documentType,
      documentDate: record.effectiveDate,
      intubationPreference: record.intubationPreference,
      dialysisPreference: record.dialysisPreference,
      antibioticsPreference: record.antibioticsPreference,
      nutritionDirective: record.nutritionDirective,
      treatmentLimitations: record.treatmentLimitations,
      verificationStatus: this.formatVerificationStatus(record),
      verifiedWithinNinetyDays,
      scannedDocumentAvailable: !!record.documentUrl,
    };
  }

  async extractFromScannedDocument(imageData: Buffer | string): Promise<OcrExtractionResult> {
    // Tier 2: OCR + NLP pipeline
    // 1. Run OCR on scanned POLST/MOLST document
    // 2. Extract structured fields using NLP
    // 3. Identify checkboxes for code status and treatment preferences
    // 4. Extract signature presence and date
    // 5. Return structured result with confidence score
    throw new Error('Not implemented — requires OCR/NLP model integration');
  }

  needsVerification(record: AdvanceDirectiveRecord): boolean {
    return !this.isVerifiedWithinDays(record.verifiedAt, 90);
  }

  private isVerifiedWithinDays(verifiedAt: string | undefined, days: number): boolean {
    if (!verifiedAt) return false;
    const verified = new Date(verifiedAt);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return verified >= cutoff;
  }

  private formatVerificationStatus(record: AdvanceDirectiveRecord): string {
    if (!record.verifiedAt) {
      return 'NOT VERIFIED — no verification on record';
    }

    const verified = new Date(record.verifiedAt);
    const daysSince = Math.floor(
      (Date.now() - verified.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince <= 90) {
      return `Verified ${record.verifiedAt} by ${record.verifiedBy ?? 'unknown'} (${daysSince} days ago)`;
    }

    return `NOT VERIFIED — last verified ${record.verifiedAt} (${daysSince} days ago, exceeds 90-day threshold)`;
  }
}
