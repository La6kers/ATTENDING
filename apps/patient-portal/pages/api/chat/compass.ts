// ============================================================
// API Route: /api/chat/compass
// apps/patient-portal/pages/api/chat/compass.ts
//
// COMPASS AI Chat Endpoint
// Processes patient messages and returns AI responses with
// clinical extraction, phase progression, and urgency assessment
//
// Security:
// - Rate limited to prevent abuse
// - Input validation
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import type { AssessmentPhase, UrgencyLevel, HistoryOfPresentIllness } from '@attending/shared';
import { rateLimit, getClientIp, sanitizeInput } from '@attending/shared/lib/security';

// Red flag patterns for emergency detection
const RED_FLAG_PATTERNS = [
  { pattern: /chest pain|chest tightness|pressure in chest/i, flag: 'Chest Pain', severity: 'critical' as const },
  { pattern: /can't breathe|difficulty breathing|short of breath|gasping/i, flag: 'Dyspnea', severity: 'critical' as const },
  { pattern: /worst headache|thunderclap|sudden severe headache/i, flag: 'Thunderclap Headache', severity: 'critical' as const },
  { pattern: /suicidal|want to die|kill myself|end my life/i, flag: 'Suicidal Ideation', severity: 'critical' as const },
  { pattern: /bleeding heavily|can't stop bleeding|hemorrhage/i, flag: 'Hemorrhage', severity: 'critical' as const },
  { pattern: /stroke|face drooping|arm weakness|slurred speech/i, flag: 'Stroke Symptoms', severity: 'critical' as const },
  { pattern: /unconscious|passed out|fainted|syncope/i, flag: 'Loss of Consciousness', severity: 'high' as const },
  { pattern: /severe pain.*10|worst pain|excruciating/i, flag: 'Severe Pain', severity: 'high' as const },
  { pattern: /blood in stool|vomiting blood|coughing blood/i, flag: 'GI Bleeding', severity: 'high' as const },
  { pattern: /vision loss|can't see|sudden blindness/i, flag: 'Vision Changes', severity: 'high' as const },
  { pattern: /high fever|104|105|106 degrees/i, flag: 'High Fever', severity: 'high' as const },
  { pattern: /confusion|disoriented|altered mental/i, flag: 'Altered Mental Status', severity: 'high' as const },
];

// Phase transitions and questions
// Phase questions - used for reference, potentially for future AI prompt construction
const _PHASE_QUESTIONS: Record<AssessmentPhase, string[]> = {
  'chief-complaint': [
    'What brings you in today? Please describe your main concern.',
  ],
  'hpi-development': [
    'When did this start?',
    'Where exactly do you feel this?',
    'On a scale of 0-10, how severe is this?',
    'How would you describe the sensation?',
    'What makes it worse?',
    'What makes it better?',
    'Are you experiencing any other symptoms along with this?',
  ],
  'review-of-systems': [
    'Have you noticed any other symptoms we haven\'t discussed?',
    'Any fever, chills, or night sweats?',
    'Any changes in appetite or weight?',
    'Any difficulty sleeping?',
  ],
  'medical-history': [
    'What medications are you currently taking?',
    'Do you have any drug allergies?',
    'Do you have any chronic medical conditions?',
    'Have you had any surgeries in the past?',
  ],
  'risk-stratification': [
    'Is there anything else you think I should know?',
    'Any family history of similar problems?',
  ],
  'clinical-summary': [
    'Thank you for providing this information. Let me summarize what you\'ve told me.',
  ],
};

// Quick reply suggestions per phase
const QUICK_REPLIES: Record<AssessmentPhase, string[]> = {
  'chief-complaint': [],
  'hpi-development': [
    'Today', 'Yesterday', 'A few days ago', 'About a week ago',
    'Sharp', 'Dull', 'Throbbing', 'Burning', 'Pressure',
    'Mild (1-3)', 'Moderate (4-6)', 'Severe (7-10)',
  ],
  'review-of-systems': ['Yes', 'No', 'Not sure'],
  'medical-history': ['None', 'No known allergies', 'No surgeries'],
  'risk-stratification': ['Nothing else to add', 'Yes, I have more to share'],
  'clinical-summary': ['Submit my assessment', 'I need to add something'],
};

interface ChatRequest {
  sessionId: string;
  message: string;
  currentPhase: AssessmentPhase;
  clinicalData: any;
  messageHistory: any[];
}

interface ChatResponse {
  message: string;
  nextPhase: AssessmentPhase;
  urgencyLevel: UrgencyLevel;
  quickReplies: string[];
  clinicalExtraction: {
    extractedData: Partial<HistoryOfPresentIllness>;
    redFlags: string[];
    riskFactors: string[];
  };
  isComplete: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: max 60 messages per minute per IP (for assessment conversations)
  const clientIp = getClientIp(req);
  const rateLimitResult = await rateLimit(clientIp, {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: 'compass-chat',
  });

  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());

  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many messages. Please wait a moment before continuing.',
      retryAfter: rateLimitResult.retryAfter,
    });
  }

  try {
    const { message: rawMessage, currentPhase, clinicalData, messageHistory } = req.body as ChatRequest;

    // Sanitize user input to prevent XSS
    const message = sanitizeInput(rawMessage || '');

    // Detect red flags in user message
    const detectedRedFlags = detectRedFlags(message);
    const urgencyLevel = calculateUrgency(detectedRedFlags, clinicalData);

    // Extract clinical information from message
    const extraction = extractClinicalData(message, currentPhase, clinicalData);

    // Determine next phase
    const { nextPhase, isComplete } = determineNextPhase(currentPhase, messageHistory?.length || 0);

    // Generate AI response
    const aiResponse = generateResponse(message, currentPhase, nextPhase, detectedRedFlags, extraction);

    // Get appropriate quick replies
    const quickReplies = getQuickReplies(nextPhase, extraction);

    const response: ChatResponse = {
      message: aiResponse,
      nextPhase,
      urgencyLevel,
      quickReplies,
      clinicalExtraction: {
        extractedData: extraction,
        redFlags: detectedRedFlags,
        riskFactors: extractRiskFactors(message, clinicalData),
      },
      isComplete,
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('COMPASS Chat Error:', error);
    return res.status(500).json({
      message: 'I apologize, but I encountered an issue processing your response. Please try again.',
      nextPhase: req.body.currentPhase,
      urgencyLevel: 'standard',
      quickReplies: [],
      clinicalExtraction: { extractedData: {}, redFlags: [], riskFactors: [] },
      isComplete: false,
    });
  }
}

