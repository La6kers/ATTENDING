// =============================================================================
// ATTENDING AI - Prior Authorization Service
// apps/shared/services/prior-auth/PriorAuthService.ts
//
// Automates prior authorization submissions for medications, imaging, procedures
// Extracts clinical evidence, populates forms, submits, and tracks status
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type PACategory = 'medication' | 'imaging' | 'procedure' | 'dme' | 'genetic_testing' | 'specialty_referral';
export type PAStatus = 'draft' | 'pending_info' | 'ready' | 'submitted' | 'approved' | 'denied' | 'appealed' | 'expired';
export type PAUrgency = 'routine' | 'expedited' | 'urgent' | 'emergent';

export interface PriorAuthRequest {
  id: string;
  encounterId: string;
  patientId: string;
  providerId: string;
  category: PACategory;
  status: PAStatus;
  urgency: PAUrgency;
  
  // What's being requested
  requestedItem: RequestedItem;
  
  // Payer information
  payer: PayerInfo;
  
  // Clinical justification
  clinicalEvidence: ClinicalEvidence;
  
  // Submission details
  submission?: SubmissionDetails;
  
  // Tracking
  timeline: PATimelineEvent[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  autoSubmit: boolean;
}

export interface RequestedItem {
  type: PACategory;
  code: string;
  codeSystem: 'CPT' | 'HCPCS' | 'NDC' | 'RXNORM' | 'ICD10PCS';
  name: string;
  description?: string;
  quantity?: number;
  duration?: string;
  frequency?: string;
  
  // For medications
  medication?: {
    ndc?: string;
    rxnorm?: string;
    dosage: string;
    route: string;
    daysSupply: number;
    refills: number;
  };
  
  // For imaging/procedures
  procedure?: {
    cptCode: string;
    modifier?: string;
    bodyPart?: string;
    laterality?: 'left' | 'right' | 'bilateral';
    facilityType?: string;
  };
}

export interface PayerInfo {
  payerId: string;
  payerName: string;
  planId?: string;
  planName?: string;
  memberId: string;
  groupNumber?: string;
  phone?: string;
  fax?: string;
  portalUrl?: string;
  electronicSubmission: boolean;
  averageResponseDays: number;
}

export interface ClinicalEvidence {
  primaryDiagnosis: DiagnosisInfo;
  secondaryDiagnoses: DiagnosisInfo[];
  clinicalRationale: string;
  medicalNecessity: string;
  
  // Supporting documentation
  supportingDocuments: SupportingDocument[];
  
  // Treatment history
  previousTreatments: PreviousTreatment[];
  
  // Clinical criteria met
  criteriaChecklist: CriteriaItem[];
  
  // Lab results
  relevantLabs: RelevantLab[];
  
  // Imaging results
  relevantImaging: RelevantImaging[];
}

export interface DiagnosisInfo {
  icd10Code: string;
  description: string;
  onsetDate?: string;
  isPrimary: boolean;
}

export interface SupportingDocument {
  id: string;
  type: 'clinical_note' | 'lab_result' | 'imaging_report' | 'referral' | 'letter_medical_necessity' | 'other';
  title: string;
  dateOfService?: string;
  content?: string;
  fileUrl?: string;
  extracted: boolean;
}

export interface PreviousTreatment {
  treatment: string;
  startDate: string;
  endDate?: string;
  outcome: 'effective' | 'ineffective' | 'partial' | 'intolerable' | 'contraindicated';
  notes?: string;
}

export interface CriteriaItem {
  criterion: string;
  met: boolean;
  evidence?: string;
  required: boolean;
}

export interface RelevantLab {
  testName: string;
  testCode?: string;
  value: string;
  unit?: string;
  date: string;
  interpretation?: string;
}

export interface RelevantImaging {
  studyType: string;
  date: string;
  findings: string;
  impression?: string;
}

export interface SubmissionDetails {
  submittedAt: Date;
  submissionMethod: 'electronic' | 'fax' | 'portal' | 'phone';
  referenceNumber?: string;
  trackingNumber?: string;
  submittedBy: string;
  response?: PAResponse;
}

export interface PAResponse {
  receivedAt: Date;
  status: 'approved' | 'denied' | 'pend' | 'partial';
  authorizationNumber?: string;
  approvedQuantity?: number;
  approvedDuration?: string;
  effectiveDate?: string;
  expirationDate?: string;
  denialReason?: string;
  denialCode?: string;
  appealDeadline?: string;
  notes?: string;
}

export interface PATimelineEvent {
  timestamp: Date;
  event: string;
  details?: string;
  actor: string;
}

// =============================================================================
// PAYER RULES ENGINE
// =============================================================================

export interface PayerRule {
  payerId: string;
  category: PACategory;
  itemCode?: string;
  itemCodePattern?: RegExp;
  requiresPA: boolean;
  criteria: PayerCriteria[];
  stepTherapyRequired: boolean;
  stepTherapyDrugs?: string[];
  quantityLimits?: {
    maxQuantity: number;
    perDays: number;
  };
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };
  diagnosisRequired?: string[];
  documentationRequired: string[];
}

