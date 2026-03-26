/**
 * Diagnosis Coding Engine
 *
 * Tier 0 (rule-based) + Tier 2 (Claude AI) diagnosis code suggestion engine.
 * Takes clinical data from encounters and transfer documents, suggests
 * ICD-10 codes with maximum specificity, and flags documentation gaps
 * that would improve coding accuracy.
 *
 * The Tier 0 layer runs locally with zero API cost.
 * The Tier 2 layer uses Claude Haiku (~$0.005/encounter) for context-aware suggestions.
 */

import {
  ICD10_CATALOG,
  SPECIFICITY_UPGRADES,
  searchByKeyword,
  searchByClinicalIndicator,
  findByCode,
  getSpecificityUpgrades,
  type ICD10Entry,
  type SpecificityUpgrade,
} from '../../catalogs/icd10-catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodingInput {
  // Patient context
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';

  // Clinical data
  chiefComplaint: string;
  presentingSymptoms: string[];
  medicalHistory: string[];
  medications: string[];
  allergies: string[];

  // Vitals
  vitals?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
  };

  // Labs (if available)
  labResults?: LabValue[];

  // Existing codes (from prior encounter or SNF record)
  existingIcd10Codes?: string[];

  // Transfer context
  transferReason?: string;
  snfDiagnoses?: string[];
}

export interface LabValue {
  testName: string;
  value: number;
  units: string;
  referenceRange: string;
  isAbnormal: boolean;
  isCritical: boolean;
}

export interface CodeSuggestion {
  code: string;
  description: string;
  confidence: number; // 0-1
  source: 'RULE_BASED' | 'KEYWORD_MATCH' | 'CLINICAL_INDICATOR' | 'LAB_DERIVED' | 'AI_SUGGESTED';
  rationale: string;
  specificitySuggestion?: SpecificityUpgrade;
  documentationGap?: string;
  hccImpact?: string;
  isPrimary: boolean;
}

export interface CodingResult {
  suggestedCodes: CodeSuggestion[];
  primaryDiagnosis: CodeSuggestion | null;
  secondaryDiagnoses: CodeSuggestion[];
  documentationGaps: DocumentationGap[];
  specificityUpgrades: SpecificityUpgrade[];
  codingComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  summaryText: string;
}

