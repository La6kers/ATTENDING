// =============================================================================
// ATTENDING AI - Clinical Trials API
// apps/provider-portal/pages/api/interventions/trials.ts
//
// Match patients to clinical trials
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  clinicalTrialMatcher,
  type PatientTrialContext,
  type TrialMatch,
  type ClinicalTrial,
} from '@attending/shared/services/interventions';

interface TrialsRequest {
  action: 'match' | 'search' | 'notify';
  patientContext?: PatientTrialContext;
  searchQuery?: {
    condition?: string;
    phase?: string[];
    status?: string[];
    location?: { state?: string; maxDistance?: number };
  };
  matchId?: string;
  patientName?: string;
}

interface TrialsResponse {
  success: boolean;
  matches?: TrialMatch[];
  trials?: ClinicalTrial[];
  notification?: string;
  summary?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrialsResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { action, patientContext, searchQuery, matchId, patientName } = req.body as TrialsRequest;

    switch (action) {
      case 'match': {
        if (!patientContext) {
          return res.status(400).json({ success: false, error: 'patientContext is required' });
        }

        const matches = await clinicalTrialMatcher.findMatchingTrials(patientContext);
        const summary = await clinicalTrialMatcher.generateProviderSummary(
          matches, 
          patientContext.patientId
        );

        return res.status(200).json({ success: true, matches, summary });
      }

      case 'search': {
        if (!searchQuery) {
          return res.status(400).json({ success: false, error: 'searchQuery is required' });
        }

        const trials = await clinicalTrialMatcher.searchTrials(searchQuery);
        return res.status(200).json({ success: true, trials });
      }

      case 'notify': {
        // Would retrieve match from storage in production
        return res.status(200).json({ 
          success: true, 
          notification: 'Patient notification generated' 
        });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Trials API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
