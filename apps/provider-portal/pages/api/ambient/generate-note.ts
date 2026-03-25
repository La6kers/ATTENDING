// =============================================================================
// ATTENDING AI - Generate Clinical Note API
// apps/provider-portal/pages/api/ambient/generate-note.ts
//
// Generate SOAP/H&P notes from ambient session data
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  ambientListening, 
  clinicalNoteGenerator,
  type NoteFormat,
  type GeneratedNote,
} from '@attending/shared/services/ambient';

interface GenerateNoteRequest {
  sessionId?: string;
  format?: NoteFormat;
  options?: {
    includeReviewOfSystems?: boolean;
    includeFullPhysicalExam?: boolean;
    verbosityLevel?: 'concise' | 'standard' | 'detailed';
    templateStyle?: 'narrative' | 'structured' | 'bullet';
  };
}

interface GenerateNoteResponse {
  success: boolean;
  note?: GeneratedNote;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateNoteResponse>
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

    const { format = 'soap', options = {} } = req.body as GenerateNoteRequest;

    // Get current session
    const listeningSession = ambientListening.getSession();
    
    if (!listeningSession) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active ambient session found' 
      });
    }

    if (listeningSession.transcriptions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No transcriptions available to generate note' 
      });
    }

    // Generate clinical note
    const note = await clinicalNoteGenerator.generateNote(listeningSession, {
      format,
      includeReviewOfSystems: options.includeReviewOfSystems ?? true,
      includeFullPhysicalExam: options.includeFullPhysicalExam ?? true,
      verbosityLevel: options.verbosityLevel || 'standard',
      templateStyle: options.templateStyle || 'narrative',
    });

    return res.status(200).json({ 
      success: true, 
      note 
    });
  } catch (error) {
    console.error('[Generate Note API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
