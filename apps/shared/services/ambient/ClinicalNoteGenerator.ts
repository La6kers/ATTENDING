// =============================================================================
// ATTENDING AI - Clinical Note Generator
// apps/shared/services/ambient/ClinicalNoteGenerator.ts
//
// Generates structured clinical notes (SOAP, H&P) from ambient extraction
// =============================================================================

import type {
  ListeningSession,
  ClinicalExtraction,
  TranscriptionResult,
  HPIElements,
  ReviewOfSystems,
  PhysicalExamFindings,
  MedicationMention,
  AllergyMention,
  PlanItem,
} from './AmbientListeningService';

// =============================================================================
// TYPES
// =============================================================================

export type NoteFormat = 'soap' | 'hp' | 'progress' | 'consult';

export interface GeneratedNote {
  id: string;
  sessionId: string;
  format: NoteFormat;
  content: NoteContent;
  plainText: string;
  htmlFormatted: string;
  wordCount: number;
  generatedAt: Date;
  confidence: number;
  reviewRequired: boolean;
  flaggedSections: string[];
}

export interface NoteContent {
  // SOAP sections
  subjective?: SubjectiveContent;
  objective?: ObjectiveContent;
  assessment?: AssessmentContent;
  plan?: PlanContent;
  
  // Additional H&P sections
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  pastSurgicalHistory?: string;
  medications?: string;
  allergies?: string;
  familyHistory?: string;
  socialHistory?: string;
  reviewOfSystems?: string;
  physicalExamination?: string;
}

export interface SubjectiveContent {
  chiefComplaint: string;
  hpi: string;
  ros: string;
  pmh: string;
  psh: string;
  medications: string;
  allergies: string;
  familyHistory: string;
  socialHistory: string;
}

export interface ObjectiveContent {
  vitals: string;
  generalAppearance: string;
  physicalExam: string;
  diagnosticResults?: string;
}

export interface AssessmentContent {
  diagnoses: string;
  differentialDiagnoses?: string;
  clinicalReasoning?: string;
}

export interface PlanContent {
  items: string;
  medications?: string;
  diagnostics?: string;
  referrals?: string;
  patientEducation?: string;
  followUp?: string;
}

export interface NoteGenerationOptions {
  format: NoteFormat;
  includeReviewOfSystems: boolean;
  includeFullPhysicalExam: boolean;
  verbosityLevel: 'concise' | 'standard' | 'detailed';
  templateStyle: 'narrative' | 'structured' | 'bullet';
  specialty?: string;
}

// =============================================================================
// CLINICAL NOTE GENERATOR
// =============================================================================

export class ClinicalNoteGenerator {
  private defaultOptions: NoteGenerationOptions = {
    format: 'soap',
    includeReviewOfSystems: true,
    includeFullPhysicalExam: true,
    verbosityLevel: 'standard',
    templateStyle: 'narrative',
  };

  // =========================================================================
  // MAIN GENERATION METHODS
  // =========================================================================

  async generateNote(
    session: ListeningSession,
    options: Partial<NoteGenerationOptions> = {}
  ): Promise<GeneratedNote> {
    const opts = { ...this.defaultOptions, ...options };
    const extraction = session.extractedData;
    
    let content: NoteContent;
    let plainText: string;
    let htmlFormatted: string;

    switch (opts.format) {
      case 'soap':
        content = this.generateSOAPContent(extraction, opts);
        plainText = this.formatSOAPAsText(content);
        htmlFormatted = this.formatSOAPAsHTML(content);
        break;
      
      case 'hp':
        content = this.generateHPContent(extraction, opts);
        plainText = this.formatHPAsText(content);
        htmlFormatted = this.formatHPAsHTML(content);
        break;
      
      case 'progress':
        content = this.generateProgressContent(extraction, opts);
        plainText = this.formatProgressAsText(content);
        htmlFormatted = this.formatProgressAsHTML(content);
        break;
      
      default:
        content = this.generateSOAPContent(extraction, opts);
        plainText = this.formatSOAPAsText(content);
        htmlFormatted = this.formatSOAPAsHTML(content);
    }

    const flaggedSections = this.identifyFlaggedSections(content, extraction);
    const confidence = this.calculateConfidence(session, extraction);

    return {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      format: opts.format,
      content,
      plainText,
      htmlFormatted,
      wordCount: plainText.split(/\s+/).length,
      generatedAt: new Date(),
      confidence,
      reviewRequired: confidence < 0.8 || flaggedSections.length > 0,
      flaggedSections,
    };
  }