export interface PayerCriteria {
  id: string;
  description: string;
  type: 'diagnosis' | 'lab' | 'imaging' | 'treatment_failure' | 'clinical' | 'age' | 'duration';
  required: boolean;
  validation?: (data: any) => boolean;
}

// =============================================================================
// PRIOR AUTHORIZATION SERVICE
// =============================================================================

export class PriorAuthService extends EventEmitter {
  private payerRules: Map<string, PayerRule[]> = new Map();

  constructor() {
    super();
    this.initializePayerRules();
  }

  // =========================================================================
  // CORE METHODS
  // =========================================================================

  async createPriorAuth(
    encounterId: string,
    patientId: string,
    providerId: string,
    requestedItem: RequestedItem,
    payer: PayerInfo,
    urgency: PAUrgency = 'routine'
  ): Promise<PriorAuthRequest> {
    const paRequest: PriorAuthRequest = {
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      encounterId,
      patientId,
      providerId,
      category: requestedItem.type,
      status: 'draft',
      urgency,
      requestedItem,
      payer,
      clinicalEvidence: {
        primaryDiagnosis: { icd10Code: '', description: '', isPrimary: true },
        secondaryDiagnoses: [],
        clinicalRationale: '',
        medicalNecessity: '',
        supportingDocuments: [],
        previousTreatments: [],
        criteriaChecklist: [],
        relevantLabs: [],
        relevantImaging: [],
      },
      timeline: [{
        timestamp: new Date(),
        event: 'Prior authorization request created',
        actor: 'system',
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      autoSubmit: false,
    };

    // Check if PA is required
    const paRequired = await this.checkPARequired(requestedItem, payer);
    if (!paRequired) {
      paRequest.status = 'approved';
      paRequest.timeline.push({
        timestamp: new Date(),
        event: 'No prior authorization required for this item/payer',
        actor: 'system',
      });
    }

    // Get criteria checklist
    paRequest.clinicalEvidence.criteriaChecklist = await this.getCriteriaChecklist(
      requestedItem,
      payer
    );

    this.emit('paCreated', paRequest);
    return paRequest;
  }

  async checkPARequired(item: RequestedItem, payer: PayerInfo): Promise<boolean> {
    const rules = this.payerRules.get(payer.payerId) || [];
    
    for (const rule of rules) {
      if (rule.category !== item.type) continue;
      
      if (rule.itemCode && rule.itemCode === item.code) {
        return rule.requiresPA;
      }
      
      if (rule.itemCodePattern && rule.itemCodePattern.test(item.code)) {
        return rule.requiresPA;
      }
    }

    // Default: assume PA required for safety
    return true;
  }

  async getCriteriaChecklist(item: RequestedItem, payer: PayerInfo): Promise<CriteriaItem[]> {
    const rules = this.payerRules.get(payer.payerId) || [];
    const checklist: CriteriaItem[] = [];

    for (const rule of rules) {
      if (rule.category !== item.type) continue;
      
      for (const criterion of rule.criteria) {
        checklist.push({
          criterion: criterion.description,
          met: false,
          required: criterion.required,
        });
      }
    }

    // Add generic criteria if none found
    if (checklist.length === 0) {
      checklist.push(
        { criterion: 'Primary diagnosis documented', met: false, required: true },
        { criterion: 'Medical necessity documented', met: false, required: true },
        { criterion: 'Previous treatments documented', met: false, required: false },
        { criterion: 'Clinical notes attached', met: false, required: true },
      );
    }

    return checklist;
  }

  // =========================================================================
  // EVIDENCE EXTRACTION
  // =========================================================================

  async extractClinicalEvidence(
    paRequest: PriorAuthRequest,
    patientData: {
      diagnoses: DiagnosisInfo[];
      medications: any[];
      allergies: any[];
      labResults: RelevantLab[];
      imagingResults: RelevantImaging[];
      clinicalNotes: string[];
      encounters: any[];
    }
  ): Promise<ClinicalEvidence> {
    const evidence = paRequest.clinicalEvidence;

    // Extract primary diagnosis
    if (patientData.diagnoses.length > 0) {
      const primary = patientData.diagnoses.find(d => d.isPrimary) || patientData.diagnoses[0];
      evidence.primaryDiagnosis = primary;
      evidence.secondaryDiagnoses = patientData.diagnoses.filter(d => d !== primary);
    }

    // Extract relevant labs
    evidence.relevantLabs = this.filterRelevantLabs(
      patientData.labResults,
      paRequest.requestedItem
    );

    // Extract relevant imaging
    evidence.relevantImaging = this.filterRelevantImaging(
      patientData.imagingResults,
      paRequest.requestedItem
    );

    // Extract previous treatments
    evidence.previousTreatments = this.extractPreviousTreatments(
      patientData.medications,
      paRequest.requestedItem
    );

    // Generate clinical rationale
    evidence.clinicalRationale = this.generateClinicalRationale(
      paRequest,
      evidence
    );

    // Generate medical necessity statement
    evidence.medicalNecessity = this.generateMedicalNecessity(
      paRequest,
      evidence
    );

    // Update criteria checklist
    evidence.criteriaChecklist = this.evaluateCriteria(
      evidence.criteriaChecklist,
      evidence
    );

    // Add supporting documents
    for (const note of patientData.clinicalNotes) {
      evidence.supportingDocuments.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'clinical_note',
        title: 'Clinical Note',
        content: note,
        extracted: true,
      });
    }

    paRequest.updatedAt = new Date();
    paRequest.timeline.push({
      timestamp: new Date(),
      event: 'Clinical evidence extracted from patient record',
      details: `Found ${evidence.relevantLabs.length} labs, ${evidence.previousTreatments.length} previous treatments`,
      actor: 'system',
    });

    // Check if ready for submission
    const readyStatus = this.checkReadyForSubmission(paRequest);
    if (readyStatus.ready) {
      paRequest.status = 'ready';
    } else {
      paRequest.status = 'pending_info';
    }

    this.emit('evidenceExtracted', { paRequest, evidence });
    return evidence;
  }

