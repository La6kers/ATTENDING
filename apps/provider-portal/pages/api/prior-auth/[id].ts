// =============================================================================
// ATTENDING AI - Prior Authorization Actions API
// apps/provider-portal/pages/api/prior-auth/[id].ts
//
// Extract evidence, submit, check status, and generate appeals
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  priorAuthService, 
  type PriorAuthRequest,
  type ClinicalEvidence,
} from '@attending/shared/services/prior-auth';

interface PAActionRequest {
  action: 'extract' | 'submit' | 'status' | 'appeal';
  patientData?: any; // For extract action
}

interface PAActionResponse {
  success: boolean;
  priorAuth?: PriorAuthRequest;
  evidence?: ClinicalEvidence;
  appeal?: string;
  ready?: { ready: boolean; missing: string[] };
  error?: string;
}

// In-memory storage for demo (would use database in production)
const paStorage = new Map<string, PriorAuthRequest>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PAActionResponse>
) {
  try {
    // Authenticate
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.query;
    const paId = Array.isArray(id) ? id[0] : id;

    if (!paId) {
      return res.status(400).json({ success: false, error: 'PA ID required' });
    }

    // Get PA request (would come from database)
    let priorAuth = paStorage.get(paId);
    
    if (!priorAuth && req.method !== 'GET') {
      return res.status(404).json({ 
        success: false, 
        error: 'Prior authorization not found' 
      });
    }

    switch (req.method) {
      case 'GET': {
        // Get PA details
        if (!priorAuth) {
          return res.status(404).json({ 
            success: false, 
            error: 'Prior authorization not found' 
          });
        }
        return res.status(200).json({ success: true, priorAuth });
      }

      case 'POST': {
        const { action, patientData } = req.body as PAActionRequest;

        switch (action) {
          case 'extract': {
            // Extract clinical evidence
            if (!patientData) {
              return res.status(400).json({ 
                success: false, 
                error: 'Patient data required for evidence extraction' 
              });
            }

            const evidence = await priorAuthService.extractClinicalEvidence(
              priorAuth!,
              patientData
            );

            paStorage.set(paId, priorAuth!);

            return res.status(200).json({ 
              success: true, 
              priorAuth: priorAuth!,
              evidence 
            });
          }

          case 'submit': {
            // Check if ready
            const readyCheck = priorAuthService.checkReadyForSubmission(priorAuth!);
            
            if (!readyCheck.ready) {
              return res.status(400).json({ 
                success: false, 
                ready: readyCheck,
                error: `Missing required items: ${readyCheck.missing.join(', ')}` 
              });
            }

            // Submit PA
            const submittedPA = await priorAuthService.submitPriorAuth(
              priorAuth!,
              session.user.id
            );

            paStorage.set(paId, submittedPA);

            return res.status(200).json({ 
              success: true, 
              priorAuth: submittedPA 
            });
          }

          case 'status': {
            // Check status with payer
            const updatedPA = await priorAuthService.checkStatus(priorAuth!);
            paStorage.set(paId, updatedPA);

            return res.status(200).json({ 
              success: true, 
              priorAuth: updatedPA 
            });
          }

          case 'appeal': {
            // Generate appeal letter
            if (priorAuth!.status !== 'denied') {
              return res.status(400).json({ 
                success: false, 
                error: 'Can only generate appeal for denied requests' 
              });
            }

            const appealLetter = await priorAuthService.generateAppeal(priorAuth!);

            return res.status(200).json({ 
              success: true, 
              appeal: appealLetter,
              priorAuth: priorAuth! 
            });
          }

          default:
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid action' 
            });
        }
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[Prior Auth Action API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
