/**
 * E/M Level Determinator
 *
 * Pure Tier 0 service — zero AI cost. Reads structured clinical data
 * from an encounter or INTERACT document and calculates the appropriate
 * E/M level using the 2021 CMS MDM complexity framework.
 *
 * For SNF-to-hospital transfers, the INTERACT document IS the clinical
 * documentation that supports E/M level assignment.
 */

import {
  assessProblems,
  assessData,
  assessRisk,
  determineOverallMDM,
  getEMCode,
  buildSNFTransferDataPoints,
  buildSNFTransferRiskFactors,
  type MDMAssessment,
  type MDMComplexity,
  type EMCategory,
  type ProblemEntry,
  type ProblemType,
  type DataPoint,
  type RiskFactor,
} from '../../catalogs/em-level-rules';
import type { CodeSuggestion, CodingResult } from './DiagnosisCodingEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EMInput {
  // Encounter type
  encounterCategory: EMCategory;

  // From DiagnosisCodingEngine output
  codingResult?: CodingResult;

  // Or manual problem list
  diagnoses?: DiagnosisInput[];

  // Data reviewed
  labsOrdered?: string[];
  labsReviewed?: string[];
  imagingOrdered?: string[];
  imagingReviewed?: string[];
  externalRecordsReviewed?: boolean;
  providerDiscussion?: boolean;
  independentInterpretations?: string[];

  // SNF-specific context
  snfTransferContext?: {
    marReconciliationPerformed: boolean;
    medicationCount: number;
    hasHighRiskMeds: boolean;
    hasControlledSubstances: boolean;
    hasCriticalDiscrepancies: boolean;
  };

  // Risk context
  isHospitalization: boolean;
  acuteDiagnosisSeverity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
}

export interface DiagnosisInput {
  description: string;
  icd10Code?: string;
  isNew: boolean;
  isAcute: boolean;
  isChronic: boolean;
  isExacerbation: boolean;
  isStable: boolean;
  isLifeThreatening: boolean;
}

// ---------------------------------------------------------------------------
// Determinator
// ---------------------------------------------------------------------------

export class EmLevelDeterminator {
  determine(input: EMInput): MDMAssessment {
    // Step 1: Build problem list
    const problems = this.buildProblemList(input);
    const element1 = assessProblems(problems);

    // Step 2: Build data points
    const dataPoints = this.buildDataPoints(input);
    const element2 = assessData(dataPoints);

    // Step 3: Build risk factors
    const riskFactors = this.buildRiskFactors(input);
    const element3 = assessRisk(riskFactors);

    // Step 4: Determine overall MDM (highest 2 of 3)
    const overallMDM = determineOverallMDM(element1, element2, element3);

    // Step 5: Map to E/M code
    const cptCode = getEMCode(input.encounterCategory, overallMDM);

    // Step 6: Generate rationale and gaps
    const rationale = this.generateRationale(element1, element2, element3, overallMDM, cptCode);
    const gaps = this.identifyDocumentationGaps(element1, element2, element3, overallMDM);
    const upgrades = this.identifyUpgradeOpportunities(element1, element2, element3, overallMDM);

    return {
      element1,
      element2,
      element3,
      overallMDM,
      emLevel: cptCode as any,
      emCategory: input.encounterCategory,
      cptCode,
      rationale,
      documentationGaps: gaps,
      specificityUpgrades: upgrades,
    };
  }

