/**
 * CMS Clinical Narrative Generator
 *
 * Tier 2 service — uses Claude to generate CMS-compliant clinical narratives
 * from structured INTERACT document data. The generated narrative serves as:
 *
 * 1. The clinical summary the ER physician reads at 2am
 * 2. The documentation supporting ICD-10 diagnosis codes
 * 3. The documentation supporting E/M level assignment
 * 4. The audit trail for CMS compliance review
 *
 * Cost: ~$0.01/encounter using Sonnet, ~$0.003 using Haiku
 */

import type { InteractDocument } from '../../types/interact.types';
import type { CodingResult } from './DiagnosisCodingEngine';
import type { MDMAssessment } from '../../catalogs/em-level-rules';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NarrativeInput {
  // Patient
  patientName: string;
  patientAge: number;
  patientGender: string;

  // INTERACT document (structured data)
  interactDocument?: Partial<InteractDocument>;

  // Coding result (from DiagnosisCodingEngine)
  codingResult?: CodingResult;

  // E/M assessment (from EmLevelDeterminator)
  emAssessment?: MDMAssessment;

  // Additional clinical context
  chiefComplaint: string;
  presentingSymptoms: string[];
  medicalHistory: string[];
  medications: string[];
  allergies: string[];
  vitalSigns?: string;
  recentLabs?: string;
  functionalBaseline?: string;
  codeStatus?: string;
  isolationStatus?: string;
  woundSummary?: string;

  // Transfer context
  sendingFacility?: string;
  transferReason?: string;
  transferUrgency?: string;
}

