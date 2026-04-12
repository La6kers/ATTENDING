// =============================================================================
// ATTENDING AI - Ambient Session API
// apps/provider-portal/pages/api/ambient/session.ts
//
// Start, end, and manage ambient listening sessions
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  AmbientListeningService,
  ambientListening,
  type ListeningSession,
  type SessionSettings,
} from '@attending/shared/services/ambient';

interface StartSessionRequest {
  encounterId: string;
  patientId: string;
  settings?: Partial<SessionSettings>;
}

interface SessionResponse {
  success: boolean;
  session?: ListeningSession;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionResponse>
) {
  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const providerId = session.user.id;

    switch (req.method) {
      case 'POST': {
        // Start new session
        const { encounterId, patientId, settings } = req.body as StartSessionRequest;

        if (!encounterId || !patientId) {
          return res.status(400).json({ 
            success: false, 
            error: 'encounterId and patientId are required' 
          });
        }

        const listeningSession = await ambientListening.startSession(
          encounterId,
          patientId,
          providerId,
          settings
        );

        return res.status(200).json({ 
          success: true, 
          session: listeningSession 
        });
      }

      case 'GET': {
        // Get current session
        const currentSession = ambientListening.getSession();
        
        if (!currentSession) {
          return res.status(404).json({ 
            success: false, 
            error: 'No active session' 
          });
        }

        return res.status(200).json({ 
          success: true, 
          session: currentSession 
        });
      }

      case 'DELETE': {
        // End session
        const completedSession = await ambientListening.endSession();
        
        return res.status(200).json({ 
          success: true, 
          session: completedSession 
        });
      }

      case 'PATCH': {
        // Pause/resume session
        const { action } = req.body as { action: 'pause' | 'resume' };
        
        if (action === 'pause') {
          await ambientListening.pauseSession();
        } else if (action === 'resume') {
          await ambientListening.resumeSession();
        } else {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid action. Use "pause" or "resume"' 
          });
        }

        const updatedSession = ambientListening.getSession();
        return res.status(200).json({ 
          success: true, 
          session: updatedSession! 
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[Ambient Session API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