  // =========================================================================
  // SOAP NOTE GENERATION
  // =========================================================================

  private generateSOAPContent(
    extraction: ClinicalExtraction,
    options: NoteGenerationOptions
  ): NoteContent {
    return {
      subjective: {
        chiefComplaint: extraction.chiefComplaint || 'Chief complaint not documented',
        hpi: this.generateHPI(extraction.hpiElements, extraction.chiefComplaint),
        ros: this.generateROS(extraction.reviewOfSystems, options),
        pmh: this.generatePMH(extraction.conditions),
        psh: 'Review patient chart for surgical history',
        medications: this.generateMedicationList(extraction.medications),
        allergies: this.generateAllergyList(extraction.allergies),
        familyHistory: this.generateFamilyHistory(extraction.familyHistory),
        socialHistory: this.generateSocialHistory(extraction.socialHistory),
      },
      objective: {
        vitals: this.generateVitals(extraction.vitals),
        generalAppearance: extraction.physicalExam.general.length > 0
          ? extraction.physicalExam.general.join('. ')
          : 'Alert and oriented, no acute distress',
        physicalExam: this.generatePhysicalExam(extraction.physicalExam, options),
      },
      assessment: {
        diagnoses: extraction.assessment.primaryDiagnosis || extraction.chiefComplaint || 'Assessment pending',
        differentialDiagnoses: extraction.assessment.differentials.length > 0
          ? extraction.assessment.differentials.join(', ')
          : undefined,
        clinicalReasoning: extraction.assessment.clinicalImpression,
      },
      plan: {
        items: this.generatePlanItems(extraction.plan),
        followUp: extraction.plan.find(p => p.category === 'follow_up')?.description,
      },
    };
  }

  private generateHPI(hpi: HPIElements, chiefComplaint?: string): string {
    const parts: string[] = [];

    if (chiefComplaint) {
      parts.push(`Patient presents with ${chiefComplaint.toLowerCase()}`);
    }

    if (hpi.onset) {
      parts.push(`onset ${hpi.onset}`);
    }

    if (hpi.duration) {
      parts.push(`for ${hpi.duration}`);
    }

    if (hpi.location) {
      parts.push(`located in the ${hpi.location}`);
    }

    if (hpi.character) {
      parts.push(`described as ${hpi.character}`);
    }

    if (hpi.severity) {
      if (/^\d+$/.test(hpi.severity)) {
        parts.push(`with severity rated ${hpi.severity}/10`);
      } else {
        parts.push(`described as ${hpi.severity} in severity`);
      }
    }

    let text = parts.length > 0 ? parts.join(', ') + '. ' : '';

    if (hpi.aggravatingFactors.length > 0) {
      text += `Symptoms are aggravated by ${hpi.aggravatingFactors.join(', ')}. `;
    }

    if (hpi.relievingFactors.length > 0) {
      text += `Symptoms are relieved by ${hpi.relievingFactors.join(', ')}. `;
    }

    if (hpi.associatedSymptoms.length > 0) {
      text += `Associated symptoms include ${hpi.associatedSymptoms.join(', ')}. `;
    }

    if (hpi.timing) {
      text += `Timing: ${hpi.timing}. `;
    }

    if (hpi.context) {
      text += hpi.context;
    }

    return text || 'History of present illness to be documented.';
  }

