// =============================================================================
// ATTENDING AI - Social Determinants of Health API
// apps/provider-portal/pages/api/interventions/sdoh.ts
//
// Screen for SDOH and connect to community resources
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  sdohService,
  type SDOHScreening,
  type ScreeningResponse,
  type CommunityResource,
  type SDOHDomain,
} from '@attending/shared/services/interventions';

interface SDOHRequest {
  action: 'questions' | 'screen' | 'resources' | 'update_referral';
  patientId?: string;
  screenedBy?: string;
  responses?: ScreeningResponse[];
  resourceQuery?: {
    domain?: SDOHDomain;
    zipCode?: string;
    state?: string;
    costPreference?: 'free' | 'sliding_scale' | 'insurance' | 'paid';
    languages?: string[];
    walkIn?: boolean;
  };
  referralId?: string;
  referralStatus?: string;
}

interface SDOHResponse {
  success: boolean;
  questions?: any[];
  screening?: SDOHScreening;
  resources?: CommunityResource[];
  summary?: string;
  zCodes?: Array<{ code: string; description: string }>;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SDOHResponse>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Return screening questions
      const questions = sdohService.getScreeningQuestions();
      return res.status(200).json({ success: true, questions });
    }

    const { action, patientId, screenedBy, responses, resourceQuery, referralId, referralStatus } = req.body as SDOHRequest;

    switch (action) {
      case 'questions': {
        const questions = sdohService.getScreeningQuestions();
        return res.status(200).json({ success: true, questions });
      }

      case 'screen': {
        if (!patientId || !responses) {
          return res.status(400).json({ 
            success: false, 
            error: 'patientId and responses are required' 
          });
        }

        const screening = await sdohService.processScreeningResponses(
          patientId,
          screenedBy || session.user.id,
          responses
        );

        const summary = await sdohService.generatePatientSDOHSummary(screening);
        const zCodes = sdohService.getZCodesForScreening(screening);

        return res.status(200).json({ 
          success: true, 
          screening, 
          summary,
          zCodes 
        });
      }

      case 'resources': {
        if (!resourceQuery) {
          return res.status(400).json({ success: false, error: 'resourceQuery is required' });
        }

        const resources = sdohService.searchResources(resourceQuery);
        return res.status(200).json({ success: true, resources });
      }

      case 'update_referral': {
        if (!referralId || !referralStatus) {
          return res.status(400).json({ 
            success: false, 
            error: 'referralId and referralStatus are required' 
          });
        }

        await sdohService.updateReferralStatus(
          referralId, 
          referralStatus as any
        );
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[SDOH API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
