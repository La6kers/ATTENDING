/**
 * Functional Status Aggregator
 *
 * Tier 0 service — aggregates scores from multiple standardized functional
 * assessment instruments into a unified functional status profile.
 *
 * @see docs/patents/P16-SNF-HOSPITAL-TRANSFER-CLAIMS.md — Claim 7
 */

import type {
  InteractFunctionalStatus,
  InteractFunctionalAssessment,
  FunctionalInstrumentType,
  TransferAssistanceLevel,
  CognitiveStatus,
  WeightBearingStatus,
} from '../../types/interact.types';
import {
  getBarthelInterpretation,
  getMorseFallRiskLevel,
  getBradenRiskLevel,
} from '../../types/interact.types';

export interface FunctionalAssessmentRecord {
  id: string;
  patientId: string;
  instrumentType: FunctionalInstrumentType;
  totalScore: number;
  subscores: Record<string, number>;
  assessedAt: string;
  mobilityAids?: string[];
  weightBearingStatus?: WeightBearingStatus;
  transferAssistance?: TransferAssistanceLevel;
  cognitiveStatus?: CognitiveStatus;
}

export interface IFunctionalStatusAggregator {
  aggregate(records: FunctionalAssessmentRecord[]): InteractFunctionalStatus;
  getInterpretation(instrumentType: FunctionalInstrumentType, score: number): string;
  isWithinValidRange(instrumentType: FunctionalInstrumentType, score: number): boolean;
}

export class FunctionalStatusAggregator implements IFunctionalStatusAggregator {
  aggregate(records: FunctionalAssessmentRecord[]): InteractFunctionalStatus {
    // Use most recent assessment per instrument type
    const latestByType = new Map<FunctionalInstrumentType, FunctionalAssessmentRecord>();
    for (const record of records) {
      const existing = latestByType.get(record.instrumentType);
      if (!existing || new Date(record.assessedAt) > new Date(existing.assessedAt)) {
        latestByType.set(record.instrumentType, record);
      }
    }

    const assessments: InteractFunctionalAssessment[] = [];
    for (const [type, record] of latestByType) {
      if (!this.isWithinValidRange(type, record.totalScore)) continue;

      assessments.push({
        instrumentType: type,
        totalScore: record.totalScore,
        interpretation: this.getInterpretation(type, record.totalScore),
        subscores: record.subscores,
        assessmentDate: record.assessedAt,
      });
    }

    // Derive overall functional status from available assessments
    const mobilityAids = this.extractMobilityAids(records);
    const weightBearing = this.extractMostRestricted(records, 'weightBearingStatus');
    const transferAssist = this.extractHighestAssistance(records);
    const cognitive = this.extractWorstCognitive(records);

    return {
      assessments,
      mobilityAids,
      weightBearingStatus: weightBearing as WeightBearingStatus | undefined,
      transferAssistance: transferAssist ?? 'INDEPENDENT',
      cognitiveStatus: cognitive ?? 'INTACT',
      cognitiveBaseline: cognitive
        ? `Baseline cognitive status: ${cognitive.replace(/_/g, ' ').toLowerCase()}`
        : 'Cognitive status not assessed',
    };
  }

  getInterpretation(instrumentType: FunctionalInstrumentType, score: number): string {
    switch (instrumentType) {
      case 'BARTHEL':
        return `${getBarthelInterpretation(score)} (${score}/100)`;
      case 'KATZ_ADL': {
        const grade = score === 6 ? 'A' : score >= 4 ? 'B-C' : score >= 2 ? 'D-E' : 'F-G';
        return `Grade ${grade} — ${score}/6 functions independent`;
      }
      case 'MORSE_FALL':
        return `${getMorseFallRiskLevel(score)} risk (${score}/125)`;
      case 'BRADEN':
        return `${getBradenRiskLevel(score)} pressure injury risk (${score}/23)`;
      case 'MDS_GG':
        return `MDS Section GG score: ${score}`;
      default:
        return `Score: ${score}`;
    }
  }

  isWithinValidRange(instrumentType: FunctionalInstrumentType, score: number): boolean {
    const ranges: Record<string, [number, number]> = {
      BARTHEL: [0, 100],
      KATZ_ADL: [0, 6],
      MORSE_FALL: [0, 125],
      BRADEN: [6, 23],
      MDS_GG: [0, 100], // Flexible range
    };
    const range = ranges[instrumentType];
    if (!range) return true;
    return score >= range[0] && score <= range[1];
  }

  private extractMobilityAids(records: FunctionalAssessmentRecord[]): string[] {
    const aids = new Set<string>();
    for (const record of records) {
      for (const aid of record.mobilityAids ?? []) {
        aids.add(aid);
      }
    }
    return Array.from(aids);
  }

  private extractMostRestricted(
    records: FunctionalAssessmentRecord[],
    field: 'weightBearingStatus'
  ): string | undefined {
    const hierarchy: WeightBearingStatus[] = ['NON_WEIGHT_BEARING', 'TOUCH_DOWN', 'PARTIAL', 'FULL'];
    let mostRestricted: string | undefined;

    for (const record of records) {
      const value = record[field];
      if (!value) continue;
      if (!mostRestricted || hierarchy.indexOf(value) < hierarchy.indexOf(mostRestricted as WeightBearingStatus)) {
        mostRestricted = value;
      }
    }
    return mostRestricted;
  }

  private extractHighestAssistance(records: FunctionalAssessmentRecord[]): TransferAssistanceLevel | undefined {
    const hierarchy: TransferAssistanceLevel[] = [
      'DEPENDENT', 'MAX_ASSIST', 'MOD_ASSIST', 'MIN_ASSIST', 'STANDBY', 'INDEPENDENT',
    ];
    let highest: TransferAssistanceLevel | undefined;

    for (const record of records) {
      if (!record.transferAssistance) continue;
      if (!highest || hierarchy.indexOf(record.transferAssistance) < hierarchy.indexOf(highest)) {
        highest = record.transferAssistance;
      }
    }
    return highest;
  }

  private extractWorstCognitive(records: FunctionalAssessmentRecord[]): CognitiveStatus | undefined {
    const hierarchy: CognitiveStatus[] = ['SEVERE', 'MODERATE', 'MILD_IMPAIRMENT', 'INTACT'];
    let worst: CognitiveStatus | undefined;

    for (const record of records) {
      if (!record.cognitiveStatus) continue;
      if (!worst || hierarchy.indexOf(record.cognitiveStatus) < hierarchy.indexOf(worst)) {
        worst = record.cognitiveStatus;
      }
    }
    return worst;
  }
}