// Detect red flags in user input
function detectRedFlags(message: string): string[] {
  const flags: string[] = [];
  
  for (const { pattern, flag } of RED_FLAG_PATTERNS) {
    if (pattern.test(message)) {
      flags.push(flag);
    }
  }
  
  return [...new Set(flags)]; // Remove duplicates
}

// Calculate urgency level
function calculateUrgency(redFlags: string[], clinicalData: any): UrgencyLevel {
  const criticalFlags = RED_FLAG_PATTERNS
    .filter(p => p.severity === 'critical')
    .map(p => p.flag);
  
  const hasCritical = redFlags.some(f => criticalFlags.includes(f));
  if (hasCritical) return 'high';
  
  const existingFlags = clinicalData?.redFlags || [];
  const allFlags = [...existingFlags, ...redFlags];
  
  if (allFlags.length >= 3) return 'high';
  if (allFlags.length >= 1) return 'moderate';
  
  return 'standard';
}

// Extract clinical data from message
function extractClinicalData(message: string, _phase: AssessmentPhase, _existing: any): Partial<HistoryOfPresentIllness> {
  const extraction: Partial<HistoryOfPresentIllness> = {};
  const lowerMessage = message.toLowerCase();

  // Extract onset
  const onsetPatterns = [
    { pattern: /started?\s+(today|this morning|this afternoon)/i, value: 'Today' },
    { pattern: /started?\s+(yesterday)/i, value: 'Yesterday' },
    { pattern: /(\d+)\s*(day|days)\s*ago/i, extract: (m: RegExpMatchArray) => `${m[1]} days ago` },
    { pattern: /(\d+)\s*(week|weeks)\s*ago/i, extract: (m: RegExpMatchArray) => `${m[1]} weeks ago` },
    { pattern: /(\d+)\s*(month|months)\s*ago/i, extract: (m: RegExpMatchArray) => `${m[1]} months ago` },
    { pattern: /(few|couple)\s*(days)/i, value: 'A few days ago' },
    { pattern: /about\s*a\s*week/i, value: 'About a week ago' },
  ];

  for (const { pattern, value, extract } of onsetPatterns) {
    const match = message.match(pattern);
    if (match) {
      extraction.onset = extract ? extract(match) : value;
      break;
    }
  }

  // Extract severity (pain scale)
  const severityMatch = message.match(/(\d+)\s*(out of|\/)\s*10/i) || message.match(/severity[:\s]*(\d+)/i);
  if (severityMatch) {
    extraction.severity = parseInt(severityMatch[1]);
  } else if (/severe|excruciating|unbearable|worst/i.test(message)) {
    extraction.severity = 8;
  } else if (/moderate|medium|significant/i.test(message)) {
    extraction.severity = 5;
  } else if (/mild|slight|minor/i.test(message)) {
    extraction.severity = 3;
  }

  // Extract character/quality
  const qualityPatterns = ['sharp', 'dull', 'throbbing', 'aching', 'burning', 'stabbing', 'pressure', 'cramping', 'squeezing'];
  for (const quality of qualityPatterns) {
    if (lowerMessage.includes(quality)) {
      extraction.character = quality.charAt(0).toUpperCase() + quality.slice(1);
      break;
    }
  }

  // Extract location
  const locationPatterns = [
    { pattern: /head|forehead|temple/i, value: 'Head' },
    { pattern: /chest|sternum/i, value: 'Chest' },
    { pattern: /abdomen|stomach|belly/i, value: 'Abdomen' },
    { pattern: /back/i, value: 'Back' },
    { pattern: /arm|shoulder/i, value: 'Upper extremity' },
    { pattern: /leg|knee|ankle/i, value: 'Lower extremity' },
    { pattern: /throat|neck/i, value: 'Neck/Throat' },
  ];

  for (const { pattern, value } of locationPatterns) {
    if (pattern.test(message)) {
      extraction.location = value;
      break;
    }
  }

  // Extract aggravating factors
  const aggravatingMatch = message.match(/worse\s+(?:when|with|after)\s+([^,.]+)/i);
  if (aggravatingMatch) {
    extraction.aggravatingFactors = [aggravatingMatch[1].trim()];
  }

  // Extract relieving factors
  const relievingMatch = message.match(/(?:better|helps|relief)\s+(?:when|with|after)\s+([^,.]+)/i);
  if (relievingMatch) {
    extraction.relievingFactors = [relievingMatch[1].trim()];
  }

  return extraction;
}

