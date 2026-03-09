// =============================================================================
// ATTENDING AI - Ambient Transcription API
// apps/provider-portal/pages/api/ambient/transcribe.ts
//
// Receive transcription from browser STT and process through clinical NLP
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ambientListening } from '@attending/shared/services/ambient';

interface TranscribeRequest {
  text: string;
  confidence?: number;
  speakerId?: number;
  timestamp?: number;
}

interface TranscribeResponse {
  success: boolean;
  transcription?: {
    id: string;
    text: string;
    speaker: string;
    isMedicalContent: boolean;
    entities: any[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranscribeResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
  }

  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { text, confidence, speakerId, timestamp } = req.body as TranscribeRequest;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }

    // Process transcription through ambient listening service
    const result = await ambientListening.ingestTranscription(
      text.trim(),
      confidence || 0.9,
      timestamp || Date.now()
    );

    if (!result) {
      return res.status(200).json({ 
        success: true, 
        transcription: undefined // Filtered as non-medical content
      });
    }

    return res.status(200).json({ 
      success: true, 
      transcription: {
        id: result.id,
        text: result.text,
        speaker: result.speaker,
        isMedicalContent: result.isMedicalContent,
        entities: result.entities,
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Ambient Transcribe API] Error:', error);
    }
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error'
    });
  }
}
