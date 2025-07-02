// BioMistral-7B AI Service for medical assessment

import { 
  BioMistralResponse, 
  ClinicalData, 
  AssessmentPhase,
  ClinicalExtraction,
  UrgencyLevel,
  Diagnosis,
  HistoryOfPresentIllness,
  ReviewOfSystems,
  PastMedicalHistory,
  Medication,
  Allergy
} from '@/types/medical';
import { ChatMessage } from '@/types/chat';

export class BioMistralService {
  private conversationHistory: ChatMessage[] = [];
  private clinicalData: ClinicalData;
  private differentialDiagnosis: Diagnosis[] = [];
  private apiEndpoint: string;
  private apiKey: string;
  private answeredQuestions: Set<string> = new Set();
  private hpiQuestionIndex: number = 0;
  private rosQuestionIndex: number = 0;
  private pmhQuestionIndex: number = 0;

  constructor() {
    this.apiEndpoint = process.env.NEXT_PUBLIC_BIOMISTRAL_API_ENDPOINT || '';
    this.apiKey = process.env.NEXT_PUBLIC_BIOMISTRAL_API_KEY || '';
    this.clinicalData = this.initializeClinicalData();
  }

  private initializeClinicalData(): ClinicalData {
    return {
      chiefComplaint: '',
      hpi: {},
      ros: {},
      pmh: {},
      medications: [],
      allergies: [],
      socialHistory: {},
      familyHistory: { conditions: [] },
      riskFactors: [],
      redFlags: [],
      assessmentPhase: 'chief-complaint',
      timestamp: new Date().toISOString()
    };
  }

  async processPatientInput(message: string): Promise<BioMistralResponse> {
    try {
      // Add to conversation history
      this.addToHistory('user', message);

      // Build medical prompt
      const prompt = this.buildMedicalPrompt(message);

      // Get AI response
      const response = await this.callBioMistralAPI(prompt);

      // Parse and validate response
      const parsedResponse = this.parseAIResponse(response);

      // Update clinical data
      this.updateClinicalData(message, parsedResponse);

      // Add AI response to history
      this.addToHistory('assistant', parsedResponse.message, {
        phase: parsedResponse.nextPhase,
        urgencyLevel: parsedResponse.urgencyLevel,
        quickReplies: parsedResponse.quickReplies,
        medicalSuggestions: parsedResponse.medicalSuggestions,
        aiThinking: parsedResponse.aiThinking
      });

      return parsedResponse;
    } catch (error) {
      console.error('BioMistral processing error:', error);
      return this.getErrorResponse();
    }
  }

  private buildMedicalPrompt(patientMessage: string): string {
    const currentPhase = this.clinicalData.assessmentPhase;
    const recentHistory = this.conversationHistory.slice(-5);

    return `You are BioMistral-7B, a specialized medical AI assistant conducting a clinical interview. 
You are trained on medical literature, clinical guidelines, and diagnostic protocols.

CURRENT ASSESSMENT PHASE: ${currentPhase}

CONVERSATION HISTORY:
${JSON.stringify(recentHistory, null, 2)}

PATIENT'S LATEST MESSAGE: "${patientMessage}"

CLINICAL DATA GATHERED SO FAR:
${JSON.stringify(this.clinicalData, null, 2)}

INSTRUCTIONS:
1. Act as a medical AI conducting a thorough clinical interview
2. Ask medically appropriate follow-up questions based on the patient's responses
3. Extract and categorize clinical information systematically
4. Identify red flags and risk factors
5. Progress through: Chief Complaint → HPI → ROS → PMH → Risk Assessment → Summary
6. Use medical terminology appropriately but explain to patients when needed
7. Show clinical reasoning in your responses

RESPONSE FORMAT:
Respond with a JSON object containing:
{
  "message": "Your response to the patient (HTML allowed for formatting)",
  "quickReplies": ["array", "of", "suggested", "responses"],
  "medicalSuggestions": ["medical", "follow-up", "questions"],
  "clinicalExtraction": {
    "extractedData": "Any clinical data extracted from patient message",
    "redFlags": ["any red flag symptoms identified"],
    "riskFactors": ["risk factors identified"],
    "differentialConsiderations": ["possible diagnoses to consider"]
  },
  "aiThinking": "Brief explanation of your clinical reasoning",
  "nextPhase": "next assessment phase if changing",
  "urgencyLevel": "standard|moderate|high"
}

MEDICAL GUIDELINES:
- Always screen for red flag symptoms
- Use systematic approach to history taking
- Consider differential diagnoses early
- Document allergies and medication history
- Assess pain scales, timing, quality, radiation
- Screen for emergency conditions first
- Use evidence-based questioning

Generate a thorough, medically appropriate response:`;
  }

