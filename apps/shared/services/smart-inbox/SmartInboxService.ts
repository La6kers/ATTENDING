// =============================================================================
// ATTENDING AI - Smart Inbox Triage Service
// apps/shared/services/smart-inbox/SmartInboxService.ts
//
// AI-powered inbox management including:
// - Message classification and prioritization
// - Auto-response for simple requests
// - Draft generation for physician review
// - Action item extraction from external records
// - Routing to appropriate staff
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface InboxMessage {
  id: string;
  patientId?: string;
  patientName?: string;
  patientMRN?: string;
  senderId: string;
  senderType: 'patient' | 'provider' | 'staff' | 'external' | 'system';
  senderName: string;
  subject: string;
  body: string;
  receivedAt: Date;
  attachments?: Attachment[];
  isUrgent?: boolean;
  relatedEncounterId?: string;
  source: 'patient-portal' | 'fax' | 'email' | 'ehr' | 'lab' | 'referral' | 'phone';
  originalMessageId?: string; // For replies
}

export interface Attachment {
  id: string;
  name: string;
  type: 'document' | 'image' | 'lab-result' | 'referral' | 'medical-record';
  mimeType: string;
  size: number;
  url?: string;
  extractedText?: string;
}

export interface TriagedMessage extends InboxMessage {
  classification: MessageClassification;
  priority: MessagePriority;
  suggestedAction: SuggestedAction;
  autoResponse?: AutoResponse;
  draftResponse?: DraftResponse;
  extractedInfo?: ExtractedInfo;
  routingRecommendation?: RoutingRecommendation;
  processingNotes: string[];
  triageConfidence: number;
  triagedAt: Date;
  status: 'pending' | 'auto-responded' | 'draft-ready' | 'routed' | 'completed' | 'escalated';
}

export type MessageClassification =
  | 'refill-request'
  | 'appointment-request'
  | 'test-results-inquiry'
  | 'symptom-report'
  | 'medication-question'
  | 'referral-request'
  | 'billing-question'
  | 'medical-records-request'
  | 'prescription-prior-auth'
  | 'lab-result'
  | 'imaging-result'
  | 'consult-note'
  | 'hospital-discharge'
  | 'urgent-clinical'
  | 'follow-up-needed'
  | 'general-inquiry'
  | 'administrative'
  | 'other';

export type MessagePriority = 'critical' | 'high' | 'medium' | 'low';

export interface SuggestedAction {
  action: 'auto-respond' | 'generate-draft' | 'route-to-staff' | 'physician-review' | 'urgent-callback';
  reason: string;
  estimatedTimeToHandle?: number; // minutes
}

export interface AutoResponse {
  canAutoRespond: boolean;
  responseText?: string;
  responseType?: 'acknowledgment' | 'fulfillment' | 'information' | 'redirect';
  requiresPhysicianApproval: boolean;
  responseRationale: string;
}

export interface DraftResponse {
  text: string;
  confidence: number;
  suggestedEdits?: string[];
  referencedInfo?: string[];
  tone: 'professional' | 'empathetic' | 'informative' | 'urgent';
}

export interface ExtractedInfo {
  medications?: ExtractedMedication[];
  diagnoses?: string[];
  allergies?: string[];
  vitals?: Record<string, string>;
  labValues?: Record<string, string>;
  appointments?: ExtractedAppointment[];
  providers?: string[];
  actionItems?: ActionItem[];
  keyDates?: { date: string; description: string }[];
}

export interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  prescriber?: string;
  startDate?: string;
  isNew?: boolean;
  refillsRemaining?: number;
}

export interface ExtractedAppointment {
  type: string;
  provider?: string;
  date?: string;
  location?: string;
  status?: string;
}

export interface ActionItem {
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'follow-up' | 'order' | 'referral' | 'callback' | 'documentation' | 'other';
  dueDate?: string;
}

export interface RoutingRecommendation {
  routeTo: 'physician' | 'nurse' | 'ma' | 'front-desk' | 'billing' | 'records' | 'referral-coordinator';
  reason: string;
  urgency: 'immediate' | 'today' | 'routine';
  skillsRequired?: string[];
}

// =============================================================================
// Classification Patterns
// =============================================================================

