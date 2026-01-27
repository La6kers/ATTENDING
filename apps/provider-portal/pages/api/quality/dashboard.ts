// =============================================================================
// ATTENDING AI - Quality Measures & MIPS Dashboard API
// apps/provider-portal/pages/api/quality/dashboard.ts
//
// Get MIPS dashboard, scores, and care gaps
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  qualityMeasuresService,
  type MIPSDashboard,
  type ProviderMIPSScore,
  type CareGap,
  type QualityMeasure,
} from '@attending/shared/services/quality';

interface QualityResponse {
  success: boolean;
  dashboard?: MIPSDashboard;
  score?: ProviderMIPSScore;
  gaps?: CareGap[];
  measures?: QualityMeasure[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QualityResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

    const providerId = session.user.id;
    const { view, specialty } = req.query;

    switch (view) {
      case 'score': {
        // Get MIPS score only
        const score = await qualityMeasuresService.calculateMIPSScore(providerId);
        return res.status(200).json({ success: true, score });
      }

      case 'gaps': {
        // Get care gaps only
        const gaps = await qualityMeasuresService.getCareGaps(providerId);
        return res.status(200).json({ success: true, gaps });
      }

      case 'measures': {
        // Get measure definitions
        const measures = qualityMeasuresService.getQualityMeasures(
          specialty as string | undefined
        );
        return res.status(200).json({ success: true, measures });
      }

      default: {
        // Full dashboard
        const dashboard = await qualityMeasuresService.getMIPSDashboard(providerId);
        return res.status(200).json({ success: true, dashboard });
      }
    }
  } catch (error) {
    console.error('[Quality Dashboard API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