  private async callBioMistralAPI(prompt: string): Promise<any> {
    // In production, this would call the actual BioMistral API
    // For now, we'll simulate with a mock response
    if (!this.apiEndpoint || !this.apiKey) {
      return this.getMockResponse(prompt);
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'biomistral-7b',
          messages: [
            {
              role: 'system',
              content: 'You are BioMistral-7B, a medical AI assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('BioMistral API error:', error);
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    // Sophisticated mock response based on assessment phase
    const phase = this.clinicalData.assessmentPhase;
    const patientInput = prompt.match(/PATIENT'S LATEST MESSAGE: "(.+?)"/)?.[1] || '';
    
    // Check for red flag symptoms
    const redFlagKeywords = ['chest pain', 'difficulty breathing', 'severe headache', 'unconscious', 'bleeding heavily'];
    const hasRedFlags = redFlagKeywords.some(keyword => patientInput.toLowerCase().includes(keyword));
    
    const mockResponses: Record<AssessmentPhase, any> = {
      'chief-complaint': {
        message: hasRedFlags 
          ? `<strong>⚠️ I notice you mentioned ${patientInput.toLowerCase()}. This could be serious.</strong> 

Let me ask a few urgent questions first. Are you currently experiencing:
- Severe chest pressure or pain?
- Difficulty breathing or shortness of breath?
- Sudden severe headache unlike any you've had before?

Please answer yes or no to help me assess the urgency.`
          : `Thank you for sharing that. To better understand your ${patientInput.toLowerCase() || 'symptoms'}, I need to ask you a specific question.

<strong>When exactly did this symptom first start?</strong> Please be as specific as possible (for example: "2 hours ago", "yesterday morning", "3 days ago").`,
        quickReplies: hasRedFlags 
          ? ["Yes, experiencing these now", "No, but concerned", "Symptoms are mild", "Getting worse"]
          : ["Just now", "Today", "Yesterday", "Few days ago", "Week ago", "Longer than a week"],
        medicalSuggestions: hasRedFlags
          ? ["Call 911", "Go to ER", "Urgent care needed"]
          : ["Exact time helpful", "First occurrence?", "Gradual or sudden onset?"],
        clinicalExtraction: {
          extractedData: { chiefComplaint: patientInput },
          redFlags: hasRedFlags ? [patientInput] : [],
          riskFactors: [],
          differentialConsiderations: []
        },
        aiThinking: hasRedFlags 
          ? "Potential emergency detected - screening for immediate threats"
          : "Establishing precise timeline for symptom onset",
        nextPhase: hasRedFlags ? "chief-complaint" : "hpi-development",
        urgencyLevel: hasRedFlags ? "high" : "standard"
      },
      'hpi-development': {
        message: this.getHPIQuestion(),
        quickReplies: this.getHPIQuickReplies(),
        medicalSuggestions: [],
        clinicalExtraction: {
          extractedData: this.extractHPIData(patientInput),
          redFlags: this.checkForRedFlags(patientInput),
          riskFactors: [],
          differentialConsiderations: this.generateDifferentials(patientInput)
        },
        aiThinking: "Systematically gathering history of present illness details",
        nextPhase: this.shouldProgressFromHPI() ? "review-of-systems" : "hpi-development",
        urgencyLevel: this.calculateUrgencyLevel()
      },
      'review-of-systems': {
        message: this.getROSQuestion(),
        quickReplies: this.getROSQuickReplies(),
        medicalSuggestions: [],
        clinicalExtraction: {
          extractedData: this.extractROSData(patientInput),
          redFlags: this.checkForRedFlags(patientInput),
          riskFactors: [],
          differentialConsiderations: this.updateDifferentials(patientInput)
        },
        aiThinking: "Systematic review of body systems to identify related symptoms",
        nextPhase: this.shouldProgressFromROS() ? "medical-history" : "review-of-systems",
        urgencyLevel: this.calculateUrgencyLevel()
      },
      'medical-history': {
        message: this.getMedicalHistoryQuestion(),
        quickReplies: this.getMedicalHistoryQuickReplies(),
        medicalSuggestions: [],
        clinicalExtraction: {
          extractedData: this.extractMedicalHistory(patientInput),
          redFlags: [],
          riskFactors: this.identifyRiskFactors(patientInput),
          differentialConsiderations: this.updateDifferentials(patientInput)
        },
        aiThinking: "Gathering relevant past medical history and risk factors",
        nextPhase: this.shouldProgressFromPMH() ? "risk-stratification" : "medical-history",
        urgencyLevel: this.calculateUrgencyLevel()
      },
      'risk-stratification': {
        message: this.getRiskAssessmentQuestion(),
        quickReplies: this.getRiskQuickReplies(),
        medicalSuggestions: [],
        clinicalExtraction: {
          extractedData: this.extractRiskData(patientInput),
          redFlags: this.finalRedFlagCheck(),
          riskFactors: this.consolidateRiskFactors(),
          differentialConsiderations: this.finalizeDifferentials()
        },
        aiThinking: "Final risk assessment and safety screening",
        nextPhase: this.isAssessmentComplete() ? "clinical-summary" : "risk-stratification",
        urgencyLevel: this.calculateUrgencyLevel()
      },
      'clinical-summary': {
        message: `I've completed my clinical assessment. Here's what I've gathered:

<strong>Chief Complaint:</strong> ${this.clinicalData.chiefComplaint}
<strong>Duration:</strong> ${this.clinicalData.hpi.duration || 'Not specified'}
<strong>Severity:</strong> ${this.clinicalData.hpi.severity || 'Not specified'}/10
<strong>Associated Symptoms:</strong> ${this.getAssociatedSymptoms()}
<strong>Risk Level:</strong> ${this.calculateUrgencyLevel()}

I'm now preparing a detailed summary for your healthcare provider. Would you like to:
- Review the complete summary before submission
- Add any additional information you may have forgotten
- Submit directly to your provider`,
        quickReplies: ["Review complete summary", "Add more information", "Submit to provider"],
        medicalSuggestions: [],
        clinicalExtraction: {
          extractedData: {},
          redFlags: this.clinicalData.redFlags,
          riskFactors: this.clinicalData.riskFactors,
          differentialConsiderations: this.differentialDiagnosis.map(d => d.name)
        },
        aiThinking: "Assessment complete - ready for provider review",
        nextPhase: "clinical-summary",
        urgencyLevel: this.calculateUrgencyLevel()
      }
    };

    return JSON.stringify(mockResponses[phase]);
  }

  private parseAIResponse(response: string): BioMistralResponse {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.message) {
        throw new Error('Invalid response format');
      }

      return {
        message: parsed.message,
        quickReplies: parsed.quickReplies || [],
        medicalSuggestions: parsed.medicalSuggestions || [],
        clinicalExtraction: parsed.clinicalExtraction || {
          extractedData: {},
          redFlags: [],
          riskFactors: [],
          differentialConsiderations: []
        },
        aiThinking: parsed.aiThinking || '',
        nextPhase: parsed.nextPhase || this.clinicalData.assessmentPhase,
        urgencyLevel: parsed.urgencyLevel || 'standard',
        confidence: parsed.confidence
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.getErrorResponse();
    }
  }

  private updateClinicalData(message: string, response: BioMistralResponse): void {
    const extraction = response.clinicalExtraction;
    
    // Always update the phase from the response
    this.clinicalData.assessmentPhase = response.nextPhase;
    
    // Extract clinical data based on current phase
    switch (this.clinicalData.assessmentPhase) {
      case 'chief-complaint':
        if (!this.clinicalData.chiefComplaint) {
          this.clinicalData.chiefComplaint = message;
        }
        break;
      
      case 'hpi-development':
        this.clinicalData.hpi = {
          ...this.clinicalData.hpi,
          ...extraction.extractedData
        };
        // Increment index after processing
        if (Object.keys(extraction.extractedData).length > 0) {
          this.hpiQuestionIndex++;
        }
        break;
      
      case 'review-of-systems':
        this.clinicalData.ros = {
          ...this.clinicalData.ros,
          ...extraction.extractedData
        };
        // Increment index after processing
        if (Object.keys(extraction.extractedData).length > 0) {
          this.rosQuestionIndex++;
        }
        break;
      
      case 'medical-history':
        this.clinicalData.pmh = {
          ...this.clinicalData.pmh,
          ...extraction.extractedData
        };
        // Increment index after processing
        if (Object.keys(extraction.extractedData).length > 0) {
          this.pmhQuestionIndex++;
        }
        break;
    }

    // Update risk factors and red flags
    if (extraction.redFlags.length > 0) {
      this.clinicalData.redFlags = Array.from(
        new Set([...this.clinicalData.redFlags, ...extraction.redFlags])
      );
    }

    if (extraction.riskFactors.length > 0) {
      this.clinicalData.riskFactors = Array.from(
        new Set([...this.clinicalData.riskFactors, ...extraction.riskFactors])
      );
    }

    // Update differential diagnosis
    if (extraction.differentialConsiderations.length > 0) {
      extraction.differentialConsiderations.forEach(diagnosis => {
        if (!this.differentialDiagnosis.find(d => d.name === diagnosis)) {
          this.differentialDiagnosis.push({
            name: diagnosis,
            probability: 0,
            supportingEvidence: []
          });
        }
      });
    }
  }

  private addToHistory(
    role: 'user' | 'assistant', 
    content: string, 
    metadata?: ChatMessage['metadata']
  ): void {
    this.conversationHistory.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  private getErrorResponse(): BioMistralResponse {
    return {
      message: "I apologize, but I'm experiencing a technical issue. Let me try a different approach. Could you describe your main symptoms or concerns?",
      quickReplies: ['Chest pain', 'Headache', 'Abdominal pain', 'Other symptoms'],
      medicalSuggestions: ['Start over', 'Emergency symptoms'],
      clinicalExtraction: {
        extractedData: {},
        redFlags: [],
        riskFactors: [],
        differentialConsiderations: []
      },
      aiThinking: 'System recovery in progress...',
      nextPhase: this.clinicalData.assessmentPhase,
      urgencyLevel: 'standard'
    };
  }

  async generateClinicalSummary(): Promise<any> {
    const summaryPrompt = `Generate a comprehensive clinical summary based on the following data:
    
Clinical Data: ${JSON.stringify(this.clinicalData, null, 2)}
Conversation History: ${JSON.stringify(this.conversationHistory, null, 2)}
Differential Diagnoses: ${JSON.stringify(this.differentialDiagnosis, null, 2)}

Format as a structured medical summary suitable for physician review.`;

    try {
      const response = await this.callBioMistralAPI(summaryPrompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to generate clinical summary:', error);
      return this.getDefaultSummary();
    }
  }

  private getDefaultSummary(): any {
    return {
      chiefComplaint: this.clinicalData.chiefComplaint || 'Not specified',
      hpi: 'Clinical data collected through AI interview',
      assessment: 'AI-assisted clinical assessment completed',
      plan: 'Physician review and examination recommended',
      riskFactors: this.clinicalData.riskFactors,
      redFlags: this.clinicalData.redFlags,
      urgencyLevel: this.determineUrgencyLevel(),
      differentialDiagnosis: this.differentialDiagnosis,
      clinicalRecommendations: [
        'Complete physical examination',
        'Review vital signs',
        'Consider diagnostic testing as indicated'
      ],
      followUpNeeded: 'As clinically indicated'
    };
  }

  private determineUrgencyLevel(): UrgencyLevel {
    if (this.clinicalData.redFlags.length > 0) {
      return 'high';
    }
    if (this.clinicalData.riskFactors.length > 2) {
      return 'moderate';
    }
    return 'standard';
  }

  // Public getters
  getClinicalData(): ClinicalData {
    return { ...this.clinicalData };
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getDifferentialDiagnosis(): Diagnosis[] {
    return [...this.differentialDiagnosis];
  }

  getCurrentPhase(): AssessmentPhase {
    return this.clinicalData.assessmentPhase;
  }

  reset(): void {
    this.clinicalData = this.initializeClinicalData();
    this.conversationHistory = [];
    this.differentialDiagnosis = [];
    this.answeredQuestions.clear();
    this.hpiQuestionIndex = 0;
    this.rosQuestionIndex = 0;
    this.pmhQuestionIndex = 0;
  }

  // Helper methods for HPI phase
  private getHPIQuestion(): string {
    const hpiQuestions = [
      { key: 'severity', question: '<strong>On a scale of 1-10, how severe is your symptom right now?</strong> (1 = mild, 10 = worst possible)' },
      { key: 'character', question: '<strong>How would you describe the quality of your symptom?</strong> (For example: sharp, dull, burning, throbbing, aching)' },
      { key: 'location', question: '<strong>Where exactly is the symptom located?</strong> Please be as specific as possible.' },
      { key: 'duration', question: '<strong>How long have you been experiencing this symptom?</strong>' },
      { key: 'timing', question: '<strong>Is the symptom constant or does it come and go?</strong> If intermittent, how often does it occur?' },
      { key: 'aggravatingFactors', question: '<strong>What makes your symptom worse?</strong> (Activities, positions, foods, etc.)' },
      { key: 'relievingFactors', question: '<strong>What makes your symptom better?</strong> (Rest, medications, positions, etc.)' }
    ];

    // Use index to track progress and avoid repeating questions
    while (this.hpiQuestionIndex < hpiQuestions.length) {
      const q = hpiQuestions[this.hpiQuestionIndex];
      const hpiKey = q.key as keyof HistoryOfPresentIllness;
      
      if (!this.clinicalData.hpi[hpiKey] && !this.answeredQuestions.has(q.key)) {
        this.answeredQuestions.add(q.key);
        return q.question;
      }
      this.hpiQuestionIndex++;
    }

    return '<strong>Are there any other details about your main symptom that you think are important?</strong>';
  }

  private getHPIQuickReplies(): string[] {
    // Get the actual current question being asked
    const lastAIMessage = this.conversationHistory
      .filter(m => m.role === 'assistant')
      .pop();
    const currentQuestion = lastAIMessage?.content || this.getHPIQuestion();
    
    if (currentQuestion.includes('scale of 1-10') || currentQuestion.includes('severe')) {
      return ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst)'];
    } else if (currentQuestion.includes('quality') || currentQuestion.includes('describe')) {
      return ['Sharp', 'Dull', 'Burning', 'Throbbing', 'Aching', 'Pressure'];
    } else if (currentQuestion.includes('where') || currentQuestion.includes('location')) {
      const chiefComplaint = this.clinicalData.chiefComplaint.toLowerCase();
      if (chiefComplaint.includes('head')) {
        return ['Forehead', 'Temples', 'Back of head', 'One side', 'All over'];
      } else if (chiefComplaint.includes('chest')) {
        return ['Center of chest', 'Left side', 'Right side', 'Upper chest', 'Radiates to arm'];
      } else if (chiefComplaint.includes('abdom')) {
        return ['Upper abdomen', 'Lower abdomen', 'Right side', 'Left side', 'All over'];
      }
      return ['Specific area', 'General area', 'Multiple locations'];
    } else if (currentQuestion.includes('how long') || currentQuestion.includes('experiencing')) {
      return ['Hours', 'Days', 'Weeks', 'Months', 'On and off'];
    } else if (currentQuestion.includes('constant') || currentQuestion.includes('come and go')) {
      return ['Constant', 'Comes and goes', 'Only with activity', 'Random'];
    } else if (currentQuestion.includes('worse')) {
      return ['Movement', 'Rest', 'Eating', 'Stress', 'Nothing specific'];
    } else if (currentQuestion.includes('better')) {
      return ['Rest', 'Medication', 'Heat/Cold', 'Position change', 'Nothing helps'];
    }
    
    return ['Yes', 'No', 'Not sure', 'Sometimes'];
  }

  private getROSQuickReplies(): string[] {
    const currentQuestion = this.getROSQuestion();
    
    // For ROS questions, we typically want yes/no answers
    // But we can add more specific options based on the system
    if (currentQuestion.includes('fever') || currentQuestion.includes('chills')) {
      return ['Yes, fever', 'Yes, chills', 'Yes, both', 'No'];
    } else if (currentQuestion.includes('chest pain') || currentQuestion.includes('palpitations')) {
      return ['Yes, chest pain', 'Yes, palpitations', 'Yes, both', 'No'];
    } else if (currentQuestion.includes('nausea') || currentQuestion.includes('vomiting')) {
      return ['Yes, nausea', 'Yes, vomiting', 'Yes, both', 'No'];
    }
    
    return ['Yes', 'No', 'Not sure', 'Sometimes'];
  }

  private extractHPIData(input: string): any {
    const data: any = {};
    
    // Get the current question to know what we're extracting
    const currentQuestion = this.conversationHistory
      .filter(m => m.role === 'assistant')
      .pop()?.content || '';
    
    // Extract severity if mentioned or if it's a severity question
    if (currentQuestion.includes('scale of 1-10') || currentQuestion.includes('severity')) {
      const severityMatch = input.match(/(\d+)\s*(?:\/10|out of 10)?/);
      if (severityMatch) {
        data.severity = parseInt(severityMatch[1]);
      } else if (input.toLowerCase().includes('mild')) {
        data.severity = 3;
      } else if (input.toLowerCase().includes('moderate')) {
        data.severity = 5;
      } else if (input.toLowerCase().includes('severe')) {
        data.severity = 8;
      } else if (input.toLowerCase().includes('worst')) {
        data.severity = 10;
      }
    }
    
    // Extract duration if it's a timing question
    if (currentQuestion.includes('when') || currentQuestion.includes('how long')) {
      const durationPatterns = [
        /(\d+)\s*(hour|day|week|month|year)s?\s*ago/i,
        /for\s*(\d+)\s*(hour|day|week|month|year)s?/i,
        /since\s*(yesterday|today|last\s*week|last\s*month)/i,
        /just\s*now/i,
        /today/i,
        /yesterday/i
      ];
      
      for (const pattern of durationPatterns) {
        const match = input.match(pattern);
        if (match) {
          data.duration = match[0];
          break;
        }
      }
      
      // Handle quick reply options
      if (!data.duration) {
        if (input.toLowerCase().includes('just now')) data.duration = 'Just now';
        else if (input.toLowerCase().includes('today')) data.duration = 'Today';
        else if (input.toLowerCase().includes('yesterday')) data.duration = 'Yesterday';
        else if (input.toLowerCase().includes('few days')) data.duration = 'Few days ago';
        else if (input.toLowerCase().includes('week ago')) data.duration = 'Week ago';
        else if (input.toLowerCase().includes('longer')) data.duration = 'More than a week';
      }
    }
    
    // Extract character/quality
    if (currentQuestion.includes('quality') || currentQuestion.includes('describe')) {
      data.character = input;
    }
    
    // Extract location
    if (currentQuestion.includes('where') || currentQuestion.includes('location')) {
      data.location = input;
    }
    
    // Extract timing pattern
    if (currentQuestion.includes('constant') || currentQuestion.includes('come and go')) {
      data.timing = input;
    }
    
    // Extract aggravating factors
    if (currentQuestion.includes('worse')) {
      data.aggravatingFactors = [input];
    }
    
    // Extract relieving factors
    if (currentQuestion.includes('better')) {
      data.relievingFactors = [input];
    }
    
    return data;
  }

  private shouldProgressFromHPI(): boolean {
    // Progress if we have key HPI elements or have asked enough questions
    const hpi = this.clinicalData.hpi;
    const requiredElements: (keyof HistoryOfPresentIllness)[] = ['severity', 'character', 'location', 'timing'];
    const hasRequired = requiredElements.filter(key => hpi[key]).length;
    
    // Also check if we've asked most of the questions
    const totalQuestions = 7; // Total HPI questions
    const questionsAsked = this.answeredQuestions.size;
    
    return hasRequired >= 3 || Object.keys(hpi).length >= 5 || questionsAsked >= totalQuestions - 2;
  }

  // Helper methods for ROS phase
  private getROSQuestion(): string {
    const rosQuestions: { system: keyof ReviewOfSystems; question: string }[] = [
      { system: 'constitutional', question: '<strong>Have you had any fever, chills, night sweats, or unexplained weight loss?</strong>' },
      { system: 'cardiovascular', question: '<strong>Any chest pain, palpitations, or shortness of breath with exertion?</strong>' },
      { system: 'respiratory', question: '<strong>Any cough, wheezing, or difficulty breathing at rest?</strong>' },
      { system: 'gastrointestinal', question: '<strong>Any nausea, vomiting, diarrhea, or abdominal pain?</strong>' },
      { system: 'neurological', question: '<strong>Any headaches, dizziness, weakness, or numbness?</strong>' },
      { system: 'musculoskeletal', question: '<strong>Any joint pain, muscle aches, or swelling?</strong>' },
      { system: 'allergic', question: '<strong>Any rashes, itching, or skin changes?</strong>' }
    ];

    // Use index to track progress
    while (this.rosQuestionIndex < rosQuestions.length) {
      const q = rosQuestions[this.rosQuestionIndex];
      
      if (!this.clinicalData.ros[q.system] && !this.answeredQuestions.has(`ros_${q.system}`)) {
        this.answeredQuestions.add(`ros_${q.system}`);
        return q.question;
      }
      this.rosQuestionIndex++;
    }

    return '<strong>Are there any other symptoms in any part of your body that we haven\'t discussed?</strong>';
  }

  private extractROSData(input: string): any {
    const data: any = {};
    const positiveResponses = ['yes', 'yeah', 'yep', 'sometimes', 'occasionally'];
    const negativeResponses = ['no', 'nope', 'none', 'never'];
    
    const inputLower = input.toLowerCase();
    const isPositive = positiveResponses.some(r => inputLower.includes(r));
    const isNegative = negativeResponses.some(r => inputLower.includes(r));
    
    // Determine which system we're asking about
    const lastQuestion = this.getROSQuestion();
    let currentSystem = 'general';
    
    if (lastQuestion.includes('fever')) currentSystem = 'constitutional';
    else if (lastQuestion.includes('chest pain')) currentSystem = 'cardiovascular';
    else if (lastQuestion.includes('cough')) currentSystem = 'respiratory';
    else if (lastQuestion.includes('nausea')) currentSystem = 'gastrointestinal';
    else if (lastQuestion.includes('headaches')) currentSystem = 'neurological';
    else if (lastQuestion.includes('joint pain')) currentSystem = 'musculoskeletal';
    else if (lastQuestion.includes('rashes')) currentSystem = 'skin';
    
    data[currentSystem] = isPositive ? [input] : (isNegative ? ['Negative'] : [input]);
    
    return data;
  }

  private shouldProgressFromROS(): boolean {
    // Progress if we've covered major systems or asked enough questions
    const majorSystems: (keyof ReviewOfSystems)[] = ['constitutional', 'cardiovascular', 'respiratory', 'gastrointestinal', 'neurological'];
    const coveredSystems = majorSystems.filter(system => this.clinicalData.ros[system]).length;
    
    // Check if we've asked most ROS questions
    const rosQuestionsAsked = Array.from(this.answeredQuestions).filter(q => q.startsWith('ros_')).length;
    
    return coveredSystems >= 4 || Object.keys(this.clinicalData.ros).length >= 6 || rosQuestionsAsked >= 5;
  }

  // Helper methods for Medical History phase
  private getMedicalHistoryQuestion(): string {
    const pmhQuestions: { key: string; question: string }[] = [
      { key: 'conditions', question: '<strong>Do you have any chronic medical conditions?</strong> (diabetes, hypertension, heart disease, asthma, etc.)' },
      { key: 'surgeries', question: '<strong>Have you had any surgeries or hospitalizations?</strong> If yes, please list them with approximate dates.' },
      { key: 'medications', question: '<strong>What medications are you currently taking?</strong> Include prescription and over-the-counter medications.' },
      { key: 'allergies', question: '<strong>Do you have any allergies to medications, foods, or other substances?</strong>' },
      { key: 'familyHistory', question: '<strong>Any significant medical conditions in your immediate family?</strong> (parents, siblings, children)' },
      { key: 'socialHistory', question: '<strong>Do you smoke, drink alcohol, or use any recreational substances?</strong>' }
    ];

    while (this.pmhQuestionIndex < pmhQuestions.length) {
      const q = pmhQuestions[this.pmhQuestionIndex];
      
      if (!this.answeredQuestions.has(`pmh_${q.key}`)) {
        const needsAnswer = 
          (q.key === 'conditions' && !this.clinicalData.pmh.conditions) ||
          (q.key === 'surgeries' && !this.clinicalData.pmh.surgeries) ||
          (q.key === 'medications' && this.clinicalData.medications.length === 0 && !this.answeredQuestions.has('pmh_medications')) ||
          (q.key === 'allergies' && this.clinicalData.allergies.length === 0 && !this.answeredQuestions.has('pmh_allergies')) ||
          (q.key === 'familyHistory' && this.clinicalData.familyHistory.conditions.length === 0 && !this.answeredQuestions.has('pmh_familyHistory')) ||
          (q.key === 'socialHistory' && !this.clinicalData.socialHistory.smoking && !this.answeredQuestions.has('pmh_socialHistory'));
        
        if (needsAnswer) {
          this.answeredQuestions.add(`pmh_${q.key}`);
          return q.question;
        }
      }
      this.pmhQuestionIndex++;
    }

    return '<strong>Is there anything else in your medical history that might be relevant?</strong>';
  }

  private getMedicalHistoryQuickReplies(): string[] {
    const currentQuestion = this.getMedicalHistoryQuestion();
    
    if (currentQuestion.includes('chronic medical conditions')) {
      return ['None', 'Diabetes', 'Hypertension', 'Heart disease', 'Asthma', 'Multiple conditions'];
    } else if (currentQuestion.includes('surgeries')) {
      return ['No surgeries', 'Yes, within past year', 'Yes, years ago', 'Multiple surgeries'];
    } else if (currentQuestion.includes('medications')) {
      return ['No medications', 'One medication', 'Multiple medications', 'Not sure of names'];
    } else if (currentQuestion.includes('allergies')) {
      return ['No allergies', 'Medication allergies', 'Food allergies', 'Environmental allergies'];
    } else if (currentQuestion.includes('smoke')) {
      return ['Never smoked', 'Current smoker', 'Former smoker', 'Social drinker', 'No alcohol'];
    }
    
    return ['Yes', 'No', 'Not sure', 'Prefer not to say'];
  }

  private extractMedicalHistory(input: string): any {
    const data: any = {};
    const lastQuestion = this.getMedicalHistoryQuestion();
    
    if (lastQuestion.includes('chronic medical conditions')) {
      data.conditions = input.toLowerCase().includes('none') || input.toLowerCase().includes('no') 
        ? ['None'] 
        : input.split(/[,;]/).map(c => c.trim());
    } else if (lastQuestion.includes('surgeries')) {
      data.surgeries = input.toLowerCase().includes('no surgeries') || input.toLowerCase().includes('none')
        ? ['None']
        : input.split(/[,;]/).map(s => s.trim());
    } else if (lastQuestion.includes('medications')) {
      // Update medications array with proper structure
      if (input.toLowerCase().includes('no medication') || input.toLowerCase().includes('none')) {
        this.answeredQuestions.add('pmh_medications');
      } else {
        this.clinicalData.medications = input.split(/[,;]/).map(m => ({
          name: m.trim(),
          dose: 'Unknown',
          frequency: 'Unknown',
          route: 'Oral'
        }));
      }
    } else if (lastQuestion.includes('allergies')) {
      // Update allergies array with proper structure
      if (input.toLowerCase().includes('no allergies') || input.toLowerCase().includes('none')) {
        this.answeredQuestions.add('pmh_allergies');
      } else {
        this.clinicalData.allergies = input.split(/[,;]/).map(a => ({
          allergen: a.trim(),
          reaction: 'Unknown',
          severity: 'moderate' as const,
          type: 'drug' as const
        }));
      }
    } else if (lastQuestion.includes('family')) {
      this.clinicalData.familyHistory.conditions = input.toLowerCase().includes('none') 
        ? ['None']
        : input.split(/[,;]/).map(c => c.trim());
      this.answeredQuestions.add('pmh_familyHistory');
    } else if (lastQuestion.includes('smoke')) {
      this.clinicalData.socialHistory.smoking = input;
      this.answeredQuestions.add('pmh_socialHistory');
    }
    
    return data;
  }

  private identifyRiskFactors(input: string): string[] {
    const riskFactors: string[] = [];
    const inputLower = input.toLowerCase();
    
    // Check for common risk factors
    if (inputLower.includes('diabetes')) riskFactors.push('Diabetes');
    if (inputLower.includes('hypertension') || inputLower.includes('high blood pressure')) riskFactors.push('Hypertension');
    if (inputLower.includes('heart disease') || inputLower.includes('cardiac')) riskFactors.push('Heart disease');
    if (inputLower.includes('smoke') || inputLower.includes('smoking')) riskFactors.push('Smoking');
    if (inputLower.includes('obesity') || inputLower.includes('overweight')) riskFactors.push('Obesity');
    if (inputLower.includes('cancer')) riskFactors.push('Cancer history');
    
    return riskFactors;
  }

  private shouldProgressFromPMH(): boolean {
    // Progress if we have key history elements or asked enough questions
    const hasConditions = this.clinicalData.pmh.conditions && this.clinicalData.pmh.conditions.length > 0;
    const hasMedications = this.clinicalData.medications.length > 0 || this.answeredQuestions.has('pmh_medications');
    const hasAllergies = this.clinicalData.allergies.length > 0 || this.answeredQuestions.has('pmh_allergies');
    const hasSocialHistory = !!this.clinicalData.socialHistory.smoking || this.answeredQuestions.has('pmh_socialHistory');
    
    const elementsCount = [hasConditions, hasMedications, hasAllergies, hasSocialHistory].filter(Boolean).length;
    
    // Check if we've asked most PMH questions
    const pmhQuestionsAsked = Array.from(this.answeredQuestions).filter(q => q.startsWith('pmh_')).length;
    
    return elementsCount >= 3 || Object.keys(this.clinicalData.pmh).length >= 3 || pmhQuestionsAsked >= 4;
  }

  // Helper methods for Risk Assessment phase
  private getRiskAssessmentQuestion(): string {
    const riskQuestions = [
      '<strong>Have you traveled recently or been exposed to anyone who is sick?</strong>',
      '<strong>Are you up to date with your vaccinations, including flu and COVID-19?</strong>',
      '<strong>Do you have any concerns about your symptoms that we haven\'t discussed?</strong>'
    ];

    const answeredCount = Object.keys(this.clinicalData.pmh).filter(k => k.startsWith('risk_')).length;
    
    if (answeredCount < riskQuestions.length) {
      return riskQuestions[answeredCount];
    }

    return '<strong>Based on everything you\'ve told me, is there anything else you think I should know?</strong>';
  }

  private getRiskQuickReplies(): string[] {
    const currentQuestion = this.getRiskAssessmentQuestion();
    
    if (currentQuestion.includes('traveled')) {
      return ['No travel', 'Yes, recently', 'Exposed to illness', 'Both'];
    } else if (currentQuestion.includes('vaccinations')) {
      return ['All up to date', 'Some missing', 'Not sure', 'No vaccinations'];
    }
    
    return ['Yes', 'No', 'Not sure', 'That\'s everything'];
  }

  private extractRiskData(input: string): any {
    const data: any = {};
    const questionIndex = Object.keys(this.clinicalData.pmh).filter(k => k.startsWith('risk_')).length;
    data[`risk_${questionIndex}`] = input;
    return data;
  }

  private finalRedFlagCheck(): string[] {
    // Final comprehensive red flag check
    const redFlags: string[] = [];
    
    if (this.clinicalData.hpi.severity && this.clinicalData.hpi.severity >= 8) {
      redFlags.push('Severe pain (8+ /10)');
    }
    
    // Check for emergency symptoms in ROS
    const rosData = JSON.stringify(this.clinicalData.ros).toLowerCase();
    if (rosData.includes('chest pain') && !rosData.includes('negative')) {
      redFlags.push('Chest pain');
    }
    if (rosData.includes('shortness of breath') && !rosData.includes('negative')) {
      redFlags.push('Shortness of breath');
    }
    
    return Array.from(new Set([...this.clinicalData.redFlags, ...redFlags]));
  }

  private consolidateRiskFactors(): string[] {
    return Array.from(new Set(this.clinicalData.riskFactors));
  }

  private finalizeDifferentials(): string[] {
    // Return top differential diagnoses based on collected data
    return this.differentialDiagnosis.slice(0, 5).map(d => d.name);
  }

  private isAssessmentComplete(): boolean {
    // Check if we have enough data to complete assessment
    const hasChiefComplaint = !!this.clinicalData.chiefComplaint;
    const hasHPIData = Object.keys(this.clinicalData.hpi).length >= 3;
    const hasROSData = Object.keys(this.clinicalData.ros).length >= 3;
    const hasPMHData = Object.keys(this.clinicalData.pmh).length >= 2;
    
    return hasChiefComplaint && hasHPIData && hasROSData && hasPMHData;
  }

  // Helper methods for general use
  private checkForRedFlags(input: string): string[] {
    const redFlags: string[] = [];
    const inputLower = input.toLowerCase();
    
    const emergencyKeywords = [
      { keyword: 'chest pain', flag: 'Chest pain' },
      { keyword: 'can\'t breathe', flag: 'Severe dyspnea' },
      { keyword: 'difficulty breathing', flag: 'Dyspnea' },
      { keyword: 'severe headache', flag: 'Severe headache' },
      { keyword: 'worst headache', flag: 'Thunderclap headache' },
      { keyword: 'unconscious', flag: 'Loss of consciousness' },
      { keyword: 'bleeding heavily', flag: 'Severe bleeding' },
      { keyword: 'suicidal', flag: 'Suicidal ideation' },
      { keyword: 'want to die', flag: 'Suicidal ideation' }
    ];
    
    emergencyKeywords.forEach(({ keyword, flag }) => {
      if (inputLower.includes(keyword)) {
        redFlags.push(flag);
      }
    });
    
    return redFlags;
  }

  private generateDifferentials(input: string): string[] {
    // Generate differential diagnoses based on chief complaint and symptoms
    const differentials: string[] = [];
    const symptoms = input.toLowerCase();
    
    if (symptoms.includes('chest pain')) {
      differentials.push('Acute coronary syndrome', 'Pulmonary embolism', 'Pneumonia', 'GERD', 'Costochondritis');
    } else if (symptoms.includes('headache')) {
      differentials.push('Migraine', 'Tension headache', 'Cluster headache', 'Sinusitis', 'Meningitis');
    } else if (symptoms.includes('abdominal pain')) {
      differentials.push('Appendicitis', 'Gastroenteritis', 'Peptic ulcer', 'Cholecystitis', 'Pancreatitis');
    } else if (symptoms.includes('shortness of breath') || symptoms.includes('breathing')) {
      differentials.push('Asthma exacerbation', 'COPD exacerbation', 'Pneumonia', 'Pulmonary embolism', 'Anxiety');
    }
    
    return differentials.slice(0, 3);
  }

  private updateDifferentials(input: string): string[] {
    // Update differentials based on new information
    const newDifferentials = this.generateDifferentials(input);
    
    newDifferentials.forEach(dx => {
      if (!this.differentialDiagnosis.find(d => d.name === dx)) {
        this.differentialDiagnosis.push({
          name: dx,
          probability: 0,
          supportingEvidence: [input]
        });
      }
    });
    
    return this.differentialDiagnosis.map(d => d.name);
  }

  private calculateUrgencyLevel(): UrgencyLevel {
    if (this.clinicalData.redFlags.length > 0) {
      return 'high';
    }
    
    const severity = this.clinicalData.hpi.severity || 0;
    if (severity >= 8 || this.clinicalData.riskFactors.length > 3) {
      return 'moderate';
    }
    
    return 'standard';
  }

  private getAssociatedSymptoms(): string {
    const symptoms: string[] = [];
    
    Object.entries(this.clinicalData.ros).forEach(([system, value]) => {
      if (value && Array.isArray(value) && value.length > 0 && value[0] !== 'Negative') {
        symptoms.push(...value);
      }
    });
    
    return symptoms.length > 0 ? symptoms.join(', ') : 'None reported';
  }
}

// Export singleton instance
export const bioMistralService = new BioMistralService();
