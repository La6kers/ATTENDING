// =============================================================================
// ATTENDING AI - AI Scribe API Endpoint
// apps/provider-portal/pages/api/scribe/index.ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ambientScribeService } from '@attending/shared/services/ai-scribe/AmbientScribeService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'POST': {
        const { action } = req.body;

        switch (action) {
          case 'start-session': {
            const { patientId, encounterId, providerId, encounterType } = req.body;
            const session = ambientScribeService.startSession(
              patientId,
              encounterId,
              providerId,
              encounterType
            );
            return res.status(200).json(session);
          }

          case 'process-audio': {
            const { sessionId, audioChunk, timestamp } = req.body;
            await ambientScribeService.processAudioChunk(sessionId, audioChunk, timestamp);
            return res.status(200).json({ success: true });
          }

          case 'end-session': {
            const { sessionId } = req.body;
            const result = ambientScribeService.endSession(sessionId);
            return res.status(200).json(result);
          }

          case 'generate-note': {
            const { sessionId } = req.body;
            const note = ambientScribeService.generateSOAPNote(sessionId);
            return res.status(200).json(note);
          }

          case 'extract-codes': {
            const { sessionId } = req.body;
            const codes = ambientScribeService.extractBillingCodes(sessionId);
            return res.status(200).json(codes);
          }

          case 'generate-instructions': {
            const { sessionId, language } = req.body;
            const instructions = ambientScribeService.generatePatientInstructions(sessionId, language);
            return res.status(200).json(instructions);
          }

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }
      }

      case 'GET': {
        const { sessionId } = req.query;
        if (sessionId) {
          const session = ambientScribeService.getSession(sessionId as string);
          if (!session) {
            return res.status(404).json({ error: 'Session not found' });
          }
          return res.status(200).json(session);
        }
        return res.status(400).json({ error: 'Session ID required' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Scribe API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