const CLASSIFICATION_PATTERNS: Record<MessageClassification, RegExp[]> = {
  'refill-request': [
    /refill|renew|out of|running low|need (?:more|my) (?:medication|prescription|meds)/i,
    /(?:can you|please|would you) (?:refill|renew|send)/i,
    /pharmacy|prescription/i,
  ],
  'appointment-request': [
    /(?:schedule|make|book|need|want) (?:an? )?appointment/i,
    /(?:can i|when can i) (?:come in|see|be seen)/i,
    /availability|next available/i,
  ],
  'test-results-inquiry': [
    /(?:test|lab|blood|result|report)s?\b/i,
    /(?:what were|did you get|have you received) (?:my|the) results/i,
    /waiting (?:for|on) (?:my|the) (?:test|lab|results)/i,
  ],
  'symptom-report': [
    /(?:i am|i'm|i have been|i've been) (?:having|experiencing|feeling)/i,
    /(?:pain|ache|fever|cough|nausea|dizzy|tired|weak|swelling)/i,
    /(?:symptoms?|side effects?|reaction)/i,
    /(?:getting worse|not improving|concerned about)/i,
  ],
  'medication-question': [
    /(?:question about|asking about|wondering about) (?:my )?medication/i,
    /(?:how (?:do i|should i)|when (?:do i|should i)) take/i,
    /(?:side effect|interact|safe to take|can i take)/i,
    /(?:missed (?:a )?dose|forgot to take)/i,
  ],
  'referral-request': [
    /(?:referral|refer me|see a specialist)/i,
    /(?:need to see|want to see) (?:a |an )?(?:specialist|doctor|dermatologist|cardiologist)/i,
  ],
  'billing-question': [
    /(?:bill|billing|charge|payment|insurance|cost|price|copay)/i,
    /(?:how much|what will it cost)/i,
  ],
  'medical-records-request': [
    /(?:medical records?|health records?|my records?|copy of)/i,
    /(?:need (?:my|a copy)|request (?:my|a copy))/i,
  ],
  'prescription-prior-auth': [
    /(?:prior auth|authorization|denied|not covered)/i,
    /(?:insurance (?:won't|will not) (?:cover|approve))/i,
  ],
  'lab-result': [
    /^(?:lab|laboratory) result/i,
    /^results? (?:from|for)/i,
  ],
  'imaging-result': [
    /^(?:radiology|imaging|x-ray|ct|mri|ultrasound) (?:result|report)/i,
  ],
  'consult-note': [
    /^(?:consult|consultation) (?:note|report)/i,
    /^(?:specialist|referral) (?:note|report)/i,
  ],
  'hospital-discharge': [
    /^(?:discharge|hospital|er|emergency) (?:summary|note|report)/i,
    /(?:admitted|hospitalized|discharged)/i,
  ],
  'urgent-clinical': [
    /(?:urgent|emergency|severe|worst|can't breathe|chest pain|suicidal)/i,
    /(?:immediately|right away|asap|as soon as possible)/i,
  ],
  'follow-up-needed': [
    /(?:follow up|follow-up|followup|checking in)/i,
    /(?:how am i doing|wanted to update)/i,
  ],
  'general-inquiry': [
    /(?:question|wondering|curious|asking)/i,
  ],
  'administrative': [
    /(?:address|phone|contact|insurance card|form|paperwork)/i,
  ],
  'other': [],
};

// =============================================================================
// Auto-Response Templates
// =============================================================================

const AUTO_RESPONSE_TEMPLATES: Record<string, string> = {
  'refill-acknowledgment': `Thank you for your refill request. We have received it and are processing it now.

For routine medications, refills are typically sent to your pharmacy within 48-72 hours (business days).

If you have fewer than 3 days of medication remaining, please call our office directly.

If you haven't heard back within 3 business days, please contact us.`,

  'appointment-acknowledgment': `Thank you for your appointment request. Our scheduling team will contact you within 1 business day to schedule your appointment.

If you need to be seen urgently, please call our office directly.

For after-hours emergencies, please call 911 or go to your nearest emergency room.`,

  'results-pending': `Thank you for your inquiry about your test results.

We understand you're waiting for your results. Please note:
- Lab results typically take 2-5 business days
- Imaging results may take 3-7 business days
- Complex tests may take longer

Your provider will contact you to discuss results that need immediate attention. Otherwise, you can view your results in the patient portal once they are reviewed.`,

  'general-acknowledgment': `Thank you for your message. We have received it and will respond within 1-2 business days.

If this is urgent, please call our office directly. For emergencies, call 911.`,

  'billing-redirect': `Thank you for your billing question.

For billing inquiries, please contact our billing department directly:
- Phone: (555) 123-4567
- Email: billing@clinic.com
- Hours: Monday-Friday, 8am-5pm

They can help with questions about charges, insurance, and payment plans.`,

  'records-redirect': `Thank you for your medical records request.

To request your medical records, please:
1. Complete our Medical Records Release Form (available in the patient portal or at our front desk)
2. Submit the form to our Medical Records department

Processing time is typically 5-7 business days.

For questions, contact Medical Records at (555) 123-4569.`,
};

// =============================================================================
// Smart Inbox Service Class
// =============================================================================

export class SmartInboxService extends EventEmitter {
  private messages: Map<string, TriagedMessage> = new Map();
  private autoResponseRules: Map<MessageClassification, (msg: InboxMessage) => AutoResponse | null> = new Map();

  constructor() {
    super();
    this.initializeAutoResponseRules();
  }

  // ===========================================================================
  // Main Triage Function
  // ===========================================================================

  async triageMessage(message: InboxMessage): Promise<TriagedMessage> {
    const processingNotes: string[] = [];
    
    // Step 1: Classify the message
    const classification = this.classifyMessage(message);
    processingNotes.push(`Classified as: ${classification}`);

    // Step 2: Determine priority
    const priority = this.determinePriority(message, classification);
    processingNotes.push(`Priority: ${priority}`);

    // Step 3: Extract information from message and attachments
    const extractedInfo = await this.extractInformation(message);
    if (extractedInfo.actionItems?.length) {
      processingNotes.push(`Found ${extractedInfo.actionItems.length} action items`);
    }

    // Step 4: Determine suggested action
    const suggestedAction = this.determineSuggestedAction(message, classification, priority);
    processingNotes.push(`Suggested action: ${suggestedAction.action}`);

    // Step 5: Generate auto-response if appropriate
    let autoResponse: AutoResponse | undefined;
    if (suggestedAction.action === 'auto-respond') {
      autoResponse = this.generateAutoResponse(message, classification);
    }

    // Step 6: Generate draft response for physician review
    let draftResponse: DraftResponse | undefined;
    if (suggestedAction.action === 'generate-draft' || suggestedAction.action === 'physician-review') {
      draftResponse = await this.generateDraftResponse(message, classification, extractedInfo);
    }

    // Step 7: Determine routing
    const routingRecommendation = this.determineRouting(message, classification, priority);

    // Calculate confidence
    const triageConfidence = this.calculateConfidence(classification, priority, suggestedAction);

    const triagedMessage: TriagedMessage = {
      ...message,
      classification,
      priority,
      suggestedAction,
      autoResponse,
      draftResponse,
      extractedInfo,
      routingRecommendation,
      processingNotes,
      triageConfidence,
      triagedAt: new Date(),
      status: autoResponse?.canAutoRespond ? 'auto-responded' : 
              draftResponse ? 'draft-ready' : 'pending',
    };

    this.messages.set(message.id, triagedMessage);
    this.emit('messageTriage', triagedMessage);

    if (priority === 'critical') {
      this.emit('urgentMessage', triagedMessage);
    }

    return triagedMessage;
  }

  // ===========================================================================
  // Classification
  // ===========================================================================

  private classifyMessage(message: InboxMessage): MessageClassification {
    const fullText = `${message.subject} ${message.body}`.toLowerCase();
    
    // Score each classification
    const scores: { classification: MessageClassification; score: number }[] = [];
    
    for (const [classification, patterns] of Object.entries(CLASSIFICATION_PATTERNS)) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = fullText.match(pattern);
        if (matches) {
          score += matches.length * 10;
        }
      }
      
      // Boost score based on message source
      if (classification === 'lab-result' && message.source === 'lab') score += 50;
      if (classification === 'consult-note' && message.source === 'referral') score += 50;
      if (classification === 'hospital-discharge' && 
          (fullText.includes('discharge') || fullText.includes('hospital'))) score += 30;
      
      scores.push({ classification: classification as MessageClassification, score });
    }
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    // Return highest scoring classification (or 'other' if no matches)
    return scores[0]?.score > 0 ? scores[0].classification : 'other';
  }

  // ===========================================================================
  // Priority Determination
  // ===========================================================================

  private determinePriority(message: InboxMessage, classification: MessageClassification): MessagePriority {
    // Critical indicators
    const criticalPatterns = [
      /chest pain|can't breathe|difficulty breathing|suicidal|severe pain/i,
      /emergency|critical|life.?threatening/i,
      /stroke|heart attack|anaphyla/i,
    ];
    
    const fullText = `${message.subject} ${message.body}`;
    for (const pattern of criticalPatterns) {
      if (pattern.test(fullText)) {
        return 'critical';
      }
    }

    // Classification-based priority
    const priorityByClassification: Record<MessageClassification, MessagePriority> = {
      'urgent-clinical': 'critical',
      'symptom-report': 'high',
      'hospital-discharge': 'high',
      'lab-result': 'medium',
      'imaging-result': 'medium',
      'consult-note': 'medium',
      'refill-request': 'medium',
      'medication-question': 'medium',
      'test-results-inquiry': 'medium',
      'follow-up-needed': 'medium',
      'prescription-prior-auth': 'medium',
      'referral-request': 'low',
      'appointment-request': 'low',
      'general-inquiry': 'low',
      'billing-question': 'low',
      'medical-records-request': 'low',
      'administrative': 'low',
      'other': 'low',
    };

    let priority = priorityByClassification[classification] || 'low';

    // Elevate priority if marked urgent
    if (message.isUrgent && priority === 'low') {
      priority = 'medium';
    }
    if (message.isUrgent && priority === 'medium') {
      priority = 'high';
    }

    return priority;
  }

  // ===========================================================================
  // Information Extraction
  // ===========================================================================

  private async extractInformation(message: InboxMessage): Promise<ExtractedInfo> {
    const extracted: ExtractedInfo = {
      medications: [],
      diagnoses: [],
      actionItems: [],
    };
    
    const fullText = `${message.subject} ${message.body}`;

    // Extract medications
    const medPatterns = [
      /(?:taking|takes?|on|prescribed)\s+(\w+)\s*(\d+\s*(?:mg|mcg|ml)?)?/gi,
      /(\w+)\s+(\d+\s*(?:mg|mcg|ml)?)\s+(?:daily|twice|three times|bid|tid|qd)/gi,
    ];
    
    for (const pattern of medPatterns) {
      let match;
      while ((match = pattern.exec(fullText)) !== null) {
        extracted.medications?.push({
          name: match[1],
          dosage: match[2] || undefined,
        });
      }
    }

    // Extract action items from the message
    const actionPatterns = [
      { pattern: /(?:please|need to|should|must)\s+(?:call|contact|reach out)/i, category: 'callback' as const },
      { pattern: /(?:schedule|book|make)\s+(?:an? )?(?:appointment|follow.?up)/i, category: 'follow-up' as const },
      { pattern: /(?:order|request|need)\s+(?:labs?|test|imaging)/i, category: 'order' as const },
      { pattern: /(?:refer|referral|specialist)/i, category: 'referral' as const },
    ];

    for (const { pattern, category } of actionPatterns) {
      if (pattern.test(fullText)) {
        extracted.actionItems?.push({
          description: `${category.charAt(0).toUpperCase() + category.slice(1)} needed based on message`,
          priority: 'medium',
          category,
        });
      }
    }

    // Process attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.extractedText) {
          const attachmentInfo = await this.extractFromDocument(attachment);
          if (attachmentInfo.medications?.length) {
            extracted.medications?.push(...attachmentInfo.medications);
          }
          if (attachmentInfo.diagnoses?.length) {
            extracted.diagnoses?.push(...attachmentInfo.diagnoses);
          }
          if (attachmentInfo.actionItems?.length) {
            extracted.actionItems?.push(...attachmentInfo.actionItems);
          }
        }
      }
    }

    return extracted;
  }

  private async extractFromDocument(attachment: Attachment): Promise<ExtractedInfo> {
    const extracted: ExtractedInfo = {
      medications: [],
      diagnoses: [],
      actionItems: [],
    };
    
    if (!attachment.extractedText) return extracted;
    
    const text = attachment.extractedText;

    // Look for discharge summary action items
    if (attachment.type === 'medical-record' || attachment.name.toLowerCase().includes('discharge')) {
      const followUpMatch = text.match(/follow.?up\s+(?:with|in)\s+(\d+)\s*(days?|weeks?)/i);
      if (followUpMatch) {
        extracted.actionItems?.push({
          description: `Follow-up ${followUpMatch[1]} ${followUpMatch[2]}`,
          priority: 'high',
          category: 'follow-up',
          dueDate: this.calculateDueDate(parseInt(followUpMatch[1]), followUpMatch[2]),
        });
      }

      // Look for new medications
      const newMedMatch = text.match(/new medications?:?\s*([^\n]+)/i);
      if (newMedMatch) {
        const meds = newMedMatch[1].split(/[,;]/);
        for (const med of meds) {
          extracted.medications?.push({
            name: med.trim(),
            isNew: true,
          });
        }
      }
    }

    // Look for pending tests/orders
    const pendingMatch = text.match(/pending:?\s*([^\n]+)/i);
    if (pendingMatch) {
      extracted.actionItems?.push({
        description: `Pending: ${pendingMatch[1].trim()}`,
        priority: 'medium',
        category: 'follow-up',
      });
    }

    return extracted;
  }

  private calculateDueDate(value: number, unit: string): string {
    const date = new Date();
    if (unit.startsWith('day')) {
      date.setDate(date.getDate() + value);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() + value * 7);
    }
    return date.toISOString().split('T')[0];
  }

  // ===========================================================================
  // Action Determination
  // ===========================================================================

  private determineSuggestedAction(
    message: InboxMessage,
    classification: MessageClassification,
    priority: MessagePriority
  ): SuggestedAction {
    // Critical messages always need physician review
    if (priority === 'critical') {
      return {
        action: 'urgent-callback',
        reason: 'Message contains urgent clinical content requiring immediate attention',
        estimatedTimeToHandle: 5,
      };
    }

    // Auto-respondable message types
    const autoRespondableTypes: MessageClassification[] = [
      'refill-request',
      'appointment-request',
      'test-results-inquiry',
      'billing-question',
      'medical-records-request',
    ];

    if (autoRespondableTypes.includes(classification)) {
      return {
        action: 'auto-respond',
        reason: `Standard ${classification.replace(/-/g, ' ')} can be acknowledged automatically`,
        estimatedTimeToHandle: 1,
      };
    }

    // Route administrative messages to staff
    const staffRoutableTypes: MessageClassification[] = [
      'administrative',
      'billing-question',
      'medical-records-request',
    ];

    if (staffRoutableTypes.includes(classification)) {
      return {
        action: 'route-to-staff',
        reason: 'Administrative request can be handled by support staff',
        estimatedTimeToHandle: 10,
      };
    }

    // Clinical messages need draft or review
    const clinicalTypes: MessageClassification[] = [
      'symptom-report',
      'medication-question',
      'lab-result',
      'imaging-result',
      'consult-note',
      'hospital-discharge',
      'follow-up-needed',
    ];

    if (clinicalTypes.includes(classification)) {
      return {
        action: 'generate-draft',
        reason: 'Clinical message - draft response prepared for physician review',
        estimatedTimeToHandle: 5,
      };
    }

    return {
      action: 'physician-review',
      reason: 'Message requires physician assessment',
      estimatedTimeToHandle: 10,
    };
  }

  // ===========================================================================
  // Auto-Response Generation
  // ===========================================================================

  private initializeAutoResponseRules(): void {
    this.autoResponseRules.set('refill-request', (msg) => ({
      canAutoRespond: true,
      responseText: AUTO_RESPONSE_TEMPLATES['refill-acknowledgment'],
      responseType: 'acknowledgment',
      requiresPhysicianApproval: false,
      responseRationale: 'Standard refill request acknowledgment',
    }));

    this.autoResponseRules.set('appointment-request', (msg) => ({
      canAutoRespond: true,
      responseText: AUTO_RESPONSE_TEMPLATES['appointment-acknowledgment'],
      responseType: 'acknowledgment',
      requiresPhysicianApproval: false,
      responseRationale: 'Standard appointment request acknowledgment',
    }));

    this.autoResponseRules.set('test-results-inquiry', (msg) => ({
      canAutoRespond: true,
      responseText: AUTO_RESPONSE_TEMPLATES['results-pending'],
      responseType: 'information',
      requiresPhysicianApproval: false,
      responseRationale: 'Standard results inquiry response',
    }));

    this.autoResponseRules.set('billing-question', (msg) => ({
      canAutoRespond: true,
      responseText: AUTO_RESPONSE_TEMPLATES['billing-redirect'],
      responseType: 'redirect',
      requiresPhysicianApproval: false,
      responseRationale: 'Redirect to billing department',
    }));

    this.autoResponseRules.set('medical-records-request', (msg) => ({
      canAutoRespond: true,
      responseText: AUTO_RESPONSE_TEMPLATES['medical-records-redirect'],
      responseType: 'redirect',
      requiresPhysicianApproval: false,
      responseRationale: 'Redirect to medical records department',
    }));
  }

  private generateAutoResponse(message: InboxMessage, classification: MessageClassification): AutoResponse {
    const rule = this.autoResponseRules.get(classification);
    
    if (rule) {
      return rule(message);
    }

    return {
      canAutoRespond: false,
      requiresPhysicianApproval: true,
      responseRationale: 'No auto-response rule for this message type',
    };
  }

  // ===========================================================================
  // Draft Response Generation
  // ===========================================================================

  private async generateDraftResponse(
    message: InboxMessage,
    classification: MessageClassification,
    extractedInfo: ExtractedInfo
  ): Promise<DraftResponse> {
    let draftText = '';
    let tone: DraftResponse['tone'] = 'professional';
    const suggestedEdits: string[] = [];
    const referencedInfo: string[] = [];

    // Generate based on classification
    switch (classification) {
      case 'symptom-report':
        tone = 'empathetic';
        draftText = this.generateSymptomResponseDraft(message, extractedInfo);
        suggestedEdits.push('Review symptoms and add specific recommendations');
        suggestedEdits.push('Consider if in-person evaluation is needed');
        break;

      case 'medication-question':
        tone = 'informative';
        draftText = this.generateMedicationResponseDraft(message, extractedInfo);
        suggestedEdits.push('Verify medication information from chart');
        break;

      case 'lab-result':
      case 'imaging-result':
        tone = 'informative';
        draftText = this.generateResultsResponseDraft(message, classification);
        suggestedEdits.push('Review actual results and personalize response');
        suggestedEdits.push('Add specific follow-up recommendations');
        break;

      case 'hospital-discharge':
      case 'consult-note':
        tone = 'professional';
        draftText = this.generateExternalDocResponseDraft(message, extractedInfo);
        if (extractedInfo.actionItems?.length) {
          referencedInfo.push(`${extractedInfo.actionItems.length} action items identified`);
        }
        suggestedEdits.push('Review recommendations and confirm follow-up plan');
        break;

      case 'follow-up-needed':
        tone = 'professional';
        draftText = this.generateFollowUpResponseDraft(message);
        break;

      default:
        draftText = this.generateGenericResponseDraft(message);
        suggestedEdits.push('Customize response based on patient context');
    }

    return {
      text: draftText,
      confidence: 0.75,
      suggestedEdits,
      referencedInfo,
      tone,
    };
  }

  private generateSymptomResponseDraft(message: InboxMessage, extractedInfo: ExtractedInfo): string {
    return `Dear ${message.patientName || 'Patient'},

Thank you for reaching out about your symptoms. I understand you're experiencing [SYMPTOMS - please verify].

Based on what you've described:
- [ADD ASSESSMENT]
- [ADD RECOMMENDATIONS]

Please [SPECIFIC INSTRUCTIONS].

If your symptoms worsen or you develop [WARNING SIGNS], please seek immediate care or call 911.

Please don't hesitate to reach out if you have additional questions.

Best regards,
[Provider Name]`;
  }

  private generateMedicationResponseDraft(message: InboxMessage, extractedInfo: ExtractedInfo): string {
    return `Dear ${message.patientName || 'Patient'},

Thank you for your question about your medication.

Regarding [MEDICATION NAME]:
- [ADD SPECIFIC INFORMATION]
- [ADD DOSING/TIMING INFO IF RELEVANT]

[ADD ANY WARNINGS OR PRECAUTIONS]

If you have concerns about side effects or interactions, please let us know.

Best regards,
[Provider Name]`;
  }

  private generateResultsResponseDraft(message: InboxMessage, classification: MessageClassification): string {
    const resultType = classification === 'lab-result' ? 'lab results' : 'imaging results';
    
    return `Dear ${message.patientName || 'Patient'},

I've reviewed your recent ${resultType}.

[RESULTS SUMMARY - please add specific findings]

What this means:
- [INTERPRETATION]

Recommendations:
- [NEXT STEPS]

Please let me know if you have any questions about these results.

Best regards,
[Provider Name]`;
  }

  private generateExternalDocResponseDraft(message: InboxMessage, extractedInfo: ExtractedInfo): string {
    let actionItemsText = '';
    if (extractedInfo.actionItems?.length) {
      actionItemsText = '\n\nAction items identified:\n' +
        extractedInfo.actionItems.map(item => `- ${item.description}`).join('\n');
    }

    return `Dear ${message.patientName || 'Patient'},

I've received and reviewed the [DOCUMENT TYPE] from [PROVIDER/FACILITY].
${actionItemsText}

Here's what we need to do next:
- [FOLLOW-UP PLAN]
- [ANY MEDICATION CHANGES]
- [SCHEDULING NEEDS]

Please [SPECIFIC PATIENT INSTRUCTIONS].

Best regards,
[Provider Name]`;
  }

  private generateFollowUpResponseDraft(message: InboxMessage): string {
    return `Dear ${message.patientName || 'Patient'},

Thank you for your follow-up message.

[REVIEW CHART AND ADD RELEVANT UPDATE]

Current plan:
- [CONTINUE/MODIFY TREATMENT]
- [NEXT STEPS]

Please continue to monitor [SPECIFIC ITEMS] and let us know if you have any concerns.

Best regards,
[Provider Name]`;
  }

  private generateGenericResponseDraft(message: InboxMessage): string {
    return `Dear ${message.patientName || 'Patient'},

Thank you for your message.

[ADD PERSONALIZED RESPONSE]

Please let us know if you have any additional questions.

Best regards,
[Provider Name]`;
  }

  // ===========================================================================
  // Routing
  // ===========================================================================

  private determineRouting(
    message: InboxMessage,
    classification: MessageClassification,
    priority: MessagePriority
  ): RoutingRecommendation {
    const routingMap: Record<MessageClassification, RoutingRecommendation> = {
      'refill-request': {
        routeTo: 'nurse',
        reason: 'Routine refill can be processed by nursing staff',
        urgency: 'routine',
      },
      'appointment-request': {
        routeTo: 'front-desk',
        reason: 'Scheduling request',
        urgency: 'routine',
      },
      'test-results-inquiry': {
        routeTo: 'nurse',
        reason: 'Can check result status',
        urgency: 'routine',
      },
      'symptom-report': {
        routeTo: 'physician',
        reason: 'Clinical assessment needed',
        urgency: priority === 'high' ? 'today' : 'routine',
      },
      'medication-question': {
        routeTo: 'physician',
        reason: 'Clinical question about medication',
        urgency: 'routine',
      },
      'referral-request': {
        routeTo: 'referral-coordinator',
        reason: 'Referral processing',
        urgency: 'routine',
      },
      'billing-question': {
        routeTo: 'billing',
        reason: 'Financial/billing question',
        urgency: 'routine',
      },
      'medical-records-request': {
        routeTo: 'records',
        reason: 'Records request',
        urgency: 'routine',
      },
      'prescription-prior-auth': {
        routeTo: 'ma',
        reason: 'Prior authorization assistance',
        urgency: 'today',
      },
      'lab-result': {
        routeTo: 'physician',
        reason: 'Result review needed',
        urgency: 'today',
      },
      'imaging-result': {
        routeTo: 'physician',
        reason: 'Result review needed',
        urgency: 'today',
      },
      'consult-note': {
        routeTo: 'physician',
        reason: 'Specialist note review',
        urgency: 'today',
      },
      'hospital-discharge': {
        routeTo: 'physician',
        reason: 'Discharge follow-up coordination',
        urgency: 'today',
      },
      'urgent-clinical': {
        routeTo: 'physician',
        reason: 'Urgent clinical matter',
        urgency: 'immediate',
      },
      'follow-up-needed': {
        routeTo: 'physician',
        reason: 'Clinical follow-up',
        urgency: 'routine',
      },
      'general-inquiry': {
        routeTo: 'nurse',
        reason: 'General question',
        urgency: 'routine',
      },
      'administrative': {
        routeTo: 'front-desk',
        reason: 'Administrative matter',
        urgency: 'routine',
      },
      'other': {
        routeTo: 'nurse',
        reason: 'Initial triage',
        urgency: 'routine',
      },
    };

    const routing = routingMap[classification] || routingMap['other'];

    // Override urgency for high priority
    if (priority === 'critical') {
      routing.urgency = 'immediate';
      routing.routeTo = 'physician';
    } else if (priority === 'high' && routing.urgency === 'routine') {
      routing.urgency = 'today';
    }

    return routing;
  }

  // ===========================================================================
  // Confidence Calculation
  // ===========================================================================

  private calculateConfidence(
    classification: MessageClassification,
    priority: MessagePriority,
    action: SuggestedAction
  ): number {
    let confidence = 0.7;

    // Higher confidence for clear classifications
    const highConfidenceClassifications: MessageClassification[] = [
      'refill-request',
      'appointment-request',
      'billing-question',
      'lab-result',
    ];

    if (highConfidenceClassifications.includes(classification)) {
      confidence += 0.15;
    }

    // Lower confidence for 'other' or ambiguous
    if (classification === 'other' || classification === 'general-inquiry') {
      confidence -= 0.2;
    }

    // Auto-respond actions are typically higher confidence
    if (action.action === 'auto-respond') {
      confidence += 0.1;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  // ===========================================================================
  // Inbox Statistics & Management
  // ===========================================================================

  getInboxStats(): {
    total: number;
    byPriority: Record<MessagePriority, number>;
    byClassification: Record<string, number>;
    byStatus: Record<string, number>;
    pendingPhysicianReview: number;
    autoRespondedToday: number;
  } {
    const stats = {
      total: this.messages.size,
      byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      byClassification: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      pendingPhysicianReview: 0,
      autoRespondedToday: 0,
    };

    const today = new Date().toDateString();

    for (const msg of this.messages.values()) {
      stats.byPriority[msg.priority]++;
      stats.byClassification[msg.classification] = (stats.byClassification[msg.classification] || 0) + 1;
      stats.byStatus[msg.status] = (stats.byStatus[msg.status] || 0) + 1;

      if (msg.suggestedAction.action === 'physician-review' || msg.suggestedAction.action === 'generate-draft') {
        if (msg.status !== 'completed') {
          stats.pendingPhysicianReview++;
        }
      }

      if (msg.status === 'auto-responded' && msg.triagedAt.toDateString() === today) {
        stats.autoRespondedToday++;
      }
    }

    return stats;
  }

  getMessagesForReview(priority?: MessagePriority): TriagedMessage[] {
    const messages = Array.from(this.messages.values())
      .filter(m => m.status === 'pending' || m.status === 'draft-ready');

    if (priority) {
      return messages.filter(m => m.priority === priority);
    }

    // Sort by priority then timestamp
    const priorityOrder: Record<MessagePriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return messages.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.receivedAt.getTime() - b.receivedAt.getTime();
    });
  }

  markMessageCompleted(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.status = 'completed';
      this.emit('messageCompleted', message);
    }
  }

  getMessage(messageId: string): TriagedMessage | undefined {
    return this.messages.get(messageId);
  }
}

// Singleton instance
export const smartInboxService = new SmartInboxService();
export default smartInboxService;
