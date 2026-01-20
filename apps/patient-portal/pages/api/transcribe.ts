// ============================================================
// ATTENDING AI - Audio Transcription API
// apps/patient-portal/pages/api/transcribe.ts
//
// Backend transcription for browsers without Web Speech API
// Supports Azure Speech Services or OpenAI Whisper
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
}

interface TranscriptionError {
  error: string;
  code?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscriptionResult | TranscriptionError>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      allowEmptyFiles: false,
    });

    const [fields, files] = await form.parse(req);
    
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    const language = Array.isArray(fields.language) ? fields.language[0] : fields.language || 'en-US';

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFile.filepath);

    let result: TranscriptionResult;

    // Try Azure Speech Services first (if configured)
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      result = await transcribeWithAzure(audioBuffer, language);
    } 
    // Fall back to OpenAI Whisper
    else if (process.env.OPENAI_API_KEY) {
      result = await transcribeWithWhisper(audioBuffer, audioFile.originalFilename || 'audio.webm');
    } 
    // No service configured
    else {
      return res.status(500).json({ 
        error: 'No transcription service configured',
        code: 'NO_SERVICE'
      });
    }

    // Clean up temp file
    fs.unlinkSync(audioFile.filepath);

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Transcription failed',
      code: 'TRANSCRIPTION_ERROR'
    });
  }
}

// =============================================================================
// Azure Speech Services Transcription
// =============================================================================

async function transcribeWithAzure(
  audioBuffer: Buffer,
  language: string
): Promise<TranscriptionResult> {
  const speechKey = process.env.AZURE_SPEECH_KEY!;
  const speechRegion = process.env.AZURE_SPEECH_REGION!;

  // Azure Speech SDK would be used here in production
  // For now, using REST API
  const endpoint = `https://${speechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;

  const response = await fetch(`${endpoint}?language=${language}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'audio/webm; codecs=opus',
      'Accept': 'application/json',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Speech API error: ${errorText}`);
  }

  const data = await response.json();

  return {
    text: data.DisplayText || data.RecognitionStatus === 'NoMatch' ? '' : data.DisplayText,
    confidence: data.NBest?.[0]?.Confidence || 0.9,
    language: data.Language || language,
    duration: data.Duration ? data.Duration / 10000000 : undefined, // Convert from 100ns to seconds
  };
}

// =============================================================================
// OpenAI Whisper Transcription
// =============================================================================

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY!;

  // Create form data
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI Whisper API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    text: data.text || '',
    confidence: 0.95, // Whisper doesn't return confidence scores
    language: data.language,
    duration: data.duration,
  };
}

// =============================================================================
// Local Whisper Transcription (if self-hosted)
// =============================================================================

async function transcribeWithLocalWhisper(
  audioBuffer: Buffer,
  language: string
): Promise<TranscriptionResult> {
  const whisperUrl = process.env.LOCAL_WHISPER_URL || 'http://localhost:9000/asr';

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio_file', blob, 'audio.webm');
  formData.append('language', language.split('-')[0]); // Just 'en' not 'en-US'
  formData.append('output', 'json');

  const response = await fetch(whisperUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Local Whisper error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    text: data.text || '',
    confidence: 0.9,
    language: language,
  };
}