// Extract risk factors
function extractRiskFactors(message: string, _clinicalData: any): string[] {
  const riskFactors: string[] = [];
  
  const patterns = [
    { pattern: /diabetes|diabetic/i, factor: 'Diabetes' },
    { pattern: /hypertension|high blood pressure/i, factor: 'Hypertension' },
    { pattern: /smok(e|ing|er)/i, factor: 'Tobacco use' },
    { pattern: /alcohol/i, factor: 'Alcohol use' },
    { pattern: /overweight|obese|obesity/i, factor: 'Obesity' },
    { pattern: /heart disease|cardiac|heart attack/i, factor: 'Cardiovascular disease' },
    { pattern: /family history/i, factor: 'Family history' },
  ];

  for (const { pattern, factor } of patterns) {
    if (pattern.test(message)) {
      riskFactors.push(factor);
    }
  }

  return riskFactors;
}

// Determine next phase
function determineNextPhase(current: AssessmentPhase, messageCount: number): { nextPhase: AssessmentPhase; isComplete: boolean } {
  const phaseOrder: AssessmentPhase[] = [
    'chief-complaint',
    'hpi-development',
    'review-of-systems',
    'medical-history',
    'risk-stratification',
    'clinical-summary',
  ];

  const currentIndex = phaseOrder.indexOf(current);
  
  // Progress based on message count within phase
  // Simple heuristic: move to next phase after ~3 exchanges per phase
  const messagesPerPhase = current === 'hpi-development' ? 6 : 3;
  
  if (messageCount > 0 && messageCount % messagesPerPhase === 0 && currentIndex < phaseOrder.length - 1) {
    const nextPhase = phaseOrder[currentIndex + 1];
    return { 
      nextPhase, 
      isComplete: nextPhase === 'clinical-summary' 
    };
  }

  return { 
    nextPhase: current, 
    isComplete: current === 'clinical-summary' 
  };
}