  /**
   * Quick assessment from a CodingResult (DiagnosisCodingEngine output)
   */
  determineFromCodingResult(
    codingResult: CodingResult,
    encounterCategory: EMCategory,
    context: Partial<EMInput> = {}
  ): MDMAssessment {
    const diagnoses: DiagnosisInput[] = codingResult.suggestedCodes.map((code) => ({
      description: code.description,
      icd10Code: code.code,
      isNew: code.rationale.includes('transfer') || code.rationale.includes('acute'),
      isAcute: code.code.includes('A') || code.rationale.toLowerCase().includes('acute'),
      isChronic: code.rationale.toLowerCase().includes('chronic') || code.rationale.toLowerCase().includes('history'),
      isExacerbation: code.rationale.toLowerCase().includes('exacerbation') || code.rationale.toLowerCase().includes('worsening'),
      isStable: code.rationale.toLowerCase().includes('stable'),
      isLifeThreatening: code.rationale.toLowerCase().includes('life') || code.rationale.toLowerCase().includes('sepsis'),
    }));

    return this.determine({
      encounterCategory,
      diagnoses,
      codingResult,
      isHospitalization: encounterCategory === 'INITIAL_HOSPITAL' || encounterCategory === 'EMERGENCY_DEPARTMENT',
      acuteDiagnosisSeverity: codingResult.codingComplexity === 'COMPLEX' ? 'SEVERE' :
        codingResult.codingComplexity === 'MODERATE' ? 'MODERATE' : 'MINOR',
      ...context,
    });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private buildProblemList(input: EMInput): ProblemEntry[] {
    const problems: ProblemEntry[] = [];

    if (input.diagnoses) {
      for (const dx of input.diagnoses) {
        problems.push({
          description: dx.description,
          icd10Code: dx.icd10Code,
          problemType: this.classifyProblem(dx),
          status: dx.isExacerbation ? 'EXACERBATION' :
            dx.isNew ? 'NEW' :
            dx.isStable ? 'STABLE' : 'WORSENING',
        });
      }
    }

    if (input.codingResult) {
      for (const code of input.codingResult.suggestedCodes) {
        if (!problems.some((p) => p.icd10Code === code.code)) {
          problems.push({
            description: code.description,
            icd10Code: code.code,
            problemType: this.classifyFromCode(code),
            status: 'NEW',
          });
        }
      }
    }

    return problems;
  }

  private classifyProblem(dx: DiagnosisInput): ProblemType {
    if (dx.isLifeThreatening) return 'LIFE_THREATENING';
    if (dx.isNew && dx.isAcute) return 'ACUTE_ILLNESS_UNDIAGNOSED';
    if (dx.isChronic && dx.isExacerbation) return 'CHRONIC_EXACERBATION';
    if (dx.isChronic && !dx.isStable) return 'CHRONIC_INADEQUATELY_CONTROLLED';
    if (dx.isChronic && dx.isStable) return 'CHRONIC_STABLE';
    if (dx.isAcute) return 'ACUTE_UNCOMPLICATED';
    return 'SELF_LIMITED';
  }

  private classifyFromCode(code: CodeSuggestion): ProblemType {
    // Heuristic classification based on code characteristics
    const c = code.code;

    // Life-threatening conditions
    if (c.startsWith('A41') || c === 'R65.20' || c === 'R65.21') return 'LIFE_THREATENING';
    if (c.startsWith('I21') || c.startsWith('I22')) return 'LIFE_THREATENING'; // MI

    // Acute conditions
    if (c.startsWith('J') && (c.includes('18') || c.includes('69'))) return 'ACUTE_ILLNESS_UNDIAGNOSED'; // Pneumonia
    if (c.startsWith('S')) return 'ACUTE_INJURY'; // Injuries
    if (c.startsWith('R')) return 'ACUTE_ILLNESS_UNDIAGNOSED'; // Signs/symptoms

    // Chronic conditions
    if (c.startsWith('E11') || c.startsWith('I10') || c.startsWith('I48') || c.startsWith('I50')) {
      if (code.rationale.toLowerCase().includes('exacerbation') || code.rationale.toLowerCase().includes('acute')) {
        return 'CHRONIC_EXACERBATION';
      }
      return 'CHRONIC_STABLE';
    }

    return 'ACUTE_UNCOMPLICATED';
  }

  private buildDataPoints(input: EMInput): DataPoint[] {
    if (input.snfTransferContext) {
      return buildSNFTransferDataPoints({
        marReconciliationPerformed: input.snfTransferContext.marReconciliationPerformed,
        medicationCount: input.snfTransferContext.medicationCount,
        labsOrdered: input.labsOrdered ?? [],
        labsReviewed: input.labsReviewed ?? [],
        imagingOrdered: input.imagingOrdered ?? [],
        imagingReviewed: input.imagingReviewed ?? [],
        externalRecordsReviewed: input.externalRecordsReviewed ?? false,
        providerDiscussion: input.providerDiscussion ?? false,
        independentInterpretations: input.independentInterpretations ?? [],
      });
    }

    const points: DataPoint[] = [];

    for (const lab of input.labsOrdered ?? []) {
      points.push({ type: 'LABS_ORDERED', description: lab, category: 'TESTS' });
    }
    for (const lab of input.labsReviewed ?? []) {
      points.push({ type: 'LABS_REVIEWED', description: lab, category: 'TESTS' });
    }
    for (const img of input.imagingOrdered ?? []) {
      points.push({ type: 'IMAGING_ORDERED', description: img, category: 'TESTS' });
    }
    if (input.externalRecordsReviewed) {
      points.push({ type: 'EXTERNAL_RECORDS_REVIEWED', description: 'External records reviewed', category: 'EXTERNAL' });
    }
    for (const interp of input.independentInterpretations ?? []) {
      points.push({ type: 'INDEPENDENT_INTERPRETATION', description: interp, category: 'INDEPENDENT' });
    }

    return points;
  }

  private buildRiskFactors(input: EMInput): RiskFactor[] {
    if (input.snfTransferContext) {
      return buildSNFTransferRiskFactors({
        isHospitalization: input.isHospitalization,
        medicationCount: input.snfTransferContext.medicationCount,
        hasHighRiskMeds: input.snfTransferContext.hasHighRiskMeds,
        hasControlledSubstances: input.snfTransferContext.hasControlledSubstances,
        hasCriticalDiscrepancies: input.snfTransferContext.hasCriticalDiscrepancies,
        acuteDiagnosisSeverity: input.acuteDiagnosisSeverity,
      });
    }

    const factors: RiskFactor[] = [];

    if (input.isHospitalization) {
      factors.push({ type: 'DECISION_RE_HOSPITALIZATION', description: 'Decision to hospitalize' });
    }

    if (input.acuteDiagnosisSeverity === 'LIFE_THREATENING') {
      factors.push({ type: 'DIAGNOSIS_WITH_THREAT_TO_LIFE', description: 'Life-threatening diagnosis' });
    }

    return factors;
  }

  private generateRationale(
    e1: { level: MDMComplexity },
    e2: { level: MDMComplexity },
    e3: { level: MDMComplexity },
    overall: MDMComplexity,
    cptCode: string
  ): string {
    return `E/M Level: ${cptCode} (MDM: ${overall}). ` +
      `Problems: ${e1.level}. Data: ${e2.level}. Risk: ${e3.level}. ` +
      `Overall determined by highest 2 of 3 elements.`;
  }

  private identifyDocumentationGaps(
    e1: { level: MDMComplexity },
    e2: { level: MDMComplexity },
    e3: { level: MDMComplexity },
    overall: MDMComplexity
  ): string[] {
    const gaps: string[] = [];

    // If one element is lower than the other two, that's the gap
    const levels: MDMComplexity[] = [e1.level, e2.level, e3.level];
    const scores = levels.map((l) => ({ STRAIGHTFORWARD: 1, LOW: 2, MODERATE: 3, HIGH: 4 }[l]));
    const minIdx = scores.indexOf(Math.min(...scores));

    if (scores[minIdx] < Math.max(...scores) - 1) {
      const names = ['Problems addressed', 'Data reviewed', 'Risk of complications'];
      gaps.push(
        `${names[minIdx]} is rated ${levels[minIdx]} — improving documentation in this area ` +
        `could support a higher E/M level.`
      );
    }

    return gaps;
  }

  private identifyUpgradeOpportunities(
    e1: { level: MDMComplexity },
    e2: { level: MDMComplexity },
    e3: { level: MDMComplexity },
    overall: MDMComplexity
  ): string[] {
    const upgrades: string[] = [];

    // Check if we're one element away from a higher level
    const scores = [e1, e2, e3].map((e) =>
      ({ STRAIGHTFORWARD: 1, LOW: 2, MODERATE: 3, HIGH: 4 }[e.level])
    ).sort((a, b) => b - a);

    // If the 2nd and 3rd highest are close, suggest documentation to raise the 3rd
    if (scores[1] > scores[2]) {
      upgrades.push(
        'Documenting additional complexity in the lowest-scoring MDM element could support a higher E/M level.'
      );
    }

    return upgrades;
  }
}