export interface NarrativeResult {
  clinicalNarrative: string;
  codingSupportNarrative: string;
  transferSummary: string;
  oneLiner: string;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export class NarrativeGenerator {
  /**
   * Tier 0: Template-based narrative (zero AI cost)
   * Generates a structured clinical narrative from template.
   * Good enough for documentation — not as natural as AI-generated.
   */
  generateTemplateNarrative(input: NarrativeInput): NarrativeResult {
    const clinicalNarrative = this.buildClinicalNarrative(input);
    const codingSupportNarrative = this.buildCodingSupportNarrative(input);
    const transferSummary = this.buildTransferSummary(input);
    const oneLiner = this.buildOneLiner(input);

    return {
      clinicalNarrative,
      codingSupportNarrative,
      transferSummary,
      oneLiner,
    };
  }

  /**
   * Tier 2: Build prompt for Claude to generate a polished clinical narrative.
   * Returns the prompt string — caller sends to Claude API.
   */
  buildAINarrativePrompt(input: NarrativeInput): string {
    return `You are an experienced emergency medicine physician writing a clinical narrative for a patient arriving from a skilled nursing facility. Write a concise, professional clinical summary that:

1. Supports the documented diagnosis codes
2. Establishes the patient's baseline (cognitive, functional, wound status)
3. Clearly describes the acute change from baseline
4. Documents key medications, allergies, and code status prominently
5. Notes isolation precautions if any
6. Uses standard medical documentation language

## Patient Data

**Demographics:** ${input.patientAge}-year-old ${input.patientGender.toLowerCase()}
**From:** ${input.sendingFacility ?? 'Skilled nursing facility'}
**Transfer Reason:** ${input.transferReason ?? input.chiefComplaint}
**Urgency:** ${input.transferUrgency ?? 'Urgent'}

**Chief Complaint:** ${input.chiefComplaint}
**Presenting Symptoms:** ${input.presentingSymptoms.join(', ')}

**Medical History:** ${input.medicalHistory.join(', ')}
**Medications:** ${input.medications.join(', ')}
**Allergies:** ${input.allergies.length > 0 ? input.allergies.join(', ') : 'NKDA'}

${input.vitalSigns ? `**Vital Signs:** ${input.vitalSigns}` : ''}
${input.recentLabs ? `**Recent Labs:** ${input.recentLabs}` : ''}
${input.functionalBaseline ? `**Functional Baseline:** ${input.functionalBaseline}` : ''}
${input.codeStatus ? `**Code Status:** ${input.codeStatus}` : ''}
${input.isolationStatus ? `**Isolation:** ${input.isolationStatus}` : ''}
${input.woundSummary ? `**Wounds:** ${input.woundSummary}` : ''}

${input.codingResult ? `**Suggested ICD-10 Codes:**\n${input.codingResult.suggestedCodes.map((c) => `- ${c.code}: ${c.description}`).join('\n')}` : ''}
${input.emAssessment ? `**E/M Level:** ${input.emAssessment.cptCode} (MDM: ${input.emAssessment.overallMDM})` : ''}

## Output Format

Provide THREE sections:

### 1. Clinical Narrative (2-3 paragraphs)
The main clinical summary paragraph(s). Start with age/gender/PMH, then acute presentation, then relevant clinical details. This should read like a standard admission H&P opening.

### 2. Coding Support Documentation
A bullet-point section that explicitly documents the clinical elements supporting each diagnosis code. Each bullet should connect a clinical finding to a specific code.

### 3. One-Liner
A single sentence summary suitable for a patient board or handoff. Format: "[Age][Gender] with [key PMH] presenting from SNF with [acute problem], [key concern]."`;
  }

  // -----------------------------------------------------------------------
  // Template-based narrative builders
  // -----------------------------------------------------------------------

  private buildClinicalNarrative(input: NarrativeInput): string {
    const parts: string[] = [];

    // Opening: demographics + PMH + presentation
    const pmhList = input.medicalHistory.slice(0, 5).join(', ');
    parts.push(
      `${input.patientAge}-year-old ${input.patientGender.toLowerCase()} ` +
      `with past medical history significant for ${pmhList} ` +
      `presents from ${input.sendingFacility ?? 'skilled nursing facility'} ` +
      `with ${input.chiefComplaint.toLowerCase()}.`
    );

    // Presenting symptoms
    if (input.presentingSymptoms.length > 0) {
      parts.push(
        `Presenting symptoms include ${input.presentingSymptoms.join(', ')}.`
      );
    }

    // Functional baseline
    if (input.functionalBaseline) {
      parts.push(`Functional baseline: ${input.functionalBaseline}.`);
    }

    // Code status (critical for SNF transfers)
    if (input.codeStatus) {
      parts.push(`Code status: ${input.codeStatus}.`);
    }

    // Medications
    const medCount = input.medications.length;
    if (medCount > 0) {
      parts.push(
        `Patient is on ${medCount} medication${medCount === 1 ? '' : 's'}` +
        (medCount <= 5
          ? `: ${input.medications.join(', ')}.`
          : ` including ${input.medications.slice(0, 3).join(', ')}, and ${medCount - 3} others.`)
      );
    }

    // Allergies
    parts.push(
      input.allergies.length > 0
        ? `Allergies: ${input.allergies.join(', ')}.`
        : 'No known drug allergies.'
    );

    // Isolation
    if (input.isolationStatus) {
      parts.push(`Isolation precautions: ${input.isolationStatus}.`);
    }

    // Wounds
    if (input.woundSummary) {
      parts.push(`Wound status: ${input.woundSummary}.`);
    }

    // Vitals
    if (input.vitalSigns) {
      parts.push(`Vital signs on transfer: ${input.vitalSigns}.`);
    }

    // Labs
    if (input.recentLabs) {
      parts.push(`Recent labs: ${input.recentLabs}.`);
    }

    return parts.join(' ');
  }

  private buildCodingSupportNarrative(input: NarrativeInput): string {
    if (!input.codingResult) return 'No coding analysis available.';

    const lines: string[] = ['Coding Support Documentation:'];

    for (const code of input.codingResult.suggestedCodes) {
      lines.push(`- ${code.code} (${code.description}): ${code.rationale}`);
    }

    if (input.codingResult.documentationGaps.length > 0) {
      lines.push('\nDocumentation Gaps:');
      for (const gap of input.codingResult.documentationGaps) {
        lines.push(`- [${gap.impact}] ${gap.description}: ${gap.suggestion}`);
      }
    }

    if (input.emAssessment) {
      lines.push(`\nE/M Level: ${input.emAssessment.cptCode}`);
      lines.push(`MDM Complexity: ${input.emAssessment.overallMDM}`);
      lines.push(`Rationale: ${input.emAssessment.rationale}`);

      if (input.emAssessment.documentationGaps.length > 0) {
        lines.push('E/M Documentation Gaps:');
        for (const gap of input.emAssessment.documentationGaps) {
          lines.push(`- ${gap}`);
        }
      }
    }

    return lines.join('\n');
  }

  private buildTransferSummary(input: NarrativeInput): string {
    const parts: string[] = [];

    parts.push(`TRANSFER SUMMARY`);
    parts.push(`Patient: ${input.patientName}, ${input.patientAge}yo ${input.patientGender}`);
    parts.push(`From: ${input.sendingFacility ?? 'SNF'}`);
    parts.push(`Reason: ${input.transferReason ?? input.chiefComplaint}`);
    parts.push(`Urgency: ${input.transferUrgency ?? 'Urgent'}`);
    parts.push(`Code Status: ${input.codeStatus ?? 'Unknown — VERIFY ON ARRIVAL'}`);

    if (input.isolationStatus) {
      parts.push(`ISOLATION: ${input.isolationStatus}`);
    }

    parts.push(`Allergies: ${input.allergies.length > 0 ? input.allergies.join(', ') : 'NKDA'}`);
    parts.push(`Medications: ${input.medications.length} active`);

    if (input.codingResult?.primaryDiagnosis) {
      parts.push(`Primary Dx: ${input.codingResult.primaryDiagnosis.code} — ${input.codingResult.primaryDiagnosis.description}`);
    }

    return parts.join('\n');
  }

  private buildOneLiner(input: NarrativeInput): string {
    const topPMH = input.medicalHistory.slice(0, 3).join(', ');
    const concern = input.codingResult?.primaryDiagnosis?.description ?? input.chiefComplaint;

    return (
      `${input.patientAge}yo ${input.patientGender.charAt(0)} with ${topPMH} ` +
      `presenting from SNF with ${concern.toLowerCase()}` +
      (input.codeStatus ? `, ${input.codeStatus}` : '') +
      (input.isolationStatus ? `, ${input.isolationStatus}` : '') +
      '.'
    );
  }
}
