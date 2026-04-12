// ============================================================
// ATTENDING AI - Clinical Outcomes API
// apps/provider-portal/pages/api/analytics/outcomes.ts
//
// Phase 8: API endpoint for clinical outcomes dashboard
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { ClinicalAnalyticsService, ClinicalOutcomesData, Period } from '@attending/shared/services/analytics';

// Initialize analytics service
const analyticsService = new ClinicalAnalyticsService();

type ResponseData = 
  | ClinicalOutcomesData
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get period from query params (default to quarter)
    const period = (req.query.period as Period) || 'quarter';
    
    // Validate period
    const validPeriods: Period[] = ['day', 'week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be one of: day, week, month, quarter, year' });
    }

    // Fetch outcomes data
    const outcomesData = await analyticsService.getClinicalOutcomesData(period);

    // Set cache headers (cache for 5 minutes)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return res.status(200).json(outcomesData);
  } catch (error) {
    console.error('Error fetching clinical outcomes:', error);
    return res.status(500).json({ error: 'Failed to fetch clinical outcomes data' });
  }
}
