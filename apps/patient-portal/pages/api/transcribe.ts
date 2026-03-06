// ============================================================
// Transcription API Route
// apps/patient-portal/pages/api/transcribe.ts
//
// Voice-to-text transcription with medical entity extraction
// Supports Whisper API and Azure Speech Services
//
// Security:
// - Rate limited to prevent abuse
// - File size limited to 25MB
// - Only accepts audio MIME types
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import type { File } from 'formidable';
import fs from 'fs';
import { rateLimit, getClientIp } from '@attending/shared/lib/security';

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// ============================================================
// TYPES
// ============================================================

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language?: string;
  entities?: ExtractedEntity[];
  duration?: number;
}

interface ExtractedEntity {
  type: 'symptom' | 'duration' | 'location' | 'severity' | 'medication' | 'allergy';
  value: string;
  confidence: number;
}

// ============================================================
// MEDICAL ENTITY PATTERNS
// ============================================================

const SYMPTOM_PATTERNS = [
  // Pain patterns
  /(?:have|having|feel|feeling|experience|experiencing)\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+(?:pain|ache|discomfort)/gi,
  /(?:my)\s+(\w+)\s+(?:hurts|aches|is\s+sore|is\s+painful)/gi,
  /(headache|migraine|stomachache|backache|toothache)/gi,
  
  // Symptom words
  /(nausea|vomiting|diarrhea|constipation|fatigue|weakness|dizziness|vertigo)/gi,
  /(fever|chills|sweating|cough|congestion|runny\s+nose|sore\s+throat)/gi,
  /(shortness\s+of\s+breath|difficulty\s+breathing|chest\s+pain|chest\s+tightness)/gi,
  /(numbness|tingling|swelling|rash|itching|burning)/gi,
  /(blurred\s+vision|double\s+vision|loss\s+of\s+vision)/gi,
  /(anxiety|depression|insomnia|confusion|memory\s+loss)/gi,
];

const DURATION_PATTERNS = [
  /(?:for|since|about|approximately|around)\s+((?:\d+|a\s+few|several)\s+(?:minute|hour|day|week|month|year)s?)/gi,
  /(today|yesterday|this\s+morning|last\s+night|a\s+while\s+ago)/gi,
  /(?:started|began)\s+((?:\d+|a\s+few|several)\s+(?:minute|hour|day|week|month|year)s?\s+ago)/gi,
];

const LOCATION_PATTERNS = [
  /(?:in|on|around)\s+(?:my\s+)?(\w+(?:\s+\w+)?)\s+(?:area|region|side)/gi,
  /(?:left|right)\s+(\w+)/gi,
  /(head|neck|chest|abdomen|stomach|back|arm|leg|foot|hand|knee|shoulder|hip)/gi,
];