  private generateROS(ros: ReviewOfSystems, options: NoteGenerationOptions): string {
    const sections: string[] = [];

    const rosMapping: Array<{ key: keyof ReviewOfSystems; label: string }> = [
      { key: 'constitutional', label: 'Constitutional' },
      { key: 'eyes', label: 'Eyes' },
      { key: 'enmt', label: 'ENT' },
      { key: 'cardiovascular', label: 'Cardiovascular' },
      { key: 'respiratory', label: 'Respiratory' },
      { key: 'gastrointestinal', label: 'Gastrointestinal' },
      { key: 'genitourinary', label: 'Genitourinary' },
      { key: 'musculoskeletal', label: 'Musculoskeletal' },
      { key: 'integumentary', label: 'Skin' },
      { key: 'neurological', label: 'Neurological' },
      { key: 'psychiatric', label: 'Psychiatric' },
      { key: 'endocrine', label: 'Endocrine' },
      { key: 'hematologic', label: 'Hematologic/Lymphatic' },
      { key: 'allergicImmunologic', label: 'Allergic/Immunologic' },
    ];

    for (const { key, label } of rosMapping) {
      const findings = ros[key];
      if (findings.length > 0) {
        sections.push(`${label}: Positive for ${findings.join(', ')}`);
      } else if (options.includeReviewOfSystems) {
        sections.push(`${label}: Negative`);
      }
    }

    if (sections.length === 0) {
      return 'Review of systems not documented or all systems negative';
    }

    return options.templateStyle === 'bullet'
      ? sections.map(s => `• ${s}`).join('\n')
      : sections.join('. ') + '.';
  }

  private generatePMH(conditions: { name: string; status: string }[]): string {
    const active = conditions.filter(c => c.status === 'active');
    
    if (active.length === 0) {
      return 'No significant past medical history documented during visit';
    }

    return active.map(c => c.name).join(', ');
  }

  private generateMedicationList(medications: MedicationMention[]): string {
    if (medications.length === 0) {
      return 'No current medications documented';
    }

    return medications
      .filter(m => m.status === 'current')
      .map(m => {
        let text = m.name;
        if (m.dose) text += ` ${m.dose}`;
        if (m.frequency) text += ` ${m.frequency}`;
        return text;
      })
      .join(', ');
  }

  private generateAllergyList(allergies: AllergyMention[]): string {
    if (allergies.length === 0) {
      return 'No known drug allergies (NKDA) - verify with patient';
    }

    return allergies
      .map(a => {
        let text = a.allergen;
        if (a.reaction) text += ` (${a.reaction})`;
        return text;
      })
      .join(', ');
  }

  private generateFamilyHistory(fh: { conditions: Array<{ condition: string; relation: string }> }): string {
    if (!fh || fh.conditions.length === 0) {
      return 'Family history not documented during visit';
    }

    return fh.conditions
      .map(c => `${c.condition} (${c.relation})`)
      .join(', ');
  }

  private generateSocialHistory(sh: Record<string, string | undefined>): string {
    const parts: string[] = [];

    if (sh.tobacco) parts.push(`Tobacco: ${sh.tobacco}`);
    if (sh.alcohol) parts.push(`Alcohol: ${sh.alcohol}`);
    if (sh.drugs) parts.push(`Illicit drugs: ${sh.drugs}`);
    if (sh.occupation) parts.push(`Occupation: ${sh.occupation}`);
    if (sh.exercise) parts.push(`Exercise: ${sh.exercise}`);

    return parts.length > 0 ? parts.join('. ') + '.' : 'Social history not documented during visit';
  }

