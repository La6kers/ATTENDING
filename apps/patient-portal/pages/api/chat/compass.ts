// COMPASS Chat API Route
// Patient Portal: apps/patient-portal/pages/api/chat/compass.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import type { 
  AssessmentPhase, 
  UrgencyLevel, 
  ClinicalExtraction,
  BioMistralResponse,
} from '@attending/shared';

interface CompassRequest {
  sessionId: string;
  message: string;
  currentPhase: AssessmentPhase;
  clinicalData: Record<string, any>;
  messageHistory: Array<{ role: string; content: string }>;
}

interface CompassResponse {
  message: string;
  nextPhase: AssessmentPhase;
  urgencyLevel: UrgencyLevel;
  quickReplies: string[];
  clinicalExtraction: Partial<ClinicalExtraction>;
  isComplete: boolean;
}

// Phase transition logic
const PHASE_ORDER: AssessmentPhase[] = [
  'chief-complaint',
  'hpi-development',
  'review-of-systems',
  'medical-history',
  'risk-stratification',
  'clinical-summary',
];

// Quick replies by phase
const PHASE_QUICK_REPLIES: Record<AssessmentPhase, string[]> = {
  'chief-complaint': [],
  'hpi-development': [
    'It started suddenly',
    'It came on gradually',
    'About a week ago',
    'Pain level is 7/10',
  ],
  'review-of-systems': [
    'Yes, I\'ve noticed that',
    'No, I haven\'t experienced that',
    'Sometimes',
    'Not sure',
  ],
  'medical-history': [
    'No known allergies',
    'Yes, I take medications',
    'No surgeries',
    'I have diabetes',
  ],
  'risk-stratification': [
    'Yes',
    'No',
    'I\'m not sure',
  ],
  'clinical-summary': [],
};