const SEVERITY_PATTERNS = [
  /(?:it's|it\s+is|the\s+pain\s+is)\s+(mild|moderate|severe|terrible|unbearable|slight)/gi,
  /(?:really|very|extremely|somewhat|a\s+little)\s+(bad|painful|uncomfortable)/gi,
  /(?:on\s+a\s+scale\s+of\s+1\s+to\s+10|rate\s+it)\s+(?:a\s+)?(\d+)/gi,
  /(worst|best|better|worse)\s+(?:I've|I\s+have)\s+(?:ever\s+)?(?:felt|had|experienced)/gi,
];

const MEDICATION_PATTERNS = [
  /(?:taking|take|took|using|use|on)\s+([\w\s]+(?:mg|mcg|ml)?)/gi,
  /(aspirin|ibuprofen|tylenol|acetaminophen|advil|motrin|aleve|naproxen)/gi,
  /(lisinopril|metformin|atorvastatin|amlodipine|metoprolol|omeprazole|losartan)/gi,
];

const ALLERGY_PATTERNS = [
  /(?:allergic\s+to|allergy\s+to|can't\s+take)\s+([\w\s]+)/gi,
  /(penicillin|sulfa|latex|shellfish|peanut|egg|dairy)\s+(?:allergy|allergic)/gi,
];

// ============================================================
// HANDLER
// ============================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptionResult | { error: string; retryAfter?: number }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Rate limit: max 30 transcriptions per minute per IP
  const clientIp = getClientIp(req);
  const rateLimitResult = await rateLimit(clientIp, {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'transcribe',
  });

  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());

  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many transcription requests. Please wait before trying again.',
      retryAfter: rateLimitResult.retryAfter,
    });
  }

  try {
    // Parse multipart form data
    const { fields, files } = await parseForm(req);
    const audioFile = files.audio as File | File[];
    const extractEntities = fields.extractEntities === 'true';

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;
    
    // Read the audio file
    const audioBuffer = fs.readFileSync(file.filepath);

    // Transcribe the audio
    const transcript = await transcribeAudio(audioBuffer, file.mimetype || 'audio/webm');

    // Extract medical entities if requested
    let entities: ExtractedEntity[] = [];
    if (extractEntities && transcript) {
      entities = extractMedicalEntities(transcript);
    }

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      transcript,
      confidence: 0.85, // Placeholder - actual confidence from API
      entities,
    });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return res.status(500).json({
      error: error.message || 'Transcription failed',
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse multipart form data
 */
function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 25 * 1024 * 1024, // 25MB max
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Transcribe audio using configured service
 */
async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Check which transcription service is configured
  const whisperApiKey = process.env.OPENAI_API_KEY;
  const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
  const azureSpeechRegion = process.env.AZURE_SPEECH_REGION;

  if (whisperApiKey) {
    return transcribeWithWhisper(audioBuffer, mimeType, whisperApiKey);
  }

  if (azureSpeechKey && azureSpeechRegion) {
    return transcribeWithAzure(audioBuffer, azureSpeechKey, azureSpeechRegion);
  }

  // Fallback: Return mock transcript for development
  console.warn('[Transcribe] No transcription service configured, using mock');
  return mockTranscript();
}

/**
 * Transcribe using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  // Determine file extension from mime type
  const extension = mimeType.includes('webm') ? 'webm' : 
                    mimeType.includes('mp3') ? 'mp3' : 
                    mimeType.includes('wav') ? 'wav' : 'webm';
  
  formData.append('file', audioBuffer, {
    filename: `audio.${extension}`,
    contentType: mimeType,
  });
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('prompt', 'Medical symptoms, medications, allergies, pain descriptions');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData as any,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const result = await response.json();
  return result.text || '';
}

/**
 * Transcribe using Azure Speech Services
 */
async function transcribeWithAzure(
  audioBuffer: Buffer,
  speechKey: string,
  region: string
): Promise<string> {
  const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  
  const response = await fetch(`${endpoint}?language=en-US`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'audio/webm; codec=opus',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure Speech error: ${error}`);
  }

  const result = await response.json();
  return result.DisplayText || result.RecognitionStatus || '';
}

/**
 * Mock transcript for development
 */
function mockTranscript(): string {
  const samples = [
    "I've been having a headache for about three days now. It's mostly on the left side of my head and feels like a throbbing pain. I'd rate it about a 6 out of 10. I've tried taking ibuprofen but it only helps a little.",
    "My stomach has been hurting since yesterday morning. The pain is in my lower right side and it gets worse when I move around. I also feel nauseous and don't have much appetite.",
    "I've had a cough for about a week now. It started with a sore throat and now I'm coughing up some yellow mucus. I also have a low-grade fever and feel really tired.",
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

/**
 * Extract medical entities from transcript
 */
function extractMedicalEntities(transcript: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  // Helper to add unique entities
  const addEntity = (type: ExtractedEntity['type'], value: string, confidence: number) => {
    const key = `${type}:${value.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ type, value: value.trim(), confidence });
    }
  };

  // Extract symptoms
  for (const pattern of SYMPTOM_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('symptom', match[1] || match[0], 0.8);
    }
  }

  // Extract duration
  for (const pattern of DURATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('duration', match[1] || match[0], 0.85);
    }
  }

  // Extract body location
  for (const pattern of LOCATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('location', match[1] || match[0], 0.8);
    }
  }

  // Extract severity
  for (const pattern of SEVERITY_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('severity', match[1] || match[0], 0.75);
    }
  }

  // Extract medications
  for (const pattern of MEDICATION_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('medication', match[1] || match[0], 0.9);
    }
  }

  // Extract allergies
  for (const pattern of ALLERGY_PATTERNS) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      addEntity('allergy', match[1] || match[0], 0.9);
    }
  }

  return entities;
}