  private filterRelevantLabs(labs: RelevantLab[], item: RequestedItem): RelevantLab[] {
    // Filter labs relevant to the requested item
    // This would be more sophisticated in production with clinical rules
    const recentLabs = labs.filter(lab => {
      const labDate = new Date(lab.date);
      const daysSince = (Date.now() - labDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 90; // Labs within 90 days
    });

    return recentLabs.slice(0, 10); // Return up to 10 most relevant
  }

  private filterRelevantImaging(imaging: RelevantImaging[], item: RequestedItem): RelevantImaging[] {
    return imaging.filter(img => {
      const imgDate = new Date(img.date);
      const daysSince = (Date.now() - imgDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 365; // Imaging within 1 year
    });
  }

  private extractPreviousTreatments(medications: any[], item: RequestedItem): PreviousTreatment[] {
    const treatments: PreviousTreatment[] = [];

    // For medications - look for step therapy failures
    if (item.type === 'medication') {
      for (const med of medications) {
        if (med.status === 'stopped' || med.status === 'discontinued') {
          treatments.push({
            treatment: med.medicationName || med.name,
            startDate: med.startDate || med.prescribedDate,
            endDate: med.endDate || med.discontinuedAt,
            outcome: this.determineOutcome(med.discontinueReason),
            notes: med.discontinueReason,
          });
        }
      }
    }

    return treatments;
  }

  private determineOutcome(reason?: string): PreviousTreatment['outcome'] {
    if (!reason) return 'ineffective';
    
    const lower = reason.toLowerCase();
    if (lower.includes('side effect') || lower.includes('adverse') || lower.includes('intoleran')) {
      return 'intolerable';
    }
    if (lower.includes('contraindicated') || lower.includes('allergy')) {
      return 'contraindicated';
    }
    if (lower.includes('partial') || lower.includes('some improvement')) {
      return 'partial';
    }
    if (lower.includes('effective') || lower.includes('resolved')) {
      return 'effective';
    }
    return 'ineffective';
  }

  private generateClinicalRationale(
    paRequest: PriorAuthRequest,
    evidence: ClinicalEvidence
  ): string {
    const item = paRequest.requestedItem;
    let rationale = '';

    rationale += `Patient presents with ${evidence.primaryDiagnosis.description} (${evidence.primaryDiagnosis.icd10Code}). `;

    if (evidence.secondaryDiagnoses.length > 0) {
      const secondary = evidence.secondaryDiagnoses.map(d => d.description).join(', ');
      rationale += `Contributing conditions include ${secondary}. `;
    }

    rationale += `${item.name} is requested for treatment of this condition. `;

    if (evidence.previousTreatments.length > 0) {
      const failed = evidence.previousTreatments.filter(t => 
        t.outcome === 'ineffective' || t.outcome === 'intolerable'
      );
      if (failed.length > 0) {
        rationale += `Patient has previously tried ${failed.map(t => t.treatment).join(', ')} `;
        rationale += `without adequate response or with intolerable side effects. `;
      }
    }

    if (evidence.relevantLabs.length > 0) {
      rationale += 'Relevant laboratory findings support the diagnosis and treatment plan. ';
    }

    return rationale;
  }

  private generateMedicalNecessity(
    paRequest: PriorAuthRequest,
    evidence: ClinicalEvidence
  ): string {
    const item = paRequest.requestedItem;
    let necessity = '';

    necessity += `${item.name} is medically necessary for the treatment of ${evidence.primaryDiagnosis.description}. `;
    
    necessity += 'This treatment is indicated based on current clinical guidelines and the patient\'s ';
    necessity += 'individual clinical presentation. ';

    if (evidence.previousTreatments.length > 0) {
      const failedCount = evidence.previousTreatments.filter(t => 
        t.outcome !== 'effective'
      ).length;
      if (failedCount > 0) {
        necessity += `The patient has failed ${failedCount} previous treatment attempt(s), `;
        necessity += 'demonstrating the need for escalation of therapy. ';
      }
    }

    necessity += 'Without this treatment, the patient is at risk for disease progression, ';
    necessity += 'complications, and decreased quality of life. ';
    necessity += 'No reasonable alternatives exist that would provide equivalent benefit.';

    return necessity;
  }

  private evaluateCriteria(
    checklist: CriteriaItem[],
    evidence: ClinicalEvidence
  ): CriteriaItem[] {
    for (const item of checklist) {
      const criterion = item.criterion.toLowerCase();

      if (criterion.includes('diagnosis')) {
        item.met = !!evidence.primaryDiagnosis.icd10Code;
        item.evidence = evidence.primaryDiagnosis.icd10Code;
      }
      
      if (criterion.includes('medical necessity')) {
        item.met = evidence.medicalNecessity.length > 50;
        item.evidence = 'Medical necessity statement generated';
      }

      if (criterion.includes('previous treatment') || criterion.includes('step therapy')) {
        item.met = evidence.previousTreatments.length > 0;
        item.evidence = evidence.previousTreatments.map(t => t.treatment).join(', ');
      }

      if (criterion.includes('lab')) {
        item.met = evidence.relevantLabs.length > 0;
        item.evidence = `${evidence.relevantLabs.length} relevant labs`;
      }

      if (criterion.includes('clinical note') || criterion.includes('documentation')) {
        item.met = evidence.supportingDocuments.length > 0;
        item.evidence = `${evidence.supportingDocuments.length} documents attached`;
      }
    }

    return checklist;
  }

  // =========================================================================
  // SUBMISSION
  // =========================================================================

  checkReadyForSubmission(paRequest: PriorAuthRequest): { ready: boolean; missing: string[] } {
    const missing: string[] = [];
    const evidence = paRequest.clinicalEvidence;

    // Check required fields
    if (!evidence.primaryDiagnosis.icd10Code) {
      missing.push('Primary diagnosis');
    }

    if (!evidence.medicalNecessity || evidence.medicalNecessity.length < 50) {
      missing.push('Medical necessity statement');
    }

    // Check required criteria
    const requiredCriteria = evidence.criteriaChecklist.filter(c => c.required);
    for (const criterion of requiredCriteria) {
      if (!criterion.met) {
        missing.push(criterion.criterion);
      }
    }

    // Check supporting documents
    if (evidence.supportingDocuments.length === 0) {
      missing.push('Supporting documentation');
    }

    return {
      ready: missing.length === 0,
      missing,
    };
  }

  async submitPriorAuth(paRequest: PriorAuthRequest, submittedBy: string): Promise<PriorAuthRequest> {
    const readyCheck = this.checkReadyForSubmission(paRequest);
    
    if (!readyCheck.ready) {
      throw new Error(`Cannot submit: missing ${readyCheck.missing.join(', ')}`);
    }

    // Determine submission method
    const submissionMethod = paRequest.payer.electronicSubmission 
      ? 'electronic' 
      : 'fax';

    paRequest.submission = {
      submittedAt: new Date(),
      submissionMethod,
      submittedBy,
      referenceNumber: `REF${Date.now()}`,
    };

    paRequest.status = 'submitted';
    paRequest.updatedAt = new Date();

    // Set expiration based on urgency
    const expirationDays = paRequest.urgency === 'urgent' ? 1 : 
                          paRequest.urgency === 'expedited' ? 3 : 
                          paRequest.payer.averageResponseDays || 14;
    
    paRequest.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    paRequest.timeline.push({
      timestamp: new Date(),
      event: `Prior authorization submitted via ${submissionMethod}`,
      details: `Reference: ${paRequest.submission.referenceNumber}`,
      actor: submittedBy,
    });

    // In production, this would call actual submission APIs
    // await this.submitToElectronic(paRequest);
    // await this.submitViaFax(paRequest);
    // await this.submitToPortal(paRequest);

    this.emit('paSubmitted', paRequest);
    return paRequest;
  }

  // =========================================================================
  // STATUS TRACKING
  // =========================================================================

  async checkStatus(paRequest: PriorAuthRequest): Promise<PriorAuthRequest> {
    // In production, this would query payer systems
    // For now, simulate status check

    paRequest.timeline.push({
      timestamp: new Date(),
      event: 'Status check performed',
      actor: 'system',
    });

    this.emit('statusChecked', paRequest);
    return paRequest;
  }

  async processResponse(
    paRequest: PriorAuthRequest,
    response: PAResponse
  ): Promise<PriorAuthRequest> {
    paRequest.submission!.response = response;
    
    if (response.status === 'approved') {
      paRequest.status = 'approved';
      paRequest.timeline.push({
        timestamp: new Date(),
        event: 'Prior authorization APPROVED',
        details: `Auth #: ${response.authorizationNumber}, Valid until: ${response.expirationDate}`,
        actor: 'payer',
      });
    } else if (response.status === 'denied') {
      paRequest.status = 'denied';
      paRequest.timeline.push({
        timestamp: new Date(),
        event: 'Prior authorization DENIED',
        details: `Reason: ${response.denialReason}. Appeal deadline: ${response.appealDeadline}`,
        actor: 'payer',
      });
    } else if (response.status === 'pend') {
      paRequest.timeline.push({
        timestamp: new Date(),
        event: 'Additional information requested',
        details: response.notes,
        actor: 'payer',
      });
      paRequest.status = 'pending_info';
    }

    paRequest.updatedAt = new Date();
    this.emit('responseReceived', { paRequest, response });
    return paRequest;
  }

  // =========================================================================
  // APPEAL GENERATION
  // =========================================================================

  async generateAppeal(paRequest: PriorAuthRequest): Promise<string> {
    if (paRequest.status !== 'denied') {
      throw new Error('Can only appeal denied requests');
    }

    const response = paRequest.submission?.response;
    const evidence = paRequest.clinicalEvidence;

    let appeal = `APPEAL FOR PRIOR AUTHORIZATION DENIAL\n\n`;
    appeal += `Date: ${new Date().toLocaleDateString()}\n`;
    appeal += `Reference Number: ${paRequest.submission?.referenceNumber}\n`;
    appeal += `Authorization Request: ${paRequest.requestedItem.name}\n\n`;

    appeal += `Dear Medical Director,\n\n`;

    appeal += `I am writing to appeal the denial of prior authorization for `;
    appeal += `${paRequest.requestedItem.name} for our patient. `;
    appeal += `The denial reason provided was: "${response?.denialReason}"\n\n`;

    appeal += `CLINICAL SUMMARY:\n`;
    appeal += evidence.clinicalRationale + '\n\n';

    appeal += `MEDICAL NECESSITY:\n`;
    appeal += evidence.medicalNecessity + '\n\n';

    if (evidence.previousTreatments.length > 0) {
      appeal += `TREATMENT HISTORY:\n`;
      for (const treatment of evidence.previousTreatments) {
        appeal += `- ${treatment.treatment}: ${treatment.outcome}`;
        if (treatment.notes) appeal += ` (${treatment.notes})`;
        appeal += '\n';
      }
      appeal += '\n';
    }

    if (evidence.relevantLabs.length > 0) {
      appeal += `SUPPORTING LABORATORY DATA:\n`;
      for (const lab of evidence.relevantLabs) {
        appeal += `- ${lab.testName}: ${lab.value} ${lab.unit || ''} (${lab.date})\n`;
      }
      appeal += '\n';
    }

    appeal += `RESPONSE TO DENIAL REASON:\n`;
    appeal += this.generateDenialResponse(response?.denialReason, evidence);
    appeal += '\n\n';

    appeal += `Based on the clinical evidence presented, we respectfully request `;
    appeal += `reconsideration of this denial. The requested treatment is medically `;
    appeal += `necessary for this patient's condition and no reasonable alternatives exist.\n\n`;

    appeal += `Please contact our office if additional information is needed.\n\n`;
    appeal += `Sincerely,\n`;
    appeal += `[Provider Name, Credentials]\n`;
    appeal += `[Practice Name]\n`;
    appeal += `[Contact Information]`;

    paRequest.timeline.push({
      timestamp: new Date(),
      event: 'Appeal letter generated',
      actor: 'system',
    });

    return appeal;
  }

  private generateDenialResponse(denialReason?: string, evidence?: ClinicalEvidence): string {
    if (!denialReason) return 'We believe the clinical evidence supports approval of this request.';

    const lower = denialReason.toLowerCase();
    
    if (lower.includes('step therapy') || lower.includes('formulary')) {
      const failedTreatments = evidence?.previousTreatments.filter(t => 
        t.outcome !== 'effective'
      ) || [];
      
      if (failedTreatments.length > 0) {
        return `The denial indicates step therapy requirements were not met. However, ` +
               `as documented above, the patient has already failed ${failedTreatments.length} ` +
               `previous treatment(s): ${failedTreatments.map(t => t.treatment).join(', ')}. ` +
               `These treatment failures meet or exceed typical step therapy requirements.`;
      }
    }

    if (lower.includes('not medically necessary')) {
      return `The denial indicates the treatment was deemed not medically necessary. ` +
             `However, the clinical evidence clearly demonstrates that the patient's ` +
             `condition requires this specific treatment. The patient's diagnosis, ` +
             `treatment history, and clinical presentation all support medical necessity.`;
    }

    if (lower.includes('documentation') || lower.includes('information')) {
      return `The denial indicates insufficient documentation. We have now included ` +
             `comprehensive clinical documentation including progress notes, ` +
             `laboratory results, and detailed medical necessity statement.`;
    }

    return `We have carefully reviewed the denial reason and believe the clinical ` +
           `evidence presented in this appeal addresses these concerns.`;
  }

  // =========================================================================
  // PAYER RULES INITIALIZATION
  // =========================================================================

  private initializePayerRules(): void {
    // Example rules - in production, these would be loaded from a database
    // and updated regularly based on payer policy changes

    // Generic commercial payer rules
    const genericRules: PayerRule[] = [
      {
        payerId: 'GENERIC',
        category: 'imaging',
        itemCodePattern: /^7[0-9]{4}$/,  // CPT codes starting with 7
        requiresPA: true,
        criteria: [
          { id: 'dx', description: 'Appropriate diagnosis documented', type: 'diagnosis', required: true },
          { id: 'cons', description: 'Conservative treatment tried for 4-6 weeks', type: 'treatment_failure', required: false },
          { id: 'xray', description: 'X-ray performed first (if applicable)', type: 'imaging', required: false },
        ],
        stepTherapyRequired: false,
        documentationRequired: ['clinical_note', 'order'],
      },
      {
        payerId: 'GENERIC',
        category: 'medication',
        requiresPA: true,
        criteria: [
          { id: 'dx', description: 'FDA-approved indication', type: 'diagnosis', required: true },
          { id: 'step', description: 'Step therapy requirements met', type: 'treatment_failure', required: false },
          { id: 'qty', description: 'Quantity within limits', type: 'clinical', required: true },
        ],
        stepTherapyRequired: true,
        documentationRequired: ['prescription', 'clinical_note'],
      },
    ];

    this.payerRules.set('GENERIC', genericRules);

    // Add more payer-specific rules as needed
    // this.payerRules.set('BCBS', bcbsRules);
    // this.payerRules.set('AETNA', aetnaRules);
    // this.payerRules.set('UNITED', unitedRules);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  async getPayerRules(payerId: string): Promise<PayerRule[]> {
    return this.payerRules.get(payerId) || this.payerRules.get('GENERIC') || [];
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const priorAuthService = new PriorAuthService();