// Red flag patterns
const RED_FLAG_PATTERNS = [
  { pattern: /chest pain|chest tightness|pressure in chest/i, flag: 'Chest pain' },
  { pattern: /can't breathe|difficulty breathing|short of breath/i, flag: 'Respiratory distress' },
  { pattern: /worst headache|thunderclap/i, flag: 'Worst headache of life' },
  { pattern: /sudden weakness|numbness|slurred speech/i, flag: 'Stroke symptoms' },
  { pattern: /blood in stool|vomiting blood|black stool/i, flag: 'GI bleeding' },
  { pattern: /suicidal|want to die|kill myself/i, flag: 'Suicidal ideation' },
  { pattern: /severe pain.*abdomen|worst pain/i, flag: 'Severe abdominal pain' },
  { pattern: /losing consciousness|passed out|fainted/i, flag: 'Syncope' },
];

// Phase-specific prompts
const PHASE_PROMPTS: Record<AssessmentPhase, string> = {
  'chief-complaint': 
    "I understand. To help you better, I'll ask some follow-up questions about your symptoms.",
  'hpi-development':
    "Now let me gather more details about when this started and how it's been affecting you.",
  'review-of-systems':
    "I'd like to check on some related symptoms. Have you experienced any of the following?",
  'medical-history':
    "Let me understand your medical background. Do you have any ongoing health conditions or take any medications?",
  'risk-stratification':
    "Based on what you've shared, I have a few more questions to assess your situation.",
  'clinical-summary':
    "Thank you for providing all this information. I'm preparing a summary for your healthcare provider.",
};

// Generate AI-like response based on phase
function generateResponse(
  phase: AssessmentPhase, 
  message: string,
  clinicalData: Record<string, any>
): CompassResponse {
  const currentIndex = PHASE_ORDER.indexOf(phase);
  const isLastPhase = currentIndex === PHASE_ORDER.length - 1;
  
  // Detect red flags
  const detectedFlags: string[] = [];
  RED_FLAG_PATTERNS.forEach(({ pattern, flag }) => {
    if (pattern.test(message)) {
      detectedFlags.push(flag);
    }
  });

  // Determine urgency
  let urgencyLevel: UrgencyLevel = 'standard';
  if (detectedFlags.length >= 2) {
    urgencyLevel = 'high';
  } else if (detectedFlags.length === 1) {
    urgencyLevel = 'moderate';
  }

  // Determine next phase (advance every 2-3 messages in real implementation)
  const nextPhase = isLastPhase ? phase : PHASE_ORDER[currentIndex + 1];
  
  // Generate contextual response
  let responseMessage = '';
  let quickReplies: string[] = [];

  switch (phase) {
    case 'chief-complaint':
      responseMessage = `Thank you for sharing that. I want to make sure I understand your main concern.

${PHASE_PROMPTS['hpi-development']}

**When did this first start?** Please be as specific as you can (e.g., "3 days ago", "last Tuesday").`;
      quickReplies = ['Today', 'Yesterday', 'A few days ago', 'About a week ago', 'More than a week'];
      break;

    case 'hpi-development':
      responseMessage = `I see. That helps me understand the timeline.

**How would you describe the intensity on a scale of 1-10?** (1 being barely noticeable, 10 being the worst you can imagine)

Also, does anything make it better or worse?`;
      quickReplies = ['1-3 (Mild)', '4-6 (Moderate)', '7-8 (Severe)', '9-10 (Extreme)'];
      break;

    case 'review-of-systems':
      responseMessage = `Thank you. Now I'd like to ask about any other symptoms you might be experiencing.

**Have you noticed any of the following?**
- Fever or chills
- Nausea or vomiting  
- Changes in appetite
- Fatigue or weakness`;
      quickReplies = PHASE_QUICK_REPLIES['review-of-systems'];
      break;

    case 'medical-history':
      responseMessage = `This information is very helpful.

Now let me ask about your medical background:
- **Do you have any known medical conditions?** (diabetes, high blood pressure, etc.)
- **Are you currently taking any medications?**
- **Do you have any allergies to medications?**`;
      quickReplies = PHASE_QUICK_REPLIES['medical-history'];
      break;

    case 'risk-stratification':
      responseMessage = `I have a few more questions to help assess your situation:

- Does anyone in your immediate family have similar health issues?
- Have you had any recent injuries, surgeries, or hospitalizations?`;
      quickReplies = PHASE_QUICK_REPLIES['risk-stratification'];
      break;

    case 'clinical-summary':
      responseMessage = `Thank you for providing all this information. 

**Summary of your visit:**
- Chief Complaint: ${clinicalData.chiefComplaint || 'Symptoms as described'}
- Duration: As reported
- Severity: As indicated
${detectedFlags.length > 0 ? `\n⚠️ **Important findings noted:** ${detectedFlags.join(', ')}` : ''}

Your information has been compiled and is ready to submit to your healthcare provider. Please click "Submit Assessment" below to complete.`;
      break;
  }

  // Add urgency warning if needed
  if (urgencyLevel === 'high' && phase !== 'clinical-summary') {
    responseMessage = `⚠️ **Based on what you've described, your symptoms may need urgent attention.**

I'll continue gathering information, but please be aware that a healthcare provider will be prioritized to review your case.

${responseMessage}`;
  }

  return {
    message: responseMessage,
    nextPhase: phase === 'clinical-summary' ? 'clinical-summary' : nextPhase,
    urgencyLevel,
    quickReplies,
    clinicalExtraction: {
      extractedData: {
        lastMessage: message,
        phase,
      },
      redFlags: detectedFlags,
      riskFactors: [],
      differentialConsiderations: [],
    },
    isComplete: phase === 'clinical-summary',
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompassResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, message, currentPhase, clinicalData } = req.body as CompassRequest;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In production, this would call the BioMistral AI service
    // For now, use rule-based response generation
    const response = generateResponse(currentPhase, message, clinicalData);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    return res.status(200).json(response);

  } catch (error) {
    console.error('COMPASS API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