  private generateVitals(vitals: Array<{ type: string; value: string; unit?: string }>): string {
    if (vitals.length === 0) {
      return 'Vital signs: See nursing documentation';
    }

    const vitalMap: Record<string, string> = {};
    
    for (const v of vitals) {
      const key = v.type.toLowerCase().replace(/_/g, ' ');
      vitalMap[key] = v.unit ? `${v.value} ${v.unit}` : v.value;
    }

    const parts: string[] = [];
    if (vitalMap['blood pressure']) parts.push(`BP ${vitalMap['blood pressure']}`);
    if (vitalMap['heart rate']) parts.push(`HR ${vitalMap['heart rate']}`);
    if (vitalMap['temperature']) parts.push(`Temp ${vitalMap['temperature']}`);
    if (vitalMap['respiratory rate']) parts.push(`RR ${vitalMap['respiratory rate']}`);
    if (vitalMap['oxygen saturation']) parts.push(`O2 ${vitalMap['oxygen saturation']}%`);
    if (vitalMap['weight']) parts.push(`Weight ${vitalMap['weight']}`);

    return parts.length > 0 ? parts.join(', ') : 'Vital signs pending';
  }

  private generatePhysicalExam(pe: PhysicalExamFindings, options: NoteGenerationOptions): string {
    const sections: string[] = [];

    const peMapping: Array<{ key: keyof PhysicalExamFindings; label: string; default: string }> = [
      { key: 'general', label: 'General', default: 'Alert, oriented, no acute distress' },
      { key: 'heent', label: 'HEENT', default: 'Normocephalic, PERRLA, oropharynx clear' },
      { key: 'neck', label: 'Neck', default: 'Supple, no lymphadenopathy, no thyromegaly' },
      { key: 'cardiovascular', label: 'Cardiovascular', default: 'Regular rate and rhythm, no murmurs' },
      { key: 'respiratory', label: 'Respiratory', default: 'Clear to auscultation bilaterally' },
      { key: 'abdomen', label: 'Abdomen', default: 'Soft, non-tender, non-distended, normoactive bowel sounds' },
      { key: 'extremities', label: 'Extremities', default: 'No edema, pulses intact' },
      { key: 'neurological', label: 'Neurological', default: 'Alert, oriented x3, CN II-XII intact' },
      { key: 'skin', label: 'Skin', default: 'Warm, dry, no rashes' },
      { key: 'psychiatric', label: 'Psychiatric', default: 'Appropriate mood and affect' },
    ];

    for (const { key, label, default: defaultText } of peMapping) {
      const findings = pe[key];
      if (findings.length > 0) {
        sections.push(`${label}: ${findings.join('. ')}`);
      } else if (options.includeFullPhysicalExam) {
        sections.push(`${label}: ${defaultText}`);
      }
    }

    return options.templateStyle === 'bullet'
      ? sections.map(s => `• ${s}`).join('\n')
      : sections.join('\n');
  }

