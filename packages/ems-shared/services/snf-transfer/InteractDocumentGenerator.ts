/**
 * INTERACT Document Generator
 *
 * Tier 1 service that assembles a complete INTERACT v4.0 transfer
 * communication document from all collected clinical data sources.
 *
 * @see docs/specifications/P16-INTERACT-FIELD-MAPPING.md
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 1
 */

import type {
  InteractDocument,
  InteractSectionId,
  InteractValidationResult,
  InteractValidationError,
  TransferMode,
} from '../../types/interact.types';
import {
  INTERACT_FIELDS,
  INTERACT_SECTIONS,
  getFieldsBySection,
  getRequiredFields,
  calculateComplianceScore,
} from '../../catalogs/interact-fields';

export interface IInteractDocumentGenerator {
  generate(transferId: string): Promise<InteractDocument>;
  validate(document: Partial<InteractDocument>): InteractValidationResult;
  getComplianceScore(document: Partial<InteractDocument>): number;
}

export class InteractDocumentGenerator implements IInteractDocumentGenerator {
  async generate(transferId: string): Promise<InteractDocument> {
    // In production, fetches all collected data for the transfer and
    // assembles the INTERACT document by mapping each data element
    // to its INTERACT field per the field catalog.
    throw new Error('Not implemented — requires data layer integration');
  }

  validate(document: Partial<InteractDocument>): InteractValidationResult {
    const errors: InteractValidationError[] = [];
    const warnings: InteractValidationError[] = [];

    const requiredFields = getRequiredFields();

    for (const field of requiredFields) {
      const sectionData = this.getSectionData(document, field.section);
      if (!sectionData) {
        errors.push({
          fieldId: field.id,
          section: field.section,
          rule: 'NON_EMPTY',
          message: `Required field '${field.label}' is missing (section ${field.section} not populated)`,
          severity: 'error',
        });
      }
    }

    // Check advance directive verification freshness
    if (document.advanceDirectives && !document.advanceDirectives.verifiedWithinNinetyDays) {
      warnings.push({
        fieldId: 'directive_verification',
        section: 'ADVANCE_DIRECTIVES',
        rule: 'FRESHNESS',
        message: 'Advance directive has not been verified within 90 days',
        severity: 'warning',
      });
    }

    // Check functional status assessment freshness
    if (document.functionalStatus) {
      for (const assessment of document.functionalStatus.assessments) {
        const assessmentDate = new Date(assessment.assessmentDate);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        if (assessmentDate < ninetyDaysAgo) {
          warnings.push({
            fieldId: `${assessment.instrumentType}_date`,
            section: 'FUNCTIONAL_STATUS',
            rule: 'FRESHNESS',
            message: `${assessment.instrumentType} assessment is older than 90 days`,
            severity: 'warning',
          });
        }
      }
    }

    const sectionCompleteness = {} as Record<InteractSectionId, number>;
    for (const section of INTERACT_SECTIONS) {
      sectionCompleteness[section.id] = this.calculateSectionCompleteness(document, section.id);
    }

    const overallCompleteness = Object.values(sectionCompleteness).reduce(
      (sum, v) => sum + v, 0
    ) / INTERACT_SECTIONS.length;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completionPercentage: Math.round(overallCompleteness),
      sectionCompleteness,
    };
  }

  getComplianceScore(document: Partial<InteractDocument>): number {
    const completedFields = new Set<string>();

    // Check which fields have data
    for (const [fieldId, field] of Object.entries(INTERACT_FIELDS)) {
      const sectionData = this.getSectionData(document, field.section);
      if (sectionData) {
        completedFields.add(fieldId);
      }
    }

    return calculateComplianceScore(completedFields);
  }

  private getSectionData(
    document: Partial<InteractDocument>,
    section: InteractSectionId
  ): unknown {
    const sectionMap: Record<InteractSectionId, keyof InteractDocument | undefined> = {
      PATIENT_IDENTIFICATION: 'patientIdentification',
      TRANSFER_REASON: 'transferReason',
      MEDICATIONS: 'medications',
      ALLERGIES: 'allergies',
      ADVANCE_DIRECTIVES: 'advanceDirectives',
      FUNCTIONAL_STATUS: 'functionalStatus',
      WOUND_STATUS: 'woundStatus',
      ISOLATION_PRECAUTIONS: 'isolationPrecautions',
      DIAGNOSTICS: 'diagnostics',
      TRANSFER_LOGISTICS: 'transferLogistics',
    };

    const key = sectionMap[section];
    return key ? (document as any)[key] : undefined;
  }

  private calculateSectionCompleteness(
    document: Partial<InteractDocument>,
    sectionId: InteractSectionId
  ): number {
    const sectionData = this.getSectionData(document, sectionId);
    if (!sectionData) return 0;

    const fields = getFieldsBySection(sectionId);
    if (fields.length === 0) return 100;

    // Count non-null/non-undefined fields
    const data = sectionData as Record<string, unknown>;
    const populated = Object.values(data).filter(
      (v) => v !== null && v !== undefined && v !== ''
    ).length;

    return Math.round((populated / fields.length) * 100);
  }
}
