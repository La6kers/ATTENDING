/**
 * Wound Assessment Processor
 *
 * Tier 2 service — processes clinical wound photographs using computer
 * vision to assist with pressure injury staging and generates CMS-compliant
 * wound assessment narratives.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 5
 */

import type {
  InteractWoundEntry,
  InteractWoundStatus,
  PressureInjuryStage,
  WoundType,
  WoundBedType,
  BradenSubscores,
} from '../../types/interact.types';

export interface WoundPhotoInput {
  imageData: Buffer | string; // Raw image or base64
  patientId: string;
  location: string;
  woundType: WoundType;
  measurementReferencePresent: boolean;
}

export interface WoundStagingResult {
  suggestedStage: PressureInjuryStage;
  confidence: number;
  dimensions?: { length: number; width: number; depth?: number };
  woundBed?: WoundBedType;
  tissuePercentages?: Record<string, number>;
}

export interface IWoundAssessmentProcessor {
  processPhoto(input: WoundPhotoInput): Promise<WoundStagingResult>;
  generateCmsNarrative(wound: InteractWoundEntry): string;
  aggregateWoundStatus(wounds: InteractWoundEntry[]): InteractWoundStatus;
  validateBradenSubscores(subscores: BradenSubscores): boolean;
}

export class WoundAssessmentProcessor implements IWoundAssessmentProcessor {
  async processPhoto(input: WoundPhotoInput): Promise<WoundStagingResult> {
    // Tier 2: This would invoke a cloud CV model for wound staging.
    // The model is trained on clinical wound images and returns:
    // - NPIAP staging classification
    // - Measurement extraction from reference marker
    // - Wound bed tissue type identification
    throw new Error('Not implemented — requires CV model integration');
  }

  generateCmsNarrative(wound: InteractWoundEntry): string {
    const parts: string[] = [];

    // Wound type and location
    const typeLabel = wound.woundType.replace(/_/g, ' ').toLowerCase();
    parts.push(`${typeLabel} located at ${wound.location}`);

    // Stage (for pressure injuries)
    if (wound.woundType === 'PRESSURE_INJURY' && wound.stage) {
      const stageLabel = wound.stage.replace('_', ' ');
      parts.push(stageLabel);
    }

    // Dimensions
    if (wound.lengthCm != null && wound.widthCm != null) {
      let dim = `measuring ${wound.lengthCm} x ${wound.widthCm}`;
      if (wound.depthCm != null) dim += ` x ${wound.depthCm}`;
      dim += ' cm';
      parts.push(dim);
    }

    // Wound bed
    if (wound.woundBed) {
      parts.push(`wound bed: ${wound.woundBed.toLowerCase()}`);
    }

    // Exudate
    if (wound.exudateType) {
      const amount = wound.exudateAmount?.toLowerCase() ?? 'unspecified amount';
      parts.push(`exudate: ${wound.exudateType.toLowerCase()}, ${amount}`);
    }

    // Periwound
    if (wound.periWoundSkin) {
      parts.push(`periwound: ${wound.periWoundSkin}`);
    }

    // Odor
    parts.push(wound.odorPresent ? 'odor present' : 'no odor');

    // Treatment
    if (wound.currentTreatment) {
      parts.push(`current treatment: ${wound.currentTreatment}`);
    }

    // Braden score
    if (wound.bradenScore != null) {
      const risk = this.getBradenRiskLabel(wound.bradenScore);
      parts.push(`Braden Scale score: ${wound.bradenScore} (${risk} risk)`);
    }

    return parts.join('. ') + '.';
  }

  aggregateWoundStatus(wounds: InteractWoundEntry[]): InteractWoundStatus {
    return {
      wounds,
      totalCount: wounds.length,
    };
  }

  validateBradenSubscores(subscores: BradenSubscores): boolean {
    return (
      subscores.sensoryPerception >= 1 && subscores.sensoryPerception <= 4 &&
      subscores.moisture >= 1 && subscores.moisture <= 4 &&
      subscores.activity >= 1 && subscores.activity <= 4 &&
      subscores.mobility >= 1 && subscores.mobility <= 4 &&
      subscores.nutrition >= 1 && subscores.nutrition <= 4 &&
      subscores.frictionShear >= 1 && subscores.frictionShear <= 3
    );
  }

  private getBradenRiskLabel(score: number): string {
    if (score <= 9) return 'very high';
    if (score <= 12) return 'high';
    if (score <= 14) return 'moderate';
    if (score <= 18) return 'mild';
    return 'no';
  }
}