  private generatePlanItems(plan: PlanItem[]): string {
    if (plan.length === 0) {
      return 'Plan to be documented by provider';
    }

    const categorized: Record<string, PlanItem[]> = {};
    
    for (const item of plan) {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push(item);
    }

    const sections: string[] = [];

    const categoryLabels: Record<string, string> = {
      medication: 'Medications',
      lab: 'Laboratory',
      imaging: 'Imaging',
      referral: 'Referrals',
      procedure: 'Procedures',
      education: 'Patient Education',
      follow_up: 'Follow-up',
      other: 'Other',
    };

    for (const [category, items] of Object.entries(categorized)) {
      const label = categoryLabels[category] || category;
      const itemTexts = items.map(i => 
        i.details ? `${i.description} - ${i.details}` : i.description
      );
      sections.push(`${label}:\n${itemTexts.map(t => `  - ${t}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  // =========================================================================
  // H&P NOTE GENERATION
  // =========================================================================

  private generateHPContent(
    extraction: ClinicalExtraction,
    options: NoteGenerationOptions
  ): NoteContent {
    const soap = this.generateSOAPContent(extraction, options);
    
    return {
      ...soap,
      historyOfPresentIllness: soap.subjective?.hpi,
      pastMedicalHistory: soap.subjective?.pmh,
      pastSurgicalHistory: soap.subjective?.psh,
      medications: soap.subjective?.medications,
      allergies: soap.subjective?.allergies,
      familyHistory: soap.subjective?.familyHistory,
      socialHistory: soap.subjective?.socialHistory,
      reviewOfSystems: soap.subjective?.ros,
      physicalExamination: soap.objective?.physicalExam,
    };
  }

  // =========================================================================
  // PROGRESS NOTE GENERATION
  // =========================================================================

  private generateProgressContent(
    extraction: ClinicalExtraction,
    options: NoteGenerationOptions
  ): NoteContent {
    // Progress notes are typically shorter, focused on interval history
    const soap = this.generateSOAPContent(extraction, { ...options, verbosityLevel: 'concise' });
    
    return {
      subjective: {
        ...soap.subjective!,
        pmh: 'See chart',
        psh: 'See chart',
        familyHistory: 'See chart',
        socialHistory: 'See chart',
      },
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
    };
  }

  // =========================================================================
  // TEXT FORMATTING
  // =========================================================================

  private formatSOAPAsText(content: NoteContent): string {
    let text = '';

    if (content.subjective) {
      text += 'SUBJECTIVE:\n';
      text += `Chief Complaint: ${content.subjective.chiefComplaint}\n\n`;
      text += `History of Present Illness:\n${content.subjective.hpi}\n\n`;
      text += `Review of Systems:\n${content.subjective.ros}\n\n`;
      text += `Past Medical History: ${content.subjective.pmh}\n`;
      text += `Past Surgical History: ${content.subjective.psh}\n`;
      text += `Medications: ${content.subjective.medications}\n`;
      text += `Allergies: ${content.subjective.allergies}\n`;
      text += `Family History: ${content.subjective.familyHistory}\n`;
      text += `Social History: ${content.subjective.socialHistory}\n\n`;
    }

    if (content.objective) {
      text += 'OBJECTIVE:\n';
      text += `Vital Signs: ${content.objective.vitals}\n`;
      text += `General: ${content.objective.generalAppearance}\n\n`;
      text += `Physical Examination:\n${content.objective.physicalExam}\n\n`;
    }

    if (content.assessment) {
      text += 'ASSESSMENT:\n';
      text += `${content.assessment.diagnoses}\n`;
      if (content.assessment.differentialDiagnoses) {
        text += `Differential: ${content.assessment.differentialDiagnoses}\n`;
      }
      text += '\n';
    }

    if (content.plan) {
      text += 'PLAN:\n';
      text += content.plan.items;
    }

    return text;
  }

  private formatSOAPAsHTML(content: NoteContent): string {
    let html = '<div class="clinical-note soap-note">';

    if (content.subjective) {
      html += '<section class="subjective">';
      html += '<h2>SUBJECTIVE</h2>';
      html += `<p><strong>Chief Complaint:</strong> ${this.escapeHtml(content.subjective.chiefComplaint)}</p>`;
      html += `<h3>History of Present Illness</h3><p>${this.escapeHtml(content.subjective.hpi)}</p>`;
      html += `<h3>Review of Systems</h3><p>${this.escapeHtml(content.subjective.ros)}</p>`;
      html += `<p><strong>PMH:</strong> ${this.escapeHtml(content.subjective.pmh)}</p>`;
      html += `<p><strong>PSH:</strong> ${this.escapeHtml(content.subjective.psh)}</p>`;
      html += `<p><strong>Medications:</strong> ${this.escapeHtml(content.subjective.medications)}</p>`;
      html += `<p><strong>Allergies:</strong> ${this.escapeHtml(content.subjective.allergies)}</p>`;
      html += `<p><strong>Family History:</strong> ${this.escapeHtml(content.subjective.familyHistory)}</p>`;
      html += `<p><strong>Social History:</strong> ${this.escapeHtml(content.subjective.socialHistory)}</p>`;
      html += '</section>';
    }

    if (content.objective) {
      html += '<section class="objective">';
      html += '<h2>OBJECTIVE</h2>';
      html += `<p><strong>Vitals:</strong> ${this.escapeHtml(content.objective.vitals)}</p>`;
      html += `<p><strong>General:</strong> ${this.escapeHtml(content.objective.generalAppearance)}</p>`;
      html += `<h3>Physical Examination</h3><pre>${this.escapeHtml(content.objective.physicalExam)}</pre>`;
      html += '</section>';
    }

    if (content.assessment) {
      html += '<section class="assessment">';
      html += '<h2>ASSESSMENT</h2>';
      html += `<p>${this.escapeHtml(content.assessment.diagnoses)}</p>`;
      if (content.assessment.differentialDiagnoses) {
        html += `<p><strong>Differential:</strong> ${this.escapeHtml(content.assessment.differentialDiagnoses)}</p>`;
      }
      html += '</section>';
    }

    if (content.plan) {
      html += '<section class="plan">';
      html += '<h2>PLAN</h2>';
      html += `<pre>${this.escapeHtml(content.plan.items)}</pre>`;
      html += '</section>';
    }

    html += '</div>';
    return html;
  }

  private formatHPAsText(content: NoteContent): string {
    let text = 'HISTORY AND PHYSICAL\n\n';
    text += this.formatSOAPAsText(content);
    return text;
  }

  private formatHPAsHTML(content: NoteContent): string {
    return this.formatSOAPAsHTML(content).replace('soap-note', 'hp-note');
  }

  private formatProgressAsText(content: NoteContent): string {
    let text = 'PROGRESS NOTE\n\n';
    text += this.formatSOAPAsText(content);
    return text;
  }

  private formatProgressAsHTML(content: NoteContent): string {
    return this.formatSOAPAsHTML(content).replace('soap-note', 'progress-note');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  // =========================================================================
  // QUALITY ANALYSIS
  // =========================================================================

  private identifyFlaggedSections(content: NoteContent, extraction: ClinicalExtraction): string[] {
    const flags: string[] = [];

    if (!extraction.chiefComplaint) {
      flags.push('Chief complaint not clearly documented');
    }

    if (!extraction.hpiElements.duration && !extraction.hpiElements.onset) {
      flags.push('Symptom timeline/duration not documented');
    }

    if (extraction.allergies.length === 0) {
      flags.push('Allergies not verified - confirm NKDA status');
    }

    if (extraction.medications.length === 0) {
      flags.push('Medication reconciliation may be incomplete');
    }

    if (extraction.vitals.length === 0) {
      flags.push('Vital signs not documented in audio');
    }

    if (extraction.plan.length === 0) {
      flags.push('Treatment plan not clearly documented');
    }

    return flags;
  }

  private calculateConfidence(session: ListeningSession, extraction: ClinicalExtraction): number {
    let score = 0;
    let maxScore = 0;

    // Chief complaint (20%)
    maxScore += 20;
    if (extraction.chiefComplaint) score += 20;

    // HPI completeness (25%)
    maxScore += 25;
    const hpiElements = [
      extraction.hpiElements.onset,
      extraction.hpiElements.duration,
      extraction.hpiElements.severity,
      extraction.hpiElements.location,
      extraction.hpiElements.character,
    ];
    score += (hpiElements.filter(Boolean).length / 5) * 25;

    // Medications/Allergies (15%)
    maxScore += 15;
    if (extraction.medications.length > 0 || extraction.allergies.length > 0) {
      score += 15;
    }

    // Vitals (10%)
    maxScore += 10;
    if (extraction.vitals.length > 0) score += 10;

    // Assessment (15%)
    maxScore += 15;
    if (extraction.assessment.primaryDiagnosis || extraction.assessment.differentials.length > 0) {
      score += 15;
    }

    // Plan (15%)
    maxScore += 15;
    if (extraction.plan.length > 0) score += 15;

    // Transcription quality bonus
    const avgConfidence = session.transcriptions.length > 0
      ? session.transcriptions.reduce((sum, t) => sum + t.confidence, 0) / session.transcriptions.length
      : 0;
    
    const baseConfidence = score / maxScore;
    return Math.round((baseConfidence * 0.7 + avgConfidence * 0.3) * 100) / 100;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const clinicalNoteGenerator = new ClinicalNoteGenerator();
