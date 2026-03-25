// =============================================================================
// ATTENDING AI - Prior Authorization API
// apps/provider-portal/pages/api/prior-auth/index.ts
//
// Create, list, and manage prior authorization requests
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  priorAuthService, 
  type PriorAuthRequest,
  type RequestedItem,
  type PayerInfo,
  type PAUrgency,
} from '@attending/shared/services/prior-auth';

interface CreatePARequest {
  encounterId: string;
  patientId: string;
  requestedItem: RequestedItem;
  payer: PayerInfo;
  urgency?: PAUrgency;
}

interface PAResponse {
  success: boolean;
  priorAuth?: PriorAuthRequest;
  priorAuths?: PriorAuthRequest[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PAResponse>
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
        // Create new PA request
        const { 
          encounterId, 
          patientId, 
          requestedItem, 
          payer, 
          urgency 
        } = req.body as CreatePARequest;

        if (!encounterId || !patientId || !requestedItem || !payer) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields' 
          });
        }

        const priorAuth = await priorAuthService.createPriorAuth(
          encounterId,
          patientId,
          providerId,
          requestedItem,
          payer,
          urgency
        );

        return res.status(201).json({ 
          success: true, 
          priorAuth 
        });
      }

      case 'GET': {
        // List PA requests (would need database integration)
        // For now, return empty array
        return res.status(200).json({ 
          success: true, 
          priorAuths: [] 
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          error: `Method ${req.method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('[Prior Auth API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