// Generate AI response
function generateResponse(
  userMessage: string, 
  currentPhase: AssessmentPhase, 
  nextPhase: AssessmentPhase,
  redFlags: string[],
  extraction: any
): string {
  let response = '';

  // Emergency acknowledgment
  if (redFlags.length > 0) {
    const criticalFlags = ['Chest Pain', 'Dyspnea', 'Thunderclap Headache', 'Suicidal Ideation', 'Stroke Symptoms'];
    if (redFlags.some(f => criticalFlags.includes(f))) {
      response = `⚠️ **Important:** The symptoms you're describing need immediate attention. If you're experiencing a medical emergency, please call 911 now.\n\nI'll continue gathering information to help your healthcare provider, but please don't delay seeking emergency care if needed.\n\n`;
    }
  }

  // Acknowledge what was shared
  if (extraction.onset) {
    response += `I understand this started ${extraction.onset}. `;
  }
  if (extraction.severity) {
    response += `You've rated the severity as ${extraction.severity}/10. `;
  }
  if (extraction.character) {
    response += `You described it as a ${extraction.character.toLowerCase()} sensation. `;
  }

  // Phase-specific follow-up
  switch (currentPhase) {
    case 'chief-complaint':
      response += `\n\nThank you for sharing that. To better understand your concern, let me ask a few more questions.\n\n**When did this first start?** Please be as specific as you can.`;
      break;
      
    case 'hpi-development':
      if (!extraction.severity) {
        response += `\n\n**On a scale of 0 to 10**, with 10 being the worst imaginable, how would you rate this?`;
      } else if (!extraction.aggravatingFactors) {
        response += `\n\n**What makes it worse?** For example, movement, eating, stress, or certain positions?`;
      } else if (!extraction.relievingFactors) {
        response += `\n\n**What, if anything, makes it better?** Such as rest, medication, ice, or heat?`;
      } else {
        response += `\n\n**Are you experiencing any other symptoms** along with this? For example, nausea, dizziness, fever, or fatigue?`;
      }
      break;
      
    case 'review-of-systems':
      response += `\n\nNow I'd like to ask about some other body systems.\n\n**Have you had any fever, chills, or night sweats recently?**`;
      break;
      
    case 'medical-history':
      response += `\n\nLet's review your medical history.\n\n**What medications are you currently taking?** Please include any prescription, over-the-counter, or supplements.`;
      break;
      
    case 'risk-stratification':
      response += `\n\n**Is there anything else you think is important for your healthcare provider to know?**`;
      break;
      
    case 'clinical-summary':
      response = `Thank you for providing all this information. I've gathered the details about your ${extraction.location || 'symptoms'} and will share this with your healthcare provider.\n\n**Summary:**\n- Chief Complaint: ${userMessage.substring(0, 100)}...\n- Duration: ${extraction.onset || 'Not specified'}\n- Severity: ${extraction.severity || 'Not rated'}/10\n\nPlease click "Submit Assessment" when you're ready to send this to your provider.`;
      break;
  }

  return response;
}

// Get quick replies for phase
function getQuickReplies(phase: AssessmentPhase, extraction: any): string[] {
  const baseReplies = QUICK_REPLIES[phase] || [];
  
  // Customize based on what we're asking
  if (phase === 'hpi-development') {
    if (!extraction.onset) {
      return ['Today', 'Yesterday', 'A few days ago', 'About a week ago', 'Longer than a week'];
    }
    if (!extraction.severity) {
      return ['1-3 (Mild)', '4-6 (Moderate)', '7-10 (Severe)'];
    }
    if (!extraction.character) {
      return ['Sharp', 'Dull', 'Throbbing', 'Burning', 'Pressure', 'Aching'];
    }
  }
  
  return baseReplies.slice(0, 5); // Limit to 5 quick replies
}
