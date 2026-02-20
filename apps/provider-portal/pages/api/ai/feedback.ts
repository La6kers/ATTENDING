// ============================================================
// ATTENDING AI - AI Feedback API Endpoint
// apps/provider-portal/pages/api/ai/feedback.ts
//
// Persists structured clinical feedback on AI recommendations.
// Collects: differential accuracy, SOAP note quality, lab
// suggestion relevance, and treatment plan feedback.
//
// Data flow: Widget → This API → Database → Outcomes Dashboard
// No PHI is stored in feedback records.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

interface FeedbackPayload {
  id: string;
  type: string;
  recommendationId: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  providerId: string;
  encounterId?: string;
  createdAt: string;
  aiOutputSnippet?: string;
}

interface FeedbackResponse {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedbackResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const feedback: FeedbackPayload = req.body;

    // Validate required fields
    if (!feedback.type || !feedback.recommendationId || !feedback.rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, recommendationId, rating',
      });
    }

    // Validate rating value
    if (!['helpful', 'not_helpful'].includes(feedback.rating)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be "helpful" or "not_helpful"',
      });
    }

    // Truncate comment to prevent abuse
    if (feedback.comment && feedback.comment.length > 500) {
      feedback.comment = feedback.comment.substring(0, 500);
    }

    // Truncate AI output snippet
    if (feedback.aiOutputSnippet && feedback.aiOutputSnippet.length > 200) {
      feedback.aiOutputSnippet = feedback.aiOutputSnippet.substring(0, 200);
    }

    // In production: persist to database
    // For now, log to structured output for later analysis
    const logEntry = {
      timestamp: new Date().toISOString(),
      feedbackId: feedback.id || `fb-${Date.now()}`,
      type: feedback.type,
      recommendationId: feedback.recommendationId,
      rating: feedback.rating,
      hasComment: !!feedback.comment,
      commentLength: feedback.comment?.length || 0,
      providerId: feedback.providerId,
      encounterId: feedback.encounterId,
    };

    // Structured log for analytics pipeline
    console.log('[AI_FEEDBACK]', JSON.stringify(logEntry));

    // TODO: Persist to database when AiFeedback model is added to Prisma schema
    // await prisma.aiFeedback.create({ data: { ... } });

    return res.status(200).json({
      success: true,
      feedbackId: logEntry.feedbackId,
    });

  } catch (error) {
    console.error('[AI_FEEDBACK:ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to store feedback',
    });
  }
}