export interface DocumentationGap {
  field: string;
  description: string;
  impact: 'CODING_SPECIFICITY' | 'REIMBURSEMENT' | 'QUALITY_MEASURE' | 'COMPLIANCE';
  suggestion: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class DiagnosisCodingEngine {
  /**
   * Tier 0: Rule-based coding suggestions (zero API cost)
   */
  suggestCodes(input: CodingInput): CodingResult {
    const suggestions: CodeSuggestion[] = [];
    const gaps: DocumentationGap[] = [];

    // Step 1: Match existing diagnoses from medical history
    for (const dx of input.medicalHistory) {
      const matches = searchByKeyword(dx);
      for (const match of matches.slice(0, 2)) {
        suggestions.push({
          code: match.code,
          description: match.description,
          confidence: 0.85,
          source: 'KEYWORD_MATCH',
          rationale: `Matched from medical history: "${dx}"`,
          isPrimary: false,
        });
      }
    }

    // Step 2: Match chief complaint and symptoms
    const symptomMatches = this.matchSymptoms(input.chiefComplaint, input.presentingSymptoms);
    suggestions.push(...symptomMatches);

    // Step 3: Lab-derived codes
    if (input.labResults) {
      const labCodes = this.deriveFromLabs(input.labResults);
      suggestions.push(...labCodes);
    }

    // Step 4: Vital sign-derived codes
    if (input.vitals) {
      const vitalCodes = this.deriveFromVitals(input.vitals);
      suggestions.push(...vitalCodes);
    }

    // Step 5: Transfer-specific codes
    if (input.transferReason) {
      const transferMatches = searchByKeyword(input.transferReason);
      for (const match of transferMatches.slice(0, 3)) {
        suggestions.push({
          code: match.code,
          description: match.description,
          confidence: 0.80,
          source: 'KEYWORD_MATCH',
          rationale: `Matched from transfer reason: "${input.transferReason}"`,
          isPrimary: true,
        });
      }
    }

    // Step 6: Deduplicate and rank
    const deduped = this.deduplicateAndRank(suggestions);

    // Step 7: Check specificity upgrades
    const upgrades: SpecificityUpgrade[] = [];
    for (const suggestion of deduped) {
      const possibleUpgrades = getSpecificityUpgrades(suggestion.code);
      for (const upgrade of possibleUpgrades) {
        if (this.upgradeApplies(upgrade, input)) {
          suggestion.specificitySuggestion = upgrade;
          upgrades.push(upgrade);
        }
      }
    }

    // Step 8: Identify documentation gaps
    gaps.push(...this.identifyDocumentationGaps(deduped, input));

    // Step 9: Determine primary diagnosis
    const primary = deduped.find((s) => s.isPrimary) ?? deduped[0] ?? null;
    if (primary) primary.isPrimary = true;
    const secondary = deduped.filter((s) => s !== primary);

    const complexity = deduped.length <= 2 ? 'SIMPLE' :
      deduped.length <= 5 ? 'MODERATE' : 'COMPLEX';

    return {
      suggestedCodes: deduped,
      primaryDiagnosis: primary,
      secondaryDiagnoses: secondary,
      documentationGaps: gaps,
      specificityUpgrades: upgrades,
      codingComplexity: complexity,
      summaryText: this.generateSummary(deduped, gaps, upgrades),
    };
  }

  /**
   * Tier 2: Generate AI-enhanced coding prompt for Claude
   * Returns the prompt string — caller sends it to Claude API.
   */
  buildAICodingPrompt(input: CodingInput, tier0Results: CodingResult): string {
    return `You are a certified medical coder (CPC) reviewing clinical documentation for ICD-10-CM code assignment. Your goal is to suggest the MOST SPECIFIC billable codes supported by the documentation.

## Patient
- Age: ${input.patientAge}, Gender: ${input.patientGender}
- Chief Complaint: ${input.chiefComplaint}
- Presenting Symptoms: ${input.presentingSymptoms.join(', ')}
- Medical History: ${input.medicalHistory.join(', ')}
- Medications: ${input.medications.join(', ')}
${input.vitals ? `- Vitals: BP ${input.vitals.bloodPressureSystolic}/${input.vitals.bloodPressureDiastolic}, HR ${input.vitals.heartRate}, RR ${input.vitals.respiratoryRate}, Temp ${input.vitals.temperature}, O2 ${input.vitals.oxygenSaturation}%` : ''}
${input.labResults ? `- Labs: ${input.labResults.map((l) => `${l.testName}: ${l.value} ${l.units}${l.isAbnormal ? ' [ABNORMAL]' : ''}`).join(', ')}` : ''}
${input.transferReason ? `- Transfer Reason: ${input.transferReason}` : ''}

## Rule-Based Suggestions (verify and improve these)
${tier0Results.suggestedCodes.map((s) => `- ${s.code}: ${s.description} (confidence: ${s.confidence})`).join('\n')}

## Instructions
1. Review the rule-based suggestions. Confirm, reject, or upgrade each code.
2. Suggest additional codes supported by the documentation.
3. For each code, explain WHY the documentation supports it.
4. Flag any codes that need MORE SPECIFIC alternatives (e.g., E11.9 → E11.42 if neuropathy is documented).
5. Identify documentation gaps that would allow coding to a higher specificity.
6. Note any HCC (risk adjustment) opportunities.

Respond in this JSON format:
{
  "codes": [
    {
      "code": "ICD-10 code",
      "description": "Code description",
      "rationale": "Why documentation supports this code",
      "isPrimary": true/false,
      "confidence": 0.0-1.0,
      "specificityNote": "If a more specific code is available, explain what documentation would support it"
    }
  ],
  "documentationGaps": [
    {
      "gap": "What's missing",
      "impact": "How it affects coding",
      "suggestion": "What to document"
    }
  ],
  "hccOpportunities": ["List of HCC-impacting codes that could be captured with better documentation"]
}`;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private matchSymptoms(chiefComplaint: string, symptoms: string[]): CodeSuggestion[] {
    const results: CodeSuggestion[] = [];
    const allText = [chiefComplaint, ...symptoms];

    for (const text of allText) {
      // Search by keyword
      const keywordMatches = searchByKeyword(text);
      for (const match of keywordMatches.slice(0, 1)) {
        results.push({
          code: match.code,
          description: match.description,
          confidence: 0.70,
          source: 'KEYWORD_MATCH',
          rationale: `Symptom match: "${text}"`,
          isPrimary: text === chiefComplaint,
        });
      }

      // Search by clinical indicator
      const indicatorMatches = searchByClinicalIndicator(text);
      for (const match of indicatorMatches.slice(0, 1)) {
        results.push({
          code: match.code,
          description: match.description,
          confidence: 0.65,
          source: 'CLINICAL_INDICATOR',
          rationale: `Clinical indicator match: "${text}"`,
          isPrimary: false,
        });
      }
    }

    return results;
  }

  private deriveFromLabs(labs: LabValue[]): CodeSuggestion[] {
    const results: CodeSuggestion[] = [];

    for (const lab of labs) {
      if (!lab.isAbnormal) continue;

      const name = lab.testName.toLowerCase();

      // Sodium
      if (name.includes('sodium') || name === 'na') {
        if (lab.value < 135) {
          results.push({
            code: 'E87.1', description: 'Hyponatremia',
            confidence: 0.90, source: 'LAB_DERIVED',
            rationale: `Sodium ${lab.value} ${lab.units} (below normal)`,
            isPrimary: false,
          });
        }
      }

      // Potassium
      if (name.includes('potassium') || name === 'k') {
        if (lab.value < 3.5) {
          results.push({
            code: 'E87.6', description: 'Hypokalemia',
            confidence: 0.90, source: 'LAB_DERIVED',
            rationale: `Potassium ${lab.value} ${lab.units} (below normal)`,
            isPrimary: false,
          });
        }
        if (lab.value > 5.0) {
          results.push({
            code: 'E87.5', description: 'Hyperkalemia',
            confidence: 0.90, source: 'LAB_DERIVED',
            rationale: `Potassium ${lab.value} ${lab.units} (above normal)`,
            isPrimary: false,
          });
        }
      }

      // Glucose
      if (name.includes('glucose')) {
        if (lab.value > 200) {
          results.push({
            code: 'E11.65', description: 'Type 2 DM with hyperglycemia',
            confidence: 0.75, source: 'LAB_DERIVED',
            rationale: `Glucose ${lab.value} ${lab.units} (>200 supports hyperglycemia code)`,
            isPrimary: false,
          });
        }
        if (lab.value < 70) {
          results.push({
            code: 'E16.2', description: 'Hypoglycemia, unspecified',
            confidence: 0.85, source: 'LAB_DERIVED',
            rationale: `Glucose ${lab.value} ${lab.units} (<70 indicates hypoglycemia)`,
            isPrimary: false,
          });
        }
      }

      // Creatinine / eGFR
      if (name.includes('egfr') || name.includes('gfr')) {
        if (lab.value < 60 && lab.value >= 30) {
          results.push({
            code: 'N18.3', description: 'CKD Stage 3',
            confidence: 0.85, source: 'LAB_DERIVED',
            rationale: `eGFR ${lab.value} (30-59 = Stage 3 CKD)`,
            isPrimary: false,
          });
        }
        if (lab.value < 30 && lab.value >= 15) {
          results.push({
            code: 'N18.4', description: 'CKD Stage 4',
            confidence: 0.85, source: 'LAB_DERIVED',
            rationale: `eGFR ${lab.value} (15-29 = Stage 4 CKD)`,
            isPrimary: false,
          });
        }
      }

      // WBC
      if (name.includes('wbc') || name.includes('white blood')) {
        if (lab.value > 12000 || lab.value > 12) {
          results.push({
            code: 'D72.829', description: 'Elevated white blood cell count, unspecified',
            confidence: 0.60, source: 'LAB_DERIVED',
            rationale: `WBC ${lab.value} ${lab.units} (elevated — suggests infection or inflammation)`,
            isPrimary: false,
          });
        }
      }

      // BNP / NT-proBNP
      if (name.includes('bnp')) {
        if (lab.value > 300) {
          results.push({
            code: 'I50.9', description: 'Heart failure, unspecified',
            confidence: 0.70, source: 'LAB_DERIVED',
            rationale: `BNP ${lab.value} ${lab.units} (elevated — supports heart failure)`,
            isPrimary: false,
          });
        }
      }
    }

    return results;
  }

  private deriveFromVitals(vitals: CodingInput['vitals']): CodeSuggestion[] {
    const results: CodeSuggestion[] = [];
    if (!vitals) return results;

    // Hypertension
    if ((vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140) ||
        (vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic >= 90)) {
      results.push({
        code: 'I10', description: 'Essential hypertension',
        confidence: 0.60, source: 'CLINICAL_INDICATOR',
        rationale: `BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} (elevated)`,
        isPrimary: false,
      });
    }

    // Hypoxemia
    if (vitals.oxygenSaturation && vitals.oxygenSaturation < 90) {
      results.push({
        code: 'R09.02', description: 'Hypoxemia',
        confidence: 0.90, source: 'CLINICAL_INDICATOR',
        rationale: `O2 sat ${vitals.oxygenSaturation}% (<90% = hypoxemia)`,
        isPrimary: false,
      });
    }

    // Fever
    if (vitals.temperature && vitals.temperature > 100.4) {
      results.push({
        code: 'R50.9', description: 'Fever',
        confidence: 0.85, source: 'CLINICAL_INDICATOR',
        rationale: `Temp ${vitals.temperature}°F (>100.4 = fever)`,
        isPrimary: false,
      });
    }

    // Tachycardia
    if (vitals.heartRate && vitals.heartRate > 100) {
      results.push({
        code: 'R00.0', description: 'Tachycardia, unspecified',
        confidence: 0.60, source: 'CLINICAL_INDICATOR',
        rationale: `HR ${vitals.heartRate} (>100 = tachycardia)`,
        isPrimary: false,
      });
    }

    return results;
  }

  private upgradeApplies(upgrade: SpecificityUpgrade, input: CodingInput): boolean {
    const condLower = upgrade.condition.toLowerCase();

    // Check if symptoms/history suggest the upgrade
    const allText = [
      input.chiefComplaint,
      ...input.presentingSymptoms,
      ...input.medicalHistory,
    ].map((t) => t.toLowerCase());

    // Simple keyword matching for upgrade conditions
    if (condLower.includes('neuropathy') && allText.some((t) => t.includes('neuropath') || t.includes('tingling') || t.includes('numbness'))) {
      return true;
    }
    if (condLower.includes('worsening') && allText.some((t) => t.includes('worsening') || t.includes('exacerbation') || t.includes('decompensated'))) {
      return true;
    }
    if (condLower.includes('aspiration') && allText.some((t) => t.includes('aspiration') || t.includes('dysphagia'))) {
      return true;
    }
    if (condLower.includes('organ dysfunction') && allText.some((t) => t.includes('organ') || t.includes('aki') || t.includes('altered mental'))) {
      return true;
    }

    // Check labs for metabolic upgrades
    if (input.labResults) {
      if (condLower.includes('glucose > 200')) {
        const glucose = input.labResults.find((l) => l.testName.toLowerCase().includes('glucose'));
        if (glucose && glucose.value > 200) return true;
      }
      if (condLower.includes('egfr < 60')) {
        const egfr = input.labResults.find((l) => l.testName.toLowerCase().includes('gfr'));
        if (egfr && egfr.value < 60) return true;
      }
    }

    return false;
  }

  private identifyDocumentationGaps(codes: CodeSuggestion[], input: CodingInput): DocumentationGap[] {
    const gaps: DocumentationGap[] = [];

    // Check for unspecified codes that could be more specific
    for (const code of codes) {
      const entry = findByCode(code.code);
      if (entry?.moreSpecificCodes && entry.moreSpecificCodes.length > 0) {
        gaps.push({
          field: code.code,
          description: `${code.code} (${code.description}) has more specific alternatives`,
          impact: 'CODING_SPECIFICITY',
          suggestion: `Consider: ${entry.moreSpecificCodes.join(', ')}. ${entry.documentationRequirements?.join('. ') ?? ''}`,
        });
      }
    }

    // Check for missing HCC codes
    const hccCodes = codes.filter((c) => {
      const entry = findByCode(c.code);
      return entry?.hccCategory;
    });
    if (hccCodes.length === 0 && input.medicalHistory.length > 2) {
      gaps.push({
        field: 'HCC',
        description: 'No HCC-impacting codes captured despite multiple chronic conditions',
        impact: 'REIMBURSEMENT',
        suggestion: 'Review chronic conditions for HCC-eligible diagnoses (CHF, diabetes with complications, CKD, dementia)',
      });
    }

    // Check for quality measure opportunities
    if (input.medicalHistory.some((h) => h.toLowerCase().includes('diabetes'))) {
      gaps.push({
        field: 'DM_QUALITY',
        description: 'Diabetes documented — ensure quality measure documentation',
        impact: 'QUALITY_MEASURE',
        suggestion: 'Document: A1c result/date, last eye exam, last foot exam, smoking status',
      });
    }

    if (input.medicalHistory.some((h) => h.toLowerCase().includes('hypertension'))) {
      gaps.push({
        field: 'HTN_QUALITY',
        description: 'Hypertension documented — ensure BP at goal documentation',
        impact: 'QUALITY_MEASURE',
        suggestion: 'Document: current BP, target BP, medication compliance, controlled vs uncontrolled',
      });
    }

    return gaps;
  }

  private deduplicateAndRank(suggestions: CodeSuggestion[]): CodeSuggestion[] {
    // Deduplicate by code, keeping highest confidence
    const byCode = new Map<string, CodeSuggestion>();
    for (const s of suggestions) {
      const existing = byCode.get(s.code);
      if (!existing || s.confidence > existing.confidence) {
        byCode.set(s.code, s);
      }
    }

    // Sort: primary first, then by confidence
    return Array.from(byCode.values()).sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.confidence - a.confidence;
    });
  }

  private generateSummary(
    codes: CodeSuggestion[],
    gaps: DocumentationGap[],
    upgrades: SpecificityUpgrade[]
  ): string {
    const parts: string[] = [];

    parts.push(`${codes.length} diagnosis codes suggested`);

    const primary = codes.find((c) => c.isPrimary);
    if (primary) {
      parts.push(`Primary: ${primary.code} (${primary.description})`);
    }

    if (upgrades.length > 0) {
      parts.push(`${upgrades.length} specificity upgrade(s) available`);
    }

    if (gaps.length > 0) {
      const reimbursementGaps = gaps.filter((g) => g.impact === 'REIMBURSEMENT');
      if (reimbursementGaps.length > 0) {
        parts.push(`${reimbursementGaps.length} reimbursement-impacting documentation gap(s)`);
      }
    }

    return parts.join('. ') + '.';
  }
}
